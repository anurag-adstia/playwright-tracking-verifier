import type { BrowserContext, Page } from '@playwright/test';

export interface Req {
  ts: number;
  url: string;
  method: string;
  resourceType: string;
  pageUrl: string;
  status?: number;
  failure?: string;
  postData?: string;
  json?: any;
}

export interface Push {
  ts: number;
  global: 'dataLayer' | '_rgba_tags';
  data: any;
  pageUrl: string;
}

export interface PageScan {
  url: string;
  tel: Array<{ href: string; text: string }>;
  links: Array<{ text: string; kind: string; href: string }>;
  /** Ringba / CallGrid <script> tags. */
  scripts: Array<{ id: string; src: string }>;
  /** Voluum runtime: dtpCallback installed, and the click id it stored. */
  dtp: boolean;
  clickId: string | null;
  /** GTM container id the app exposes (layout.tsx: window.cf_variable.GTM_ID). */
  cfGtmId: string | null;
  /** GTM <noscript> fallback (googletagmanager.com/ns.html?id=…). */
  gtmNoscript: string | null;
  /** window.clarity installed by the Clarity tag. */
  clarity: boolean;
  /** Globals the templates install: VoluumScripts, adstiaScripts, jitsu, CallGrid, cf_variable. */
  globals: Record<string, boolean | string>;
  /** localStorage.quizValues — what the quiz stored (ZIP lookup result, answers). */
  quizValues: Record<string, unknown>;
}

export interface PhoneClick {
  ts: number;
  text: string;
  href: string;
  pageUrl: string;
}

/**
 * Records every request (with POST body and status), every dataLayer / _rgba_tags push, and the
 * HTML the server sent for each page (the phone number before Ringba swaps it).
 */
export class Capture {
  readonly requests: Req[] = [];
  readonly pushes: Push[] = [];
  readonly documents = new Map<string, string>();
  /** Script / JSON bodies: the quiz config (ringbaScriptId, callgridCampaignSourceId, pabblyUrl…) is bundled into them. */
  readonly bodies: Array<{ url: string; text: string }> = [];
  readonly scans: PageScan[] = [];
  readonly consoleErrors: string[] = [];
  phoneClick?: PhoneClick;
  cookies: Array<{ name: string; value: string }> = [];
  private siteRoot = '';
  private readonly start = Date.now();
  private readonly pending: Promise<unknown>[] = [];

