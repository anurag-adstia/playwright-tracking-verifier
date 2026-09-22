import * as fs from 'fs';
import * as path from 'path';
import { chromium, type Browser, type Route } from '@playwright/test';
import { ConsoleCollector } from './collectors/console.collector';
import { DataLayerCollector, pathKey } from './collectors/datalayer.collector';
import { DomCollector } from './collectors/dom.collector';
import { NetworkCollector } from './collectors/network.collector';
import { StorageCollector } from './collectors/storage.collector';
import { CallProvider, SiteConfig, SiteType, TRACKER_IDS, TrackerId } from './config/tracking.config';
import { assignActions } from './correlation/action-correlator';
import { Logger } from './core/logger';
import { Masker } from './core/mask';
import { RunState } from './core/run-state';
import type { CheckResult, FlowSummary, NetworkRecord, Status, TrackerState } from './core/types';
import { originOf } from './core/utils';
import { runLanderFlow } from './flows/lander.flow';
import { runQuizFlow } from './flows/quiz.flow';
import { FlowSession } from './flows/session';
import { generateReport } from './reports/report.generator';
import type { RunReport } from './reports/report.types';
import { TRACKERS } from './trackers';
import { ringbaScripts } from './trackers/ringba';
import type { EvalContext } from './trackers/types';
import { flowChecks } from './validators/flow.validator';
import { KeyScanner, PROVIDER_KEYS, providerSafetyCheck } from './validators/provider.validator';
import { isOk } from './validators/request.validator';
import { identityValues, snapshotFor, storageChecks } from './validators/storage.validator';

export interface RunOptions {
  debug?: boolean;
  quiet?: boolean;
  /** Reuse a browser across runs (each run still gets a fresh, isolated context). */
  browser?: Browser;
  /** Request interception (self-tests only: serves mock vendor scripts offline). */
  routes?: Array<{ url: string | RegExp; handler: (route: Route) => Promise<void> | void }>;
  runId?: string;
}

export interface RunResult {
  report: RunReport;
  dir: string;
  exitCode: 0 | 1;
}

/** RUN-YYYYMMDD-NNN, unique within the reports directory. */
export function createRunDir(reportRoot: string): { runId: string; dir: string } {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  fs.mkdirSync(reportRoot, { recursive: true });
  const existing = fs.readdirSync(reportRoot).filter((f) => f.startsWith(`RUN-${date}-`));
  let n = existing.reduce((m, f) => Math.max(m, Number(f.split('-')[2]) || 0), 0);
  for (;;) {
    n += 1;
    const runId = `RUN-${date}-${String(n).padStart(3, '0')}`;
    const dir = path.join(reportRoot, runId);
    try {
      fs.mkdirSync(dir);
      return { runId, dir };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    }
  }
}

function detectType(cfg: SiteConfig, url: string): SiteType {
  if (cfg.type !== 'auto') return cfg.type;
  if (cfg.expected.quiz.enabled === true) return 'quiz';
  let p = '';
  try {
    p = new URL(url).pathname + new URL(url).hostname;
  } catch {
    /* ignore */
  }
  if (/chat/i.test(p)) return 'chatquiz';
  if (/quiz|survey|questionnaire/i.test(p)) return 'quiz';
  return 'lander';
}

