import { expect, test } from '@playwright/test';
import { compareToBaseline } from '../../src/validators/baseline.validator';

test('baseline diffs are classified, volatile values are EXPECTED', () => {
  const baseline = { event: 'cta_click', properties: { cta_text: 'Get Quote', session_id: 's1', plan: 'A', count: 1, gone: true }, context: { page: { url: 'https://a.test' } } };
  const actual = { event: 'cta_click', properties: { cta_text: 'Get Started', session_id: 's2', plan: 'B', count: '1', extra: 1 }, context: { page: { url: 'https://b.test' } } };
  const diffs = Object.fromEntries(compareToBaseline(baseline, actual).map((d) => [d.path, d.classification]));
  expect(diffs['properties.cta_text']).toBe('EXPECTED');
  expect(diffs['properties.session_id']).toBe('EXPECTED');
  expect(diffs['context.page.url']).toBe('EXPECTED');
  expect(diffs['properties.plan']).toBe('VALUE MISMATCH');
  expect(diffs['properties.count']).toBe('TYPE MISMATCH');
  expect(diffs['properties.gone']).toBe('MISSING');
  expect(diffs['properties.extra']).toBe('ADDITIONAL');
});

test('custom ignorePaths make a difference EXPECTED', () => {
  const d = compareToBaseline({ properties: { plan: 'A' } }, { properties: { plan: 'B' } }, ['properties\\.plan$']);
  expect(d[0].classification).toBe('EXPECTED');
});
