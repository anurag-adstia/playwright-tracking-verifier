import type { CheckResult, TrackerState } from '../core/types';
import { describeOccurrences, PROVIDER_KEYS } from '../validators/provider.validator';
import { describeRequest, isOk } from '../validators/request.validator';
import { flagCheck, ringbaScripts, zipKeyCheck } from './ringba';
import { check, DetectContext, EvalContext, skippedFor, TrackerAdapter } from './types';

const GROUP = 'CALLGRID';
const TITLES: Record<string, string> = {
  'CALLGRID-001': 'CallGrid provider configuration',
  'CALLGRID-002': 'collectedzipcode',
  'CALLGRID-003': 'callgridCampaignSourceId',
  'CALLGRID-004': 'callCallgrid: true',
  'CALLGRID-005': 'CallGrid flow activity',
};

const K = PROVIDER_KEYS.callgrid;
const callgridRequests = (ctx: DetectContext) => ctx.run.network.filter((r) => r.category === 'CALLGRID');

/** CallGrid has no mandated browser endpoint: evidence is whatever CallGrid traffic/keys were really observed. */
export const callgridAdapter: TrackerAdapter = {
  id: 'callgrid',
  label: 'CallGrid',

  detect(ctx) {
    const ev: string[] = [];
    const n = callgridRequests(ctx).length;
    if (n) ev.push(`${n} CallGrid request(s)`);
    const inDom = ctx.run.domSnapshots.some((d) => (d.nextData ?? '').includes(K.id) || (d.nextData ?? '').includes(K.flag) || d.scripts.some((s) => /callgrid/i.test(s.src ?? '') || (s.snippet ?? '').includes(K.id)));
    if (inDom) ev.push('CallGrid keys in page configuration');
    const inRuntime = ctx.run.events.some((e) => JSON.stringify(e.payload ?? '').includes(K.zip) || JSON.stringify(e.payload ?? '').includes(K.id));
    if (inRuntime) ev.push('CallGrid keys in tracking payloads');
    if (ctx.run.bodies.some((b) => b.tier === 'config' && (b.body.includes(K.id) || b.body.includes(K.flag)))) ev.push('CallGrid keys in page data');
    return ev;
  },

  evaluate(ctx: EvalContext, state: TrackerState): CheckResult[] {
    if (!state.enabled) return Object.entries(TITLES).map(([id, t]) => skippedFor(state, id, t, GROUP));
    const { cfg, flow, keys, masker } = ctx;
    if (flow.provider !== 'callgrid') {
      return Object.entries(TITLES).map(([id, t]) => check(id, t, GROUP, 'SKIPPED', `call-tracking provider is ${flow.provider}`));
    }
    const out: CheckResult[] = [];
    const mask = (key: string, v: unknown) => masker.field(key, v);
    const reqs = callgridRequests(ctx);
    const ringbaLoaded = ringbaScripts(ctx).filter((r) => isOk(r));
    const cgEvidence = [...keys.find(K.id), ...keys.find(K.flag), ...keys.find(K.zip)].filter((o) => o.tier !== 'bundle');

    // 001 provider configuration
    const configured = cfg.expected.callTracking.provider === 'callgrid';
    const d1 = [`configured provider: ${cfg.expected.callTracking.provider}`, `CallGrid requests: ${reqs.length}`, `CallGrid keys in config/runtime: ${cgEvidence.length}`, ...ringbaLoaded.map((r) => `Ringba script loaded: ${describeRequest(r)}`)];
    if (ringbaLoaded.length) out.push(check('CALLGRID-001', TITLES['CALLGRID-001'], GROUP, 'FAIL', 'provider is CallGrid but the Ringba script is loaded', { expected: 'CallGrid only', actual: 'Ringba script loaded', details: d1, classification: 'PROVIDER MISMATCH' }));
    else if (!cgEvidence.length && !reqs.length) out.push(check('CALLGRID-001', TITLES['CALLGRID-001'], GROUP, 'FAIL', 'CallGrid is the configured provider but no CallGrid configuration or activity was found on the page', { details: d1, classification: 'MISSING CONFIG' }));
    else out.push(check('CALLGRID-001', TITLES['CALLGRID-001'], GROUP, 'PASS', configured ? 'CallGrid configured and present on the page' : 'CallGrid detected on the page', { details: d1 }));

    // 002 collectedzipcode (never ringba_zip)
    out.push(zipKeyCheck('CALLGRID-002', TITLES['CALLGRID-002'], GROUP, ctx, K.zip, PROVIDER_KEYS.ringba.zip));

    // 003 campaign source id
    const occ = keys.find(K.id).filter((o) => o.tier !== 'bundle');
    const val = keys.value(K.id);
    const expected = cfg.expected.callgrid.campaignSourceId;
    const d3 = describeOccurrences(keys.find(K.id), 8, mask);
    if (!occ.length) out.push(check('CALLGRID-003', TITLES['CALLGRID-003'], GROUP, 'FAIL', `${K.id} not found`, { expected: expected ?? K.id, actual: 'not found', details: d3, classification: 'MISSING CONFIG' }));
    else if (expected && String(val?.value) !== expected) out.push(check('CALLGRID-003', TITLES['CALLGRID-003'], GROUP, 'FAIL', `${K.id}=${String(val?.value)}, expected ${expected}`, { expected, actual: String(val?.value), details: d3, classification: 'VALUE MISMATCH' }));
    else if (val && (val.value === '' || val.value === null)) out.push(check('CALLGRID-003', TITLES['CALLGRID-003'], GROUP, 'FAIL', `${K.id} is empty`, { details: d3, classification: 'EMPTY VALUE' }));
    else out.push(check('CALLGRID-003', TITLES['CALLGRID-003'], GROUP, expected ? 'PASS' : 'INFO', `${K.id} = ${String(val?.value ?? '(expression)')}${expected ? '' : ' (no expected value configured)'}`, { details: d3 }));

    // 004 callCallgrid: true
    out.push(flagCheck('CALLGRID-004', TITLES['CALLGRID-004'], GROUP, ctx, K.flag));

    // 005 flow activity: only what was really observed
    const runtimeKeys = [...keys.find(K.zip), ...keys.find(K.id)].filter((o) => o.tier === 'runtime');
    const d5 = [`quiz steps: ${flow.quizSteps}, ZIP submitted: ${flow.zipSubmitted}, phone clicked: ${flow.phoneClicked}`, ...reqs.slice(0, 10).map(describeRequest), ...describeOccurrences(runtimeKeys, 6, mask)];
    const failedReqs = reqs.filter((r) => r.failure || (r.status !== undefined && !isOk(r)));
    if (failedReqs.length) out.push(check('CALLGRID-005', TITLES['CALLGRID-005'], GROUP, 'FAIL', `${failedReqs.length} CallGrid request(s) failed`, { details: d5, actionId: failedReqs[0].actionId }));
    else if (reqs.length || runtimeKeys.length) out.push(check('CALLGRID-005', TITLES['CALLGRID-005'], GROUP, 'PASS', `CallGrid activity observed (${reqs.length} request(s), ${runtimeKeys.length} runtime key occurrence(s))`, { details: d5 }));
    else if (!flow.quizSteps && !flow.phoneClicked) out.push(check('CALLGRID-005', TITLES['CALLGRID-005'], GROUP, 'SKIPPED', 'flow did not reach a CallGrid stage (no quiz progress, no phone click)', { details: d5 }));
    else out.push(check('CALLGRID-005', TITLES['CALLGRID-005'], GROUP, cfg.expected.callgrid.requireActivity ? 'FAIL' : 'WARNING', 'no CallGrid network activity or runtime CallGrid data observed during the flow', { details: d5 }));
    return out;
  },
};
