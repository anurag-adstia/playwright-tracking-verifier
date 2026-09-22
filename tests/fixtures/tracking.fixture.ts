import * as fs from 'fs';
import * as path from 'path';
import { expect, test as base } from '@playwright/test';
import { loadConfigFile, resolveConfig } from '../../src/config/config.loader';
import type { SiteConfig, SiteConfigInput } from '../../src/config/tracking.config';
import type { CheckResult } from '../../src/core/types';
import type { RunReport } from '../../src/reports/report.types';

/** The tracking run happens once (tracking.setup.ts); every spec reads its report from here. */
export const RESULT_FILE = path.resolve(__dirname, '../../test-results/.tracking-run.json');

/**
 * Site under test, from the environment:
 *   TRACKING_URL=https://…   TRACKING_CONFIG=<file|site-name>   TRACKING_TYPE=quiz   TRACKING_PROVIDER=ringba
 */
export async function configFromEnv(): Promise<SiteConfig | undefined> {
  const { TRACKING_URL: url, TRACKING_CONFIG: config, TRACKING_TYPE: type, TRACKING_PROVIDER: provider, TRACKING_HEADED: headed } = process.env;
  if (!url && !config) return undefined;
  const input: SiteConfigInput = config ? await loadConfigFile(config) : {};
  return resolveConfig(input, { url, type, provider, headed: headed === '1' || headed === 'true' });
}

export const test = base.extend<object, { trackingReport: RunReport | null }>({
  trackingReport: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(fs.existsSync(RESULT_FILE) ? (JSON.parse(fs.readFileSync(RESULT_FILE, 'utf8')) as RunReport) : null);
    },
    { scope: 'worker' },
  ],
});
export { expect };

export function explain(c: CheckResult): string {
  return [
    `${c.id} ${c.title}: ${c.status} — ${c.message}`,
    c.expected !== undefined ? `expected: ${JSON.stringify(c.expected)}` : '',
    c.actual !== undefined ? `actual:   ${JSON.stringify(c.actual)}` : '',
    c.classification ? `class:    ${c.classification}` : '',
    ...(c.details ?? []).slice(0, 12),
    c.evidence?.length ? `evidence: ${c.evidence.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** One Playwright test per check ID. FAIL fails the test; SKIPPED skips it; WARNING is annotated. */
export function describeChecks(group: string, ids: string[]): void {
  test.describe(group, () => {
    for (const id of ids) {
      test(id, async ({ trackingReport }) => {
        test.skip(!trackingReport, 'No tracking run: set TRACKING_URL or TRACKING_CONFIG');
        const c = trackingReport!.checks.find((x) => x.id === id);
        test.skip(!c, `${id} not produced in this run`);
        test.skip(c!.status === 'SKIPPED', c!.message);
        if (c!.status === 'WARNING') test.info().annotations.push({ type: 'warning', description: c!.message });
        expect(c!.status, explain(c!)).not.toBe('FAIL');
      });
    }
  });
}
