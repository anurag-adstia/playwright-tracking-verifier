import type { CheckResult, NetworkRecord, TrackerState } from '../core/types';
import { originOf, unique } from '../core/utils';
import { phoneAnchorOutcome, phoneCorrelationOutcome } from '../validators/phone.validator';
import { describeOccurrences, PROVIDER_KEYS } from '../validators/provider.validator';
import { checkScriptRequests, describeRequest, isOk } from '../validators/request.validator';
import { check, DetectContext, EvalContext, skippedFor, TrackerAdapter } from './types';

const GROUP = 'RINGBA';
const TITLES: Record<string, string> = {
  'RINGBA-001': 'Ringba script',
  'RINGBA-002': 'Ringba ID',
  'RINGBA-003': 'Ringba initialization (PushDataToRingbaTags)',
  'RINGBA-004': 'Phone anchor',
  'RINGBA-005': 'Phone tracking',
  'RINGBA-QUIZ-001': 'ringbaScriptId',
  'RINGBA-QUIZ-002': 'ringba_zip',
  'RINGBA-QUIZ-003': 'callRingba: true',
  'RINGBA-QUIZ-004': 'Ringba quiz flow',
};

export const ringbaScripts = (ctx: DetectContext): NetworkRecord[] =>
  ctx.run.network.filter((r) => r.category === 'RINGBA' && (r.resourceType === 'script' || /b-js\.ringba\.com\//.test(r.url)));

export function ringbaIdFromUrl(url: string): string | undefined {
  return /ringba\.com\/([A-Za-z0-9_-]+)/.exec(url)?.[1];
}

export const ringbaAdapter: TrackerAdapter = {
  id: 'ringba',
  label: 'Ringba',

  detect(ctx) {
    const ev: string[] = [];
    const s = ringbaScripts(ctx);
    if (s.length) ev.push(`Ringba script requested (${unique(s.map((r) => ringbaIdFromUrl(r.url))).join(', ')})`);
    if (ctx.run.domSnapshots.some((d) => d.scripts.some((x) => /ringba\.com/.test(x.src ?? '') || x.id === 'ringba-script-med'))) ev.push('Ringba <script> in DOM');
    const tags = ctx.run.events.filter((e) => e.tracker === 'ringba').length;
    if (tags) ev.push(`${tags} _rgba_tags push(es)`);
    return ev;
  },

  pageLoadReady(ctx, since) {
    return ringbaScripts(ctx).some((r) => r.ts >= since && (r.status !== undefined || !!r.failure));
  },

  evaluate(ctx: EvalContext, state: TrackerState): CheckResult[] {
    if (!state.enabled) return Object.entries(TITLES).map(([id, t]) => skippedFor(state, id, t, GROUP));
    const { cfg, run, masker } = ctx;
    const out: CheckResult[] = [];
    const scripts = ringbaScripts(ctx);

    // 001 script
    const s1 = checkScriptRequests('Ringba script (b-js.ringba.com)', scripts, { required: true });
    const pagePattern = cfg.expected.ringba.pagePattern ? new RegExp(cfg.expected.ringba.pagePattern, 'i') : undefined;
    const domTag = run.domSnapshots.flatMap((d) => d.scripts.filter((x) => /ringba\.com/.test(x.src ?? '')).map((x) => `<script id="${x.id ?? ''}" src="${x.src}"${x.nscript ? ` data-nscript="${x.nscript}"` : ''}>`));
    const d1 = [...s1.details, ...unique(domTag), ...scripts.map((r) => `loaded on page ${masker.url(r.pageUrl ?? '?')}`)];
    if (s1.status === 'PASS' && pagePattern && !scripts.some((r) => pagePattern.test(r.pageUrl ?? ''))) {
      out.push(check('RINGBA-001', TITLES['RINGBA-001'], GROUP, 'WARNING', `Ringba script loaded, but not on a page matching ${cfg.expected.ringba.pagePattern}`, { details: d1 }));
    } else out.push(check('RINGBA-001', TITLES['RINGBA-001'], GROUP, s1.status, s1.message, { details: d1 }));

    // 002 id
    const ids = unique(scripts.map((r) => ringbaIdFromUrl(r.url)).filter((x): x is string => !!x));
    const expectedId = cfg.expected.ringba.id;
    if (!ids.length) out.push(check('RINGBA-002', TITLES['RINGBA-002'], GROUP, scripts.length ? 'FAIL' : 'SKIPPED', scripts.length ? 'could not extract a Ringba ID from the script URL' : 'no Ringba script to read an ID from'));
    else if (expectedId && !ids.includes(expectedId)) out.push(check('RINGBA-002', TITLES['RINGBA-002'], GROUP, 'FAIL', `Ringba ID ${ids.join(', ')} loaded, expected ${expectedId}`, { expected: expectedId, actual: ids.join(', '), classification: 'VALUE MISMATCH' }));
    else out.push(check('RINGBA-002', TITLES['RINGBA-002'], GROUP, expectedId ? 'PASS' : 'INFO', expectedId ? `Ringba ID ${expectedId} matches` : `detected Ringba ID ${ids.join(', ')} (no expected ID configured)`, { actual: ids.join(', ') }));

    // 003 initialization: actual data handed to Ringba (_rgba_tags), Ringba traffic after the script, globals
    const tags = run.events.filter((e) => e.tracker === 'ringba');
    const tagKeys = unique(tags.flatMap((t) => (t.payload && typeof t.payload === 'object' ? Object.keys(t.payload) : [])));
    const firstScriptTs = scripts.length ? Math.min(...scripts.map((r) => r.ts)) : Infinity;
    const followUp = run.network.filter((r) => r.category === 'RINGBA' && r.ts > firstScriptTs && !scripts.includes(r));
    const globals = cfg.expected.ringba.globals.filter((g) => g in run.globals);
    const missingKeys = cfg.expected.ringba.expectedTagKeys.filter((k) => !tagKeys.includes(k));
    const dlRingba = run.dataLayer.filter((p) => /ringba/i.test(JSON.stringify(p.data ?? '')));
    const d3 = [
      `_rgba_tags pushes: ${tags.length}${tagKeys.length ? ` (keys: ${tagKeys.join(', ')})` : ''}`,
      ...tags.slice(0, 8).map((t) => `  ${t.actionId ?? ''} ${JSON.stringify(masker.obj(t.payload)).slice(0, 160)}`),
      `Ringba network activity after script: ${followUp.length}`,
      ...followUp.slice(0, 8).map((r) => `  ${describeRequest(r)}`),
      `globals present: ${globals.join(', ') || 'none'}`,
      `dataLayer entries mentioning ringba: ${dlRingba.length}`,
    ];
    if (!s1.status.match(/PASS|WARNING/)) out.push(check('RINGBA-003', TITLES['RINGBA-003'], GROUP, 'FAIL', 'cannot initialize: Ringba script did not load', { details: d3 }));
    else if (missingKeys.length) out.push(check('RINGBA-003', TITLES['RINGBA-003'], GROUP, 'FAIL', `expected Ringba tag key(s) never pushed: ${missingKeys.join(', ')}`, { expected: cfg.expected.ringba.expectedTagKeys.join(', '), actual: tagKeys.join(', ') || 'none', classification: 'MISSING DATA', details: d3 }));
    else if (tags.length || followUp.length) out.push(check('RINGBA-003', TITLES['RINGBA-003'], GROUP, 'PASS', `Ringba received data (${tags.length} tag push(es), ${followUp.length} follow-up request(s))`, { details: d3 }));
    else out.push(check('RINGBA-003', TITLES['RINGBA-003'], GROUP, 'WARNING', 'Ringba script loaded but no data push (_rgba_tags) or Ringba traffic was observed', { details: d3 }));

    // 004 / 005 phone
    const phone = ctx.phoneAction();
    const phoneRequired = cfg.expected.phoneTracking.enabled === true;
    const a = phoneAnchorOutcome(phone, run.domSnapshots, masker, phoneRequired);
    out.push(check('RINGBA-004', TITLES['RINGBA-004'], GROUP, a.status, a.message, { details: a.details, actionId: phone?.id, expected: a.expected, actual: a.actual, classification: a.classification }));
    const c = phoneCorrelationOutcome(phone, run.events, { jitsu: ctx.trackers.jitsu, gtm: ctx.trackers.gtm }, masker);
    const phoneOrigin = phone ? originOf(phone.pageUrlBefore) : '';
    const onPhonePage = scripts.some((r) => originOf(r.pageUrl ?? '') === phoneOrigin && isOk(r));
    const after = phone ? run.network.filter((r) => r.category === 'RINGBA' && r.actionId === phone.id) : [];
    const d5 = [...c.details, `Ringba script on the page where the phone was clicked: ${onPhonePage}`, `Ringba requests during phone click: ${after.length}`];
    let st5 = c.status;
    let msg5 = c.message;
    if (phone && c.status === 'PASS' && !onPhonePage) {
      st5 = 'WARNING';
      msg5 = `${c.message}, but the Ringba script was not loaded on the page where the phone was clicked (no number pool/swap there)`;
    }
    out.push(check('RINGBA-005', TITLES['RINGBA-005'], GROUP, st5, msg5, { details: d5, actionId: phone?.id, expected: c.expected, actual: c.actual, classification: c.classification }));

    out.push(...ringbaQuizChecks(ctx, ids));
    return out;
  },
};

function ringbaQuizChecks(ctx: EvalContext, loadedIds: string[]): CheckResult[] {
  const { flow, keys, masker, cfg } = ctx;
  const ids = ['RINGBA-QUIZ-001', 'RINGBA-QUIZ-002', 'RINGBA-QUIZ-003', 'RINGBA-QUIZ-004'];
  if (flow.type === 'lander') return ids.map((id) => check(id, TITLES[id], GROUP, 'SKIPPED', 'not a quiz/chatquiz page'));
  if (flow.provider !== 'ringba') return ids.map((id) => check(id, TITLES[id], GROUP, 'SKIPPED', `call-tracking provider is ${flow.provider}`));
  const k = PROVIDER_KEYS.ringba;
  const mask = (key: string, v: unknown) => masker.field(key, v);
  const out: CheckResult[] = [];

  // QUIZ-001 ringbaScriptId
  const idOcc = keys.find(k.id);
  const idVal = keys.value(k.id);
  const strongId = idOcc.filter((o) => o.tier !== 'bundle');
  if (!strongId.length) out.push(check(ids[0], TITLES[ids[0]], GROUP, 'FAIL', `${k.id} not found in page configuration or runtime data`, { expected: k.id, actual: idOcc.length ? 'only referenced in JS bundle code' : 'not found', details: describeOccurrences(idOcc, 6, mask), classification: 'MISSING CONFIG' }));
  else if (idVal?.value && loadedIds.length && !loadedIds.includes(String(idVal.value))) out.push(check(ids[0], TITLES[ids[0]], GROUP, 'FAIL', `${k.id}=${String(idVal.value)} but the loaded Ringba script is ${loadedIds.join(', ')}`, { expected: String(idVal.value), actual: loadedIds.join(', '), details: describeOccurrences(idOcc, 6, mask), classification: 'VALUE MISMATCH' }));
  else if (idVal?.value && cfg.expected.ringba.id && String(idVal.value) !== cfg.expected.ringba.id) out.push(check(ids[0], TITLES[ids[0]], GROUP, 'FAIL', `${k.id}=${String(idVal.value)}, expected ${cfg.expected.ringba.id}`, { expected: cfg.expected.ringba.id, actual: String(idVal.value), details: describeOccurrences(idOcc, 6, mask), classification: 'VALUE MISMATCH' }));
  else out.push(check(ids[0], TITLES[ids[0]], GROUP, 'PASS', `${k.id}${idVal?.value ? ` = ${String(idVal.value)}` : ' present'}`, { details: describeOccurrences(idOcc, 6, mask) }));

  // QUIZ-002 ringba_zip
  out.push(zipKeyCheck(ids[1], TITLES[ids[1]], GROUP, ctx, k.zip, PROVIDER_KEYS.callgrid.zip));

  // QUIZ-003 callRingba: true
  out.push(flagCheck(ids[2], TITLES[ids[2]], GROUP, ctx, k.flag));

  // QUIZ-004 flow
  const problems: string[] = [];
  const details: string[] = [`quiz steps answered: ${flow.quizSteps}`, `quiz completed: ${flow.quizCompleted}`, `ZIP submitted: ${flow.zipSubmitted}`, `phone clicked: ${flow.phoneClicked}`];
  const scripts = ringbaScripts(ctx);
  if (!flow.quizSteps) problems.push('quiz was not progressed');
  if (!scripts.some((r) => isOk(r))) problems.push('Ringba script not loaded during the quiz flow');
  const tags = ctx.run.events.filter((e) => e.tracker === 'ringba');
  const zipAction = ctx.actions.find((a) => a.kind === 'zip_submit');
  if (zipAction) {
    const zipInRuntime = keys.find(k.zip).some((o) => o.tier === 'runtime' && String(o.value) === zipAction.context.zip);
    details.push(`${k.zip} = entered ZIP at runtime: ${zipInRuntime}`);
    if (!zipInRuntime) problems.push(`entered ZIP not observed in ${k.zip} at runtime`);
  }
  details.push(`_rgba_tags pushes: ${tags.length}`);
  out.push(check(ids[3], TITLES[ids[3]], GROUP, problems.length ? 'FAIL' : 'PASS', problems.length ? problems.join('; ') : 'quiz completed with Ringba loaded and provider data handed over', { details }));
  return out;
}

/** Shared by Ringba and CallGrid: the provider's ZIP key must carry the entered ZIP. */
export function zipKeyCheck(id: string, title: string, group: string, ctx: EvalContext, key: string, foreignKey: string): CheckResult {
  const occ = ctx.keys.find(key);
  const foreign = ctx.keys.find(foreignKey).filter((o) => o.tier !== 'bundle');
  const zipAction = ctx.actions.find((a) => a.kind === 'zip_submit');
  const details = describeOccurrences(occ, 8);
  if (foreign.length) details.push(...describeOccurrences(foreign, 3).map((d) => `WRONG PROVIDER KEY ${d}`));
  const runtime = occ.filter((o) => o.tier === 'runtime');
  const strong = occ.filter((o) => o.tier !== 'bundle');
  if (!zipAction) {
    if (foreign.length && !strong.length) return check(id, title, group, 'FAIL', `"${foreignKey}" is used instead of "${key}"`, { expected: key, actual: foreignKey, details, classification: 'PROVIDER KEY MISMATCH' });
    if (strong.length) return check(id, title, group, 'PASS', `"${key}" present in page configuration (no ZIP step in this flow)`, { details });
    return check(id, title, group, 'SKIPPED', 'SKIPPED — ZIP not part of this flow', { details });
  }
  const zip = zipAction.context.zip;
  const matching = runtime.filter((o) => String(o.value) === zip);
  if (matching.length) return check(id, title, group, 'PASS', `"${key}" = ${zip} (entered ZIP) observed at runtime`, { details, actionId: zipAction.id });
  if (foreign.some((o) => String(o.value) === zip)) {
    return check(id, title, group, 'FAIL', `ZIP ${zip} was sent as "${foreignKey}" instead of "${key}"`, { expected: key, actual: foreignKey, details, actionId: zipAction.id, classification: 'PROVIDER KEY MISMATCH' });
  }
  if (runtime.length) {
    return check(id, title, group, 'FAIL', `"${key}" observed with ${JSON.stringify(runtime[0].value)} instead of the entered ZIP ${zip}`, { expected: zip, actual: runtime[0].value, details, actionId: zipAction.id, classification: 'VALUE MISMATCH' });
  }
  if (strong.length) return check(id, title, group, 'WARNING', `"${key}" is configured but was not observed carrying the ZIP at runtime`, { details, actionId: zipAction.id });
  return check(id, title, group, 'FAIL', `"${key}" not used after ZIP ${zip} was submitted`, { expected: `${key}=${zip}`, actual: 'not found', details, actionId: zipAction.id, classification: 'MISSING DATA' });
}

/** Shared by Ringba and CallGrid: `callRingba: true` / `callCallgrid: true`. */
export function flagCheck(id: string, title: string, group: string, ctx: EvalContext, key: string): CheckResult {
  const occ = ctx.keys.find(key);
  const details = describeOccurrences(occ, 8);
  const strong = occ.filter((o) => o.tier !== 'bundle');
  if (strong.some((o) => o.value === true || o.value === 'true')) return check(id, title, group, 'PASS', `${key}: true`, { details });
  if (strong.some((o) => o.value === false || o.value === 'false')) return check(id, title, group, 'FAIL', `${key} is false`, { expected: `${key}: true`, actual: `${key}: false`, details, classification: 'VALUE MISMATCH' });
  if (strong.length) return check(id, title, group, 'WARNING', `${key} present but its value could not be read (set from an expression)`, { details });
  return check(id, title, group, 'FAIL', `${key}: true not found in page configuration or runtime data`, { expected: `${key}: true`, actual: occ.length ? 'only referenced in JS bundle code' : 'not found', details, classification: 'MISSING CONFIG' });
}
