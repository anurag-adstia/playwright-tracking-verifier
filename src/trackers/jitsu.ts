import type { SiteConfig } from '../config/tracking.config';
import type { CheckResult, EventValidation, Issue, NetworkRecord, TrackerState, TrackingEvent } from '../core/types';
import { originOf, unique } from '../core/utils';
import { findIdenticalDuplicates, severityToStatus, validateEvents, validateQuizSequence } from '../validators/event.validator';
import { resolveField } from '../validators/payload.validator';
import { checkScriptRequests, describeRequest, isOk } from '../validators/request.validator';
import { check, checkFromValidations, consoleCheck, maskIssueValue, DetectContext, EvalContext, skippedFor, TrackerAdapter } from './types';

const GROUP = 'JITSU';
const TITLES: Record<string, string> = {
  'JITSU-001': 'Jitsu script & initialization',
  'JITSU-002': 'Jitsu tracking endpoint',
  'JITSU-003': 'page_view',
  'JITSU-004': 'cta_click',
  'JITSU-005': 'quiz_data',
  'JITSU-006': 'ZIP tracking',
  'JITSU-007': 'lead_submit',
  'JITSU-008': 'phone_number_click',
  'JITSU-009': 'Duplicate Jitsu events',
  'JITSU-010': 'Payload schema (required fields)',
  'JITSU-011': 'Payload data types',
  'JITSU-012': 'Payload values',
  'JITSU-013': 'Jitsu console errors',
  'JITSU-014': 'Other configured Jitsu events',
};

const API_RE = /\/api\/s\/(?:s2s\/)?(track|page|identify|group|batch)\b|\/api\/v1\/(event|s2s\/event)\b/;

