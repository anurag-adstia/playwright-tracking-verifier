import type { RunState } from '../core/run-state';
import type { ActionRecord, CheckResult, EventValidation, Status, TimelineEntry } from '../core/types';
import { shortUrl, truncate, unique } from '../core/utils';

export interface ActionSummary {
  id: string;
  kind: string;
  label: string;
  startTs: number;
  endTs: number;
  pageUrl: string;
  navigated: boolean;
  status: 'done' | 'error';
  element?: string;
  dom: Status;
  dataLayerEvents: string[];
  jitsuEvents: string[];
  ringbaTags: number;
  network: Record<string, number>;
  trackingRequests: number;
  payload: Status;
  duplicates: number;
  missing: string[];
  result: Status;
  notes: string[];
  error?: string;
  checks: string[];
}

/** Assign every request / event / push / console line to the action during which it happened. */
export function assignActions(run: RunState): void {
  const actions = [...run.actions].sort((a, b) => a.startTs - b.startTs);
  if (!actions.length) return;
  const find = (ts: number): string => {
    let hit = actions[0];
    for (const a of actions) {
      if (a.startTs <= ts) hit = a;
      else break;
    }
    return hit.id;
  };
  for (const r of run.network) r.actionId = find(r.ts);
  for (const e of run.events) e.actionId = find(e.ts);
  for (const p of run.dataLayer) p.actionId = find(p.ts);
  for (const c of run.console) c.actionId = find(c.ts);
}

const RANK: Record<Status, number> = { FAIL: 4, WARNING: 3, PASS: 2, INFO: 1, SKIPPED: 0 };

export function worst(statuses: Status[]): Status {
  let w: Status = 'SKIPPED';
  for (const s of statuses) if (RANK[s] > RANK[w]) w = s;
  return w;
}

export function summarizeActions(run: RunState, validations: EventValidation[], checks: CheckResult[]): ActionSummary[] {
  return run.actions.map((a: ActionRecord) => {
    const vals = validations.filter((v) => v.actionId === a.id);
    const events = run.events.filter((e) => e.actionId === a.id);
    const reqs = run.network.filter((r) => r.actionId === a.id);
    const network: Record<string, number> = {};
    for (const r of reqs) if (r.category !== 'OTHER') network[r.category] = (network[r.category] ?? 0) + 1;
    const relatedChecks = checks.filter((c) => c.actionId === a.id && (c.status === 'FAIL' || c.status === 'WARNING'));
    const payloadStatus = vals.length ? worst(vals.map((v) => (v.issues.some((i) => !['MISSING_EVENT', 'DUPLICATE_EVENT'].includes(i.kind) && i.severity === 'FAIL') ? 'FAIL' : v.actualCount ? 'PASS' : 'SKIPPED'))) : 'SKIPPED';
    const duplicates = vals.filter((v) => v.issues.some((i) => i.kind === 'DUPLICATE_EVENT')).length;
    const missing = unique(vals.filter((v) => v.issues.some((i) => i.kind === 'MISSING_EVENT')).map((v) => `${v.tracker}:${v.event}`));
    const result = a.status === 'error' ? 'FAIL' : worst([...vals.map((v) => (v.status === 'SKIPPED' ? 'SKIPPED' : v.status)), ...relatedChecks.map((c) => c.status), 'PASS']);
    return {
      id: a.id,
      kind: a.kind,
      label: a.label,
      startTs: a.startTs,
      endTs: a.endTs,
      pageUrl: a.pageUrlBefore,
      navigated: a.navigated,
      status: a.status,
      element: a.element ? `<${a.element.tag.toLowerCase()}> "${truncate(a.element.text, 60)}"` : undefined,
      dom: a.kind === 'page_load' || a.kind === 'navigation' ? 'PASS' : a.element ? (a.element.visible && a.element.enabled ? 'PASS' : 'WARNING') : 'SKIPPED',
      dataLayerEvents: events.filter((e) => e.tracker === 'gtm').map((e) => e.name),
      jitsuEvents: events.filter((e) => e.tracker === 'jitsu').map((e) => e.name),
      ringbaTags: events.filter((e) => e.tracker === 'ringba').length,
      network,
      trackingRequests: reqs.filter((r) => r.category !== 'OTHER').length,
      payload: payloadStatus,
      duplicates,
      missing,
      result,
      notes: a.notes,
      error: a.error,
      checks: unique(relatedChecks.map((c) => c.id)),
    };
  });
}

/** Chronological tracking timeline (script loads, events, pushes, actions, tracking errors). */
export function buildTimeline(run: RunState, internalGtm: (name: string) => boolean): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  for (const a of run.actions) out.push({ ts: a.startTs, kind: 'ACTION', label: `${a.id} ${a.label}`, actionId: a.id, status: a.status === 'error' ? 'FAIL' : undefined });
  for (const n of run.navigations) out.push({ ts: n.ts, kind: 'NAVIGATION', label: `${n.kind === 'spa' ? 'client-side ' : ''}navigation → ${shortUrl(n.url, 90)}` });
  for (const r of run.network) {
    if (r.category === 'OTHER') continue;
    const isScript = r.resourceType === 'script';
    if (!isScript && r.category === 'JITSU') continue; // represented by the event entry
    const st = r.failure ? ` FAILED ${r.failure}` : r.status !== undefined ? ` ${r.status}` : '';
    out.push({ ts: r.ts, kind: isScript ? 'SCRIPT' : 'NETWORK', tracker: r.category, label: `${r.category} ${isScript ? 'script' : r.method} ${shortUrl(r.url, 80)}${st}`, actionId: r.actionId, status: r.failure ? 'FAIL' : undefined });
  }
  for (const e of run.events) {
    if (e.tracker === 'gtm' && internalGtm(e.name) && !/^gtm\.(js|load)$/.test(e.name)) continue;
    const label = e.tracker === 'gtm' ? `dataLayer ${e.name}` : e.tracker === 'ringba' ? `_rgba_tags ${truncate(JSON.stringify(Object.keys(e.payload ?? {})), 60)}` : `${e.tracker} ${e.name}`;
    out.push({ ts: e.ts, kind: e.tracker === 'gtm' ? 'DATALAYER' : 'EVENT', tracker: e.tracker.toUpperCase(), label, actionId: e.actionId });
  }
  for (const c of run.console) {
    if (c.category !== 'TRACKING' && c.type !== 'pageerror') continue;
    out.push({ ts: c.ts, kind: 'CONSOLE', tracker: c.tracker?.toUpperCase(), label: `${c.type} ${truncate(c.text, 100)}`, actionId: c.actionId, status: c.blocking ? 'FAIL' : 'WARNING' });
  }
  return out.sort((a, b) => a.ts - b.ts);
}
