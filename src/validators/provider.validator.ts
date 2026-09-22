import type { CallProvider } from '../config/tracking.config';
import type { RunState } from '../core/run-state';
import type { ActionRecord, CheckResult } from '../core/types';
import { shortUrl, truncate } from '../core/utils';

/**
 * Evidence tiers, strongest first:
 *  - runtime: seen in real traffic/state (payloads, dataLayer, _rgba_tags, storage, globals, URLs)
 *  - config:  rendered page configuration (HTML, __NEXT_DATA__, RSC/JSON responses)
 *  - bundle:  only in JS source code (templates often contain code paths for both providers)
 */
export type EvidenceTier = 'runtime' | 'config' | 'bundle';

export interface KeyOccurrence {
  key: string;
  tier: EvidenceTier;
  source: string;
  value?: string | number | boolean | null;
  hasValue: boolean;
}

export const PROVIDER_KEYS: Record<Exclude<CallProvider, 'none'>, { zip: string; id: string; flag: string }> = {
  ringba: { zip: 'ringba_zip', id: 'ringbaScriptId', flag: 'callRingba' },
  callgrid: { zip: 'collectedzipcode', id: 'callgridCampaignSourceId', flag: 'callCallgrid' },
};

const TIER_RANK: Record<EvidenceTier, number> = { runtime: 0, config: 1, bundle: 2 };
const MAX_PER_SOURCE = 5;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find `key: value` / `"key":"value"` / `key=value` assignments (also inside escaped RSC strings). */
export function scanText(text: string, key: string, tier: EvidenceTier, source: string): KeyOccurrence[] {
  const out: KeyOccurrence[] = [];
  if (!text.includes(key)) return out;
  const unescaped = text.includes('\\"') ? text.replace(/\\\\"/g, '"').replace(/\\"/g, '"') : text;
  const k = escapeRe(key);
  // [^?&] prefix: query-string pairs are handled below (their values are always strings).
  const assign = new RegExp(`(?:^|[^\\w$?&])["']?${k}["']?\\s*(?::|=(?!=))\\s*("([^"\\n]{0,200})"|'([^'\\n]{0,200})'|(true|false|null|-?\\d+(?:\\.\\d+)?)\\b|([A-Za-z_$][\\w$.]{0,80}))`, 'g');
  let m: RegExpExecArray | null;
  while ((m = assign.exec(unescaped)) && out.length < MAX_PER_SOURCE) {
    let value: KeyOccurrence['value'];
    let hasValue = true;
    if (m[2] !== undefined) value = m[2];
    else if (m[3] !== undefined) value = m[3];
    // Zero-padded numbers (ZIP 01234) stay strings.
    else if (m[4] !== undefined) value = m[4] === 'true' ? true : m[4] === 'false' ? false : m[4] === 'null' ? null : /^-?0\d/.test(m[4]) ? m[4] : Number(m[4]);
    else hasValue = false; // assigned from an expression / variable
    out.push({ key, tier, source, value, hasValue });
  }
  // query-string style key=value
  const qs = new RegExp(`[?&]${k}=([^&#"'\\s]*)`, 'g');
  while ((m = qs.exec(unescaped)) && out.length < MAX_PER_SOURCE) {
    out.push({ key, tier, source, value: safeDecode(m[1]), hasValue: true });
  }
  if (!out.length && new RegExp(`["'\`]${k}["'\`]|\\b${k}\\b`).test(unescaped)) {
    out.push({ key, tier, source, hasValue: false });
  }
  return out;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Structured search: object keys equal to `key`, plus key=value inside string values. */
export function scanObject(obj: unknown, key: string, tier: EvidenceTier, source: string, depth = 0, out: KeyOccurrence[] = []): KeyOccurrence[] {
  if (depth > 10 || out.length >= MAX_PER_SOURCE || obj === null || obj === undefined) return out;
  if (typeof obj === 'string') {
    if (obj.includes(key)) out.push(...scanText(obj, key, tier, source).slice(0, MAX_PER_SOURCE - out.length));
    return out;
  }
  if (typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    for (const v of obj) scanObject(v, key, tier, source, depth + 1, out);
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k === key) {
      const primitive = v === null || ['string', 'number', 'boolean'].includes(typeof v);
      out.push({ key, tier, source, value: primitive ? (v as KeyOccurrence['value']) : undefined, hasValue: primitive });
    } else {
      scanObject(v, key, tier, source, depth + 1, out);
    }
  }
  return out;
}

/**
 * Split HTML into page configuration (markup, JSON scripts, Next.js RSC payloads) and inline
 * JavaScript. Inline JS is code, not configuration: templates often carry both providers' paths.
 */
export function splitHtml(html: string): { config: string; code: string } {
  const config: string[] = [];
  const code: string[] = [];
  const markup = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_m, attrs: string, body: string) => {
    if (/type=["']?application\/(ld\+)?json|id=["']?__NEXT_DATA__/i.test(attrs) || body.includes('self.__next_f.push')) config.push(body);
    else code.push(body);
    return '';
  });
  return { config: [markup, ...config].join('\n'), code: code.join('\n') };
}

/** Scans everything the run observed for a key. Results are cached per key. */
export class KeyScanner {
  private cache = new Map<string, KeyOccurrence[]>();

  constructor(
    private readonly run: RunState,
    private readonly actions: ActionRecord[],
  ) {}

  find(key: string): KeyOccurrence[] {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const out: KeyOccurrence[] = [];
    const run = this.run;

    // runtime
    for (const e of run.events) scanObject(e.payload, key, 'runtime', `${e.tracker} ${e.name} (${e.actionId ?? e.id})`, 0, out);
    for (const p of run.dataLayer) if (!p.eventName) scanObject(p.data, key, 'runtime', `${p.global} push (${p.actionId ?? p.id})`, 0, out);
    for (const r of run.network) {
      if (r.url.includes(key)) out.push(...scanText(r.url, key, 'runtime', `request URL ${shortUrl(r.url, 80)}`));
      if (r.postDataJson !== undefined) scanObject(r.postDataJson, key, 'runtime', `request body ${shortUrl(r.url, 80)}`, 0, out);
      else if (r.postData?.includes(key)) out.push(...scanText(r.postData, key, 'runtime', `request body ${shortUrl(r.url, 80)}`));
    }
    for (const s of run.storageSnapshots) {
      for (const area of ['localStorage', 'sessionStorage'] as const) {
        for (const [k, v] of Object.entries(s[area])) {
          if (k === key) out.push({ key, tier: 'runtime', source: `${area} (${s.origin})`, value: v, hasValue: true });
          else if (v.includes(key)) out.push(...scanText(v, key, 'runtime', `${area}.${k} (${s.origin})`));
        }
      }
      for (const c of s.cookies) if (c.name === key) out.push({ key, tier: 'runtime', source: `cookie (${c.domain})`, value: safeDecode(c.value), hasValue: true });
    }
    scanObject(run.globals, key, 'runtime', 'window globals', 0, out);

    // config
    for (const d of run.domSnapshots) {
      if (d.nextData?.includes(key)) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(d.nextData);
        } catch {
          parsed = d.nextData;
        }
        scanObject(parsed, key, 'config', `__NEXT_DATA__ (${shortUrl(d.url, 60)})`, 0, out);
      }
    }
    const seenHtml = new Set<string>();
    for (const a of this.actions) {
      if (a.domHtml && a.domHtml.includes(key) && !seenHtml.has(a.pageUrlAfter)) {
        seenHtml.add(a.pageUrlAfter);
        const parts = splitHtml(a.domHtml);
        out.push(...scanText(parts.config, key, 'config', `DOM ${a.id} (${shortUrl(a.pageUrlAfter, 60)})`));
        out.push(...scanText(parts.code, key, 'bundle', `inline script ${a.id} (${shortUrl(a.pageUrlAfter, 60)})`));
      }
    }
    for (const b of run.bodies) {
      if (!b.body.includes(key)) continue;
      if (/html/i.test(b.contentType)) {
        const parts = splitHtml(b.body);
        out.push(...scanText(parts.config, key, 'config', `document ${shortUrl(b.url, 80)}`));
        out.push(...scanText(parts.code, key, 'bundle', `inline script ${shortUrl(b.url, 80)}`));
      } else out.push(...scanText(b.body, key, b.tier, `${b.tier === 'bundle' ? 'JS bundle' : 'response'} ${shortUrl(b.url, 80)}`));
    }

    // dedupe (same tier/source/value)
    const seen = new Set<string>();
    const deduped = out.filter((o) => {
      const sig = `${o.tier}|${o.source}|${String(o.value)}|${o.hasValue}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
    deduped.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
    this.cache.set(key, deduped);
    return deduped;
  }

  strongest(key: string): EvidenceTier | undefined {
    return this.find(key)[0]?.tier;
  }

  /** Best literal value (runtime first). */
  value(key: string): KeyOccurrence | undefined {
    return this.find(key).find((o) => o.hasValue && o.value !== undefined);
  }
}

export function describeOccurrences(occ: KeyOccurrence[], max = 6, mask?: (k: string, v: unknown) => unknown): string[] {
  return occ.slice(0, max).map((o) => {
    const v = o.hasValue ? ` = ${truncate(JSON.stringify(mask ? mask(o.key, o.value) : o.value) ?? 'undefined', 60)}` : '';
    return `[${o.tier}] ${o.key}${v} — ${o.source}`;
  });
}

/**
 * Cross-provider safety: the configured provider must not use the other provider's keys.
 * Runtime/config evidence of a foreign key = FAIL. Bundle-only = INFO (shared template code).
 */
export function providerSafetyCheck(provider: CallProvider, scanner: KeyScanner): CheckResult {
  if (provider === 'none') {
    return { id: 'PROVIDER-001', title: 'Provider-specific key safety', group: 'PROVIDER', status: 'SKIPPED', message: 'no call-tracking provider configured' };
  }
  const own = PROVIDER_KEYS[provider];
  const otherName = provider === 'ringba' ? 'callgrid' : 'ringba';
  const other = PROVIDER_KEYS[otherName];
  const details: string[] = [];
  const failures: string[] = [];
  const infos: string[] = [];
  for (const [role, key] of Object.entries(other) as Array<[keyof typeof other, string]>) {
    const occ = scanner.find(key);
    const strong = occ.filter((o) => o.tier !== 'bundle');
    if (strong.length) {
      // callRingba:false on a CallGrid site is fine - only truthy flags / real values count.
      const meaningful = role === 'flag' ? strong.filter((o) => o.value === true || !o.hasValue) : strong;
      if (meaningful.length) {
        failures.push(
          `${otherName}-specific ${role === 'zip' ? 'ZIP key' : role === 'id' ? 'ID key' : 'flag'} "${key}" is used although the provider is ${provider} (expected "${own[role]}")`,
        );
        details.push(...describeOccurrences(meaningful, 3));
      }
    } else if (occ.length) {
      infos.push(`"${key}" appears only in JS bundle source (shared template code) — not used at runtime`);
    }
  }
  if (failures.length) {
    return {
      id: 'PROVIDER-001',
      title: 'Provider-specific key safety',
      group: 'PROVIDER',
      status: 'FAIL',
      message: failures.join('; '),
      expected: `${provider} keys only: ${Object.values(own).join(', ')}`,
      actual: failures.length === 1 ? failures[0] : failures,
      classification: 'PROVIDER KEY MISMATCH',
      details,
    };
  }
  return {
    id: 'PROVIDER-001',
    title: 'Provider-specific key safety',
    group: 'PROVIDER',
    status: 'PASS',
    message: `no ${otherName}-specific keys used on a ${provider} site`,
    details: infos,
  };
}
