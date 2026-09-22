import type { BrowserContext, Page } from '@playwright/test';
import type { ActionTrigger, SiteConfig, TrackerId } from '../config/tracking.config';
import type { DataLayerCollector } from '../collectors/datalayer.collector';
import type { DomCollector } from '../collectors/dom.collector';
import type { StorageCollector } from '../collectors/storage.collector';
import type { Logger } from '../core/logger';
import type { RunState } from '../core/run-state';
import type { ActionContext, ActionKind, ActionRecord, DomSnapshot, ElementInfo } from '../core/types';
import { sleep, truncate } from '../core/utils';
import type { TrackerAdapter } from '../trackers/types';

const PREFIX: Record<ActionKind, string> = {
  page_load: 'PAGE',
  navigation: 'NAV',
  cta_click: 'CTA',
  quiz_answer: 'QUIZ',
  zip_submit: 'ZIP',
  lead_submit: 'LEAD',
  phone_click: 'PHONE',
};

const TRIGGER: Record<ActionKind, ActionTrigger> = {
  page_load: 'page_load',
  navigation: 'page_load',
  cta_click: 'cta_click',
  quiz_answer: 'quiz_answer',
  zip_submit: 'zip_submit',
  lead_submit: 'lead',
  phone_click: 'phone_click',
};

export interface SessionDeps {
  context: BrowserContext;
  run: RunState;
  cfg: SiteConfig;
  log: Logger;
  dom: DomCollector;
  storage: StorageCollector;
  dataLayer: DataLayerCollector;
  trackers: TrackerAdapter[];
}

/**
 * Shared state for the user flows. `perform()` is the action lifecycle:
 * start action → do it → wait (event-based) for the tracking it should produce →
 * short duplicate window → capture evidence (screenshot, storage, dataLayer, DOM).
 */
export class FlowSession {
  page: Page;
  readonly screenshots = new Map<string, Buffer>();
  readonly popups: Page[] = [];
  readonly notes: string[] = [];
  lastDom?: DomSnapshot;
  landerUrl?: string;
  private seq: Partial<Record<string, number>> = {};

  constructor(
    page: Page,
    readonly deps: SessionDeps,
  ) {
    this.page = page;
    // Popups (target=_blank CTAs): continue on the new page.
    deps.context.on('page', (p) => this.popups.push(p));
  }

  get cfg(): SiteConfig {
    return this.deps.cfg;
  }
  get run(): RunState {
    return this.deps.run;
  }
  get log(): Logger {
    return this.deps.log;
  }

  note(msg: string): void {
    this.notes.push(msg);
    this.log.info('ACTION', msg);
  }

  /** Enabled tracker = required by config, or 'auto' and detected so far. */
  trackerActive(id: TrackerId): boolean {
    const toggle = this.cfg.tracking[id];
    if (toggle === false) return false;
    if (toggle === true) return true;
    const t = this.deps.trackers.find((x) => x.id === id);
    return !!t && t.detect({ cfg: this.cfg, run: this.run }).length > 0;
  }

  async inspect(): Promise<DomSnapshot | undefined> {
    const snap = await this.deps.dom.inspect(this.page);
    if (snap) this.lastDom = snap;
    return snap;
  }

  private expectedEvents(trigger: ActionTrigger, navigated: boolean): Array<{ tracker: string; name: string; count: number }> {
    const out: Array<{ tracker: string; name: string; count: number }> = [];
    const add = (tracker: TrackerId, specs: SiteConfig['expected']['jitsu']['events']) => {
      if (!this.trackerActive(tracker)) return;
      for (const [name, spec] of Object.entries(specs)) {
        const triggers = Array.isArray(spec.trigger) ? spec.trigger : [spec.trigger];
        if (spec.required === false) continue;
        if (triggers.includes(trigger) || (navigated && triggers.includes('page_load'))) out.push({ tracker, name, count: 1 });
      }
    };
    add('jitsu', this.cfg.expected.jitsu.events);
    add('gtm', this.cfg.expected.gtm.events);
    return out;
  }

