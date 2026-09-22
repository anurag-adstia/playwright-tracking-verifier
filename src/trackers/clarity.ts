import type { CheckResult, TrackerState } from '../core/types';
import { unique } from '../core/utils';
import { checkScriptRequests, describeRequest, isOk } from '../validators/request.validator';
import { check, consoleCheck, DetectContext, EvalContext, skippedFor, TrackerAdapter } from './types';

const GROUP = 'CLARITY';
const TITLES: Record<string, string> = {
  'CLARITY-001': 'Clarity implementation / tag script',
  'CLARITY-002': 'Clarity library loaded (clarity.ms)',
  'CLARITY-003': 'Clarity collect request',
  'CLARITY-004': 'Clarity collect response status',
  'CLARITY-005': 'Clarity console errors',
};

const clarityReqs = (ctx: DetectContext) => ctx.run.network.filter((r) => r.category === 'CLARITY');
const tagReqs = (ctx: DetectContext) => clarityReqs(ctx).filter((r) => /clarity\.ms\/tag\//.test(r.url));
const libReqs = (ctx: DetectContext) => clarityReqs(ctx).filter((r) => r.resourceType === 'script' && !/\/tag\//.test(r.url));
export const collectReqs = (ctx: DetectContext) => clarityReqs(ctx).filter((r) => /\/collect(\?|$)/.test(r.url));

function snippetInDom(ctx: DetectContext): boolean {
  return ctx.run.domSnapshots.some((d) => d.scripts.some((s) => /clarity\.ms\/tag/.test(s.src ?? '') || /clarity/.test(s.snippet ?? '')));
}

export const clarityAdapter: TrackerAdapter = {
  id: 'clarity',
  label: 'Microsoft Clarity',

  detect(ctx) {
    const ev: string[] = [];
    if (snippetInDom(ctx)) ev.push('Clarity snippet in DOM');
    const n = clarityReqs(ctx).length;
    if (n) ev.push(`${n} clarity.ms request(s)`);
    if (ctx.run.globals.__clarityType === 'function') ev.push('window.clarity defined');
    return ev;
  },

  evaluate(ctx: EvalContext, state: TrackerState): CheckResult[] {
    if (!state.enabled) return Object.entries(TITLES).map(([id, t]) => skippedFor(state, id, t, GROUP));
    const { cfg, run } = ctx;
    const out: CheckResult[] = [];
    const tags = tagReqs(ctx);

    // 001 implementation: snippet + tag script; project id
    const ids = unique(tags.map((r) => /clarity\.ms\/tag\/([\w-]+)/.exec(r.url)?.[1]).filter((x): x is string => !!x));
    const s1 = checkScriptRequests('Clarity tag script', tags, { required: true });
    const d1 = [`snippet in DOM: ${snippetInDom(ctx)}`, `project id(s): ${ids.join(', ') || 'unknown'}`, ...s1.details];
    if (s1.status === 'PASS' && cfg.expected.clarity.projectId && !ids.includes(cfg.expected.clarity.projectId)) {
      out.push(check('CLARITY-001', TITLES['CLARITY-001'], GROUP, 'FAIL', `Clarity project ${ids.join(', ')} loaded, expected ${cfg.expected.clarity.projectId}`, { expected: cfg.expected.clarity.projectId, actual: ids.join(', '), classification: 'VALUE MISMATCH', details: d1 }));
    } else {
      out.push(check('CLARITY-001', TITLES['CLARITY-001'], GROUP, s1.status, s1.status === 'PASS' ? `Clarity tag loaded (project ${ids.join(', ') || 'unknown'})` : s1.message, { details: d1 }));
    }

    // 002 library (script loaded ≠ tracking request generated; that is 003)
    const libs = libReqs(ctx);
    const s2 = checkScriptRequests('clarity.js library', libs, { required: true });
    out.push(check('CLARITY-002', TITLES['CLARITY-002'], GROUP, s2.status, `${s2.message}; window.clarity is ${String(run.globals.__clarityType ?? 'unknown')}`, { details: s2.details }));

    // 003 collect request generated
    const collects = collectReqs(ctx);
    if (!collects.length) {
      out.push(check('CLARITY-003', TITLES['CLARITY-003'], GROUP, 'FAIL', `no clarity.ms/collect request within the run (waited up to ${cfg.timeouts.clarityCollect}ms after load)`, { expected: 'POST https://*.clarity.ms/collect', actual: 'none', classification: 'MISSING REQUEST' }));
    } else {
      const bytes = collects.reduce((n, r) => n + (r.postDataSize ?? 0), 0);
      out.push(check('CLARITY-003', TITLES['CLARITY-003'], GROUP, 'PASS', `${collects.length} collect request(s) sent (${bytes} bytes)`, { details: collects.slice(0, 10).map(describeRequest) }));
    }

    // 004 response status
    const allowed = cfg.expected.clarity.collectStatuses;
    if (!collects.length) out.push(check('CLARITY-004', TITLES['CLARITY-004'], GROUP, 'SKIPPED', 'no collect request to evaluate'));
    else {
      // A status followed by a failure means the browser discarded the response (CORS, abort).
      const aborted = (r: (typeof collects)[number]) => /ERR_ABORTED/.test(r.failure ?? '');
      const ok = collects.filter((r) => isOk(r, allowed));
      const bad = collects.filter((r) => (r.status !== undefined || r.failure) && !isOk(r, allowed) && !aborted(r));
      const statuses = unique(collects.map((r) => (r.failure ? `${r.status ?? ''} ${r.failure}`.trim() : String(r.status ?? 'pending'))));
      if (bad.length) out.push(check('CLARITY-004', TITLES['CLARITY-004'], GROUP, 'FAIL', `collect responded ${statuses.join(', ')}`, { expected: allowed?.join(', ') ?? '2xx', actual: statuses.join(', '), details: bad.map(describeRequest), classification: 'BAD STATUS' }));
      else if (ok.length) out.push(check('CLARITY-004', TITLES['CLARITY-004'], GROUP, 'PASS', `collect status ${unique(ok.map((r) => String(r.status))).join(', ')} (${ok.length}/${collects.length} ok)`));
      else out.push(check('CLARITY-004', TITLES['CLARITY-004'], GROUP, 'WARNING', `no collect request completed (${statuses.join(', ')})`, { details: collects.map(describeRequest) }));
    }

    out.push(consoleCheck('CLARITY-005', TITLES['CLARITY-005'], GROUP, ctx, 'clarity'));
    return out;
  },
};
