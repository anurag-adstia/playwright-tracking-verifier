import * as fs from 'fs';
import * as path from 'path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { renderReport, type RunResult } from './report';

export const REPORT_PATH = path.resolve(__dirname, '../reports/report.html');

/**
 * Collects the result every test attaches ("tracking-result") and writes ONE report for the whole
 * run: reports/report.html (replaced on every run).
 */
export default class TrackingReporter implements Reporter {
  private readonly runs: RunResult[] = [];
  private readonly startedAt = new Date();

  onTestEnd(test: TestCase, result: TestResult): void {
    const a = result.attachments.find((x) => x.name === 'tracking-result' && x.body);
    if (a?.body) this.runs.push(JSON.parse(a.body.toString('utf8')) as RunResult);
    else if (result.status !== 'skipped') {
      this.runs.push({ site: test.title, url: '', sections: [], notes: [], error: result.error?.message?.split('\n')[0] ?? result.status });
    }
  }

  onEnd(): void {
    if (!this.runs.length) return;
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, renderReport(this.runs, this.startedAt));
    console.log(`\nTracking report: ${path.relative(process.cwd(), REPORT_PATH)}\n`);
  }

  printsToStdio(): boolean {
    return false;
  }
}
