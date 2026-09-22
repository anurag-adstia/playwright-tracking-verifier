import { expect, test } from '@playwright/test';
import { DEFAULT_JITSU_EVENTS } from '../../src/config/tracking.config';
import { resolveField, validatePayload } from '../../src/validators/payload.validator';

// Shape produced by the real Jitsu p.js for jitsu.track('cta_click', {...})
const jitsuCta = (props: Record<string, unknown>) => ({
  type: 'track',
  event: 'cta_click',
  properties: props,
  userId: null,
  anonymousId: 'anon-1',
  context: { page: { path: '/lander', url: 'https://x.test/lander' }, campaign: {} },
  messageId: 'm1',
  timestamp: '2026-09-18T00:00:00Z',
});

const base = { roots: ['properties', ''], extrasRoot: 'properties', context: { ctaText: 'Get Started' }, identity: { sessionId: 'sess_id_1', userId: 'user_id_1' } };

test('valid cta_click payload has no failures', () => {
  const issues = validatePayload(jitsuCta({ cta_text: 'Get Started', session_id: 'sess_id_1', userId: 'user_id_1' }), DEFAULT_JITSU_EVENTS.cta_click.fields!, base);
  expect(issues.filter((i) => i.severity !== 'INFO')).toEqual([]);
});

test('missing, empty, wrong type, wrong context and identity mismatch are reported', () => {
  const issues = validatePayload(jitsuCta({ cta_text: 'Start Now', session_id: 42, userId: '' }), DEFAULT_JITSU_EVENTS.cta_click.fields!, base);
  const kinds = issues.map((i) => `${i.kind}:${i.field}`);
  expect(kinds).toContain('CONTEXT_MISMATCH:cta_text');
  expect(kinds).toContain('TYPE_MISMATCH:session_id');
  expect(kinds).toContain('EMPTY_VALUE:userId');
});

test('identity mismatch is flagged against storage', () => {
  const issues = validatePayload(jitsuCta({ cta_text: 'Get Started', session_id: 'sess_id_OTHER', userId: 'user_id_1' }), DEFAULT_JITSU_EVENTS.cta_click.fields!, base);
  expect(issues.find((i) => i.kind === 'IDENTITY_MISMATCH')?.field).toBe('session_id');
});

test('additional fields are INFO by default, FAIL in strict mode', () => {
  const payload = jitsuCta({ cta_text: 'Get Started', session_id: 'sess_id_1', userId: 'user_id_1', view_type: 'lander' });
  const info = validatePayload(payload, DEFAULT_JITSU_EVENTS.cta_click.fields!, base);
  expect(info.find((i) => i.kind === 'ADDITIONAL_FIELD')).toMatchObject({ field: 'properties.view_type', severity: 'INFO' });
  const strict = validatePayload(payload, DEFAULT_JITSU_EVENTS.cta_click.fields!, { ...base, strict: true });
  expect(strict.find((i) => i.kind === 'ADDITIONAL_FIELD')?.severity).toBe('FAIL');
});

test('optional missing fields are not failures', () => {
  const issues = validatePayload({ properties: { user_id: 'u', session_id: 's' } }, DEFAULT_JITSU_EVENTS.lead_submit.fields!, { ...base, identity: {} });
  expect(issues.filter((i) => i.severity === 'FAIL')).toEqual([]);
});

test('phone is compared on the last 10 digits', () => {
  const fields = DEFAULT_JITSU_EVENTS.phone_number_click.fields!;
  const ok = validatePayload({ properties: { phone: '+1 (800) 265-0896', session_id: 's', userId: 'u' } }, fields, { ...base, identity: {}, context: { phone: '8002650896' } });
  expect(ok.filter((i) => i.severity === 'FAIL')).toEqual([]);
  const bad = validatePayload({ properties: { phone: '8005551234', session_id: 's', userId: 'u' } }, fields, { ...base, identity: {}, context: { phone: '8002650896' } });
  expect(bad.find((i) => i.kind === 'CONTEXT_MISMATCH')).toMatchObject({ field: 'phone', expected: '8002650896', actual: '8005551234' });
});

test('resolveField prefers a real value under a later root over null', () => {
  const p = { properties: { userId: null }, userId: 'root-user' };
  expect(resolveField(p, 'userId', [], ['properties', ''])).toMatchObject({ found: true, value: 'root-user' });
  expect(resolveField({ properties: { user_id: 'x' } }, 'userId', ['user_id'], ['properties', ''])).toMatchObject({ value: 'x' });
});
