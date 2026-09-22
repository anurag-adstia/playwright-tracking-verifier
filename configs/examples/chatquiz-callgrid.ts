import { defineSiteConfig } from '../../src/config/tracking.config';

/**
 * ChatQuiz with CallGrid:  collectedzipcode · callgridCampaignSourceId · callCallgrid: true
 * Any runtime/config use of ringba_zip / ringbaScriptId / callRingba: true is a FAIL (PROVIDER-001).
 */
export default defineSiteConfig({
  name: 'example-chatquiz-callgrid',
  url: 'https://example-quiz.com/chat',
  type: 'chatquiz',

  tracking: { gtm: true, jitsu: true, clarity: 'auto' },

  expected: {
    callTracking: { provider: 'callgrid' },
    callgrid: {
      campaignSourceId: 'CG-SOURCE-ID',
      requireActivity: false, // true = FAIL when no CallGrid traffic/data is observed during the flow
    },
    quiz: { zip: { required: true, value: '10001' } },
    phoneTracking: { enabled: true },
  },
});
