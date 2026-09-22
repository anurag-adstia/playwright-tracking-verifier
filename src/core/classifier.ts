import type { ClassifierRule, TrackerId } from '../config/tracking.config';
import type { ConsoleCategory } from './types';

/** Configurable URL → category classifier. First matching rule wins. */
export class RequestClassifier {
  private readonly rules: Array<{ category: string; re: RegExp }>;

  constructor(rules: ClassifierRule[]) {
    this.rules = rules.map((r) => ({ category: r.category, re: new RegExp(r.pattern, 'i') }));
  }

  classify(url: string): string {
    for (const r of this.rules) if (r.re.test(url)) return r.category;
    return 'OTHER';
  }
}

export const CATEGORY_TRACKER: Record<string, TrackerId> = {
  GTM: 'gtm',
  JITSU: 'jitsu',
  CLARITY: 'clarity',
  RINGBA: 'ringba',
  CALLGRID: 'callgrid',
};

const TRACKER_KEYWORDS: Array<[TrackerId, RegExp]> = [
  ['gtm', /googletagmanager|gtm\.js|\bGTM-[A-Z0-9]+|dataLayer|\bgtag\b|google_tag_manager/i],
  ['jitsu', /jitsu|adstiacms|__eventn/i],
  ['clarity', /clarity/i],
  ['ringba', /ringba|_rgba/i],
  ['callgrid', /callgrid/i],
];

/** Console noise that is never a tracking failure. */
const BENIGN = [
  /Failed to launch 'tel:/i,
  /scheme does not have a registered handler/i,
  /favicon\.ico/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /\[HMR\]/i,
];

const APP_WARNINGS = [/largest contentful paint|LCP|next\/image|Image with src|priority property/i, /hydrat/i, /preload(ed)? .* not used/i];

export function trackerForText(...texts: Array<string | undefined>): TrackerId | undefined {
  const joined = texts.filter(Boolean).join(' ');
  for (const [id, re] of TRACKER_KEYWORDS) if (re.test(joined)) return id;
  return undefined;
}

export interface ConsoleClassification {
  category: ConsoleCategory;
  tracker?: TrackerId;
  blocking: boolean;
}

/**
 * TRACKING    - error/warning attributable to a tracker (blocking only for errors)
 * APPLICATION - page/JS errors unrelated to tracking
 * NETWORK     - failed requests unrelated to tracking
 * WARNING     - console warnings (Next.js image/LCP warnings land here)
 * INFO        - logs and benign noise
 */
export function classifyConsole(type: string, text: string, location?: string, requestCategory?: string): ConsoleClassification {
  if (BENIGN.some((re) => re.test(text))) return { category: 'INFO', blocking: false };

  if (type === 'requestfailed') {
    const tracker = requestCategory ? CATEGORY_TRACKER[requestCategory] : trackerForText(location);
    // ERR_ABORTED is what Chrome reports for beacons/requests cancelled by navigation.
    const aborted = /ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(text);
    if (tracker) return { category: 'TRACKING', tracker, blocking: !aborted };
    return { category: aborted ? 'INFO' : 'NETWORK', blocking: false };
  }

  const tracker = trackerForText(text, location);
  if (type === 'error' || type === 'pageerror' || type === 'assert') {
    if (/Failed to load resource|net::ERR_/i.test(text)) {
      if (tracker) return { category: 'TRACKING', tracker, blocking: !/ERR_ABORTED/.test(text) };
      return { category: 'NETWORK', blocking: false };
    }
    if (tracker) return { category: 'TRACKING', tracker, blocking: true };
    return { category: 'APPLICATION', blocking: false };
  }
  if (type === 'warning') {
    if (tracker && !APP_WARNINGS.some((re) => re.test(text))) return { category: 'TRACKING', tracker, blocking: false };
    return { category: 'WARNING', blocking: false };
  }
  return { category: 'INFO', tracker, blocking: false };
}
