import * as fs from 'fs';
import * as path from 'path';
import type { CallProvider, SiteConfig, TrackerId } from '../config/tracking.config';
import { TRACKER_IDS } from '../config/tracking.config';
import { buildTimeline, summarizeActions, worst } from '../correlation/action-correlator';
import type { Masker } from '../core/mask';
import type { RunState } from '../core/run-state';
import type { CheckResult, EventValidation, FlowSummary, NetworkRecord, Status, StorageSnapshot, TrackerState } from '../core/types';
import { safeStringify } from '../core/utils';
import { TRACKERS } from '../trackers';
import { isInternalGtmEvent } from '../trackers/gtm';
import { maskIssueValue } from '../trackers/types';
import { KeyScanner, PROVIDER_KEYS } from '../validators/provider.validator';
import { renderHtml } from './html.template';
import type { AcceptanceAnswer, RunReport } from './report.types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VERSION: string = require('../../package.json').version;

export interface ReportInput {
  cfg: SiteConfig;
  run: RunState;
  flow: FlowSummary;
  trackers: Record<TrackerId, TrackerState>;
  checks: CheckResult[];
  validations: EventValidation[];
  detectedProviders: CallProvider[];
  keys: KeyScanner;
  screenshots: Map<string, Buffer>;
  startedAt: Date;
  dir: string;
  tracePath?: string;
  masker: Masker;
  status: Status;
  targetUrl: string;
  finalUrl: string;
  siteOrigin: string;
}

const GROUP_OF: Record<TrackerId, string> = { gtm: 'GTM', jitsu: 'JITSU', clarity: 'CLARITY', ringba: 'RINGBA', callgrid: 'CALLGRID' };

/** The acceptance-criteria questions, answered from the checks that prove them. */
const QUESTIONS: Array<{ q: string; ids: string[] }> = [
  { q: 'What trackers exist?', ids: [] },
  { q: 'Did their scripts load?', ids: ['GTM-001', 'JITSU-001', 'CLARITY-001', 'CLARITY-002', 'RINGBA-001'] },
  { q: 'Did they initialize?', ids: ['GTM-003', 'JITSU-001', 'CLARITY-002', 'RINGBA-003'] },
  { q: 'Did page_view fire?', ids: ['JITSU-003'] },
  { q: 'Did CTA tracking fire?', ids: ['JITSU-004', 'GTM-004'] },
  { q: 'Did quiz tracking fire?', ids: ['JITSU-005', 'QUIZ-001'] },
  { q: 'Did ZIP tracking fire (if required)?', ids: ['JITSU-006', 'DOM-003'] },
  { q: 'Did lead tracking fire?', ids: ['JITSU-007'] },
  { q: 'Did phone tracking fire?', ids: ['JITSU-008', 'GTM-008', 'PHONE-002', 'RINGBA-005'] },
  { q: 'Was the correct provider used?', ids: ['PROVIDER-000', 'CALLGRID-001'] },
  { q: 'Were provider-specific keys correct?', ids: ['PROVIDER-001', 'RINGBA-QUIZ-001', 'RINGBA-QUIZ-002', 'RINGBA-QUIZ-003', 'CALLGRID-002', 'CALLGRID-003', 'CALLGRID-004'] },
  { q: 'Were network requests generated?', ids: ['JITSU-002', 'CLARITY-003', 'CLARITY-004', 'CALLGRID-005', 'RINGBA-QUIZ-004'] },
  { q: 'Were payloads correct?', ids: ['JITSU-010', 'JITSU-011', 'JITSU-012'] },
  { q: 'Were DOM elements correct?', ids: ['DOM-001', 'DOM-002', 'PHONE-001', 'RINGBA-004'] },
  { q: 'Were storage values correct?', ids: ['STORAGE-001', 'STORAGE-002', 'STORAGE-003', 'STORAGE-004', 'STORAGE-005'] },
  { q: 'Did dataLayer events occur?', ids: ['GTM-003', 'GTM-004', 'GTM-008', 'GTM-009'] },
  { q: 'Were there duplicate events?', ids: ['GTM-005', 'JITSU-009'] },
  { q: 'Were there missing events?', ids: [] },
  { q: 'Were there tracking-related console errors?', ids: ['GTM-006', 'JITSU-013', 'CLARITY-005', 'CONSOLE-001'] },
];

function write(file: string, data: string | Buffer): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

function statusOf(checks: CheckResult[]): Status {
  const relevant = checks.filter((c) => c.status !== 'SKIPPED');
  if (!relevant.length) return 'SKIPPED';
  return worst(relevant.map((c) => c.status));
}