function withQuery(url: string, query?: Record<string, string>): string {
  if (!query || !Object.keys(query).length) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

export async function runTracking(cfg: SiteConfig, opts: RunOptions = {}): Promise<RunResult> {
  const startedAt = new Date();
  const { runId, dir } = opts.runId ? { runId: opts.runId, dir: path.join(cfg.report.dir, opts.runId) } : createRunDir(path.resolve(cfg.report.dir));
  fs.mkdirSync(dir, { recursive: true });
  const run = new RunState(runId);
  const log = new Logger(!!opts.debug, () => run.now(), !!opts.quiet);
  const masker = new Masker(cfg.report.maskSensitive);
  const targetUrl = withQuery(cfg.url, cfg.query);
  log.info('PAGE', `${runId} — ${cfg.name} — ${masker.url(targetUrl)}`);

  const ownBrowser = !opts.browser;
  const browser = opts.browser ?? (await chromium.launch({ headless: cfg.browser.headless }));
  const context = await browser.newContext({
    viewport: cfg.browser.viewport,
    userAgent: cfg.browser.userAgent,
    locale: cfg.browser.locale,
    ignoreHTTPSErrors: true,
  });

  const flow: FlowSummary = {
    type: 'lander',
    provider: 'none',
    ctaClicked: false,
    quizSteps: 0,
    quizCompleted: false,
    zipSubmitted: false,
    leadStageReached: false,
    phoneClicked: false,
    notes: [],
  };
  let docRecord: NetworkRecord | undefined;
  let navError: string | undefined;
  let session: FlowSession | undefined;
  let dataLayer: DataLayerCollector | undefined;
  let tracePath: string | undefined;
  const tracing = cfg.report.trace !== 'off';

  try {
    for (const r of opts.routes ?? []) await context.route(r.url, r.handler);

    // Collectors start before the first navigation.
    const consoleCollector = new ConsoleCollector(run, log);
    const parsers = TRACKERS.flatMap((t) => (t.createParser ? [t.createParser(cfg)] : []));
    const network = new NetworkCollector(run, cfg, parsers, log, (rec) => consoleCollector.addRequestFailed(rec));
    network.attach(context);
    dataLayer = new DataLayerCollector(run, cfg, log);
    await dataLayer.install(context);
    const storage = new StorageCollector(run);
    const dom = new DomCollector(run, cfg);
    context.on('page', (p) => {
      consoleCollector.attach(p);
      let last = '';
      p.on('framenavigated', (frame) => {
        if (frame !== p.mainFrame()) return;
        const key = pathKey(frame.url());
        if (key === last) return;
        last = key;
        run.navigations.push({ ts: run.now(), url: frame.url(), kind: 'load' });
        log.debug('PAGE', `navigated → ${masker.url(frame.url())}`);
        run.notify();
      });
    });
    if (tracing) await context.tracing.start({ screenshots: true, snapshots: true, sources: false });

    const page = await context.newPage();
    session = new FlowSession(page, { context, run, cfg, log, dom, storage, dataLayer, trackers: TRACKERS });

    // ACTION-PAGE-001
    await session.perform('page_load', `Open ${masker.url(targetUrl)}`, { pageUrl: targetUrl, pagePath: new URL(targetUrl).pathname }, async () => {
      try {
        const res = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: cfg.timeouts.navigation });
        docRecord = run.network.find((r) => r.isNavigation && r.resourceType === 'document' && res && r.url === res.url()) ?? run.network.find((r) => r.isNavigation);
        log.info('PAGE', `Loaded ${masker.url(page.url())} (HTTP ${res?.status() ?? '?'})`);
      } catch (e) {
        navError = (e as Error).message.split('\n')[0];
        throw e;
      }
    });

    if (!navError) {
      flow.type = detectType(cfg, page.url());
      for (const t of TRACKERS) {
        const ev = t.detect({ cfg, run });
        if (ev.length) log.info('TRACKER', `${t.label} detected: ${ev.join('; ')}`);
      }
      if (flow.type === 'lander') await runLanderFlow(session, flow);
      else await runQuizFlow(session, flow);

      // Final settle: wait (event-based) for late signals that are still expected.
      const pageLoadEnd = run.actions[0]?.endTs ?? 0;
      const clarityOn = session.trackerActive('clarity');
      const hasCollect = () => run.network.some((r) => r.category === 'CLARITY' && /\/collect/.test(r.url));
      if (clarityOn && !hasCollect()) {
        const remaining = Math.max(1000, cfg.timeouts.clarityCollect - (run.now() - pageLoadEnd));
        log.debug('CLARITY', `waiting up to ${remaining}ms for a collect request`);
        await run.waitFor(hasCollect, remaining);
      }
      if (flow.leadStageReached && session.trackerActive('jitsu') && cfg.expected.jitsu.events.lead_submit) {
        await run.waitFor(() => run.events.some((e) => e.tracker === 'jitsu' && e.name === 'lead_submit'), cfg.timeouts.action);
      }
      run.globals = await dom.globals(session.page);
    }
    await network.flush();
  } catch (e) {
    if (!navError) throw e;
  } finally {
    run.cancelWaits();
  }

  // ------------------------------------------------------------------ evaluation
  assignActions(run);
  const trackers = {} as Record<TrackerId, TrackerState>;
  for (const id of TRACKER_IDS) {
    const adapter = TRACKERS.find((t) => t.id === id)!;
    const evidence = adapter.detect({ cfg, run });
    const toggle = cfg.tracking[id];
    trackers[id] = { id, toggle, detected: evidence.length > 0, enabled: toggle === true || (toggle === 'auto' && evidence.length > 0), required: toggle === true, evidence };
  }

  const keys = new KeyScanner(run, run.actions);
  const detectedProviders: CallProvider[] = [];
  if (ringbaScripts({ cfg, run }).some((r) => isOk(r))) detectedProviders.push('ringba');
  const cgFlag = keys.find(PROVIDER_KEYS.callgrid.flag).some((o) => o.tier !== 'bundle' && (o.value === true || o.value === 'true'));
  if (run.network.some((r) => r.category === 'CALLGRID') || cgFlag) detectedProviders.push('callgrid');
  const configuredProvider = cfg.expected.callTracking.provider;
  flow.provider = configuredProvider !== 'auto' ? configuredProvider : (detectedProviders[0] ?? 'none');
  if (configuredProvider === 'auto' && flow.provider === 'ringba') trackers.ringba.enabled = true;
  if (configuredProvider === 'auto' && flow.provider === 'callgrid') trackers.callgrid.enabled = true;
  flow.notes.push(...(session?.notes ?? []));

  const ctx: EvalContext = {
    cfg,
    run,
    flow,
    trackers,
    actions: run.actions,
    telClicks: dataLayer?.telClicks ?? [],
    dataLayerPages: dataLayer?.dataLayerPages ?? new Set(),
    keys,
    masker,
    eventValidations: [],
    identityFor: (e) => identityValues(cfg, snapshotFor(run.storageSnapshots, e)),
    contextFor: (e, a) => {
      let pagePath: string | undefined;
      let host: string | undefined;
      try {
        const u = new URL(e.pageUrl ?? a?.pageUrlAfter ?? cfg.url);
        pagePath = u.pathname;
        host = u.host;
      } catch {
        /* ignore */
      }
      return { ...(a?.context ?? {}), pagePath, pageUrl: e.pageUrl, host };
    },
    phoneAction: () => [...run.actions].reverse().find((a) => a.kind === 'phone_click'),
  };

  const checks: CheckResult[] = [];
  checks.push(...flowChecks(ctx, { record: docRecord, error: navError }, detectedProviders));
  if (!navError) {
    for (const adapter of TRACKERS) {
      try {
        checks.push(...adapter.evaluate(ctx, trackers[adapter.id]));
      } catch (e) {
        checks.push({ id: `${adapter.id.toUpperCase()}-ERR`, title: `${adapter.label} evaluation`, group: adapter.id.toUpperCase(), status: 'FAIL', message: `framework error while evaluating: ${(e as Error).message}` });
      }
    }
    checks.push(flow.provider === 'none' ? providerSafetyCheck('none', keys) : providerSafetyCheck(flow.provider, keys));
    checks.push(...storageChecks({ cfg, snapshots: run.storageSnapshots, validations: ctx.eventValidations, events: run.events, masker, jitsuActive: trackers.jitsu.enabled }));
  }

  const status: Status = checks.some((c) => c.status === 'FAIL') ? 'FAIL' : checks.some((c) => c.status === 'WARNING') ? 'WARNING' : 'PASS';

  if (tracing) {
    const keep = cfg.report.trace === 'on' || (cfg.report.trace === 'on-failure' && status === 'FAIL');
    tracePath = keep ? path.join(dir, 'trace.zip') : undefined;
    await context.tracing.stop(tracePath ? { path: tracePath } : undefined).catch(() => (tracePath = undefined));
  }
  await context.close().catch(() => undefined);
  if (ownBrowser) await browser.close().catch(() => undefined);

  const report = generateReport({
    cfg,
    run,
    flow,
    trackers,
    checks,
    validations: ctx.eventValidations,
    detectedProviders,
    keys,
    screenshots: session?.screenshots ?? new Map(),
    startedAt,
    dir,
    tracePath,
    masker,
    status,
    targetUrl,
    finalUrl: session?.page.url() ?? targetUrl,
    siteOrigin: originOf(targetUrl),
  });
  return { report, dir, exitCode: status === 'FAIL' ? 1 : 0 };
}
