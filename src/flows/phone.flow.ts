import type { ActionRecord, ElementInfo } from '../core/types';
import { maskPhone } from '../core/mask';
import { normalizePhone } from '../core/utils';
import type { FlowSession } from './session';

function pickPhone(links: ElementInfo[]): ElementInfo | undefined {
  const visible = links.filter((l) => l.visible && l.enabled);
  // Prefer a link in the main content over a header/footer one.
  return visible.find((l) => !l.inHeader) ?? visible[0];
}

/**
 * Find the tel: CTA, click it once and let the action lifecycle collect the Jitsu
 * phone_number_click / GTM phoneNumberClick / Ringba activity it produces.
 */
export async function runPhoneFlow(s: FlowSession, opts: { returnUrl?: string } = {}): Promise<ActionRecord | undefined> {
  const { cfg } = s;
  if (cfg.expected.phoneTracking.enabled === false) {
    s.note('Phone: SKIPPED — disabled by configuration');
    return undefined;
  }
  let dom = await s.inspect();
  let link = pickPhone(dom?.phoneLinks ?? []);

  if (!link && opts.returnUrl && cfg.expected.cta.returnForPhone && s.page.url() !== opts.returnUrl) {
    const hadPhone = s.run.domSnapshots.some((d) => d.url === opts.returnUrl && d.phoneLinks.some((l) => l.visible));
    if (hadPhone) {
      await s.perform('navigation', 'Return to lander for phone CTA', { pageUrl: opts.returnUrl }, async () => {
        await s.page.goto(opts.returnUrl!, { waitUntil: 'domcontentloaded', timeout: cfg.timeouts.navigation });
      });
      dom = await s.inspect();
      link = pickPhone(dom?.phoneLinks ?? []);
    }
  }

  if (!link) {
    s.note(`Phone: ${cfg.expected.phoneTracking.enabled === true ? 'FAIL' : 'SKIPPED'} — no visible <a href="tel:"> element present`);
    return undefined;
  }
  const phoneRaw = link.text;
  const phone = normalizePhone(/\d{3}.*\d{4}/.test(phoneRaw) ? phoneRaw : link.href);
  return s.perform(
    'phone_click',
    `Click phone ${maskPhone(phone)}`,
    { phone, phoneRaw, phoneHref: link.href, pageUrl: s.page.url() },
    async (action) => {
      await s.click(link!, action);
    },
    { element: link },
  );
}
