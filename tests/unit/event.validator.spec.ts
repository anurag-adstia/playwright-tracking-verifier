import { expect, test } from '@playwright/test';
import type { EventSpec } from '../../src/config/tracking.config';
import type { ActionRecord, TrackingEvent } from '../../src/core/types';
import { findIdenticalDuplicates, validateEvents, validateQuizSequence } from '../../src/validators/event.validator';

const action = (id: string, kind: ActionRecord['kind'], trigger: ActionRecord['trigger'], startTs: number): ActionRecord => ({
  id,
  kind,
  trigger,
  label: id,
  startTs,
  endTs: startTs + 900,
  pageUrlBefore: 'https://x.test/',
  pageUrlAfter: 'https://x.test/',
  navigated: false,
  context: { ctaText: 'Get Started' },
  status: 'done',
  notes: [],
});
let n = 0;
const ev = (name: string, actionId: string, ts: number, properties: Record<string, unknown> = {}): TrackingEvent => ({
  id: `E${++n}`,
  ts,
  tracker: 'jitsu',
  source: 'network',
  name,
  actionId,
  payload: { event: name, properties },
});

const specs: Record<string, EventSpec> = { cta_click: { trigger: 'cta_click', fields: { cta_text: { type: 'string', matchesContext: 'ctaText' } } } };
const common = { tracker: 'jitsu', specs, leadStageReached: false, roots: ['properties', ''], strict: false, allowRepeat: [], identityFor: () => ({}), contextFor: (_e: TrackingEvent, a?: ActionRecord) => a?.context ?? {} };

test('missing event on a triggering action is a FAIL', () => {
  const actions = [action('ACTION-CTA-001', 'cta_click', 'cta_click', 0)];
  const [v] = validateEvents({ ...common, events: [], actions });
  expect(v.status).toBe('FAIL');
  expect(v.issues[0].kind).toBe('MISSING_EVENT');
});

test('duplicate event on one click is a FAIL', () => {
  const actions = [action('ACTION-CTA-001', 'cta_click', 'cta_click', 0)];
  const events = [ev('cta_click', 'ACTION-CTA-001', 10, { cta_text: 'Get Started' }), ev('cta_click', 'ACTION-CTA-001', 12, { cta_text: 'Get Started' })];
  const [v] = validateEvents({ ...common, events, actions });
  expect(v.issues.map((i) => i.kind)).toContain('DUPLICATE_EVENT');
  expect(v).toMatchObject({ expectedCount: 1, actualCount: 2, status: 'FAIL' });
});

test('allowRepeat suppresses duplicate failures', () => {
  const actions = [action('ACTION-CTA-001', 'cta_click', 'cta_click', 0)];
  const events = [ev('cta_click', 'ACTION-CTA-001', 10, { cta_text: 'Get Started' }), ev('cta_click', 'ACTION-CTA-001', 12, { cta_text: 'Get Started' })];
  const [v] = validateEvents({ ...common, allowRepeat: ['cta_click'], events, actions });
  expect(v.status).toBe('PASS');
});

test('identical unconfigured events inside the window are found', () => {
  const events = [ev('scroll', 'A', 10, { d: 1 }), ev('scroll', 'A', 200, { d: 1 }), ev('scroll', 'A', 5000, { d: 1 })];
  const d = findIdenticalDuplicates(events, 800, () => false);
  expect(d).toHaveLength(1);
  expect(d[0].count).toBe(2);
});

test('quiz step continuity mismatch is explained', () => {
  const events = [
    ev('quiz_data', 'Q1', 1, { current_step: 1, previous_step: null, next_step: 2 }),
    ev('quiz_data', 'Q2', 2, { current_step: 2, previous_step: 1, next_step: 3 }),
    ev('quiz_data', 'Q3', 3, { current_step: 4, previous_step: 2, next_step: 5 }),
  ];
  const issues = validateQuizSequence(events, ['properties', '']);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ kind: 'SEQUENCE_MISMATCH', field: 'current_step', expected: 3, actual: 4 });
});
