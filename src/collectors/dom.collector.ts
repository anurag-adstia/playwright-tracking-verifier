import type { Page } from '@playwright/test';
import { globalsScript, inspectDomScript } from '../browser/dom-scripts';
import type { SiteConfig } from '../config/tracking.config';
import type { RunState } from '../core/run-state';
import type { DomSnapshot } from '../core/types';

/** DOM inspection (the "Elements" panel): scripts, noscript, CTAs, phone links, inputs, iframes. */
export class DomCollector {
  constructor(
    private readonly run: RunState,
    private readonly cfg: SiteConfig,
  ) {}

  async inspect(page: Page): Promise<DomSnapshot | undefined> {
    try {
      const snap = (await page.evaluate(
        inspectDomScript({
          ctaSelector: this.cfg.selectors.cta,
          ctaPattern: this.cfg.expected.cta.textPattern,
          phoneSelector: this.cfg.selectors.phone,
          zipSelector: this.cfg.selectors.zipInput,
          excludeSelector: this.cfg.selectors.exclude,
        }),
      )) as Omit<DomSnapshot, 'ts'>;
      const full: DomSnapshot = { ts: this.run.now(), ...snap };
      this.run.domSnapshots.push(full);
      return full;
    } catch {
      return undefined;
    }
  }

  async html(page: Page): Promise<string | undefined> {
    try {
      return await page.content();
    } catch {
      return undefined;
    }
  }

  /** Provider globals, recorded without assuming any of them exists. */
  async globals(page: Page): Promise<Record<string, unknown>> {
    const names = ['cf_variable', 'jitsu', ...this.cfg.expected.ringba.globals];
    try {
      return (await page.evaluate(globalsScript(names))) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
