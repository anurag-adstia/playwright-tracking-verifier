import type { CheckResult, TrackerState, TrackingEvent } from '../core/types';
import { unique } from '../core/utils';
import { findIdenticalDuplicates, validateEvents } from '../validators/event.validator';
import { checkScriptRequests } from '../validators/request.validator';
import { check, checkFromValidations, consoleCheck, DetectContext, EvalContext, skippedFor, TrackerAdapter } from './types';

const GROUP = 'GTM';
const TITLES: Record<string, string> = {
  'GTM-001': 'GTM script',
  'GTM-002': 'GTM container ID',
  'GTM-003': 'dataLayer & GTM initialization',
  'GTM-004': 'CTA dataLayer event',
  'GTM-005': 'Duplicate GTM events',
  'GTM-006': 'GTM console errors',
  'GTM-007': 'GTM noscript fallback',
  'GTM-008': 'Phone dataLayer event',
  'GTM-009': 'Other configured dataLayer events',
};

const CONTAINER_RE = /GTM-[A-Z0-9]{4,10}/g;

function gtmScriptRequests(ctx: DetectContext) {
  return ctx.run.network.filter((r) => r.category === 'GTM' && /\/gtm\.js(\?|$)/.test(r.url));
}

export function isInternalGtmEvent(name: string, patterns: string[]): boolean {
  return patterns.some((p) => new RegExp(p).test(name));
}

