import type { Browser, Page } from '@playwright/test';
import { Capture } from './capture';
import { buildSections } from './checks';
import type { SiteConfig } from './config';
import { walkQuiz } from './flow';
import type { RunResult } from './report';

/**
 * No quiz on the page: say why instead of leaving "no question found". A lander only renders the
 * site (with its CTA to the offer) when the URL carries a real campaign id and the issued vlsid —
 * otherwise it renders the article, which has no quiz.
 */
async function explainNoQuiz(page: Page, url: string): Promise<string[]> {
  const notes: string[] = [];
  const cta = await page
    .evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).href).filter((h) => /\/click(\/|\?|$)/.test(h))[0] ?? '')
    .catch(() => '');
  try {
    const params = new URL(url).searchParams;
    const campaign = ['utm_campaign', 'campaignid'].map((k) => params.get(k)).find((v) => v && /^\d{4,}$/.test(v) && !/^(\d)\1+$/.test(v));
    const vlsid = params.get('vlsid');
    if (/\/landers?\//.test(new URL(url).pathname) && (!campaign || !vlsid)) {
      notes.push(
        `this lander shows its article version: it needs a real campaign id (utm_campaign / campaignid, 4+ digits) and the issued vlsid — this URL has ${campaign ? `campaign ${campaign}` : 'no valid campaign id'} and ${vlsid ? `vlsid ${vlsid}` : 'no vlsid'}`,
      );
    }
  } catch {
    /* not a URL */
  }
  if (cta) notes.push(`this page is a lander: its CTA goes to ${cta} — run the quiz URL behind it to check the quiz trackers`);
  return notes;
}

/** Open the page, walk the quiz to the congrats page, click the phone link, then build the checks. */
export async function runSite(browser: Browser, cfg: SiteConfig, notes: string[] = []): Promise<RunResult> {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true });
  const cap = new Capture();
  // What the run managed to do — an event is only expected when its action happened.
  const facts = { answered: false, congrats: false, leadStage: false, phoneClicked: false };
  try {
    await cap.attach(context, cfg.url);
    const page = await context.newPage();
    await page.goto(cfg.url, { waitUntil: 'load', timeout: 45_000 });
    await cap.scan(page, cfg.voluumHostPattern);

    await walkQuiz(page, cfg, notes);
    await page.waitForLoadState('load').catch(() => undefined);
    facts.answered = notes.some((n) => n.includes('→'));
    if (!facts.answered) notes.push(...(await explainNoQuiz(page, cfg.url)));

    // End of the quiz: a congrats page, a lead_submit event, or the phone number appearing in the
    // chat. Ringba / CallGrid are only injected at that point, so wait for it before judging them.
    const congrats = new RegExp(cfg.congratsPattern, 'i');
    const phoneVisible = async () => (await page.locator('a[href^="tel:"]:visible').count()) > 0;
    const leadStage = async () => congrats.test(page.url()) || cap.requests.some((r) => r.json?.event === 'lead_submit') || (await phoneVisible().catch(() => false));
    const stageEnd = Date.now() + 20_000;
    while (Date.now() < stageEnd && !(await leadStage())) await page.waitForTimeout(500);

    facts.congrats = congrats.test(page.url()) || cap.requests.some((r) => r.json?.event === 'lead_submit');
    facts.leadStage = await leadStage();
    if (facts.leadStage) {
      notes.push(congrats.test(page.url()) ? `reached ${new URL(page.url()).pathname}` : 'reached the end of the quiz (phone number shown)');
      // The provider script is injected now; then it swaps the number in.
      const provider = Date.now() + 15_000;
      while (Date.now() < provider && !cap.requests.some((r) => /ringba\.com|callgrid/i.test(r.url) && r.status)) await page.waitForTimeout(300);
      await page.waitForTimeout(3000);
    } else notes.push('the quiz did not reach the stage where the phone number appears');
    await cap.scan(page, cfg.voluumHostPattern);

    // Phone CTA: the click must send phone_number_click (Jitsu) and phoneNumberClick (GTM).
    if (await cap.clickPhone(page)) {
      facts.phoneClicked = true;
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

  return { site: cfg.name, url: cfg.url, sections: buildSections(cap, cfg, facts), notes };
}