  /** The site itself (its own chunks), not third-party scripts. */
  private sameSite(url: string): boolean {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      const root = host.split('.').slice(-2).join('.');
      return !!this.siteRoot && (host === this.siteRoot || root === this.siteRoot);
    } catch {
      return false;
    }
  }

  async attach(context: BrowserContext, siteUrl?: string): Promise<void> {
    if (siteUrl) {
      try {
        this.siteRoot = new URL(siteUrl).hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
      } catch {
        /* validated by the caller */
      }
    }
    await context.exposeBinding('__qaPush', ({ frame }, global: Push['global'], json: string) => {
      this.pushes.push({ ts: Date.now() - this.start, global, data: JSON.parse(json), pageUrl: frame.url() });
    });
    await context.addInitScript(INIT_SCRIPT);

    const byReq = new WeakMap<object, Req>();
    context.on('request', (r) => {
      if (/^(data|blob):/.test(r.url())) return;
      const rec: Req = { ts: Date.now() - this.start, url: r.url(), method: r.method(), resourceType: r.resourceType(), pageUrl: safe(() => r.frame().page().url()) ?? '' };
      rec.postData = safe(() => r.postData()) ?? undefined;
      if (rec.postData) rec.json = safe(() => JSON.parse(rec.postData!));
      byReq.set(r, rec);
      this.requests.push(rec);
    });
    context.on('response', (res) => {
      const rec = byReq.get(res.request());
      if (!rec) return;
      rec.status = res.status();
      if (rec.resourceType === 'document' && safe(() => res.request().frame().parentFrame()) === null) {
        this.pending.push(res.text().then((t) => this.documents.set(res.url(), t), () => undefined));
      }
      // The quiz config lives in the page's own JS chunks / JSON; keep them for key lookups.
      if (['script', 'fetch', 'xhr'].includes(rec.resourceType) && this.sameSite(rec.url) && res.status() < 300) {
        this.pending.push(
          res.text().then((t) => {
            if (t.length <= 4_000_000) this.bodies.push({ url: rec.url, text: t });
          }, () => undefined),
        );
      }
    });
    context.on('requestfailed', (r) => {
      const rec = byReq.get(r);
      if (rec) rec.failure = r.failure()?.errorText ?? 'failed';
    });
    context.on('page', (p) => {
      p.on('console', (msg) => msg.type() === 'error' && this.consoleErrors.push(msg.text()));
      p.on('pageerror', (e) => this.consoleErrors.push(e.message));
    });
  }

  /** Clicks the first visible phone link (the init script keeps the dialer from opening). */
  async clickPhone(page: Page): Promise<boolean> {
    const link = page.locator('a[href^="tel:"]:visible').first();
    if (!(await link.count())) return false;
    const [text, href] = await Promise.all([link.innerText().catch(() => ''), link.getAttribute('href').catch(() => '')]);
    this.phoneClick = { ts: Date.now() - this.start, text: text.trim(), href: href ?? '', pageUrl: page.url() };
    await link.click({ timeout: 5000 }).catch(() => link.dispatchEvent('click'));
    return true;
  }

  /**
   * Phone links, Ringba/CallGrid scripts, and buttons / links whose target is on the Voluum domain
   * (`voluumHost`, e.g. track.<domain> or gotrack.<domain>): href, formaction, data-href/url, onclick.
   */
  async scan(page: Page, voluumHost: string): Promise<void> {
    const s = await page
      .evaluate((hostPattern) => {
        const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const txt = (e: Element) => ((e as HTMLElement).innerText || (e as HTMLInputElement).value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
        const host = new RegExp(hostPattern, 'i');
        const targets = (e: Element): string[] => {
          const raw = [
            (e as HTMLAnchorElement).href,
            e.getAttribute('formaction'),
            e.getAttribute('data-href'),
            e.getAttribute('data-url'),
            e.tagName === 'FORM' ? (e as HTMLFormElement).action : null,
            ...(e.getAttribute('onclick') ?? '').match(/https?:\/\/[^'"\s)]+/g) ?? [],
          ];
          return raw.filter((u): u is string => typeof u === 'string' && /^https?:/.test(u));
        };
        const voluum = (u: string) => {
          try {
            return host.test(new URL(u).hostname);
          } catch {
            return false;
          }
        };
        return {
          url: location.href,
          tel: [...document.querySelectorAll('a[href^="tel:"]')].filter(vis).map((a) => ({ href: a.getAttribute('href') ?? '', text: txt(a) })),
          links: [...document.querySelectorAll('a[href], button, [role="button"], input[type="submit"], form[action], [data-href], [data-url], [onclick]')].flatMap((e) =>
            targets(e)
              .filter(voluum)
              .map((href) => {
                const btn = e.tagName !== 'A' || /btn|button/i.test(e.className + (e.getAttribute('role') ?? '')) || !!e.querySelector('button');
                return { text: txt(e), kind: `${e.closest('footer') ? 'footer ' : ''}${btn ? 'button' : 'link'}`, href };
              }),
          ),
          scripts: [...document.querySelectorAll('script')]
            .filter((s) => /ringba|callgrid/i.test(s.id + s.src))
            .map((s) => ({ id: s.id, src: s.getAttribute('src') ?? '' })),
          cfGtmId: (window as unknown as { cf_variable?: { GTM_ID?: string } }).cf_variable?.GTM_ID ?? null,
          gtmNoscript:
            [...document.querySelectorAll('noscript')]
              .map((n) => n.textContent || n.innerHTML)
              .find((t) => /googletagmanager\.com\/ns\.html/.test(t))
              ?.match(/id=(GTM-[\w-]+)/)?.[1] ?? null,
          clarity: typeof (window as unknown as { clarity?: unknown }).clarity === 'function',
          globals: (() => {
            const w = window as unknown as Record<string, any>;
            return {
              VoluumScripts: !!w.VoluumScripts,
              adstiaScripts: !!w.adstiaScripts,
              jitsu: !!w.jitsu,
              CallGrid: typeof w.CallGrid === 'function',
              cf_GTM_ID: w.cf_variable?.GTM_ID ?? '',
              cf_JITSU_EVENT_URL: w.cf_variable?.JITSU_EVENT_URL ?? '',
            };
          })(),
          quizValues: (() => {
            try {
              return JSON.parse(localStorage.getItem('quizValues') || '{}');
            } catch {
              return {};
            }
          })(),
          dtp: typeof (window as unknown as { dtpCallback?: unknown }).dtpCallback === 'function',
          clickId: (() => {
            try {
              return sessionStorage.getItem('clickId');
            } catch {
              return null;
            }
          })(),
        };
      }, voluumHost)
      .catch(() => undefined);
    if (s) this.scans.push(s);
  }

  async finish(context: BrowserContext): Promise<void> {
    await Promise.race([Promise.allSettled(this.pending), new Promise((r) => setTimeout(r, 3000))]);
    this.cookies = (await context.cookies().catch(() => [])).map((c) => ({ name: c.name, value: c.value }));
  }
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

/**
 * Wraps push() of dataLayer and _rgba_tags, even when the page replaces the array or GTM installs
 * its own push that chains to the previous one (the re-entry is recorded once).
 */
const INIT_SCRIPT = `(() => {
  if (window.__qaInstalled) return;
  window.__qaInstalled = true;
  function send(global, v) {
    try { window.__qaPush(global, JSON.stringify(v, (k, x) => typeof x === 'function' ? undefined : (typeof Node !== 'undefined' && x instanceof Node) ? '[Element]' : x)); } catch (e) {}
  }
  function wrap(global, arr) {
    if (!arr || typeof arr !== 'object' || arr.__qa) return;
    try { Object.defineProperty(arr, '__qa', { value: true }); } catch (e) { return; }
    for (var i = 0; i < arr.length; i++) send(global, arr[i]);
    var inner = arr.push, inFlight = [], depth = 0;
    var wrapper = function () {
      var args = Array.prototype.slice.call(arguments);
      if (depth > 0 && args.every(function (a) { return inFlight.indexOf(a) >= 0; })) return Array.prototype.push.apply(this, args);
      args.forEach(function (a) { inFlight.push(a); send(global, a && a.length !== undefined && typeof a !== 'string' ? { __arguments: Array.prototype.slice.call(a) } : a); });
      depth++;
      try { return (inner === wrapper ? Array.prototype.push : inner).apply(this, arguments); }
      finally { depth--; args.forEach(function (a) { var j = inFlight.indexOf(a); if (j >= 0) inFlight.splice(j, 1); }); }
    };
    try {
      Object.defineProperty(arr, 'push', { configurable: true, get: function () { return wrapper; }, set: function (fn) { if (fn !== wrapper) inner = fn; } });
    } catch (e) {}
  }
  ['dataLayer', '_rgba_tags'].forEach(function (global) {
    var current = window[global];
    try { Object.defineProperty(window, global, { configurable: true, get: function () { return current; }, set: function (v) { current = v; wrap(global, v); } }); } catch (e) {}
    if (current) wrap(global, current);
  });
  // Stop tel: links from opening the dialer. Bubble phase on window: the site's handlers run first.
  window.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('a[href^="tel:"]')) e.preventDefault();
  });
})();`;
