import type { ActionTrigger, EventSpec } from '../config/tracking.config';
import type { ActionContext, ActionRecord, EventValidation, Issue, Status, TrackingEvent } from '../core/types';
import { safeStringify } from '../core/utils';
import { resolveField, validatePayload } from './payload.validator';

export interface EventValidationInput {
  tracker: string;
  specs: Record<string, EventSpec>;
  /** Events of this tracker, with actionId already assigned by the correlator. */
  events: TrackingEvent[];
  actions: ActionRecord[];
  leadStageReached: boolean;
  roots: string[];
  extrasRoot?: string;
  strict: boolean;
  allowRepeat: string[];
  identityFor: (e: TrackingEvent) => Record<string, string | undefined>;
  contextFor: (e: TrackingEvent, a?: ActionRecord) => ActionContext;
}

export function severityToStatus(issues: Issue[]): Status {
  if (issues.some((i) => i.severity === 'FAIL')) return 'FAIL';
  if (issues.some((i) => i.severity === 'WARNING')) return 'WARNING';
  return 'PASS';
}

function triggersOf(spec: EventSpec): ActionTrigger[] {
  return Array.isArray(spec.trigger) ? spec.trigger : [spec.trigger];
}

/**
 * For every action that should produce an event: expected count vs actual count (missing /
 * duplicate) and full payload validation of every matching event.
 */
export function validateEvents(input: EventValidationInput): EventValidation[] {
  const out: EventValidation[] = [];
  const actionsById = new Map(input.actions.map((a) => [a.id, a]));

  for (const [name, spec] of Object.entries(input.specs)) {
    const triggers = triggersOf(spec);
    const expectedCount = spec.count ?? 1;
    const requiredMode = spec.required ?? 'if-triggered';
    const allowRepeat = input.allowRepeat.includes(name);
    const matching = input.events.filter((e) => e.name === name);

    const build = (trigger: ActionTrigger, events: TrackingEvent[], action: ActionRecord | undefined, triggered: boolean): EventValidation => {
      const required = requiredMode === true || (triggered && requiredMode !== false);
      const issues: Issue[] = [];
      if (events.length === 0) {
        if (required) {
          issues.push({
            kind: 'MISSING_EVENT',
            severity: requiredMode === 'warn-if-missing' ? 'WARNING' : 'FAIL',
            expected: `${expectedCount} × ${name}`,
            actual: 'none',
            message: action ? `${action.label}: expected ${name} but no ${name} event was captured` : `expected ${name} but it was never captured`,
          });
        }
      } else if (events.length > expectedCount && !allowRepeat) {
        issues.push({
          kind: 'DUPLICATE_EVENT',
          severity: 'FAIL',
          expected: expectedCount,
          actual: events.length,
          message: `${action ? `${action.label}: ` : ''}${name} fired ${events.length}× (expected ${expectedCount}) — duplicate tracking event`,
        });
      }
      events.forEach((e, idx) => {
        const evAction = action ?? (e.actionId ? actionsById.get(e.actionId) : undefined);
        const payloadIssues = validatePayload(e.payload, spec.fields ?? {}, {
          roots: input.roots,
          extrasRoot: input.extrasRoot,
          strict: input.strict || !!spec.strict,
          context: input.contextFor(e, evAction),
          identity: input.identityFor(e),
        });
        for (const i of payloadIssues) {
          if (events.length > 1) i.message = `[#${idx + 1}] ${i.message}`;
          issues.push(i);
        }
      });
      let status: Status = severityToStatus(issues);
      if (events.length === 0 && !issues.length) status = 'SKIPPED';
      return {
        tracker: input.tracker,
        event: name,
        checkId: spec.checkId,
        actionId: action?.id,
        actionLabel: action?.label,
        trigger,
        expectedCount,
        actualCount: events.length,
        required,
        status,
        eventIds: events.map((e) => e.id),
        issues,
      };
    };

    if (triggers.includes('any')) {
      out.push(build('any', matching, undefined, true));
      continue;
    }
    if (triggers.includes('lead')) {
      out.push(build('lead', matching, undefined, input.leadStageReached));
      continue;
    }
    for (const action of input.actions) {
      const fires = triggers.includes(action.trigger) || (triggers.includes('page_load') && action.navigated);
      if (!fires) continue;
      const events = matching.filter((e) => e.actionId === action.id);
      // A navigation inside an action (e.g. a CTA that leads to the quiz) must produce a page_view
      // but it is not a duplicate of the action's own event.
      out.push(build(triggers.includes(action.trigger) ? action.trigger : 'page_load', events, action, true));
    }
    // Events of this name that fired on actions that should not produce them.
    const expectedActionIds = new Set(out.filter((v) => v.event === name && v.tracker === input.tracker).map((v) => v.actionId));
    const stray = matching.filter((e) => !expectedActionIds.has(e.actionId));
    if (stray.length) {
      const v = build(triggers[0], stray, undefined, false);
      v.actionLabel = 'outside expected actions';
      v.expectedCount = 0;
      v.required = false;
      v.issues.unshift({
        kind: 'VALUE_MISMATCH',
        severity: 'INFO',
        message: `${name} also fired ${stray.length}× on other actions (${[...new Set(stray.map((s) => s.actionId ?? 'n/a'))].join(', ')})`,
      });
      v.status = severityToStatus(v.issues);
      out.push(v);
    }
  }
  return out;
}

