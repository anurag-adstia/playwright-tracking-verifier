import * as fs from 'fs';
import * as path from 'path';
import {
  CallProviderOption,
  DEFAULT_CONFIG,
  DEFAULT_GTM_EVENTS,
  DEFAULT_JITSU_EVENTS,
  EventSpec,
  SiteConfig,
  SiteConfigInput,
  SiteTypeOption,
  TRACKER_IDS,
} from './tracking.config';

/** Raised for anything that should exit with code 2. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export const SITES_DIR = path.resolve(__dirname, '../../configs/sites');

export interface CliOverrides {
  url?: string;
  type?: string;
  provider?: string;
  headed?: boolean;
  reportDir?: string;
  zip?: string;
  strict?: boolean;
  trace?: SiteConfig['report']['trace'];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Objects merge recursively, arrays and scalars replace. */
export function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = k in out ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/** `events: ['page_view', 'cta_click']` keeps only those defaults; a record merges per event. */
function resolveEvents(
  defaults: Record<string, EventSpec>,
  input: Record<string, Partial<EventSpec>> | string[] | undefined,
  label: string,
): Record<string, EventSpec> {
  if (input === undefined) return defaults;
  if (Array.isArray(input)) {
    const out: Record<string, EventSpec> = {};
    for (const name of input) {
      out[name] = defaults[name] ?? { trigger: 'any', required: true };
    }
    return out;
  }
  const out: Record<string, EventSpec> = { ...defaults };
  for (const [name, spec] of Object.entries(input)) {
    if (spec === null) {
      delete out[name];
      continue;
    }
    const merged = out[name] ? deepMerge(out[name], spec) : (spec as EventSpec);
    if (!merged.trigger) throw new ConfigError(`${label}.events.${name}: "trigger" is required for custom events`);
    out[name] = merged;
  }
  return out;
}

export function resolveConfig(input: SiteConfigInput, overrides: CliOverrides = {}): SiteConfig {
  const { expected: exp, ...rest } = input;
  const { gtmContainerId, gtm, jitsu, clarity, ...otherExpected } = exp ?? {};
  const { events: gtmEvents, ...gtmRest } = gtm ?? {};
  const { events: jitsuEvents, ...jitsuRest } = jitsu ?? {};
  const { enabled: clarityEnabled, ...clarityRest } = clarity ?? {};

  let cfg = deepMerge(DEFAULT_CONFIG, {
    ...rest,
    expected: { ...otherExpected, gtm: gtmRest, jitsu: jitsuRest, clarity: clarityRest },
  });
  cfg.expected.gtm.events = resolveEvents(DEFAULT_GTM_EVENTS, gtmEvents, 'expected.gtm');
  cfg.expected.jitsu.events = resolveEvents(DEFAULT_JITSU_EVENTS, jitsuEvents, 'expected.jitsu');
  if (gtmContainerId) cfg.expected.gtm.containerId = gtmContainerId;
  if (clarityEnabled !== undefined && input.tracking?.clarity === undefined) {
    cfg.tracking.clarity = clarityEnabled;
  }

  // CLI overrides
  if (overrides.url) cfg.url = overrides.url;
  if (overrides.type) cfg.type = overrides.type as SiteTypeOption;
  if (overrides.provider) cfg.expected.callTracking.provider = overrides.provider as CallProviderOption;
  if (overrides.headed) cfg.browser.headless = false;
  if (overrides.reportDir) cfg.report.dir = overrides.reportDir;
  if (overrides.zip) cfg.expected.quiz.zip.value = overrides.zip;
  if (overrides.strict) cfg.validation.strictSchema = true;
  if (overrides.trace) cfg.report.trace = overrides.trace;

  // A configured call provider implies that provider's tracker is required
  // (unless the user explicitly set it in `tracking`).
  const provider = cfg.expected.callTracking.provider;
  if (provider === 'ringba' && input.tracking?.ringba === undefined) cfg.tracking.ringba = true;
  if (provider === 'callgrid' && input.tracking?.callgrid === undefined) cfg.tracking.callgrid = true;
  if (provider === 'ringba' && input.tracking?.callgrid === undefined) cfg.tracking.callgrid = false;
  if (provider === 'callgrid' && input.tracking?.ringba === undefined) cfg.tracking.ringba = false;
  if (provider === 'none') {
    if (input.tracking?.ringba === undefined) cfg.tracking.ringba = false;
    if (input.tracking?.callgrid === undefined) cfg.tracking.callgrid = false;
  }

  if (!input.name && cfg.url) {
    try {
      cfg = { ...cfg, name: new URL(cfg.url).hostname.replace(/^www\./, '') };
    } catch {
      /* validated below */
    }
  }
  validateConfig(cfg);
  return cfg;
}

