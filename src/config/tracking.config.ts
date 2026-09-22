/**
 * Configuration model for the tracking verifier.
 *
 * A site config (configs/sites/*.ts|json) is a *partial* SiteConfigInput. It is deep-merged
 * over DEFAULT_CONFIG by the loader, so a site only states what differs from the standard
 * Next.js lander / ChatQuiz template.
 */

export type SiteType = 'lander' | 'quiz' | 'chatquiz';
export type SiteTypeOption = SiteType | 'auto';
export type CallProvider = 'ringba' | 'callgrid' | 'none';
export type CallProviderOption = CallProvider | 'auto';

/** true = required (FAIL if missing), false = disabled (SKIPPED), 'auto' = validate if detected. */
export type TrackerToggle = boolean | 'auto';
export type TrackerId = 'gtm' | 'jitsu' | 'clarity' | 'ringba' | 'callgrid';
export const TRACKER_IDS: TrackerId[] = ['gtm', 'jitsu', 'clarity', 'ringba', 'callgrid'];

export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'any';

/** Values captured from the real user action that payload fields can be compared with. */
export type ContextKey =
  | 'ctaText'
  | 'phone'
  | 'pagePath'
  | 'pageUrl'
  | 'answerText'
  | 'answerValue'
  | 'questionText'
  | 'zip'
  | 'host';

/**
 * - page_load:   initial navigation (and full / client-side navigations)
 * - cta_click:   primary CTA clicked
 * - quiz_answer: one quiz answer selected
 * - zip_submit:  ZIP entered and submitted
 * - lead:        quiz completed / lead form submitted (event may fire on any action after that)
 * - phone_click: tel: link clicked
 * - any:         must appear somewhere in the run
 */
export type ActionTrigger = 'page_load' | 'cta_click' | 'quiz_answer' | 'zip_submit' | 'lead' | 'phone_click' | 'any';

export interface FieldSpec {
  /** Accepted type(s). Default 'any'. */
  type?: FieldType | FieldType[];
  /** Default true. Optional fields only produce WARNINGs when empty. */
  required?: boolean;
  /** Alternative paths to try when the primary path is absent (e.g. `user_id` for `userId`). */
  aliases?: string[];
  equals?: unknown;
  oneOf?: unknown[];
  /** Regex the stringified value must match. */
  pattern?: string;
  /** Value must correspond to the real action (e.g. cta_text == clicked CTA text). */
  matchesContext?: ContextKey | ContextKey[];
  normalize?: 'text' | 'phone' | 'none';
  /** Name of an `expected.identity` entry: payload value must equal that storage value. */
  identity?: string;
  /** Allow '' for a required field. Default false. */
  allowEmpty?: boolean;
}

/** Shorthand: `'string'` == `{ type: 'string', required: true }`. */
export type FieldRule = FieldType | FieldType[] | FieldSpec;

export interface EventSpec {
  trigger: ActionTrigger | ActionTrigger[];
  /**
   * true: always required. false: validated if seen, never required.
   * 'if-triggered' (default): required whenever the trigger action happened.
   * 'warn-if-missing': like if-triggered but a missing event is a WARNING.
   */
  required?: boolean | 'if-triggered' | 'warn-if-missing';
  /** Expected number of events per triggering action. Default 1. More = duplicate. */
  count?: number;
  fields?: Record<string, FieldRule>;
  /** Check ID used in the report (e.g. JITSU-004). */
  checkId?: string;
  /** Report additional payload fields as FAIL instead of INFO. */
  strict?: boolean;
}

export interface ClassifierRule {
  category: string;
  /** Regex (string) tested against the full request URL. */
  pattern: string;
}

export interface IdentitySpec {
  source: 'localStorage' | 'sessionStorage' | 'cookie';
  key: string;
  /** FAIL if missing. Default false (reported as INFO). */
  required?: boolean;
}

export interface QuizAnswerRule {
  /** Regex matched against the question text. Omit to match any question. */
  question?: string;
  /** Regex (or plain text) matched against answer text. */
  answer: string;
}