function maskStorage(snap: StorageSnapshot | undefined, m: Masker): StorageSnapshot | undefined {
  if (!snap) return undefined;
  return {
    ...snap,
    pageUrl: m.url(snap.pageUrl),
    localStorage: Object.fromEntries(Object.entries(snap.localStorage).map(([k, v]) => [k, String(m.field(k, v))])),
    sessionStorage: Object.fromEntries(Object.entries(snap.sessionStorage).map(([k, v]) => [k, String(m.field(k, v))])),
    cookies: snap.cookies.map((c) => ({ ...c, value: String(m.field(c.name, c.value)) })),
  };
}

function maskRequest(r: NetworkRecord, m: Masker): NetworkRecord {
  const { responseBody, ...rest } = r;
  return {
    ...rest,
    url: m.url(r.url),
    pageUrl: r.pageUrl ? m.url(r.pageUrl) : undefined,
    frameUrl: r.frameUrl ? m.url(r.frameUrl) : undefined,
    postData: r.postDataJson !== undefined ? undefined : r.postData ? m.text(r.postData.slice(0, 4000)) : undefined,
    postDataJson: r.postDataJson !== undefined ? m.obj(r.postDataJson) : undefined,
    requestHeaders: r.requestHeaders ? Object.fromEntries(Object.entries(r.requestHeaders).filter(([k]) => !/cookie|authorization|x-write-key/i.test(k))) : undefined,
    responseHeaders: r.responseHeaders ? Object.fromEntries(Object.entries(r.responseHeaders).filter(([k]) => !/set-cookie/i.test(k))) : undefined,
    ...(responseBody ? { responseBody: m.text(responseBody.slice(0, 500)) } : {}),
  };
}

