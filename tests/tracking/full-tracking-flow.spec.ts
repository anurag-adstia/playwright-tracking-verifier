import * as fs from 'fs';
import { describeChecks, expect, test } from '../fixtures/tracking.fixture';

describeChecks('Page & DOM', ['PAGE-001', 'DOM-001', 'DOM-002', 'DOM-003', 'QUIZ-001']);
describeChecks('Phone', ['PHONE-001', 'PHONE-002']);
describeChecks('Application storage', ['STORAGE-001', 'STORAGE-002', 'STORAGE-003', 'STORAGE-004', 'STORAGE-005']);
describeChecks('Provider', ['PROVIDER-000', 'PROVIDER-001']);
describeChecks('Console & baseline', ['CONSOLE-001', 'BASELINE-001']);

test.describe('Full tracking flow', () => {
  test('overall result is not FAIL', async ({ trackingReport }) => {
    test.skip(!trackingReport, 'No tracking run: set TRACKING_URL or TRACKING_CONFIG');
    const r = trackingReport!;
    const failures = r.failures.map((f) => `${f.id}: ${f.message}`).join('\n');
    expect(r.status, `Report: ${r.artifacts.html}\n${failures}`).not.toBe('FAIL');
  });

  test('every acceptance question is answered without FAIL', async ({ trackingReport }) => {
    test.skip(!trackingReport, 'No tracking run: set TRACKING_URL or TRACKING_CONFIG');
    for (const a of trackingReport!.answers) {
      expect.soft(a.status, `${a.question} → ${a.answer}`).not.toBe('FAIL');
    }
  });

  test('report artifacts were written', async ({ trackingReport }) => {
    test.skip(!trackingReport, 'No tracking run: set TRACKING_URL or TRACKING_CONFIG');
    expect(fs.existsSync(trackingReport!.artifacts.html)).toBe(true);
    expect(fs.existsSync(trackingReport!.artifacts.json)).toBe(true);
  });
});
