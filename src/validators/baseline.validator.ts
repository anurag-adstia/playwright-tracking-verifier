import * as fs from 'fs';
import * as path from 'path';
import type { TrackingEvent } from '../core/types';
import { flatten, looseEquals, typeOf } from '../core/utils';

export type DiffClass = 'EXPECTED' | 'UNEXPECTED' | 'MISSING' | 'ADDITIONAL' | 'TYPE MISMATCH' | 'VALUE MISMATCH';

export interface BaselineDiff {
  path: string;
  classification: DiffClass;
  baseline?: unknown;
  actual?: unknown;
  baselineType?: string;
  actualType?: string;
}

export interface BaselineComparison {
  event: string;
  file: string;
  tracker?: string;
  eventId?: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'INFO';
  diffs: BaselineDiff[];
}

/** Values that legitimately differ between sites/runs. Compared by type only. */
export const DEFAULT_VOLATILE = [
  '(^|\\.)(timestamp|sentAt|receivedAt|messageId|writeKey|requestId)$',
  '(^|\\.)(anonymousId|anonymous_id|userId|user_id|session_id|sessionId|groupId)$',
  '(^|\\.)(path|url|referrer|referring_domain|host|search|title|finalUrl|domainName|domainSlug|domain|hostname|href)$',
  '(^|\\.)campaign(\\.|$)',
  '(^|\\.)(phone|phone_number|cta_text|view_type)$',
  '(^|\\.)(current_step|previous_step|next_step|step|question_key|question_type|question|answer_value|answer)$',
  '(^|\\.)(ip|userAgent|locale|screen|screenResolution|device|browser|os|encoding|library)(\\.|$)',
  '(^|\\.)clientIds(\\.|$)',
  '(^|\\.)traits(\\.|$)',
  '(^|\\.)(gtm\\.uniqueEventId|gtm\\.start)$',
  '(^|\\.)(age|beneficiary|zip|zipcode|ringba_zip|collectedzipcode)$',
];

export function compareToBaseline(baseline: unknown, actual: unknown, ignorePaths: string[] = []): BaselineDiff[] {
  const volatile = [...DEFAULT_VOLATILE, ...ignorePaths].map((p) => new RegExp(p));
  const isVolatile = (p: string) => volatile.some((re) => re.test(p));
  const b = flatten(baseline);
  const a = flatten(actual);
  const diffs: BaselineDiff[] = [];
  for (const [p, bv] of Object.entries(b)) {
    if (!(p in a)) {
      // Array element count differences are not individually interesting.
      diffs.push({ path: p, classification: 'MISSING', baseline: bv, baselineType: typeOf(bv) });
      continue;
    }
    const av = a[p];
    const bt = typeOf(bv);
    const at = typeOf(av);
    if (bt !== at && !(bt === 'null' || at === 'null')) {
      diffs.push({ path: p, classification: 'TYPE MISMATCH', baseline: bv, actual: av, baselineType: bt, actualType: at });
    } else if (!looseEquals(av, bv)) {
      diffs.push({ path: p, classification: isVolatile(p) ? 'EXPECTED' : 'VALUE MISMATCH', baseline: bv, actual: av, baselineType: bt, actualType: at });
    }
  }
  for (const [p, av] of Object.entries(a)) {
    if (!(p in b)) diffs.push({ path: p, classification: 'ADDITIONAL', actual: av, actualType: typeOf(av) });
  }
  return diffs;
}

export function loadBaselines(dir: string): Map<string, { file: string; payload: unknown }> {
  const out = new Map<string, { file: string; payload: unknown }>();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const file = path.join(dir, f);
    try {
      out.set(f.replace(/\.json$/, ''), { file, payload: JSON.parse(fs.readFileSync(file, 'utf8')) });
    } catch {
      out.set(f.replace(/\.json$/, ''), { file, payload: undefined });
    }
  }
  return out;
}

/**
 * Baseline file name = event name (e.g. page_view.json, ctaButtonClick.json).
 * The first captured event of that name is compared. Differences never require identical
 * payloads: volatile values are EXPECTED; MISSING/TYPE/VALUE MISMATCH are WARNING (FAIL if strict).
 */
export function runBaseline(dir: string, events: TrackingEvent[], opts: { strict?: boolean; ignorePaths?: string[] }): BaselineComparison[] {
  const baselines = loadBaselines(dir);
  const results: BaselineComparison[] = [];
  const serious = opts.strict ? 'FAIL' : 'WARNING';
  for (const [name, { file, payload }] of baselines) {
    const actual = events.find((e) => e.name === name && e.tracker === 'jitsu') ?? events.find((e) => e.name === name);
    if (payload === undefined) {
      results.push({ event: name, file, status: 'WARNING', diffs: [{ path: '(file)', classification: 'UNEXPECTED', baseline: 'invalid JSON' }] });
      continue;
    }
    if (!actual) {
      results.push({ event: name, file, status: serious, diffs: [{ path: '(event)', classification: 'MISSING', baseline: name, actual: 'event not captured in this run' }] });
      continue;
    }
    const diffs = compareToBaseline(payload, actual.payload, opts.ignorePaths);
    const bad = diffs.some((d) => d.classification === 'MISSING' || d.classification === 'TYPE MISMATCH' || d.classification === 'VALUE MISMATCH');
    results.push({ event: name, file, tracker: actual.tracker, eventId: actual.id, status: bad ? serious : diffs.length ? 'INFO' : 'PASS', diffs });
  }
  return results;
}

/** Save the first payload of each tracked event as a baseline (for --save-baseline). */
export function saveBaselines(dir: string, events: TrackingEvent[], trackers = ['jitsu', 'gtm']): string[] {
  fs.mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  for (const tracker of trackers) {
    for (const e of events.filter((x) => x.tracker === tracker)) {
      if (tracker === 'gtm' && /^gtm\./.test(e.name)) continue;
      const file = path.join(dir, `${e.name}.json`);
      if (written.includes(file)) continue;
      fs.writeFileSync(file, JSON.stringify(e.payload, null, 2));
      written.push(file);
    }
  }
  return written;
}
