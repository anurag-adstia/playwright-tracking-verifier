import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { chromium, type Browser } from '@playwright/test';
import { verdicts } from '../checks';
import { makeSite } from '../config';
import { COMPONENT_CSS, plain, renderReport, TOKENS, type RunResult } from '../report';
import { runSite } from '../run';

/**
 * Static frontend (public/) + a small API that runs the tracking check:
 *   POST /api/runs            { url, name? }            → { id }
 *   GET  /api/runs/:id                                  → status, live quiz path, final result
 *   GET  /api/runs/:id/report.html                      → the full HTML report
 * Runs are queued one at a time and share a single browser.
 */

interface Job {
  id: string;
  url: string;
  status: 'queued' | 'running' | 'done' | 'error';
  startedAt: number;
  finishedAt?: number;
  notes: string[];
  result?: RunResult;
  error?: string;
}

const PORT = Number(process.env.PORT ?? 3000);
/**
 * In a container Chromium runs as root (no user namespace) and /dev/shm is tiny, so it needs
 * these two flags. Set PW_NO_SANDBOX=1 there; locally the defaults stay.
 */
const LAUNCH_ARGS = process.env.PW_NO_SANDBOX === '1' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [];
const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const MAX_JOBS = 50;

const jobs = new Map<string, Job>();
let queue: Promise<void> = Promise.resolve();
let browser: Browser | undefined;

async function execute(job: Job): Promise<void> {
  job.status = 'running';
  job.startedAt = Date.now();
  try {
    if (!browser?.isConnected()) browser = await chromium.launch({ args: LAUNCH_ARGS });
    job.result = await runSite(browser, makeSite({ url: job.url }), job.notes);
    job.status = 'done';
  } catch (e) {
    job.error = (e as Error).message.split('\n')[0];
    job.status = 'error';
  } finally {
    job.finishedAt = Date.now();
  }
}

function enqueue(url: string): Job {
  const job: Job = { id: Math.random().toString(36).slice(2, 10), url, status: 'queued', startedAt: Date.now(), notes: [] };
  jobs.set(job.id, job);
  for (const old of [...jobs.keys()].slice(0, Math.max(0, jobs.size - MAX_JOBS))) jobs.delete(old);
  queue = queue.then(() => execute(job));
  return job;
}

/** What the frontend renders: one row per check plus the quiz path. */
function jobState(job: Job) {
  const result = job.result;
  return {
    id: job.id,
    url: job.url,
    status: job.status,
    error: job.error,
    seconds: Math.round(((job.finishedAt ?? Date.now()) - job.startedAt) / 1000),
    notes: job.notes,
    site: result?.site,
    checks: result
      ? verdicts(result.sections).map((v) => ({ title: v.title, mark: v.mark, detail: plain(v.head) }))
      : [],
  };
}

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function send(res: http.ServerResponse, status: number, body: string | Buffer, type = 'application/json'): void {
  res.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' });
  res.end(body);
}

function serveStatic(res: http.ServerResponse, urlPath: string): void {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found', 'text/plain');
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] ?? 'application/octet-stream');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const run = /^\/api\/runs\/([\w-]+)(\/report\.html)?$/.exec(url.pathname);

  if (req.method === 'POST' && url.pathname === '/api/runs') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let target = '';
      try {
        target = String((JSON.parse(body || '{}') as { url?: string }).url ?? '').trim();
        if (!/^https?:$/.test(new URL(target).protocol)) throw new Error('not http(s)');
      } catch {
        return send(res, 400, JSON.stringify({ error: 'Enter a full URL, e.g. https://example.com/quiz/abcd' }));
      }
      send(res, 202, JSON.stringify(jobState(enqueue(target))));
    });
    return;
  }

  if (req.method === 'GET' && run) {
    const job = jobs.get(run[1]);
    if (!job) return send(res, 404, JSON.stringify({ error: 'Unknown run' }));
    if (!run[2]) return send(res, 200, JSON.stringify(jobState(job)));
    if (!job.result) return send(res, 409, 'The run is not finished yet.', 'text/plain');
    // ?embed=1: details only — the UI already shows the header and the final result.
    return send(res, 200, renderReport([job.result], new Date(job.startedAt), { embed: url.searchParams.get('embed') === '1' }), 'text/html');
  }

  // Colours + the report's components: one source of truth for the UI and the report.
  if (req.method === 'GET' && url.pathname === '/report.css') return send(res, 200, TOKENS + COMPONENT_CSS, 'text/css');

  if (req.method === 'GET') return serveStatic(res, url.pathname);
  send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
});

server.listen(PORT, '0.0.0.0', () => console.log(`Tracking check UI: http://localhost:${PORT}`));

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    browser?.close().catch(() => undefined);
    server.close(() => process.exit(0));
  });
}
