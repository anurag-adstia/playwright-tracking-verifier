import { expect, test } from '@playwright/test';
import { verdicts } from '../src/checks';
import { loadSites } from '../src/config';
import { REPORT_PATH } from '../src/reporter';
import { runSite } from '../src/run';

/**
 * One test per site in configs/sites/: walks the quiz, clicks the phone link and checks GTM,
 * Pabbly, Voluum, call tracking (Ringba or CallGrid) and Jitsu.
 * All results go into one report: reports/report.html.
 *   npx playwright test                  every site
 *   npx playwright test -g <site-name>   one site
 * A ❌ fails the test, ⚠️ is added as an annotation.
 */
test.describe.configure({ mode: 'parallel' });

for (const cfg of loadSites()) {
  test(cfg.name, async ({ browser }) => {
    const result = await runSite(browser, cfg);
    await test.info().attach('tracking-result', { body: JSON.stringify(result), contentType: 'application/json' });

    // Ringba and CallGrid count as one requirement: either one integrated correctly is enough.
    for (const v of verdicts(result.sections)) {
      if (v.mark === 'warn') test.info().annotations.push({ type: 'warning', description: v.title });
      expect.soft(v.mark, `${v.title} has a ❌ — see ${REPORT_PATH}`).not.toBe('fail');
    }
  });
}
