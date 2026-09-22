import type { Browser } from '@playwright/test';
import { Capture } from './capture';
import { buildSections } from './checks';
import type { SiteConfig } from './config';
import { walkQuiz } from './flow';
import type { RunResult } from './report';

/** Open the page, walk the quiz to the congrats page, click the phone link, then build the checks. */
export async function runSite(browser: Browser, cfg: SiteConfig, notes: string[] = []): Promise<RunResult> {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true });
  const cap = new Capture();
  try {
    await cap.attach(context);
    const page = await context.newPage();
    await page.goto(cfg.url, { waitUntil: 'load', timeout: 45_000 });
    await cap.scan(page, cfg.voluumHostPattern);

    await walkQuiz(page, cfg, notes);
    await page.waitForLoadState('load').catch(() => undefined);
    if (new RegExp(cfg.congratsPattern, 'i').test(page.url())) {
      notes.push(`reached ${new URL(page.url()).pathname}`);
      // Ringba / CallGrid load and swap the number after the congrats page renders.
      const end = Date.now() + 10_000;
      while (Date.now() < end && !cap.requests.some((r) => /ringba\.com|callgrid/i.test(r.url) && r.status)) await page.waitForTimeout(300);
      await page.waitForTimeout(3000);
    }
    await cap.scan(page, cfg.voluumHostPattern);

    // Phone CTA: the click must send phone_number_click (Jitsu) and phoneNumberClick (GTM).
    if (await cap.clickPhone(page)) {
      notes.push(`clicked phone ${cap.phoneClick!.text}`);
      const sent = () =>
        cap.requests.some((r) => r.json?.event === 'phone_number_click') && cap.pushes.some((p) => p.data?.event === 'phoneNumberClick');
      const end = Date.now() + 6000;
      while (Date.now() < end && !sent()) await page.waitForTimeout(300);
      await page.waitForTimeout(800);
    } else notes.push('no visible phone link to click');
    await cap.finish(context);
  } finally {
    await context.close().catch(() => undefined);
  }

  return { site: cfg.name, url: cfg.url, sections: buildSections(cap, cfg), notes };
}