function stripQuery(u: string): string {
  return u.split(/[?#]/)[0];
}

function isEndpointRequest(rec: NetworkRecord, cfg: SiteConfig): boolean {
  if (rec.method === 'OPTIONS') return false;
  if (stripQuery(rec.url) === stripQuery(cfg.expected.jitsu.endpoint)) return true;
  return rec.category === 'JITSU' && API_RE.test(rec.url);
}

function loaderRequests(ctx: DetectContext): NetworkRecord[] {
  const loader = stripQuery(ctx.cfg.expected.jitsu.scriptUrl);
  return ctx.run.network.filter((r) => stripQuery(r.url) === loader);
}

function libraryUrl(ctx: DetectContext): string | undefined {
  const cf = ctx.run.globals.cf_variable as Record<string, unknown> | undefined;
  const v = cf && typeof cf === 'object' ? cf.JITSU_EVENT_URL : undefined;
  return typeof v === 'string' && v ? v : undefined;
}

function libraryRequests(ctx: DetectContext): NetworkRecord[] {
  const lib = libraryUrl(ctx);
  const loader = stripQuery(ctx.cfg.expected.jitsu.scriptUrl);
  return ctx.run.network.filter(
    (r) => r.resourceType === 'script' && stripQuery(r.url) !== loader && ((lib && stripQuery(r.url) === stripQuery(lib)) || (r.category === 'JITSU' && /\.js$/.test(stripQuery(r.url)))),
  );
}

export const jitsuAdapter: TrackerAdapter = {
  id: 'jitsu',
  label: 'Jitsu',

  createParser(cfg) {
    return (rec) => {
      if (!isEndpointRequest(rec, cfg)) return [];
      const body = rec.postDataJson as any;
      if (!body || typeof body !== 'object') return [];
      const items: any[] = Array.isArray(body) ? body : Array.isArray(body.batch) ? body.batch : [body];
      const method = API_RE.exec(rec.url)?.[1];
      return items
        .filter((p) => p && typeof p === 'object')
        .map((p) => ({
          tracker: 'jitsu',
          name: String(p.event ?? p.event_type ?? (p.type === 'page' ? 'page' : p.type) ?? method ?? 'unknown'),
          payload: p,
        }));
    };
  },

  detect(ctx) {
    const ev: string[] = [];
    if (loaderRequests(ctx).length) ev.push('Jitsu loader script requested');
    if (libraryRequests(ctx).length) ev.push('Jitsu library requested');
    const n = ctx.run.network.filter((r) => isEndpointRequest(r, ctx.cfg)).length;
    if (n) ev.push(`${n} request(s) to Jitsu endpoint`);
    if (ctx.run.domSnapshots.some((d) => d.scripts.some((s) => /jitsu/i.test(s.src ?? '') || /jitsu|JITSU_EVENT_URL/i.test(s.snippet ?? '')))) ev.push('Jitsu script tag in DOM');
    return ev;
  },

  pageLoadReady(ctx, since) {
    if (ctx.run.events.some((e) => e.tracker === 'jitsu' && e.name === 'page_view' && e.ts >= since)) return true;
    // loader failed / no library configured: nothing more will come
    return loaderRequests(ctx).some((r) => r.ts >= since && !!r.failure);
  },

  evaluate(ctx: EvalContext, state: TrackerState): CheckResult[] {
    if (!state.enabled) return Object.entries(TITLES).map(([id, t]) => skippedFor(state, id, t, GROUP));
    const { cfg, run, masker } = ctx;
    const out: CheckResult[] = [];
    const jitsuEvents = run.events.filter((e) => e.tracker === 'jitsu');

    // JITSU-001 loader + library + window.jitsu
    const loader = loaderRequests(ctx);
    const lib = libraryRequests(ctx);
    const libUrl = libraryUrl(ctx);
    const details = [...loader.map((r) => `loader: ${describeRequest(r)}`), ...lib.map((r) => `library: ${describeRequest(r)}`), `window.cf_variable.JITSU_EVENT_URL = ${libUrl ?? '(not set)'}`, `window.jitsu: ${String(run.globals.__jitsuType ?? 'unknown')}`];
    const loaderOutcome = checkScriptRequests('Jitsu loader', loader, { required: false });
    const libOutcome = checkScriptRequests('Jitsu library', lib, { required: true });
    let s1: CheckResult;
    if (loaderOutcome.status === 'FAIL') s1 = check('JITSU-001', TITLES['JITSU-001'], GROUP, 'FAIL', loaderOutcome.message, { details });
    else if (loader.length && !libUrl && !lib.length) s1 = check('JITSU-001', TITLES['JITSU-001'], GROUP, 'FAIL', 'loader loaded but window.cf_variable.JITSU_EVENT_URL is missing — Jitsu library never loads', { details, classification: 'MISSING CONFIG' });
    else if (libOutcome.status === 'FAIL') s1 = check('JITSU-001', TITLES['JITSU-001'], GROUP, 'FAIL', libOutcome.message, { details });
    else if (!jitsuEvents.length && run.globals.__jitsuType !== 'object') s1 = check('JITSU-001', TITLES['JITSU-001'], GROUP, 'FAIL', 'Jitsu scripts loaded but the tracker never initialized (no window.jitsu, no events)', { details });
    else s1 = check('JITSU-001', TITLES['JITSU-001'], GROUP, loader.length ? 'PASS' : 'WARNING', loader.length ? 'loader + library loaded, tracker initialized' : `Jitsu initialized without the standard loader (${cfg.expected.jitsu.scriptUrl})`, { details });
    out.push(s1);

    // JITSU-002 endpoint
    const endpointReqs = run.network.filter((r) => isEndpointRequest(r, cfg));
    const expectedHost = originOf(cfg.expected.jitsu.endpoint);
    // ERR_ABORTED = cancelled by a navigation (e.g. lead_submit right before the congrats redirect): the event was sent.
    const bad = endpointReqs.filter((r) => r.status !== undefined && !isOk(r) && !/ERR_ABORTED/.test(r.failure ?? ''));
    const failed = endpointReqs.filter((r) => r.failure && !/ERR_ABORTED/.test(r.failure));
    const offHost = endpointReqs.filter((r) => originOf(r.url) !== expectedHost);
    const d2 = endpointReqs.slice(0, 20).map(describeRequest);
    if (!endpointReqs.length) out.push(check('JITSU-002', TITLES['JITSU-002'], GROUP, 'FAIL', `no request to ${cfg.expected.jitsu.endpoint} observed`, { expected: cfg.expected.jitsu.endpoint, actual: 'none', classification: 'MISSING REQUEST' }));
    else if (bad.length || failed.length) {
      const r = bad[0] ?? failed[0];
      out.push(check('JITSU-002', TITLES['JITSU-002'], GROUP, 'FAIL', `${bad.length + failed.length}/${endpointReqs.length} tracking requests failed (${r.failure ?? `HTTP ${r.status}`})`, { details: d2, actionId: r.actionId }));
    } else if (offHost.length) {
      out.push(check('JITSU-002', TITLES['JITSU-002'], GROUP, 'WARNING', `${offHost.length} request(s) sent to ${originOf(offHost[0].url)} instead of ${expectedHost}`, { details: d2, expected: expectedHost, actual: originOf(offHost[0].url) }));
    } else out.push(check('JITSU-002', TITLES['JITSU-002'], GROUP, 'PASS', `${endpointReqs.length} request(s) to ${stripQuery(cfg.expected.jitsu.endpoint)}, all successful`, { details: d2 }));

    // Event validations
    const leadSpec = cfg.expected.jitsu.events.lead_submit;
    const specs = { ...cfg.expected.jitsu.events };
    if (leadSpec && leadSpec.required === undefined) {
      const mode = cfg.expected.quiz.lead.expected;
      specs.lead_submit = { ...leadSpec, required: mode === true ? true : mode === false ? false : 'warn-if-missing' };
    }
    const vals = validateEvents({
      tracker: 'jitsu',
      specs,
      events: jitsuEvents,
      actions: ctx.actions,
      leadStageReached: ctx.flow.leadStageReached,
      roots: ['properties', ''],
      extrasRoot: 'properties',
      strict: cfg.validation.strictSchema,
      allowRepeat: cfg.duplicates.allowRepeat,
      identityFor: (e) => ctx.identityFor(e),
      contextFor: (e, a) => ctx.contextFor(e, a),
    });

    // quiz_data step continuity
    const quizEvents = jitsuEvents.filter((e) => e.name === 'quiz_data');
    const seqIssues = validateQuizSequence(quizEvents, ['properties', '']);
    if (seqIssues.length) vals.push(synthetic('quiz_data', 'JITSU-005', 'quiz_answer', 'step sequence', seqIssues, quizEvents));

    // UTM → context.campaign
    const campaignIssues = campaignReflection(cfg, jitsuEvents);
    if (campaignIssues.length) vals.push(synthetic('page_view', 'JITSU-003', 'page_load', 'campaign parameters', campaignIssues, jitsuEvents.filter((e) => e.name === 'page_view').slice(0, 1)));
    ctx.eventValidations.push(...vals);

    const byCheck = (id: string) => vals.filter((v) => (v.checkId ?? 'JITSU-014') === id && (v.actualCount > 0 || v.required || v.issues.length));
    out.push(checkFromValidations('JITSU-003', TITLES['JITSU-003'], GROUP, byCheck('JITSU-003'), 'no page load recorded', masker));
    out.push(checkFromValidations('JITSU-004', TITLES['JITSU-004'], GROUP, byCheck('JITSU-004'), 'SKIPPED — CTA not clicked (element not present)', masker));
    const quizCheck = checkFromValidations('JITSU-005', TITLES['JITSU-005'], GROUP, byCheck('JITSU-005'), ctx.flow.quizSteps ? 'quiz_data not configured' : 'SKIPPED — no quiz in this flow', masker);
    if (quizEvents.length) quizCheck.details = [...(quizCheck.details ?? []), ...quizEvents.map((e, i) => `#${i + 1} ${e.actionId}: ${stepSummary(e)}`)];
    out.push(quizCheck);
    out.push(zipCheck(ctx, jitsuEvents));
    out.push(checkFromValidations('JITSU-007', TITLES['JITSU-007'], GROUP, byCheck('JITSU-007'), 'SKIPPED — lead stage not reached in this flow', masker));
    out.push(checkFromValidations('JITSU-008', TITLES['JITSU-008'], GROUP, byCheck('JITSU-008'), 'SKIPPED — phone CTA not clicked (element not present)', masker));

    // JITSU-009 duplicates
    const dupVals = vals.filter((v) => v.issues.some((i) => i.kind === 'DUPLICATE_EVENT'));
    const identical = findIdenticalDuplicates(jitsuEvents, cfg.duplicates.windowMs, (e: TrackingEvent) => cfg.duplicates.allowRepeat.includes(e.name) || !!cfg.expected.jitsu.events[e.name]);
    out.push(
      check('JITSU-009', TITLES['JITSU-009'], GROUP, dupVals.length ? 'FAIL' : identical.length ? 'WARNING' : 'PASS', dupVals.length ? `duplicate tracking event: ${dupVals.map((v) => `${v.event} ×${v.actualCount} on ${v.actionId} (expected ${v.expectedCount})`).join('; ')}` : identical.length ? `${identical.length} identical unconfigured event(s) sent twice` : '0 unexpected duplicates', {
        details: [...dupVals.map((v) => `${v.event} @${v.actionId} (${v.actionLabel}): expected ${v.expectedCount}, actual ${v.actualCount}`), ...identical.map((d) => `${d.event} @${d.actionId}: ${d.count} identical events within ${d.withinMs}ms`)],
        actionId: dupVals[0]?.actionId,
        expected: dupVals[0]?.expectedCount,
        actual: dupVals[0]?.actualCount,
        classification: dupVals.length ? 'DUPLICATE EVENT' : undefined,
      }),
    );

    // JITSU-010/011/012 roll-ups across all Jitsu events
    const rollup = (id: string, kinds: Issue['kind'][], okMsg: string) => {
      const hits = vals.flatMap((v) => v.issues.filter((i) => kinds.includes(i.kind) && i.severity !== 'INFO').map((i) => ({ v, i })));
      const infos = vals.flatMap((v) => v.issues.filter((i) => kinds.includes(i.kind) && i.severity === 'INFO').map((i) => ({ v, i })));
      const validated = vals.filter((v) => v.actualCount > 0).length;
      const status = hits.length ? severityToStatus(hits.map((h) => h.i)) : validated ? 'PASS' : 'SKIPPED';
      const fmt = ({ v, i }: { v: EventValidation; i: Issue }) =>
        `${i.severity} ${v.event}@${v.actionId ?? v.trigger} ${i.field ?? ''}: ${i.message}${i.expected !== undefined ? ` | expected ${JSON.stringify(maskIssueValue(i, i.expected, masker))}` : ''}${i.actual !== undefined ? ` | actual ${JSON.stringify(maskIssueValue(i, i.actual, masker))}` : ''}`;
      const first = hits.find((h) => h.i.severity === 'FAIL') ?? hits[0];
      return check(id, TITLES[id], GROUP, status, first ? `${hits.length} issue(s): ${first.i.message}` : validated ? okMsg : 'no Jitsu events captured', {
        details: [...hits.map(fmt), ...infos.slice(0, 30).map(fmt)],
        actionId: first?.v.actionId,
        expected: first ? maskIssueValue(first.i, first.i.expected, masker) : undefined,
        actual: first ? maskIssueValue(first.i, first.i.actual, masker) : undefined,
        classification: first?.i.kind.replace(/_/g, ' '),
      });
    };
    out.push(rollup('JITSU-010', ['MISSING_FIELD', 'EMPTY_VALUE', 'ADDITIONAL_FIELD'], 'all required fields present in every payload'));
    out.push(rollup('JITSU-011', ['TYPE_MISMATCH'], 'all payload field types correct'));
    out.push(rollup('JITSU-012', ['VALUE_MISMATCH', 'CONTEXT_MISMATCH', 'IDENTITY_MISMATCH', 'SEQUENCE_MISMATCH'], 'payload values match the user actions, storage identity and quiz state'));

    out.push(consoleCheck('JITSU-013', TITLES['JITSU-013'], GROUP, ctx, 'jitsu'));
    const other = checkFromValidations('JITSU-014', TITLES['JITSU-014'], GROUP, byCheck('JITSU-014'), 'no other Jitsu events configured', masker);
    other.details = [...(other.details ?? []), `all Jitsu events observed: ${unique(jitsuEvents.map((e) => e.name)).join(', ') || 'none'}`];
    out.push(other);
    return out;
  },
};

function synthetic(event: string, checkId: string, trigger: EventValidation['trigger'], label: string, issues: Issue[], events: TrackingEvent[]): EventValidation {
  return { tracker: 'jitsu', event, checkId, trigger, actionId: events[0]?.actionId, actionLabel: label, expectedCount: events.length, actualCount: events.length, required: true, status: severityToStatus(issues), eventIds: events.map((e) => e.id), issues };
}

function stepSummary(e: TrackingEvent): string {
  const g = (f: string) => {
    const r = resolveField(e.payload, f, [], ['properties', '']);
    return r.found ? JSON.stringify(r.value) : '∅';
  };
  return `question_key=${g('question_key')} answer_value=${g('answer_value')} previous_step=${g('previous_step')} current_step=${g('current_step')} next_step=${g('next_step')}`;
}

/** utm_* on the tested URL must be reflected in page_view context.campaign (Jitsu maps utm_campaign → name). */
function campaignReflection(cfg: SiteConfig, events: TrackingEvent[]): Issue[] {
  if (!cfg.expected.jitsu.validateCampaign) return [];
  const pv = events.find((e) => e.name === 'page_view');
  if (!pv) return [];
  let params: URLSearchParams;
  try {
    params = new URL(pv.pageUrl ?? cfg.url).searchParams;
  } catch {
    return [];
  }
  const issues: Issue[] = [];
  for (const [k, v] of params) {
    if (!k.startsWith('utm_')) continue;
    const key = k === 'utm_campaign' ? 'name' : k.slice(4);
    const r = resolveField(pv.payload, `context.campaign.${key}`);
    if (!r.found) issues.push({ kind: 'MISSING_FIELD', severity: 'WARNING', field: `context.campaign.${key}`, expected: v, actual: 'undefined', message: `${k} from the URL is not in context.campaign` });
    else if (String(r.value) !== v) issues.push({ kind: 'VALUE_MISMATCH', severity: 'FAIL', field: `context.campaign.${key}`, expected: v, actual: r.value, message: `context.campaign.${key} does not match ${k}` });
  }
  return issues;
}

function containsValue(obj: unknown, value: string, depth = 0): boolean {
  if (depth > 8 || obj === null || obj === undefined) return false;
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj) === value;
  if (typeof obj !== 'object') return false;
  return Object.values(obj as Record<string, unknown>).some((v) => containsValue(v, value, depth + 1));
}

function zipCheck(ctx: EvalContext, events: TrackingEvent[]): CheckResult {
  const id = 'JITSU-006';
  const zipActions = ctx.actions.filter((a) => a.kind === 'zip_submit');
  const required = ctx.cfg.expected.quiz.zip.required === true;
  if (!zipActions.length) {
    return check(id, TITLES[id], GROUP, required ? 'FAIL' : 'SKIPPED', required ? 'ZIP is required by configuration but no ZIP step was reached' : 'SKIPPED — ZIP not required');
  }
  const a = zipActions[zipActions.length - 1];
  const zip = a.context.zip ?? '';
  const inAction = events.filter((e) => e.actionId === a.id);
  const wanted = ctx.cfg.expected.jitsu.zipEvent;
  const candidates = wanted ? inAction.filter((e) => e.name === wanted) : inAction;
  const withZip = candidates.filter((e) => containsValue(e.payload, zip));
  const details = inAction.map((e) => `${e.name} (${e.id})${containsValue(e.payload, zip) ? ' contains ZIP' : ''}`);
  if (!inAction.length) return check(id, TITLES[id], GROUP, 'FAIL', `no Jitsu event fired when ZIP ${zip} was submitted`, { actionId: a.id, expected: wanted ?? 'a Jitsu event carrying the ZIP', actual: 'none', classification: 'MISSING EVENT' });
  if (wanted && !candidates.length) return check(id, TITLES[id], GROUP, 'FAIL', `expected ${wanted} on ZIP submit, got ${unique(inAction.map((e) => e.name)).join(', ')}`, { actionId: a.id, details, expected: wanted, actual: unique(inAction.map((e) => e.name)).join(', '), classification: 'MISSING EVENT' });
  if (!withZip.length) return check(id, TITLES[id], GROUP, 'WARNING', `Jitsu fired on ZIP submit but no payload contains the entered ZIP ${zip}`, { actionId: a.id, details, expected: zip, classification: 'VALUE MISMATCH' });
  return check(id, TITLES[id], GROUP, 'PASS', `ZIP ${zip} tracked in ${withZip.map((e) => e.name).join(', ')}`, { actionId: a.id, details });
}
