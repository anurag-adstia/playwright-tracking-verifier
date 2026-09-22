import { defineSiteConfig } from '../../src/config/tracking.config';

/**
 * ChatQuiz with Ringba on the congrats page:
 *   ringba_zip · ringbaScriptId · callRingba: true · <Script id="ringba-script-med"> · <PushDataToRingbaTags />
 */
export default defineSiteConfig({
  name: 'example-chatquiz-ringba',
  url: 'https://example-quiz.com/quiz',
  type: 'chatquiz',

  tracking: { gtm: true, jitsu: true, clarity: true },

  expected: {
    gtmContainerId: 'GTM-XXXXXXX',
    callTracking: { provider: 'ringba' },
    ringba: {
      id: 'CA0000000000000000000000000000000',
      pagePattern: '/congrats', // Ringba script must load on the congrats page
      expectedTagKeys: ['ringba_zip'], // keys PushDataToRingbaTags must push into window._rgba_tags
    },
    quiz: {
      zip: { required: true, value: '33101' },
      lead: { expected: true }, // lead_submit must fire when the quiz completes
      completeUrlPattern: '/congrats',
      // Force specific answers where the default (first option) would disqualify the user:
      answers: [
        { question: 'medicare', answer: '^yes' },
        { question: 'age', answer: '65' },
      ],
    },
    phoneTracking: { enabled: true },
  },

  // Only needed when the heuristics can't find the quiz elements:
  // selectors: { quizContainer: '#chat', quizAnswer: '.answer-btn', quizQuestion: '.bot-message', zipInput: 'input[name=zip]' },
});