export const gtmAdapter: TrackerAdapter = {
  id: 'gtm',
  label: 'Google Tag Manager',

  detect(ctx) {
    const ev: string[] = [];
    const reqs = gtmScriptRequests(ctx);
    if (reqs.length) ev.push(`gtm.js requested (${reqs.length}×)`);
    const snippet = ctx.run.domSnapshots.some((d) => d.scripts.some((s) => /googletagmanager\.com\/gtm\.js/.test(s.src ?? '') || /googletagmanager/.test(s.snippet ?? '')));
    if (snippet) ev.push('GTM snippet in DOM');
    if (ctx.run.events.some((e) => e.tracker === 'gtm' && e.name === 'gtm.js')) ev.push('dataLayer gtm.js event');
    return ev;
  },

  pageLoadReady(ctx, since) {
    return gtmScriptRequests(ctx).some((r) => r.ts >= since && (r.status !== undefined || !!r.failure));
  },

  evaluate(ctx: EvalContext, state: TrackerState): CheckResult[] {
    if (!state.enabled) return Object.entries(TITLES).map(([id, t]) => skippedFor(state, id, t, GROUP));
    const { cfg, run, masker } = ctx;
    const out: CheckResult[] = [];
    const scripts = gtmScriptRequests(ctx);

    // GTM-001 script
    const s = checkScriptRequests('gtm.js', scripts, { required: true });
    if (!scripts.length && state.detected) s.message = 'GTM snippet present in DOM but gtm.js was never requested';
    out.push(check('GTM-001', TITLES['GTM-001'], GROUP, s.status, s.message, { details: s.details }));

    // GTM-002 container id
    const fromRequests = unique(scripts.flatMap((r) => r.url.match(CONTAINER_RE) ?? []));
    const fromDom = unique(
      run.domSnapshots.flatMap((d) => [
        ...d.scripts.flatMap((x) => [...(x.src ?? '').matchAll(CONTAINER_RE), ...(x.snippet ?? '').matchAll(CONTAINER_RE)].map((m) => m[0])),
        ...d.noscripts.flatMap((n) => [...n.matchAll(CONTAINER_RE)].map((m) => m[0])),
      ]),
    );
    const initialized = ((run.globals.__gtmContainers as string[] | undefined) ?? []).filter((c) => c.startsWith('GTM-'));
    const detectedIds = unique([...fromRequests, ...fromDom, ...initialized]);
    const expectedIds = cfg.expected.gtm.containerId ? ([] as string[]).concat(cfg.expected.gtm.containerId) : [];
    const idDetails = [`loaded via gtm.js: ${fromRequests.join(', ') || 'none'}`, `in DOM: ${fromDom.join(', ') || 'none'}`, `initialized (google_tag_manager): ${initialized.join(', ') || 'unknown'}`];
    if (expectedIds.length) {
      const missing = expectedIds.filter((id) => !fromRequests.includes(id));
      const unexpected = fromRequests.filter((id) => !expectedIds.includes(id));
      if (missing.length) {
        out.push(check('GTM-002', TITLES['GTM-002'], GROUP, 'FAIL', `expected container ${missing.join(', ')} was not loaded${fromRequests.length ? ` (loaded: ${fromRequests.join(', ')})` : ''}`, { expected: expectedIds.join(', '), actual: fromRequests.join(', ') || 'none', classification: 'VALUE MISMATCH', details: idDetails }));
      } else {
        out.push(check('GTM-002', TITLES['GTM-002'], GROUP, unexpected.length ? 'WARNING' : 'PASS', unexpected.length ? `expected ${expectedIds.join(', ')} loaded, plus unexpected ${unexpected.join(', ')}` : `container ${expectedIds.join(', ')} loaded`, { expected: expectedIds.join(', '), actual: fromRequests.join(', '), details: idDetails }));
      }
    } else {
      out.push(check('GTM-002', TITLES['GTM-002'], GROUP, detectedIds.length ? 'INFO' : 'WARNING', detectedIds.length ? `detected container(s): ${detectedIds.join(', ')} (no expected ID configured)` : 'no GTM container ID detected', { actual: detectedIds.join(', '), details: idDetails }));
    }

    // GTM-003 dataLayer + initialization
    const dlExists = ctx.dataLayerPages.size > 0 || run.globals.__dataLayerIsArray === true;
    const gtmEvents = run.events.filter((e) => e.tracker === 'gtm');
    const lifecycle = unique(gtmEvents.filter((e) => /^gtm\.(js|dom|load)$/.test(e.name)).map((e) => e.name));
    const d3 = [`window.dataLayer created on: ${[...ctx.dataLayerPages].map((u) => masker.url(u)).join(', ') || 'none observed'}`, `GTM lifecycle events: ${lifecycle.join(', ') || 'none'}`, `google_tag_manager containers: ${initialized.join(', ') || 'none'}`, `dataLayer pushes captured: ${run.dataLayer.filter((p) => p.global === 'dataLayer').length}`];
    if (!dlExists) out.push(check('GTM-003', TITLES['GTM-003'], GROUP, 'FAIL', 'window.dataLayer does not exist', { details: d3 }));
    else if (!initialized.length && !lifecycle.includes('gtm.load') && !lifecycle.includes('gtm.dom')) {
      out.push(check('GTM-003', TITLES['GTM-003'], GROUP, 'WARNING', 'dataLayer exists but GTM did not initialize (no gtm.dom/gtm.load, no google_tag_manager container)', { details: d3 }));
    } else out.push(check('GTM-003', TITLES['GTM-003'], GROUP, 'PASS', `dataLayer exists and GTM initialized (${lifecycle.join(', ') || initialized.join(', ')})`, { details: d3 }));

    // GTM-004 / 008 / 009 dataLayer events
    const internal = cfg.expected.gtm.internalEvents;
    const custom = gtmEvents.filter((e) => !isInternalGtmEvent(e.name, internal));
    const vals = validateEvents({
      tracker: 'gtm',
      specs: cfg.expected.gtm.events,
      events: custom,
      actions: ctx.actions,
      leadStageReached: ctx.flow.leadStageReached,
      roots: [''],
      extrasRoot: 'data',
      strict: cfg.validation.strictSchema,
      allowRepeat: cfg.duplicates.allowRepeat,
      identityFor: (e) => ctx.identityFor(e),
      contextFor: (e, a) => ctx.contextFor(e, a),
    });
    ctx.eventValidations.push(...vals);
    const byCheck = (id: string) => vals.filter((v) => (v.checkId ?? 'GTM-009') === id && (v.actualCount > 0 || v.required));
    const customNames = unique(custom.map((e) => e.name));
    out.push(checkFromValidations('GTM-004', TITLES['GTM-004'], GROUP, byCheck('GTM-004'), ctx.flow.ctaClicked ? 'no CTA dataLayer event configured' : 'SKIPPED — CTA not clicked (element not present)', masker));
    out.push(checkFromValidations('GTM-008', TITLES['GTM-008'], GROUP, byCheck('GTM-008'), ctx.flow.phoneClicked ? 'no phone dataLayer event configured' : 'SKIPPED — phone CTA not clicked (element not present)', masker));
    const other = checkFromValidations('GTM-009', TITLES['GTM-009'], GROUP, byCheck('GTM-009'), 'no other dataLayer events configured', masker);
    other.details = [...(other.details ?? []), `custom dataLayer events observed: ${customNames.join(', ') || 'none'}`];
    out.push(other);

    // GTM-005 duplicates
    const dupVals = vals.filter((v) => v.issues.some((i) => i.kind === 'DUPLICATE_EVENT'));
    const identical = findIdenticalDuplicates(custom, cfg.duplicates.windowMs, (e: TrackingEvent) => cfg.duplicates.allowRepeat.includes(e.name) || !!cfg.expected.gtm.events[e.name]);
    const dupDetails = [
      ...dupVals.map((v) => `${v.event} @${v.actionId}: ${v.actualCount}× (expected ${v.expectedCount})`),
      ...identical.map((d) => `${d.event} @${d.actionId}: ${d.count} identical pushes within ${d.withinMs}ms`),
    ];
    out.push(
      check('GTM-005', TITLES['GTM-005'], GROUP, dupVals.length ? 'FAIL' : identical.length ? 'WARNING' : 'PASS', dupVals.length ? `${dupVals.length} duplicate dataLayer event(s): ${dupVals.map((v) => `${v.event} ×${v.actualCount}`).join(', ')}` : identical.length ? `${identical.length} identical unconfigured event(s) pushed twice` : '0 unexpected duplicates', {
        details: dupDetails,
        actionId: dupVals[0]?.actionId,
        classification: dupVals.length ? 'DUPLICATE EVENT' : undefined,
        expected: dupVals[0]?.expectedCount,
        actual: dupVals[0]?.actualCount,
      }),
    );

    // GTM-006 console
    out.push(consoleCheck('GTM-006', TITLES['GTM-006'], GROUP, ctx, 'gtm'));

    // GTM-007 noscript
    const ns = run.domSnapshots.flatMap((d) => d.noscripts).find((n) => /googletagmanager\.com\/ns\.html\?id=GTM-/.test(n));
    if (ns) out.push(check('GTM-007', TITLES['GTM-007'], GROUP, 'PASS', `noscript iframe present (${(ns.match(CONTAINER_RE) ?? []).join(', ')})`));
    else out.push(check('GTM-007', TITLES['GTM-007'], GROUP, cfg.expected.gtm.requireNoscript ? 'FAIL' : 'WARNING', 'GTM <noscript> iframe fallback not found (common with @next/third-parties; only affects no-JS visitors)'));
    return out;
  },
};