export function validateConfig(cfg: SiteConfig): void {
  const errors: string[] = [];
  if (!cfg.url) errors.push('url is required (--url or config.url)');
  else {
    try {
      const u = new URL(cfg.url);
      if (!/^https?:$/.test(u.protocol)) errors.push(`url must be http(s): ${cfg.url}`);
    } catch {
      errors.push(`url is not a valid URL: ${cfg.url}`);
    }
  }
  if (!['lander', 'quiz', 'chatquiz', 'auto'].includes(cfg.type)) {
    errors.push(`type must be lander | quiz | chatquiz | auto (got "${cfg.type}")`);
  }
  if (!['ringba', 'callgrid', 'none', 'auto'].includes(cfg.expected.callTracking.provider)) {
    errors.push(`provider must be ringba | callgrid | none | auto (got "${cfg.expected.callTracking.provider}")`);
  }
  for (const id of TRACKER_IDS) {
    const v = cfg.tracking[id];
    if (v !== true && v !== false && v !== 'auto') errors.push(`tracking.${id} must be true | false | "auto"`);
  }
  for (const rule of cfg.classifier) {
    try {
      new RegExp(rule.pattern);
    } catch (e) {
      errors.push(`classifier pattern for ${rule.category} is not a valid regex: ${(e as Error).message}`);
    }
  }
  const regexes: Array<[string, string | undefined]> = [
    ['expected.ringba.pagePattern', cfg.expected.ringba.pagePattern],
    ['expected.quiz.completeUrlPattern', cfg.expected.quiz.completeUrlPattern],
    ['expected.cta.textPattern', cfg.expected.cta.textPattern],
    ...cfg.expected.quiz.answers.flatMap(
      (a, i) => [[`expected.quiz.answers[${i}].question`, a.question], [`expected.quiz.answers[${i}].answer`, a.answer]] as Array<[string, string | undefined]>,
    ),
  ];
  for (const [label, re] of regexes) {
    if (!re) continue;
    try {
      new RegExp(re, 'i');
    } catch (e) {
      errors.push(`${label} is not a valid regex: ${(e as Error).message}`);
    }
  }
  for (const [tracker, events] of [['gtm', cfg.expected.gtm.events], ['jitsu', cfg.expected.jitsu.events]] as const) {
    for (const [name, spec] of Object.entries(events)) {
      for (const [field, rule] of Object.entries(spec.fields ?? {})) {
        if (typeof rule === 'object' && !Array.isArray(rule) && rule.identity && !cfg.expected.identity[rule.identity]) {
          errors.push(`expected.${tracker}.events.${name}.fields.${field}: unknown identity "${rule.identity}"`);
        }
      }
    }
  }
  if (errors.length) throw new ConfigError(`Invalid configuration:\n  - ${errors.join('\n  - ')}`);
}

/** Load a config module/JSON. Accepts a path, or a site name in configs/sites. */
export async function loadConfigFile(ref: string): Promise<SiteConfigInput> {
  const candidates = [
    path.resolve(ref),
    ...['.ts', '.js', '.json'].map((ext) => path.resolve(ref + ext)),
    ...['.ts', '.js', '.json'].map((ext) => path.join(SITES_DIR, ref + ext)),
    path.join(SITES_DIR, ref),
  ];
  const file = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!file) throw new ConfigError(`Config not found: "${ref}" (looked in ./ and configs/sites/)`);
  try {
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8')) as SiteConfigInput;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(file);
    const cfg = mod.default ?? mod.siteConfig ?? mod.config ?? mod;
    if (!cfg || typeof cfg !== 'object') throw new Error('module must export a config object (default or siteConfig)');
    return cfg as SiteConfigInput;
  } catch (e) {
    throw new ConfigError(`Could not load config ${file}: ${(e as Error).message}`);
  }
}

export function listSiteConfigs(): string[] {
  if (!fs.existsSync(SITES_DIR)) return [];
  return fs
    .readdirSync(SITES_DIR)
    .filter((f) => /\.(ts|js|json)$/.test(f) && !f.startsWith('_'))
    .map((f) => path.join(SITES_DIR, f));
}
