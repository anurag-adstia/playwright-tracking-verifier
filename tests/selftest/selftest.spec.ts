import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from '@playwright/test';
import { main } from '../../src/cli';
import { resolveConfig } from '../../src/config/config.loader';
import type { Status } from '../../src/core/types';
import type { RunReport } from '../../src/reports/report.types';
import { runTracking } from '../../src/runner';
import { MOCK_ROUTES, startMockSite } from './mock-site/server';
import { SCENARIOS, withBase } from './scenarios';

/**
 * End-to-end self-test of the framework: real Jitsu loader + library, mock GTM/Clarity/Ringba,
 * served offline. Each scenario asserts the exact verdicts the framework must reach.
 */
test.describe.configure({ mode: 'parallel' });

const REPORTS = path.resolve(__dirname, '../../test-results/selftest-reports');

async function run(name: keyof typeof SCENARIOS): Promise<RunReport> {
  const site = await startMockSite();
  try {
    const cfg = resolveConfig(withBase(SCENARIOS[name], site.baseUrl, REPORTS));
    const r = await runTracking(cfg, { routes: MOCK_ROUTES, quiet: true });
    test.info().annotations.push({ type: 'report', description: r.report.artifacts.html });
    return r.report;
  } finally {
    await site.close();
  }
}

function expectStatuses(r: RunReport, expected: Record<string, Status>): void {
  for (const [id, status] of Object.entries(expected)) {
    const c = r.checks.find((x) => x.id === id);
    expect.soft(c?.status, `${id}: ${c?.message}\n${(c?.details ?? []).slice(0, 8).join('\n')}`).toBe(status);
  }
}

test('good lander → PASS with every tracker verified', async () => {
  const r = await run('lander');
  expectStatuses(r, {
    'PAGE-001': 'PASS',
    'GTM-001': 'PASS',
    'GTM-002': 'PASS',
    'GTM-003': 'PASS',
    'GTM-004': 'PASS',
    'GTM-005': 'PASS',
    'GTM-006': 'PASS',
    'GTM-007': 'PASS',
    'GTM-008': 'PASS',
    'JITSU-001': 'PASS',
    'JITSU-002': 'PASS',
    'JITSU-003': 'PASS',
    'JITSU-004': 'PASS',
    'JITSU-005': 'SKIPPED',
    'JITSU-006': 'SKIPPED',
    'JITSU-008': 'PASS',
    'JITSU-009': 'PASS',
    'JITSU-010': 'PASS',
    'JITSU-011': 'PASS',
    'JITSU-012': 'PASS',
    'CLARITY-001': 'PASS',
    'CLARITY-002': 'PASS',
    'CLARITY-003': 'PASS',
    'CLARITY-004': 'PASS',
    'CLARITY-005': 'PASS',
    'RINGBA-001': 'SKIPPED',
    'CALLGRID-001': 'SKIPPED',
    'PHONE-001': 'PASS',
    'PHONE-002': 'PASS',
    'STORAGE-001': 'PASS',
    'STORAGE-002': 'PASS',
    'STORAGE-003': 'PASS',
    'STORAGE-004': 'PASS',
    'STORAGE-005': 'PASS',
    'DOM-001': 'PASS',
  });
  expect(r.status).toBe('PASS');
  expect(r.exitCode).toBe(0);
  // the LCP warning is a console WARNING, not a tracking failure
  expect(r.consoleErrors.find((c) => /LCP/.test(c.text))?.category).toBe('WARNING');
  // utm params reached context.campaign (utm_campaign → name)
  const pv = r.events.find((e) => e.tracker === 'jitsu' && e.name === 'page_view')!.payload as { context: { campaign: Record<string, string> } };
  expect(pv.context.campaign).toMatchObject({ source: 'qa', name: 'selftest' });
  // evidence and report files
  for (const f of ['report.html', 'report.json', 'network/requests.json', 'console/console.json', 'payloads/ACTION-CTA-001.json', 'storage/ACTION-PAGE-001.json']) {
    expect(fs.existsSync(path.join(r.artifacts.dir, f)), f).toBe(true);
  }
  // phone is masked in the written report
  expect(fs.readFileSync(r.artifacts.json, 'utf8')).not.toContain('"phone": "8002650896"');
});