  async perform(
    kind: ActionKind,
    label: string,
    context: ActionContext,
    fn: (action: ActionRecord) => Promise<void>,
    opts: { element?: ElementInfo; waitMs?: number } = {},
  ): Promise<ActionRecord> {
    const prefix = PREFIX[kind];
    this.seq[prefix] = (this.seq[prefix] ?? 0) + 1;
    const id = `ACTION-${prefix}-${String(this.seq[prefix]).padStart(3, '0')}`;
    const startTs = this.run.now();
    const action: ActionRecord = {
      id,
      kind,
      trigger: TRIGGER[kind],
      label,
      startTs,
      endTs: startTs,
      pageUrlBefore: this.page.url(),
      pageUrlAfter: this.page.url(),
      navigated: false,
      context: { ...context },
      element: opts.element,
      status: 'done',
      notes: [],
    };
    this.run.actions.push(action);
    this.log.info('ACTION', `${id} ${label}`);
    const popupsBefore = this.popups.length;

    try {
      await fn(action);
    } catch (e) {
      action.status = 'error';
      action.error = truncate((e as Error).message.split('\n')[0], 300);
      this.log.warn(`${id} failed: ${action.error}`);
    }

    if (this.popups.length > popupsBefore) {
      const popup = this.popups[this.popups.length - 1];
      action.notes.push(`opened a new tab: ${popup.url()}`);
      await popup.waitForLoadState('domcontentloaded', { timeout: this.cfg.timeouts.pageLoad }).catch(() => undefined);
      this.page = popup;
    }

    const fullNav = this.run.navigations.some((n) => n.kind === 'load' && n.ts >= startTs && kind !== 'page_load');
    const spaNav = this.run.navigations.some((n) => n.kind === 'spa' && n.ts >= startTs);
    action.navigated = kind === 'navigation' || fullNav || spaNav;
    if (fullNav || kind === 'page_load' || kind === 'navigation') {
      await this.page.waitForLoadState('load', { timeout: this.cfg.timeouts.pageLoad }).catch(() => action.notes.push('load event did not fire before timeout'));
    }
    if (action.navigated || kind === 'page_load') await this.inspect();

    // Event-based wait: resolve as soon as every expected event is in, or time out.
    const expected = this.expectedEvents(action.trigger, action.navigated && kind !== 'page_load');
    const readiness = kind === 'page_load' || action.navigated ? this.deps.trackers.filter((t) => t.pageLoadReady && this.cfg.tracking[t.id] !== false && t.detect({ cfg: this.cfg, run: this.run }).length > 0) : [];
    const count = (t: string, n: string) => this.run.events.filter((e) => e.tracker === t && e.name === n && e.ts >= startTs).length;
    const timeout = opts.waitMs ?? (kind === 'page_load' || action.navigated ? this.cfg.timeouts.pageTracking : this.cfg.timeouts.action);
    const satisfied = () => expected.every((x) => count(x.tracker, x.name) >= x.count) && readiness.every((t) => t.pageLoadReady!({ cfg: this.cfg, run: this.run }, startTs));
    const ok = await this.run.waitFor(satisfied, timeout);
    const missing = expected.filter((x) => count(x.tracker, x.name) < x.count).map((x) => `${x.tracker}:${x.name}`);
    if (ok) {
      this.log.debug('VALIDATION', `${id}: expected tracking arrived (${expected.map((x) => x.name).join(', ') || 'none expected'})`);
    } else if (missing.length) {
      this.log.debug('VALIDATION', `${id}: still missing after ${timeout}ms: ${missing.join(', ')}`);
    }
    // Duplicate window: keep listening briefly for repeated events.
    await sleep(this.cfg.duplicates.windowMs);

    action.endTs = this.run.now();
    action.pageUrlAfter = this.page.url();
    await this.capture(action);
    return action;
  }

  async capture(action: ActionRecord): Promise<void> {
    const { cfg } = this;
    const [shot, storage, dl, html] = await Promise.all([
      cfg.report.screenshots !== 'off' ? this.page.screenshot({ fullPage: false, timeout: 5000 }).catch(() => undefined) : Promise.resolve(undefined),
      this.deps.storage.snapshot(this.page),
      this.deps.dataLayer.state(this.page),
      cfg.report.domSnapshots ? this.deps.dom.html(this.page) : Promise.resolve(undefined),
    ]);
    if (shot) this.screenshots.set(action.id, shot);
    action.storage = storage;
    action.dataLayerState = dl;
    action.domHtml = html;
  }

  /** Click an element found by the DOM scripts (data-tqa-ref). Falls back to a DOM click if obscured. */
  async click(el: ElementInfo, action?: ActionRecord): Promise<void> {
    const loc = this.page.locator(`[data-tqa-ref="${el.ref}"]`).first();
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
      await loc.click({ timeout: this.cfg.timeouts.action });
    } catch (e) {
      const msg = (e as Error).message;
      if (/intercepts pointer events|not visible|timeout/i.test(msg)) {
        action?.notes.push('element was obscured; dispatched a DOM click instead');
        await loc.dispatchEvent('click');
      } else throw e;
    }
  }

}