export function generateReport(input: ReportInput): RunReport {
  const { cfg, run, flow, trackers, checks, validations, masker: m, dir } = input;
  const finishedAt = new Date();
  const internal = (n: string) => isInternalGtmEvent(n, cfg.expected.gtm.internalEvents);

  // ---------------------------------------------------------------- evidence files
  const shots: RunReport['screenshots'] = [];
  const failedActions = new Set(checks.filter((c) => c.status === 'FAIL' && c.actionId).map((c) => c.actionId!));
  for (const a of run.actions) {
    const buf = input.screenshots.get(a.id);
    if (buf && (cfg.report.screenshots === 'actions' || failedActions.has(a.id))) {
      const file = `screenshots/${a.id}.png`;
      write(path.join(dir, file), buf);
      shots.push({ actionId: a.id, label: a.label, file });
    }
    const events = run.events.filter((e) => e.actionId === a.id);
    write(
      path.join(dir, 'payloads', `${a.id}.json`),
      safeStringify(
        {
          action: { id: a.id, kind: a.kind, label: a.label, context: m.obj(a.context), pageUrlBefore: m.url(a.pageUrlBefore), pageUrlAfter: m.url(a.pageUrlAfter), notes: a.notes, error: a.error },
          events: events.map((e) => ({ id: e.id, ts: e.ts, tracker: e.tracker, source: e.source, name: e.name, requestId: e.requestId, payload: m.obj(e.payload) })),
          dataLayerAfterAction: m.obj(a.dataLayerState),
        },
        2,
      ),
    );
    if (a.storage) write(path.join(dir, 'storage', `${a.id}.json`), JSON.stringify(maskStorage(a.storage, m), null, 2));
    // DOM snapshots only where they help explain a failure (plus the first and last page state).
    const keepDom = failedActions.has(a.id) || a === run.actions[0] || a === run.actions[run.actions.length - 1];
    if (a.domHtml && keepDom) {
      a.domFile = `dom/${a.id}.html`;
      write(path.join(dir, a.domFile), m.enabled ? m.text(a.domHtml) : a.domHtml);
    }
  }
  const allRequests = run.network.map((r) => maskRequest(r, m));
  write(path.join(dir, 'network', 'requests.json'), JSON.stringify(allRequests, null, 2));
  write(path.join(dir, 'network', 'tracking-requests.json'), JSON.stringify(allRequests.filter((r) => r.category !== 'OTHER'), null, 2));
  write(path.join(dir, 'console', 'console.json'), JSON.stringify(run.console.map((c) => ({ ...c, text: m.text(c.text) })), null, 2));
  write(path.join(dir, 'datalayer', 'datalayer.json'), safeStringify(run.dataLayer.map((p) => ({ ...p, pageUrl: m.url(p.pageUrl), data: m.obj(p.data) })), 2));

  // Attach evidence paths to every failure / warning.
  for (const c of checks) {
    if (c.status !== 'FAIL' && c.status !== 'WARNING') continue;
    const ev: string[] = [];
    if (c.actionId) {
      if (shots.some((s) => s.actionId === c.actionId)) ev.push(`screenshots/${c.actionId}.png`);
      ev.push(`payloads/${c.actionId}.json`);
      if (fs.existsSync(path.join(dir, 'storage', `${c.actionId}.json`))) ev.push(`storage/${c.actionId}.json`);
      const a = run.actions.find((x) => x.id === c.actionId);
      if (a?.domFile) ev.push(a.domFile);
    }
    ev.push('network/tracking-requests.json');
    if (/CONSOLE|-006|-013|-005$/.test(c.id)) ev.push('console/console.json');
    if (/^GTM/.test(c.id)) ev.push('datalayer/datalayer.json');
    if (input.tracePath) ev.push('trace.zip');
    c.evidence = ev;
  }

  // ---------------------------------------------------------------- aggregate
  const trackerStatus = {} as Record<TrackerId, Status>;
  const trackerDetails = {} as RunReport['trackerDetails'];
  for (const id of TRACKER_IDS) {
    const own = checks.filter((c) => c.group === GROUP_OF[id]);
    const st = trackers[id].enabled ? statusOf(own) : 'SKIPPED';
    trackerStatus[id] = st;
    trackerDetails[id] = { ...trackers[id], status: st, label: TRACKERS.find((t) => t.id === id)?.label ?? id };
  }

  const counts: Record<Status, number> = { PASS: 0, FAIL: 0, WARNING: 0, SKIPPED: 0, INFO: 0 };
  for (const c of checks) counts[c.status]++;

  const missing = validations.flatMap((v) =>
    v.issues.filter((i) => i.kind === 'MISSING_EVENT').map((i) => ({ tracker: v.tracker, event: v.event, actionId: v.actionId, actionLabel: v.actionLabel, message: i.message, severity: i.severity })),
  );
  const duplicates = validations.flatMap((v) =>
    v.issues.filter((i) => i.kind === 'DUPLICATE_EVENT').map((i) => ({ tracker: v.tracker, event: v.event, actionId: v.actionId, expected: v.expectedCount, actual: v.actualCount, message: i.message })),
  );

  const byId = new Map(checks.map((c) => [c.id, c]));
  const answers: AcceptanceAnswer[] = QUESTIONS.map(({ q, ids }) => {
    if (q === 'What trackers exist?') {
      const present = TRACKER_IDS.filter((id) => trackers[id].detected).map((id) => trackerDetails[id].label);
      const requiredMissing = TRACKER_IDS.filter((id) => trackers[id].required && !trackers[id].detected);
      return {
        question: q,
        status: requiredMissing.length ? 'FAIL' : present.length ? 'PASS' : 'WARNING',
        answer: `${present.join(', ') || 'none detected'}${requiredMissing.length ? ` — required but missing: ${requiredMissing.join(', ')}` : ''}`,
        checks: [],
      };
    }
    if (q === 'Were there missing events?') {
      const fails = missing.filter((x) => x.severity === 'FAIL');
      return { question: q, status: fails.length ? 'FAIL' : missing.length ? 'WARNING' : 'PASS', answer: missing.length ? missing.map((x) => `${x.tracker}:${x.event}${x.actionId ? ` @${x.actionId}` : ''}`).join(', ') : 'no missing events', checks: [] };
    }
    const cs = ids.map((id) => byId.get(id)).filter((c): c is CheckResult => !!c);
    const st = statusOf(cs);
    const bad = cs.filter((c) => c.status === 'FAIL' || c.status === 'WARNING');
    const answer = st === 'SKIPPED' ? cs[0]?.message ?? 'not applicable' : bad.length ? bad.map((c) => `${c.id}: ${c.message}`).join(' | ') : cs.filter((c) => c.status === 'PASS' || c.status === 'INFO').map((c) => c.message).slice(0, 2).join(' | ');
    return { question: q, status: st, answer, checks: ids };
  });

  const providerKeys: RunReport['providerKeys'] = {};
  for (const k of [...Object.values(PROVIDER_KEYS.ringba), ...Object.values(PROVIDER_KEYS.callgrid)]) {
    providerKeys[k] = input.keys.find(k).map((o) => ({ ...o, value: o.hasValue ? (m.field(k, o.value) as typeof o.value) : undefined }));
  }

  const actions = summarizeActions(run, validations, checks);
  const perAction: Record<string, StorageSnapshot | undefined> = {};
  for (const a of run.actions) perAction[a.id] = maskStorage(a.storage, m);
  const siteSnaps = run.storageSnapshots.filter((s) => s.origin === input.siteOrigin);
  const trackingCats = new Set(['GTM', 'JITSU', 'CLARITY', 'RINGBA', 'CALLGRID', 'GA4']);

  const report: RunReport = {
    tool: { name: 'playwright-tracking-verifier', version: VERSION },
    runId: run.runId,
    site: cfg.name,
    url: m.url(input.targetUrl),
    finalUrl: m.url(input.finalUrl),
    startedAt: input.startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - input.startedAt.getTime(),
    type: flow.type,
    configuredType: cfg.type,
    provider: flow.provider,
    configuredProvider: cfg.expected.callTracking.provider,
    detectedProviders: input.detectedProviders,
    status: input.status,
    exitCode: input.status === 'FAIL' ? 1 : 0,
    trackers: trackerStatus,
    trackerDetails,
    summary: {
      checks: counts,
      actions: run.actions.length,
      events: run.events.filter((e) => !(e.tracker === 'gtm' && internal(e.name))).length,
      trackingRequests: run.network.filter((r) => trackingCats.has(r.category)).length,
      totalRequests: run.network.length,
      dataLayerPushes: run.dataLayer.filter((p) => p.global === 'dataLayer').length,
      consoleErrors: run.console.filter((c) => c.type === 'error' || c.type === 'pageerror').length,
      trackingErrors: run.console.filter((c) => c.category === 'TRACKING').length,
    },
    answers,
    checks,
    failures: checks.filter((c) => c.status === 'FAIL'),
    warnings: checks.filter((c) => c.status === 'WARNING'),
    flow,
    actions,
    timeline: buildTimeline(run, internal).map((t) => ({ ...t, label: m.text(t.label) })),
    events: run.events.map((e) => ({ id: e.id, ts: e.ts, tracker: e.tracker, source: e.source, name: e.name, actionId: e.actionId, pageUrl: e.pageUrl ? m.url(e.pageUrl) : undefined, requestId: e.requestId, payload: m.obj(e.payload) })),
    eventValidations: validations.map((v) => ({ ...v, issues: v.issues.map((i) => ({ ...i, expected: maskIssueValue(i, i.expected, m), actual: maskIssueValue(i, i.actual, m) })) })),
    duplicates,
    missing,
    networkRequests: allRequests.filter((r) => r.category !== 'OTHER' || r.failure || r.isNavigation || (r.status ?? 0) >= 400),
    consoleErrors: run.console.filter((c) => c.category !== 'INFO').map((c) => ({ ...c, text: m.text(c.text) })),
    storage: { final: maskStorage(siteSnaps[siteSnaps.length - 1] ?? run.storageSnapshots[run.storageSnapshots.length - 1], m), perAction },
    dataLayer: run.dataLayer.map((p) => ({ ...p, pageUrl: m.url(p.pageUrl), data: m.obj(p.data) })),
    dom: { initial: maskDom(run.domSnapshots[0], m), final: maskDom(run.domSnapshots[run.domSnapshots.length - 1], m) },
    providerKeys,
    globals: m.obj(run.globals),
    screenshots: shots,
    artifacts: {
      dir,
      html: path.join(dir, 'report.html'),
      json: path.join(dir, 'report.json'),
      trace: input.tracePath,
    },
    notes: flow.notes,
  };

  write(report.artifacts.json, safeStringify(report, 2));
  write(report.artifacts.html, renderHtml(report));
  return report;
}

function maskDom(d: RunReport['dom']['initial'], m: Masker): RunReport['dom']['initial'] {
  if (!d) return undefined;
  const { nextData, ...rest } = d;
  const mask = (e: (typeof d.phoneLinks)[number]) => ({ ...e, text: m.phone(e.text) || e.text, href: e.href ? `tel:${m.phone(e.href)}` : e.href });
  return { ...rest, url: m.url(d.url), phoneLinks: d.phoneLinks.map(mask), phoneLikeNonAnchors: d.phoneLikeNonAnchors.map((e) => ({ ...e, text: m.text(e.text) })), ...(nextData ? { nextData: `(${nextData.length} chars)` } : {}) };
}
