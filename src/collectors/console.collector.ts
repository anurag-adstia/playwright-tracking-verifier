import type { Page } from '@playwright/test';
import { classifyConsole } from '../core/classifier';
import type { Logger } from '../core/logger';
import type { RunState } from '../core/run-state';
import type { ConsoleRecord, NetworkRecord } from '../core/types';
import { shortUrl, truncate } from '../core/utils';

/** Console / page errors / failed requests (the "Console" panel), classified on capture. */
export class ConsoleCollector {
  constructor(
    private readonly run: RunState,
    private readonly log: Logger,
  ) {}

  attach(page: Page): void {
    page.on('console', (msg) => {
      const loc = msg.location();
      const location = loc?.url ? `${loc.url}:${loc.lineNumber}` : undefined;
      this.add(msg.type(), msg.text(), location, page.url());
    });
    page.on('pageerror', (err) => {
      const stack = err.stack ?? '';
      this.add('pageerror', `${err.name}: ${err.message}`, stack.split('\n').slice(1, 3).join(' ').trim() || undefined, page.url());
    });
  }

  addRequestFailed(rec: NetworkRecord): void {
    this.add('requestfailed', `${rec.method} ${shortUrl(rec.url, 160)} — ${rec.failure}`, rec.url, rec.pageUrl, rec.category);
  }

  private add(type: string, text: string, location?: string, pageUrl?: string, requestCategory?: string): void {
    const cls = classifyConsole(type, text, location, requestCategory);
    const rec: ConsoleRecord = {
      id: this.run.nextId('CON'),
      ts: this.run.now(),
      type,
      text: truncate(text, 2000),
      location,
      pageUrl,
      ...cls,
    };
    this.run.console.push(rec);
    if (cls.category === 'TRACKING' || type === 'error' || type === 'pageerror') {
      this.log.debug('CONSOLE', `${type} [${cls.category}${cls.tracker ? `/${cls.tracker}` : ''}] ${truncate(text, 180)}`);
    }
  }
}