export interface SiteConfig {
  name: string;
  url: string;
  type: SiteTypeOption;
  tracking: Record<TrackerId, TrackerToggle>;
  expected: {
    gtm: {
      containerId?: string | string[];
      requireNoscript: boolean;
      events: Record<string, EventSpec>;
      /** Regexes of dataLayer event names that are GTM/gtag internals (never duplicates/missing). */
      internalEvents: string[];
    };
    jitsu: {
      scriptUrl: string;
      endpoint: string;
      events: Record<string, EventSpec>;
      /** Event carrying the ZIP. Omit = any Jitsu event fired on ZIP submit containing the ZIP. */
      zipEvent?: string;
      /** When the URL has utm_* params, verify they arrive in context.campaign. */
      validateCampaign: boolean;
    };
    clarity: {
      projectId?: string;
      /** Accepted collect response statuses. Default: any 2xx. */
      collectStatuses?: number[];
    };
    ringba: {
      id?: string;
      /** Regex of page URLs where the Ringba script must load (e.g. "/congrats"). */
      pagePattern?: string;
      /** Keys expected in window._rgba_tags pushes (e.g. ["ringba_zip"]). */
      expectedTagKeys: string[];
      /** Browser globals worth reporting. Never required unless listed in expectedTagKeys. */
      globals: string[];
    };
    callgrid: {
      campaignSourceId?: string;
      /** Treat "no observable CallGrid activity" as FAIL (true) or WARNING (false). */
      requireActivity: boolean;
    };
    quiz: {
      enabled: boolean | 'auto';
      maxSteps: number;
      answers: QuizAnswerRule[];
      strategy: 'first' | 'last';
      zip: { required: boolean | 'auto'; value: string };
      lead: {
        /** true = lead_submit must fire, 'auto' = WARNING if the quiz completes without it. */
        expected: boolean | 'auto';
        /** Fill personal-info inputs with testData. Off by default: never create real leads by accident. */
        fillForm: boolean;
        testData: Record<string, string>;
      };
      /** Regex: URL that means the quiz is finished (e.g. "/congrats"). */
      completeUrlPattern?: string;
    };
    callTracking: { provider: CallProviderOption };
    phoneTracking: {
      enabled: boolean | 'auto';
      /** Prevent the OS "open dialer" navigation after the click handlers ran. */
      preventNavigation: boolean;
    };
    cta: {
      required: boolean;
      /** Regex overriding the built-in CTA text heuristic. */
      textPattern?: string;
      /** After a CTA navigates away, go back to the lander to test the phone CTA if needed. */
      returnForPhone: boolean;
    };
    identity: Record<string, IdentitySpec>;
  };
  selectors: {
    cta?: string;
    phone?: string;
    zipInput?: string;
    zipSubmit?: string;
    quizContainer?: string;
    quizAnswer?: string;
    quizQuestion?: string;
    quizNext?: string;
    /** Elements that must never be clicked. */
    exclude?: string;
  };
  classifier: ClassifierRule[];
  duplicates: {
    /** How long after the expected events arrive to keep listening for duplicates. */
    windowMs: number;
    /** Event names allowed to fire more than `count` times. */
    allowRepeat: string[];
  };
  timeouts: {
    navigation: number;
    pageLoad: number;
    pageTracking: number;
    action: number;
    quizStep: number;
    /** Idle time that ends the quiz once the ZIP step is done (no new question appears). */
    quizEnd: number;
    clarityCollect: number;
  };
  validation: {
    /** Additional payload fields become FAIL instead of INFO. */
    strictSchema: boolean;
  };
  report: {
    dir: string;
    maskSensitive: boolean;
    screenshots: 'actions' | 'failures' | 'off';
    trace: 'on' | 'off' | 'on-failure';
    domSnapshots: boolean;
  };
  browser: {
    headless: boolean;
    viewport: { width: number; height: number };
    userAgent?: string;
    locale?: string;
    /** Capture same-origin document/script bodies for provider key scanning. */
    captureBodies: boolean;
    maxBodyBytes: number;
  };
  /** Additional query params appended to the URL (e.g. utm_source) for the test visit. */
  query?: Record<string, string>;
}

