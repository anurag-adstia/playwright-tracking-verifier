import type { Page } from '@playwright/test';
import { STORAGE_SCRIPT } from '../browser/dom-scripts';
import type { RunState } from '../core/run-state';
import type { StorageSnapshot } from '../core/types';
import { originOf } from '../core/utils';

/** localStorage / sessionStorage / cookies (the "Application" panel) for the current page. */
export class StorageCollector {
  constructor(private readonly run: RunState) {}

  async snapshot(page: Page): Promise<StorageSnapshot | undefined> {
    try {
      const [web, cookies] = await Promise.all([
        page.evaluate(STORAGE_SCRIPT) as Promise<{ url: string; origin: string; localStorage: Record<string, string>; sessionStorage: Record<string, string> }>,
        page.context().cookies(page.url()),
      ]);
      const snap: StorageSnapshot = {
        ts: this.run.now(),
        pageUrl: web.url,
        origin: web.origin || originOf(web.url),
        localStorage: web.localStorage,
        sessionStorage: web.sessionStorage,
        cookies: cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          expires: c.expires,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite,
        })),
      };
      this.run.storageSnapshots.push(snap);
      return snap;
    } catch {
      return undefined;
    }
  }
}

/** Read one identity value from a snapshot and normalize it (URL-decoding, JSON quotes). */
export function readIdentity(snap: StorageSnapshot | undefined, source: 'localStorage' | 'sessionStorage' | 'cookie', key: string): string | undefined {
  if (!snap) return undefined;
  let raw: string | undefined;
  if (source === 'cookie') raw = snap.cookies.find((c) => c.name === key)?.value;
  else raw = snap[source][key];
  if (raw === undefined || raw === null) return undefined;
  return normalizeStoredValue(raw);
}

export function normalizeStoredValue(raw: string): string {
  let v = raw;
  try {
    v = decodeURIComponent(v);
  } catch {
    /* keep raw */
  }
  if (/^".*"$/.test(v)) {
    try {
      v = JSON.parse(v);
    } catch {
      /* keep */
    }
  }
  return String(v);
}