function signature(e: TrackingEvent): string {
  return safeStringify(e.payload, undefined).replace(/"(messageId|timestamp|sentAt|receivedAt|gtm\.uniqueEventId|eventId|event_id)":"?[^",}]*"?,?/g, '');
}

export interface DuplicateFinding {
  tracker: string;
  event: string;
  count: number;
  actionId?: string;
  eventIds: string[];
  withinMs: number;
}

/**
 * Identical events (same tracker, name and payload minus volatile ids) within `windowMs`.
 * Catches duplicates of events that have no explicit spec.
 */
export function findIdenticalDuplicates(events: TrackingEvent[], windowMs: number, ignore: (e: TrackingEvent) => boolean): DuplicateFinding[] {
  const groups = new Map<string, TrackingEvent[]>();
  for (const e of events) {
    if (ignore(e)) continue;
    const key = `${e.tracker}|${e.name}|${e.pageUrl ?? ''}|${signature(e)}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  const out: DuplicateFinding[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.ts - b.ts);
    let cluster: TrackingEvent[] = [list[0]];
    const flush = () => {
      if (cluster.length > 1) {
        out.push({
          tracker: cluster[0].tracker,
          event: cluster[0].name,
          count: cluster.length,
          actionId: cluster[0].actionId,
          eventIds: cluster.map((c) => c.id),
          withinMs: cluster[cluster.length - 1].ts - cluster[0].ts,
        });
      }
    };
    for (const e of list.slice(1)) {
      if (e.ts - cluster[0].ts <= windowMs) cluster.push(e);
      else {
        flush();
        cluster = [e];
      }
    }
    flush();
  }
  return out;
}

/**
 * quiz_data step continuity: event[i].current_step == event[i-1].next_step and
 * event[i].previous_step == event[i-1].current_step.
 */
export function validateQuizSequence(events: TrackingEvent[], roots: string[]): Issue[] {
  const issues: Issue[] = [];
  const get = (e: TrackingEvent, f: string) => {
    const r = resolveField(e.payload, f, [], roots);
    return r.found ? r.value : undefined;
  };
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const prevNext = get(prev, 'next_step');
    const prevCur = get(prev, 'current_step');
    const curCur = get(cur, 'current_step');
    const curPrev = get(cur, 'previous_step');
    const eq = (a: unknown, b: unknown) => String(a) === String(b);
    if (prevNext !== undefined && prevNext !== null && curCur !== undefined && !eq(prevNext, curCur)) {
      issues.push({
        kind: 'SEQUENCE_MISMATCH',
        severity: 'FAIL',
        field: 'current_step',
        expected: prevNext,
        actual: curCur,
        message: `quiz_data #${i + 1} (${cur.actionId}): current_step=${String(curCur)} but previous event announced next_step=${String(prevNext)}`,
      });
    }
    if (curPrev !== undefined && curPrev !== null && prevCur !== undefined && !eq(curPrev, prevCur)) {
      issues.push({
        kind: 'SEQUENCE_MISMATCH',
        severity: 'FAIL',
        field: 'previous_step',
        expected: prevCur,
        actual: curPrev,
        message: `quiz_data #${i + 1} (${cur.actionId}): previous_step=${String(curPrev)} but previous event had current_step=${String(prevCur)}`,
      });
    }
  }
  return issues;
}
