import type { BrowserContext, Page } from '@playwright/test';
import { buildInstrumentationScript } from '../browser/instrumentation';
import { DATALAYER_STATE_SCRIPT } from '../browser/dom-scripts';
import type { SiteConfig } from '../config/tracking.config';
import type { Logger } from '../core/logger';
import type { RunState } from '../core/run-state';
import type { DataLayerPush } from '../core/types';
import { truncate } from '../core/utils';

export interface TelClick {
  ts: number;
  href: string;
  text: string;
  url: string;
}

const RINGBA_TAGS = '_rgba_tags';

/** origin + pathname: hash/query-only changes are not page navigations. */
export function pathKey(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

/**
 * Streams every dataLayer / _rgba_tags push to Node in real time (see instrumentation.ts) and
 * turns dataLayer entries with an `event` key into GTM tracking events.
 */
export class DataLayerCollector {
  readonly telClicks: TelClick[] = [];
  /** Page URLs on which window.dataLayer was created. */
  readonly dataLayerPages = new Set<string>();

  constructor(
    private readonly run: RunState,
    private readonly cfg: SiteConfig,
    private readonly log: Logger,
  ) {}

  async install(context: BrowserContext): Promise<void> {
    await context.exposeBinding('__tqaEmit', (_source, kind: string, json: string) => {
      try {
        this.handle(kind, JSON.parse(json));
      } catch (e) {
        this.log.debug('DATALAYER', `bad message: ${(e as Error).message}`);
      }
    });
    await context.addInitScript({
      content: buildInstrumentationScript({
        arrayGlobals: ['dataLayer', RINGBA_TAGS],
        preventTel: this.cfg.expected.phoneTracking.preventNavigation,
      }),
    });
  }

  private ts(browserEpoch: number | undefined): number {
    return typeof browserEpoch === 'number' ? browserEpoch - this.run.t0 : this.run.now();
  }

  private handle(kind: string, msg: any): void {
    const ts = this.ts(msg.t);
    if (kind === 'array:init' || kind === 'array:push') {
      const items: unknown[] = kind === 'array:init' ? msg.items : [msg.data];
      if (kind === 'array:init' && msg.global === 'dataLayer' && msg.top) this.dataLayerPages.add(msg.url);
      for (const data of items) this.addPush(msg.global, kind === 'array:init' ? 'initial' : 'push', data, ts, msg.url, msg.top);
    } else if (kind === 'nav') {
      if (!msg.top || (msg.from && pathKey(msg.from) === pathKey(msg.url))) return;
      this.run.navigations.push({ ts, url: msg.url, kind: 'spa' });
      this.log.debug('PAGE', `client-side navigation → ${msg.url}`);
    } else if (kind === 'tel:click') {
      this.telClicks.push({ ts, href: msg.href, text: msg.text, url: msg.url });
    }
    this.run.notify();
  }

  private addPush(global: string, kind: 'initial' | 'push', data: unknown, ts: number, url: string, top: boolean): void {
    const eventName =
      data && typeof data === 'object' && !Array.isArray(data) && typeof (data as any).event === 'string'
        ? ((data as any).event as string)
        : undefined;
    const push: DataLayerPush = {
      id: this.run.nextId('DL'),
      ts,
      global,
      kind,
      pageUrl: url,
      frameUrl: top ? undefined : url,
      data,
      eventName,
    };
    this.run.dataLayer.push(push);

    if (global === 'dataLayer' && eventName) {
      this.run.events.push({ id: this.run.nextId('EVT'), ts, tracker: 'gtm', source: 'datalayer', name: eventName, payload: data, pageUrl: url });
      this.log.debug('DATALAYER', eventName);
    } else if (global === RINGBA_TAGS) {
      this.run.events.push({ id: this.run.nextId('EVT'), ts, tracker: 'ringba', source: 'ringba_tags', name: 'rgba_tag', payload: data, pageUrl: url });
      this.log.debug('RINGBA', `_rgba_tags.push ${truncate(JSON.stringify(data), 140)}`);
    }
  }

  async state(page: Page): Promise<unknown[] | undefined> {
    try {
      return ((await page.evaluate(DATALAYER_STATE_SCRIPT)) as unknown[] | null) ?? undefined;
    } catch {
      return undefined;
    }
  }
}
