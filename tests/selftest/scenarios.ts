import type { SiteConfigInput } from '../../src/config/tracking.config';

/** Site configs for the mock pages. `url` is a path; the base URL is added at runtime. */
export const SCENARIOS: Record<string, SiteConfigInput> = {
  lander: {
    name: 'mock-lander',
    url: '/lander?utm_source=qa&utm_campaign=selftest',
    type: 'lander',
    tracking: { gtm: true, jitsu: true, clarity: true, ringba: false, callgrid: false },
    expected: {
      gtmContainerId: 'GTM-TEST123',
      clarity: { projectId: 'clar1ty01' },
      callTracking: { provider: 'none' },
      phoneTracking: { enabled: true },
      cta: { required: true },
    },
  },
  landerBroken: {
    name: 'mock-lander-broken',
    url: '/lander-broken',
    type: 'lander',
    tracking: { gtm: true, jitsu: true, clarity: true, ringba: false, callgrid: false },
    expected: {
      gtmContainerId: 'GTM-TEST123',
      callTracking: { provider: 'none' },
      phoneTracking: { enabled: true },
    },
  },
  ringbaQuiz: {
    name: 'mock-chatquiz-ringba',
    url: '/quiz',
    type: 'chatquiz',
    tracking: { gtm: true, jitsu: true, clarity: true },
    expected: {
      gtmContainerId: 'GTM-TEST123',
      callTracking: { provider: 'ringba' },
      ringba: { id: 'CA-TEST-RINGBA', pagePattern: '/congrats', expectedTagKeys: ['ringba_zip'] },
      quiz: { zip: { required: true, value: '33101' }, lead: { expected: true } },
      phoneTracking: { enabled: true },
    },
  },
  callgridQuiz: {
    name: 'mock-chatquiz-callgrid',
    url: '/quiz-callgrid',
    type: 'chatquiz',
    tracking: { gtm: true, jitsu: true, clarity: false },
    expected: {
      callTracking: { provider: 'callgrid' },
      callgrid: { campaignSourceId: 'CG-SRC-777', requireActivity: true },
      quiz: { zip: { required: true, value: '10001' }, lead: { expected: false } },
    },
  },
  callgridQuizBad: {
    name: 'mock-chatquiz-callgrid-wrong-key',
    url: '/quiz-callgrid?bad=1',
    type: 'chatquiz',
    tracking: { gtm: true, jitsu: true, clarity: false },
    expected: {
      callTracking: { provider: 'callgrid' },
      callgrid: { campaignSourceId: 'CG-SRC-777' },
      quiz: { zip: { required: true, value: '10001' }, lead: { expected: false } },
    },
  },
};

export function withBase(input: SiteConfigInput, baseUrl: string, reportDir: string): SiteConfigInput {
  return { ...input, url: baseUrl + input.url, report: { ...(input.report ?? {}), dir: reportDir } };
}