type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/** What a user writes. `events` may also be given as a list of names (defaults are used). */
export type SiteConfigInput = DeepPartial<Omit<SiteConfig, 'expected'>> & {
  expected?: DeepPartial<Omit<SiteConfig['expected'], 'jitsu' | 'gtm' | 'clarity'>> & {
    /** Shorthand for expected.gtm.containerId. */
    gtmContainerId?: string | string[];
    gtm?: DeepPartial<Omit<SiteConfig['expected']['gtm'], 'events'>> & { events?: Record<string, Partial<EventSpec>> | string[] };
    jitsu?: DeepPartial<Omit<SiteConfig['expected']['jitsu'], 'events'>> & { events?: Record<string, Partial<EventSpec>> | string[] };
    clarity?: DeepPartial<SiteConfig['expected']['clarity']> & { enabled?: boolean };
  };
};

export function defineSiteConfig(config: SiteConfigInput): SiteConfigInput {
  return config;
}

// ---------------------------------------------------------------------------------------------
// Defaults: the standard Adstia Next.js lander / ChatQuiz template
// ---------------------------------------------------------------------------------------------

const ids = {
  session_id: { type: 'string', identity: 'sessionId' },
  userId: { type: 'string', aliases: ['user_id'], identity: 'userId' },
  user_id: { type: 'string', aliases: ['userId'], identity: 'userId' },
} satisfies Record<string, FieldSpec>;

export const DEFAULT_JITSU_EVENTS: Record<string, EventSpec> = {
  page_view: {
    trigger: 'page_load',
    checkId: 'JITSU-003',
    fields: {
      path: { type: 'string', aliases: ['context.page.path'], matchesContext: 'pagePath' },
      session_id: ids.session_id,
      userId: ids.userId,
      anonymousId: { type: 'string', identity: 'anonymousId', required: false },
      'context.page': { type: 'object', required: false },
      'context.campaign': { type: 'object', required: false },
    },
  },
  cta_click: {
    trigger: 'cta_click',
    checkId: 'JITSU-004',
    fields: {
      cta_text: { type: 'string', matchesContext: 'ctaText', normalize: 'text' },
      session_id: ids.session_id,
      userId: ids.userId,
    },
  },
  quiz_data: {
    trigger: 'quiz_answer',
    checkId: 'JITSU-005',
    fields: {
      question_key: 'string',
      question_type: { type: 'string', required: false },
      answer_value: {
        type: ['string', 'number', 'boolean', 'array'],
        matchesContext: ['answerText', 'answerValue'],
        normalize: 'text',
      },
      current_step: ['number', 'string'],
      previous_step: { type: ['number', 'string', 'null'], required: false },
      next_step: { type: ['number', 'string', 'null'], required: false },
      session_id: ids.session_id,
      user_id: ids.user_id,
    },
  },
  lead_submit: {
    trigger: 'lead',
    checkId: 'JITSU-007',
    fields: {
      user_id: ids.user_id,
      session_id: ids.session_id,
      device: { type: 'string', required: false },
      browser: { type: 'string', required: false },
      os: { type: 'string', required: false },
      domainName: { type: 'string', required: false },
      domainSlug: { type: 'string', required: false },
      finalUrl: { type: 'string', required: false },
      screenResolution: { type: 'string', required: false },
      beneficiary: { type: ['string', 'array'], required: false },
      age: { type: ['string', 'number'], required: false },
    },
  },
  phone_number_click: {
    trigger: 'phone_click',
    checkId: 'JITSU-008',
    fields: {
      phone: { type: ['string', 'number'], matchesContext: 'phone', normalize: 'phone' },
      session_id: ids.session_id,
      userId: ids.userId,
    },
  },
};

const gtmIds = {
  'data.session_id': { type: 'string', identity: 'sessionId' },
  'data.user_id': { type: 'string', identity: 'userId' },
  'data.anonymous_id': { type: 'string', identity: 'anonymousId' },
} satisfies Record<string, FieldSpec>;