test('broken lander → every planted defect is detected and explained', async () => {
  const r = await run('landerBroken');
  expectStatuses(r, {
    'GTM-002': 'FAIL', // wrong container
    'GTM-004': 'FAIL', // ctaButtonClick ×2
    'GTM-005': 'FAIL',
    'GTM-006': 'FAIL', // console error from GTM tag
    'GTM-008': 'FAIL', // phoneNumberClick without data.user_id
    'JITSU-004': 'FAIL', // cta_click ×2 with wrong cta_text
    'JITSU-008': 'FAIL', // wrong phone
    'JITSU-009': 'FAIL',
    'JITSU-011': 'FAIL', // numeric session_id
    'JITSU-012': 'FAIL',
    'CLARITY-001': 'FAIL', // required but absent
    'PHONE-002': 'FAIL',
  });
  expect(r.status).toBe('FAIL');
  expect(r.exitCode).toBe(1);
  const dup = r.checks.find((c) => c.id === 'JITSU-009')!;
  expect(dup).toMatchObject({ expected: 1, actual: 2, classification: 'DUPLICATE EVENT', actionId: 'ACTION-CTA-001' });
  const phone = r.checks.find((c) => c.id === 'PHONE-002')!;
  expect(phone).toMatchObject({ expected: '******0896', actual: '******1234' });
  expect(phone.evidence).toContain('payloads/ACTION-PHONE-001.json');
  expect(r.duplicates.length).toBeGreaterThanOrEqual(2);
  expect(r.missing.find((m) => m.event === 'cta_click')).toBeUndefined();
});

test('Ringba ChatQuiz → quiz steps, ZIP, lead, congrats Ringba and phone verified', async () => {
  const r = await run('ringbaQuiz');
  expectStatuses(r, {
    'QUIZ-001': 'PASS',
    'JITSU-003': 'PASS',
    'JITSU-005': 'PASS',
    'JITSU-006': 'PASS',
    'JITSU-007': 'PASS',
    'JITSU-008': 'PASS',
    'JITSU-012': 'PASS',
    'RINGBA-001': 'PASS',
    'RINGBA-002': 'PASS',
    'RINGBA-003': 'PASS',
    'RINGBA-004': 'PASS',
    'RINGBA-005': 'PASS',
    'RINGBA-QUIZ-001': 'PASS',
    'RINGBA-QUIZ-002': 'PASS',
    'RINGBA-QUIZ-003': 'PASS',
    'RINGBA-QUIZ-004': 'PASS',
    'PROVIDER-000': 'PASS',
    'PROVIDER-001': 'PASS',
    'CALLGRID-001': 'SKIPPED',
  });
  expect(r.failures).toEqual([]);
  expect(r.flow).toMatchObject({ quizSteps: 3, zipSubmitted: true, quizCompleted: true, phoneClicked: true });
  expect(r.actions.map((a) => a.id)).toEqual(['ACTION-PAGE-001', 'ACTION-QUIZ-001', 'ACTION-QUIZ-002', 'ACTION-QUIZ-003', 'ACTION-ZIP-001', 'ACTION-PHONE-001']);
});

test('CallGrid ChatQuiz → collectedzipcode, campaign source and callCallgrid verified', async () => {
  const r = await run('callgridQuiz');
  expectStatuses(r, {
    'CALLGRID-001': 'PASS',
    'CALLGRID-002': 'PASS',
    'CALLGRID-003': 'PASS',
    'CALLGRID-004': 'PASS',
    'CALLGRID-005': 'PASS',
    'PROVIDER-001': 'PASS',
    'RINGBA-QUIZ-001': 'SKIPPED',
    'JITSU-006': 'PASS',
  });
  expect(r.failures).toEqual([]);
});

test('CallGrid ChatQuiz using ringba_zip → provider safety FAIL', async () => {
  const r = await run('callgridQuizBad');
  expectStatuses(r, { 'CALLGRID-002': 'FAIL', 'PROVIDER-001': 'FAIL' });
  const c = r.checks.find((x) => x.id === 'CALLGRID-002')!;
  expect(c).toMatchObject({ expected: 'collectedzipcode', actual: 'ringba_zip', classification: 'PROVIDER KEY MISMATCH' });
  expect(r.exitCode).toBe(1);
});

test('CLI exit codes: 2 for bad config, 1 for tracking failure, 0 for pass', async () => {
  const site = await startMockSite();
  fs.mkdirSync(REPORTS, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(REPORTS, 'cli-'));
  const log = console.log;
  console.log = () => undefined;
  try {
    expect(await main(['--bogus'])).toBe(2);
    expect(await main(['--config=does-not-exist'])).toBe(2);
    expect(await main(['--url=ftp://nope'])).toBe(2);
    const plain = `${site.baseUrl}/plain`;
    expect(await main([`--url=${plain}`, `--out=${tmp}`])).toBe(0);
    const failing = path.join(tmp, 'gtm-required.json');
    fs.writeFileSync(failing, JSON.stringify({ name: 'gtm-required', url: plain, tracking: { gtm: true } }));
    expect(await main([`--config=${failing}`, `--out=${tmp}`])).toBe(1);
  } finally {
    console.log = log;
    await site.close();
  }
});
