import { defineSiteConfig } from '../../src/config/tracking.config';

/**
 * Next.js lander: GTM + Jitsu + Clarity, Ringba call tracking, phone CTA.
 * Copy to configs/sites/<name>.ts and run:  npm run tracking -- --site=<name>
 */
export default defineSiteConfig({
  name: 'example-lander-ringba',
  url: 'https://example-lander.com/',
  type: 'lander',

  tracking: {
    gtm: true, // true = required (FAIL if missing), 'auto' = validate if detected, false = skip
    jitsu: true,
    clarity: true,
    ringba: true,
    callgrid: false,
  },

  expected: {
    gtmContainerId: 'GTM-XXXXXXX',
    clarity: { projectId: 'abcd1234' },
    ringba: { id: 'CA0000000000000000000000000000000' },
    callTracking: { provider: 'ringba' },
    phoneTracking: { enabled: true },
    cta: { required: true },
  },

  // Optional: add UTM parameters to the visit; Jitsu page_view must carry them in context.campaign.
  query: { utm_source: 'qa', utm_campaign: 'tracking-verifier' },
});