export const DEFAULT_GTM_EVENTS: Record<string, EventSpec> = {
  ctaButtonClick: {
    trigger: 'cta_click',
    checkId: 'GTM-004',
    fields: {
      'data.cta_text': { type: 'string', matchesContext: 'ctaText', normalize: 'text' },
      ...gtmIds,
    },
  },
  phoneNumberClick: {
    trigger: 'phone_click',
    checkId: 'GTM-008',
    fields: {
      'data.phone': { type: ['string', 'number'], matchesContext: 'phone', normalize: 'phone' },
      ...gtmIds,
    },
  },
};

/** Request classifier. First match wins; anything unmatched is OTHER. */
export const DEFAULT_CLASSIFIER: ClassifierRule[] = [
  { category: 'GTM', pattern: 'googletagmanager\\.com|/gtm\\.js\\?|/ns\\.html\\?id=GTM-' },
  { category: 'GA4', pattern: 'google-analytics\\.com|analytics\\.google\\.com|/g/collect\\?' },
  { category: 'JITSU', pattern: 'jitsu|adstiacms\\.com/(api/s/|p\\.js|s/lib\\.js)|/api/s/(track|page|identify|group)' },
  { category: 'CLARITY', pattern: '(^https?://)?[^/]*clarity\\.ms/' },
  { category: 'RINGBA', pattern: '(^https?://)?[^/]*ringba\\.com/' },
  { category: 'CALLGRID', pattern: '(^https?://)?[^/]*callgrid' },
];

export const DEFAULT_CONFIG: SiteConfig = {
  name: 'adhoc',
  url: '',
  type: 'auto',
  tracking: { gtm: 'auto', jitsu: 'auto', clarity: 'auto', ringba: 'auto', callgrid: 'auto' },
  expected: {
    gtm: {
      requireNoscript: false,
      events: DEFAULT_GTM_EVENTS,
      internalEvents: ['^gtm\\.', '^gtag\\.', '^optimize\\.', '^consent', '^js$', '^config$', '^set$'],
    },
    jitsu: {
      scriptUrl: 'https://adstia-scripts.netlify.app/jitsu-script.js',
      endpoint: 'https://tracking.adstiacms.com/api/s/track',
      events: DEFAULT_JITSU_EVENTS,
      validateCampaign: true,
    },
    clarity: {},
    ringba: {
      expectedTagKeys: [],
      globals: ['_rgba_tags', '_rgba', 'ringba'],
    },
    callgrid: { requireActivity: false },
    quiz: {
      enabled: 'auto',
      maxSteps: 25,
      answers: [],
      strategy: 'first',
      zip: { required: 'auto', value: '90210' },
      lead: {
        expected: 'auto',
        fillForm: false,
        testData: {
          first_name: 'Test',
          last_name: 'Automation',
          email: 'qa.automation@example.com',
          phone: '2025550123',
          age: '65',
        },
      },
    },
    callTracking: { provider: 'auto' },
    phoneTracking: { enabled: 'auto', preventNavigation: true },
    cta: { required: false, returnForPhone: true },
    identity: {
      sessionId: { source: 'sessionStorage', key: 'session_id' },
      userId: { source: 'localStorage', key: 'user_id' },
      anonymousId: { source: 'cookie', key: '__eventn_id' },
    },
  },
  selectors: {},
  classifier: DEFAULT_CLASSIFIER,
  duplicates: { windowMs: 800, allowRepeat: [] },
  timeouts: {
    navigation: 45_000,
    pageLoad: 15_000,
    pageTracking: 8_000,
    action: 6_000,
    quizStep: 8_000,
    quizEnd: 3_000,
    clarityCollect: 10_000,
  },
  validation: { strictSchema: false },
  report: {
    dir: 'reports',
    maskSensitive: true,
    screenshots: 'off',
    trace: 'off',
    domSnapshots: true,
  },
  browser: {
    headless: true,
    viewport: { width: 1366, height: 900 },
    captureBodies: true,
    maxBodyBytes: 3_000_000,
  },
};
