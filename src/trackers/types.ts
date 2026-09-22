import type { SiteConfig, TrackerId } from '../config/tracking.config';
import type { TelClick } from '../collectors/datalayer.collector';
import type { RequestParser } from '../collectors/network.collector';
import type { Masker } from '../core/mask';
import type { RunState } from '../core/run-state';
import type { ActionContext, ActionRecord, CheckResult, EventValidation, FlowSummary, Issue, Status, TrackerState, TrackingEvent } from '../core/types';
import type { KeyScanner } from '../validators/provider.validator';

export interface DetectContext {
  cfg: SiteConfig;
  run: RunState;
}

export interface EvalContext extends DetectContext {
  flow: FlowSummary;
  trackers: Record<TrackerId, TrackerState>;
  actions: ActionRecord[];
  telClicks: TelClick[];
  dataLayerPages: Set<string>;
  keys: KeyScanner;
  masker: Masker;
  /** Event validations produced by adapters (shared: report + storage correlation). */
  eventValidations: EventValidation[];
  identityFor(e: TrackingEvent): Record<string, string | undefined>;
  contextFor(e: TrackingEvent, a?: ActionRecord): ActionContext;
  phoneAction(): ActionRecord | undefined;
}

/**
 * A tracking provider. Adding a provider = implement this, register it in trackers/index.ts,
 * add a classifier rule and a `tracking.<id>` toggle.
 */
export interface TrackerAdapter {
  id: TrackerId;
  label: string;
  /** Extract tracking events from captured requests (network-based trackers). */
  createParser?(cfg: SiteConfig): RequestParser;
  /** Evidence that the tracker is implemented on the page (empty = not detected). */
  detect(ctx: DetectContext): string[];
  /** True once the tracker's page-load signal has been observed (used for event-based waits). */
  pageLoadReady?(ctx: DetectContext, sinceTs: number): boolean;
  evaluate(ctx: EvalContext, state: TrackerState): CheckResult[];
}

export function check(
  id: string,
  title: string,
  group: string,
  status: Status,
  message: string,
  extra: Partial<Omit<CheckResult, 'id' | 'title' | 'group' | 'status' | 'message'>> = {},
): CheckResult {
  return { id, title, group, status, message, ...extra };
}

/** Standard SKIPPED result for a disabled / not-detected tracker. */
export function skippedFor(state: TrackerState, id: string, title: string, group: string): CheckResult {
  const reason = state.toggle === false ? 'disabled by configuration' : `${group} not detected on this page (tracking.${state.id} = "auto")`;
  return check(id, title, group, 'SKIPPED', reason);
}

/** Roll a set of event validations up into one check result. */
export function checkFromValidations(id: string, title: string, group: string, vals: EventValidation[], notTriggered: string, masker: Masker): CheckResult {
  if (!vals.length) return check(id, title, group, 'SKIPPED', notTriggered);
  const order: Status[] = ['FAIL', 'WARNING', 'PASS', 'INFO', 'SKIPPED'];
  const status = order.find((s) => vals.some((v) => v.status === s)) ?? 'SKIPPED';
  const issues = vals.flatMap((v) => v.issues.filter((i) => i.severity !== 'INFO').map((i) => ({ v, i })));
  const first = issues.find((x) => x.i.severity === 'FAIL') ?? issues[0];
  const seen = vals.filter((v) => v.actualCount > 0);
  const summary =
    status === 'SKIPPED'
      ? vals.every((v) => !v.required)
        ? `not applicable in this flow (${vals.map((v) => v.event).join(', ')} not triggered)`
        : notTriggered
      : status === 'PASS'
        ? `${seen.map((v) => `${v.event}${v.actionId ? ` @${v.actionId}` : ''}`).join(', ')} captured and valid`
        : first
          ? first.i.message
          : 'see details';
  const details = vals.flatMap((v) => {
    const head = `${v.event} @ ${v.actionId ?? v.trigger} (${v.actionLabel ?? v.trigger}): ${v.actualCount}/${v.expectedCount} → ${v.status}`;
    return [
      head,
      ...v.issues.map((i) => {
        const exp = i.expected !== undefined ? ` expected=${fmt(i, i.expected, masker)}` : '';
        const act = i.actual !== undefined ? ` actual=${fmt(i, i.actual, masker)}` : '';
        return `   ${i.severity} ${i.kind}${i.field ? ` ${i.field}` : ''}: ${i.message}${exp}${act}`;
      }),
    ];
  });
  return check(id, title, group, status, summary, {
    actionId: first?.v.actionId ?? seen[0]?.actionId,
    expected: first ? maskIssueValue(first.i, first.i.expected, masker) : undefined,
    actual: first ? maskIssueValue(first.i, first.i.actual, masker) : undefined,
    classification: first ? first.i.kind.replace(/_/g, ' ') : undefined,
    details,
  });
}

/** Console errors attributed to one tracker: blocking errors FAIL, warnings WARN. */
export function consoleCheck(id: string, title: string, group: string, ctx: EvalContext, tracker: string): CheckResult {
  const recs = ctx.run.console.filter((c) => c.category === 'TRACKING' && c.tracker === tracker);
  const blocking = recs.filter((c) => c.blocking);
  const details = recs.slice(0, 15).map((c) => `${c.type.toUpperCase()} ${ctx.masker.text(c.text)}${c.location ? ` @ ${c.location}` : ''}`);
  if (blocking.length) return check(id, title, group, 'FAIL', `${blocking.length} blocking ${group} error(s): ${ctx.masker.text(blocking[0].text).slice(0, 180)}`, { details, classification: 'TRACKING ERROR', actionId: blocking[0].actionId });
  if (recs.length) return check(id, title, group, 'WARNING', `${recs.length} ${group}-related warning(s), 0 blocking`, { details });
  return check(id, title, group, 'PASS', `0 ${group}-related console errors`);
}

/** Mask issue values that are real data; type descriptions / counts are never masked. */
export function maskIssueValue(i: Issue, v: unknown, masker: Masker): unknown {
  if (!i.field || i.kind === 'TYPE_MISMATCH' || i.kind === 'MISSING_FIELD' || i.kind === 'ADDITIONAL_FIELD') return v;
  return masker.field(i.field, v);
}

function fmt(i: Issue, v: unknown, masker: Masker): string {
  const masked = maskIssueValue(i, v, masker);
  return JSON.stringify(masked) ?? String(masked);
}
