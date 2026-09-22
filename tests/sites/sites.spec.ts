import * as path from 'path';
import { expect, test } from '@playwright/test';
import { listSiteConfigs, loadConfigFile, resolveConfig } from '../../src/config/config.loader';
import { runTracking } from '../../src/runner';

/**
 * One test per site in configs/sites/. Each FAIL check is a soft assertion, so the Playwright
 * report lists every failure; the full tracking report is attached to the test.
 *   npx playwright test                      every site
 *   npx playwright test -g example-com       one site
 */
test.describe.configure({ mode: 'parallel' });

for (const file of listSiteConfigs()) {
  const site = path.basename(file).replace(/\.(ts|js|json)$/, '');

  test(site, async ({ browser }) => {
    const cfg = resolveConfig(await loadConfigFile(file));
    const { report } = await runTracking(cfg, { browser, quiet: true });

    await test.info().attach('tracking-report.html', { path: report.artifacts.html, contentType: 'text/html' });
    test.info().annotations.push({ type: 'report', description: path.relative(process.cwd(), report.artifacts.html) });
    test.info().annotations.push({ type: 'trackers', description: Object.entries(report.trackers).map(([k, v]) => `${k.toUpperCase()} ${v}`).join('  ') });

    for (const c of report.checks) {
      if (c.status === 'WARNING') test.info().annotations.push({ type: `warning ${c.id}`, description: c.message });
      const why = [c.message, c.expected !== undefined && `expected: ${JSON.stringify(c.expected)}`, c.actual !== undefined && `actual: ${JSON.stringify(c.actual)}`].filter(Boolean).join('\n');
      expect.soft(c.status, `${c.id} ${c.title}\n${why}`).not.toBe('FAIL');
    }
  });
}
