import type { BrowserContext, Request, Response } from '@playwright/test';
import type { SiteConfig } from '../config/tracking.config';
import { RequestClassifier } from '../core/classifier';
import type { Logger } from '../core/logger';
import type { RunState } from '../core/run-state';
import type { NetworkRecord, TrackingEvent } from '../core/types';
import { parseBody, shortUrl } from '../core/utils';

/** Turns a tracking request into zero or more tracking events (provided by tracker adapters). */
export type RequestParser = (rec: NetworkRecord) => Array<Pick<TrackingEvent, 'tracker' | 'name' | 'payload'>>;

const BODY_TYPES = /html|javascript|ecmascript|json|x-component|text\/plain/i;

/**
 * Captures ALL network traffic from before the first navigation, then classifies it.
 * Listeners are on the BrowserContext so popups and navigations are covered.
 */
export class NetworkCollector {
  private readonly byRequest = new WeakMap<Request, NetworkRecord>();
  private readonly pending = new Set<Promise<unknown>>();
  private readonly classifier: RequestClassifier;
  private siteHost = '';

  constructor(
    private readonly run: RunState,
    private readonly cfg: SiteConfig,
    private readonly parsers: RequestParser[],
    private readonly log: Logger,
    private readonly onRequestFailed: (rec: NetworkRecord) => void,
  ) {
    this.classifier = new RequestClassifier(cfg.classifier);
    try {
      this.siteHost = new URL(cfg.url).hostname.replace(/^www\./, '');
    } catch {
      /* validated earlier */
    }
  }

  attach(context: BrowserContext): void {
    context.on('request', (r) => this.onRequest(r));
    context.on('response', (r) => this.onResponse(r));
    context.on('requestfinished', (r) => this.onFinished(r));
    context.on('requestfailed', (r) => this.onFailed(r));
  }

  classify(url: string): string {
    return this.classifier.classify(url);
  }

  /** Wait for in-flight body reads (bounded). */
  async flush(timeoutMs = 3000): Promise<void> {
    await Promise.race([Promise.allSettled([...this.pending]), new Promise((r) => setTimeout(r, timeoutMs))]);
  }

  private track<T>(p: Promise<T>): void {
    this.pending.add(p);
    p.finally(() => this.pending.delete(p)).catch(() => undefined);
  }

  private pageUrlOf(req: Request): string | undefined {
    try {
      return req.frame().page().url();
    } catch {
      return undefined;
    }
  }

  private onRequest(req: Request): void {
    const url = req.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    const category = this.classify(url);
    let frameUrl: string | undefined;
    let isNavigation = false;
    try {
      frameUrl = req.frame().url();
      isNavigation = req.isNavigationRequest();
    } catch {
      /* service worker request */
    }
    const rec: NetworkRecord = {
      id: this.run.nextId('REQ'),
      ts: this.run.now(),
      url,
      method: req.method(),
      resourceType: req.resourceType(),
      category,
      isNavigation,
      pageUrl: this.pageUrlOf(req),
      frameUrl,
    };
    const tracking = category !== 'OTHER';
    if (tracking || req.method() !== 'GET') {
      if (tracking) rec.requestHeaders = req.headers();
      const buf = safe(() => req.postDataBuffer());
      if (buf && buf.length) {
        rec.postDataSize = buf.length;
        const text = buf.toString('utf8');
        // Binary payloads (e.g. Clarity's compressed collect) are recorded by size only.
        const binary = /[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 2000)) || text.includes('�');
        rec.postDataBinary = binary;
        if (!binary) {
          rec.postData = text.length > 200_000 ? text.slice(0, 200_000) : text;
          rec.postDataJson = parseBody(rec.postData);
        }
      }
    }
    this.byRequest.set(req, rec);
    this.run.network.push(rec);
    if (tracking) this.log.debug('NETWORK', `${rec.method} ${category} ${shortUrl(url)}`);

    for (const parse of this.parsers) {
      let parsed: ReturnType<RequestParser> = [];
      try {
        parsed = parse(rec);
      } catch (e) {
        this.log.debug('NETWORK', `parser error for ${shortUrl(url)}: ${(e as Error).message}`);
      }
      for (const ev of parsed) {
        const event: TrackingEvent = {
          id: this.run.nextId('EVT'),
          ts: rec.ts,
          source: 'network',
          requestId: rec.id,
          pageUrl: rec.pageUrl,
          ...ev,
        };
        this.run.events.push(event);
        this.log.debug(ev.tracker.toUpperCase(), `event=${ev.name}`);
      }
    }
    this.run.notify();
  }

  private onResponse(res: Response): void {
    const req = res.request();
    const rec = this.byRequest.get(req);
    if (!rec) return;
    rec.status = res.status();
    rec.statusText = res.statusText();
    rec.responseTs = this.run.now();
    const headers = res.headers();
    const ct = headers['content-type'] ?? '';
    if (rec.category !== 'OTHER' || rec.isNavigation) rec.responseHeaders = headers;
    this.run.notify();

    const wantTrackingBody = rec.category !== 'OTHER' && /json|text/i.test(ct) && rec.resourceType !== 'script';
    // JS bundles are skipped: they only yield 'bundle' evidence, which never decides a check.
    const wantScanBody =
      this.cfg.browser.captureBodies &&
      BODY_TYPES.test(ct) &&
      !/javascript|ecmascript/i.test(ct) &&
      ['document', 'fetch', 'xhr'].includes(rec.resourceType) &&
      this.isSameSite(rec.url) &&
      rec.status < 300;
    if (!wantTrackingBody && !wantScanBody) return;
    const len = Number(headers['content-length'] ?? 0);
    if (len && len > this.cfg.browser.maxBodyBytes) return;

    this.track(
      res
        .body()
        .then((buf) => {
          if (buf.length > this.cfg.browser.maxBodyBytes) return;
          const body = buf.toString('utf8');
          if (wantTrackingBody) rec.responseBody = body.slice(0, 2000);
          if (wantScanBody) this.run.bodies.push({ url: rec.url, contentType: ct, body, tier: 'config' });
        })
        .catch(() => undefined),
    );
  }

  private onFinished(req: Request): void {
    const rec = this.byRequest.get(req);
    if (!rec) return;
    const t = safe(() => req.timing());
    if (t && t.responseEnd >= 0) rec.durationMs = Math.round(t.responseEnd);
  }

  private onFailed(req: Request): void {
    const rec = this.byRequest.get(req);
    if (!rec) return;
    rec.failure = req.failure()?.errorText ?? 'failed';
    this.log.debug('NETWORK', `FAILED ${rec.category} ${shortUrl(rec.url)} ${rec.failure}`);
    this.onRequestFailed(rec);
    this.run.notify();
  }

  private isSameSite(url: string): boolean {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      if (!this.siteHost) return false;
      const base = this.siteHost.split('.').slice(-2).join('.');
      return host === this.siteHost || host.endsWith(`.${base}`) || host === base;
    } catch {
      return false;
    }
  }
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}
