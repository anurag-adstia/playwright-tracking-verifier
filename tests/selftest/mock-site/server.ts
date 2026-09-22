import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import type { Route } from '@playwright/test';
import type { RunOptions } from '../../../src/runner';

const PAGES = path.join(__dirname, 'pages');
const VENDOR = path.join(__dirname, 'vendor');

/** Tiny static server for the mock lander / quiz pages: /lander → pages/lander.html */
export async function startMockSite(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let file = path.join(PAGES, url.pathname === '/' ? 'lander.html' : url.pathname);
    if (!path.extname(file)) file += '.html';
    if (!file.startsWith(PAGES) || !fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    const type = file.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(fs.readFileSync(file));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  return { baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(() => r())) };
}

const js = (file: string) => async (route: Route) =>
  route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(VENDOR, file), 'utf8') });

/**
 * Serves third-party tracking scripts/endpoints offline. The Jitsu loader and library are the real
 * production files; GTM, Clarity and Ringba are behavioural mocks. Real endpoints are never hit.
 */
export const MOCK_ROUTES: NonNullable<RunOptions['routes']> = [
  { url: /adstia-scripts\.netlify\.app\/jitsu-script\.js/, handler: js('jitsu-loader.js') },
  { url: /tracking\.adstiacms\.com\/p\.js/, handler: js('jitsu-p.js') },
  { url: /tracking\.adstiacms\.com\/api\/s\//, handler: (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}', headers: { 'access-control-allow-origin': '*' } }) },
  { url: /googletagmanager\.com\/gtm\.js/, handler: js('gtm.js') },
  // Note: route.fulfill() with a 204 or an empty body makes Chromium report net::ERR_ABORTED, so mocks answer 200 + body.
  { url: /google-analytics\.com\//, handler: (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: 'ok', headers: { 'access-control-allow-origin': '*' } }) },
  { url: /www\.clarity\.ms\/tag\//, handler: js('clarity-tag.js') },
  { url: /scripts\.clarity\.ms\//, handler: js('clarity.js') },
  { url: /clarity\.ms\/collect/, handler: (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: 'ok', headers: { 'access-control-allow-origin': '*' } }) },
  { url: /b-js\.ringba\.com\//, handler: js('ringba.js') },
  { url: /callgrid\.test\//, handler: (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } }) },
];
