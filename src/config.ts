import * as fs from 'fs';
import * as path from 'path';

export interface SiteConfig {
  name: string;
  url: string;
  /**
   * Values typed into quiz inputs. `question` is a regex tested against the field (label,
   * placeholder, name, autocomplete, type) first, then against the question text; first match wins.
   */
  inputs: Array<{ question: string; value: string }>;
  /**
   * Fixed answers for choice questions (e.g. to stay qualified); otherwise "Yes" or the first
   * option is picked. `question` and `answer` are regexes: { question: 'coverage', answer: 'medicare' }.
   */
  answers: Array<{ question: string; answer: string }>;
  /** Regex on the page URL that means the quiz is finished. */
  congratsPattern: string;
  /** dataLayer event Google Ads converts on; must be pushed on the congrats page. */
  leadEvent: string;
  pabblyPattern: string;
  /**
   * Voluum custom domain: a button or link to it = Voluum integrated.
   * Empty (default) = track.<site domain> or gotrack.<site domain>.
   */
  voluumHostPattern: string;
  voluumScriptPattern: string;
  jitsuScriptPattern: string;
  maxSteps: number;
}

export type SiteConfigInput = Partial<SiteConfig> & { url: string };

/** Birth year used for date-of-birth and age questions. */
export const BIRTH_YEAR = 1965;

export const DEFAULTS: Omit<SiteConfig, 'name' | 'url'> = {
  inputs: [
    { question: 'zip|postal', value: '54321' },
    // Date of birth: month and day before "born", which all three questions can contain.
    { question: '\\bmonth\\b|\\bmm\\b|bday-month', value: '01' },
    { question: '\\bday\\b|\\bdd\\b|bday-day', value: '15' },
    { question: 'year|born|birth|bday|dob|\\bage\\b|how old', value: String(BIRTH_YEAR) },
    { question: 'e-?mail', value: 'qa.test@example.com' },
    { question: 'phone|mobile|cell|\\btel\\b', value: '2025550123' },
    { question: 'first|given-name', value: 'Test' },
    { question: 'last|surname|family-name', value: 'Qa' },
    { question: 'name', value: 'Test Qa' },
    { question: 'address|street', value: '123 Main St' },
    { question: 'city|address-level2', value: 'Springfield' },
    { question: 'state|address-level1', value: 'FL' },
    { question: 'income|salary|earn', value: '30000' },
    { question: 'household|people|members|how many', value: '2' },
  ],
  answers: [],
  congratsPattern: 'congrat|thank',
  leadEvent: 'Lead',
  pabblyPattern: 'save-quiz-module-submission',
  voluumHostPattern: '',
  voluumScriptPattern: '/d/\\.js(\\?|$)',
  jitsuScriptPattern: '(adstiacms|jitsu)[^/]*/p\\.js(\\?|$)',
  maxSteps: 30,
};

export function defineSiteConfig(config: SiteConfigInput): SiteConfigInput {
  return config;
}

/** A full config from user input: defaults + site rules, Voluum domain derived from the URL. */
export function makeSite(input: SiteConfigInput & { name?: string }): SiteConfig {
  const cfg: SiteConfig = {
    ...DEFAULTS,
    name: input.name || new URL(input.url).hostname.replace(/^www\./, ''),
    ...input,
    // Site rules first, so a site can override a default input value.
    inputs: [...(input.inputs ?? []), ...DEFAULTS.inputs],
  };
  if (!cfg.voluumHostPattern) {
    const root = new URL(cfg.url).hostname.split('.').slice(-2).join('\\.');
    cfg.voluumHostPattern = `^(go)?track\\.${root}$`;
  }
  return cfg;
}

export const SITES_DIR = path.resolve(__dirname, '../configs/sites');

/** Every config in configs/sites/ (files starting with "_" are ignored). */
export function loadSites(): SiteConfig[] {
  if (!fs.existsSync(SITES_DIR)) return [];
  return fs
    .readdirSync(SITES_DIR)
    .filter((f) => /\.(ts|js|json)$/.test(f) && !f.startsWith('_'))
    .map((f) => {
      const file = path.join(SITES_DIR, f);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = f.endsWith('.json') ? JSON.parse(fs.readFileSync(file, 'utf8')) : require(file);
      const input = (mod.default ?? mod) as SiteConfigInput;
      return makeSite({ name: f.replace(/\.(ts|js|json)$/, ''), ...input });
    });
}
