import type {
  ActionRecord,
  ConsoleRecord,
  DataLayerPush,
  DomSnapshot,
  NetworkRecord,
  StorageSnapshot,
  TimelineEntry,
  TrackingEvent,
} from './types';

interface Waiter {
  cond: () => boolean;
  resolve: (ok: boolean) => void;
  timer: NodeJS.Timeout;
}

/**
 * Everything observed during one run. Collectors append; flows wait on it
 * (event-based, no fixed sleeps); validators read it after the flow.
 */
export class RunState {
  readonly t0 = Date.now();
  network: NetworkRecord[] = [];
  events: TrackingEvent[] = [];
  dataLayer: DataLayerPush[] = [];
  console: ConsoleRecord[] = [];
  actions: ActionRecord[] = [];
  navigations: Array<{ ts: number; url: string; kind: 'load' | 'spa' }> = [];
  domSnapshots: DomSnapshot[] = [];
  storageSnapshots: StorageSnapshot[] = [];
  /** Same-origin document/script/data bodies used for provider key scanning. */
  bodies: Array<{ url: string; contentType: string; body: string; tier: 'config' | 'bundle' }> = [];
  /** Final browser globals (cf_variable, _rgba_tags, google_tag_manager keys, ...). */
  globals: Record<string, unknown> = {};
  extraTimeline: TimelineEntry[] = [];
  private seq = 0;
  private waiters = new Set<Waiter>();

  constructor(readonly runId: string) {}

  now(): number {
    return Date.now() - this.t0;
  }

  nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  /** Call whenever something is recorded so pending waits can resolve immediately. */
  notify(): void {
    for (const w of [...this.waiters]) {
      let ok = false;
      try {
        ok = w.cond();
      } catch {
        ok = false;
      }
      if (ok) {
        clearTimeout(w.timer);
        this.waiters.delete(w);
        w.resolve(true);
      }
    }
  }

  /** Resolve true as soon as `cond` holds, false on timeout. */
  waitFor(cond: () => boolean, timeoutMs: number): Promise<boolean> {
    if (cond()) return Promise.resolve(true);
    return new Promise((resolve) => {
      const w: Waiter = {
        cond,
        resolve,
        timer: setTimeout(() => {
          this.waiters.delete(w);
          resolve(false);
        }, Math.max(0, timeoutMs)),
      };
      this.waiters.add(w);
    });
  }

  cancelWaits(): void {
    for (const w of this.waiters) {
      clearTimeout(w.timer);
      w.resolve(false);
    }
    this.waiters.clear();
  }

  eventsSince(ts: number, filter?: (e: TrackingEvent) => boolean): TrackingEvent[] {
    return this.events.filter((e) => e.ts >= ts && (!filter || filter(e)));
  }
}
