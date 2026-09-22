import type { FlowSummary } from '../core/types';
import { runPhoneFlow } from './phone.flow';
import type { FlowSession } from './session';

/**
 * Lander: page_view (already done by the page-load action) → primary CTA → phone CTA.
 * Missing elements are SKIPPED unless configuration marks them required.
 */
export async function runLanderFlow(s: FlowSession, flow: FlowSummary): Promise<void> {
  const landerUrl = s.page.url();
  const dom = s.lastDom ?? (await s.inspect());
  const cta = dom?.ctaCandidates[0];

  if (!cta) {
    s.note(`CTA: ${s.cfg.expected.cta.required ? 'FAIL' : 'SKIPPED'} — no confident CTA element present${s.cfg.selectors.cta ? ` (selector ${s.cfg.selectors.cta})` : ''}`);
  } else {
    const others = dom!.ctaCandidates.slice(1, 4).map((c) => `"${c.text}"`);
    s.log.debug('ACTION', `CTA candidates: "${cta.text}" (score ${cta.score})${others.length ? `, then ${others.join(', ')}` : ''}`);
    await s.perform(
      'cta_click',
      `Click CTA "${cta.text}"`,
      { ctaText: cta.text, pageUrl: s.page.url() },
      async (action) => {
        await s.click(cta, action);
      },
      { element: cta },
    );
    flow.ctaClicked = true;
  }

  const phone = await runPhoneFlow(s, { returnUrl: landerUrl });
  flow.phoneClicked = !!phone;
}
