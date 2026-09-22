import type { CheckResult, Status } from '../core/types';
import { fmtTs, safeStringify, shortUrl } from '../core/utils';
import type { RunReport } from './report.types';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const badge = (s: Status | string) => `<span class="b b-${esc(s)}">${esc(s)}</span>`;
const json = (v: unknown) => `<pre class="json">${esc(safeStringify(v, 2))}</pre>`;
const details = (summary: string, body: string, open = false) => `<details${open ? ' open' : ''}><summary>${summary}</summary>${body}</details>`;
const table = (head: string[], rows: string[][], cls = '') =>
  rows.length
    ? `<div class="tw"><table class="${cls}"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : '<p class="muted">None.</p>';

function checkRows(checks: CheckResult[]): string {
  return table(
    ['ID', 'Check', 'Status', 'Result', 'Action'],
    checks.map((c) => [
      `<code>${esc(c.id)}</code>`,
      esc(c.title),
      badge(c.status),
      `${esc(c.message)}${c.details?.length ? details('details', `<pre class="det">${esc(c.details.join('\n'))}</pre>`) : ''}`,
      c.actionId ? `<a href="#${esc(c.actionId)}">${esc(c.actionId)}</a>` : '',
    ]),
    'checks',
  );
}

function section(id: string, n: number, title: string, body: string): string {
  return `<section id="${id}"><h2><span class="n">${n}</span>${esc(title)}</h2>${body}</section>`;
}

export function renderHtml(r: RunReport): string {
  const byGroup = (...groups: string[]) => r.checks.filter((c) => groups.includes(c.group));
  const nav: Array<[string, string]> = [
    ['overview', 'Overview'],
    ['result', 'Overall Result'],
    ['trackers', 'Tracker Status'],
    ['dom', 'Elements / DOM'],
    ['console', 'Console'],
    ['network', 'Network'],
    ['payloads', 'Request Payloads'],
    ['application', 'Application'],
    ['datalayer', 'DataLayer'],
    ['flow', 'User Flow'],
    ['provider', 'Provider Validation'],
    ['events', 'Event Validation'],
    ['duplicates', 'Duplicate Events'],
    ['missing', 'Missing Events'],
    ['screenshots', 'Screenshots'],
    ['failures', 'Failures'],
    ['summary', 'Final Summary'],
  ];
  const s = r.summary.checks;
  const parts: string[] = [];

  // 1 Overview
  parts.push(
    section(
      'overview',
      1,
      'Overview',
      `<div class="kv">
      <div><span>Run</span><b>${esc(r.runId)}</b></div>
      <div><span>Site</span><b>${esc(r.site)}</b></div>
      <div><span>URL</span><b class="wrap">${esc(r.url)}</b></div>
      <div><span>Final URL</span><b class="wrap">${esc(r.finalUrl)}</b></div>
      <div><span>Type</span><b>${esc(r.type)}</b> <small>(${esc(r.configuredType)})</small></div>
      <div><span>Call provider</span><b>${esc(r.provider)}</b> <small>(configured ${esc(r.configuredProvider)}, detected ${esc(r.detectedProviders.join(', ') || 'none')})</small></div>
      <div><span>Started</span><b>${esc(r.startedAt)}</b></div>
      <div><span>Duration</span><b>${(r.durationMs / 1000).toFixed(1)}s</b></div>
      <div><span>Actions</span><b>${r.summary.actions}</b></div>
      <div><span>Requests</span><b>${r.summary.totalRequests}</b> <small>(${r.summary.trackingRequests} tracking)</small></div>
      <div><span>Tracking events</span><b>${r.summary.events}</b></div>
      <div><span>Trace</span><b>${r.artifacts.trace ? '<a href="trace.zip">trace.zip</a> <small>(npx playwright show-trace)</small>' : 'off'}</b></div>
    </div>`,
    ),
  );

  // 2 Overall result
  parts.push(
    section(
      'result',
      2,
      'Overall Result',
      `<div class="hero hero-${r.status}"><div class="big">${esc(r.status)}</div><div>${s.PASS} passed · ${s.FAIL} failed · ${s.WARNING} warnings · ${s.SKIPPED} skipped · ${s.INFO} info</div><div class="muted">exit code ${r.exitCode}</div></div>
      <div class="filters">${(['FAIL', 'WARNING', 'PASS', 'SKIPPED', 'INFO'] as Status[]).map((st) => `<label><input type="checkbox" data-st="${st}" checked> ${badge(st)}</label>`).join(' ')}</div>
      ${table(['Question', 'Status', 'Answer'], r.answers.map((a) => [esc(a.question), badge(a.status), esc(a.answer)]))}`,
    ),
  );

  // 3 Trackers
  const cards = Object.values(r.trackerDetails)
    .map(
      (t) => `<div class="card st-${t.status}"><div class="ct">${esc(t.label)} ${badge(t.status)}</div>
      <div class="muted">config: <code>${esc(String(t.toggle))}</code> · detected: ${t.detected ? 'yes' : 'no'} · ${t.required ? 'required' : t.enabled ? 'validated (auto)' : 'skipped'}</div>
      ${t.evidence.length ? `<ul>${t.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</div>`,
    )
    .join('');
  parts.push(
    section(
      'trackers',
      3,
      'Tracker Status',
      `<div class="cards">${cards}</div>${['GTM', 'JITSU', 'CLARITY', 'RINGBA', 'CALLGRID'].map((g) => `<h3>${g}</h3>${checkRows(byGroup(g))}`).join('')}`,
    ),
  );

  // 4 DOM
  const d = r.dom.initial;
  const df = r.dom.final;
  const domBody = d
    ? `${checkRows(byGroup('DOM', 'PAGE', 'QUIZ', 'PHONE'))}
      <h3>Tracking-related scripts</h3>${table(
        ['src / inline', 'id', 'loading', 'snippet'],
        [...(d.scripts ?? []), ...(df && df !== d ? df.scripts : [])]
          .filter((x) => x.snippet || /googletagmanager|jitsu|adstia|clarity|ringba|callgrid/i.test(x.src ?? ''))
          .map((x) => [esc(x.src ? shortUrl(x.src) : `inline (${x.inlineSize} chars)`), esc(x.id ?? ''), esc([x.async && 'async', x.defer && 'defer', x.nscript && `next/script ${x.nscript}`].filter(Boolean).join(', ')), x.snippet ? `<code class="wrap">${esc(x.snippet.slice(0, 300))}</code>` : '']),
      )}
      <h3>CTA candidates</h3>${table(['Element', 'Text', 'Score', 'Visible', 'Enabled'], d.ctaCandidates.map((c) => [`&lt;${esc(c.tag.toLowerCase())}&gt;`, esc(c.text), String(c.score ?? ''), String(c.visible), String(c.enabled)]))}
      <h3>Phone links</h3>${table(['Element', 'href', 'Text', 'Visible', 'Enabled'], [...d.phoneLinks, ...(df && df !== d ? df.phoneLinks : [])].map((c) => [`&lt;${esc(c.tag.toLowerCase())}&gt;`, esc(c.href), esc(c.text), String(c.visible), String(c.enabled)]))}
      ${d.phoneLikeNonAnchors.length ? `<p class="warn">Phone numbers in non-anchor elements: ${d.phoneLikeNonAnchors.map((x) => esc(`<${x.tag.toLowerCase()}> ${x.text}`)).join(', ')}</p>` : ''}
      <h3>ZIP inputs / inputs</h3>${table(['Element', 'name', 'id', 'type', 'Visible'], [...d.zipInputs, ...d.inputs].slice(0, 30).map((c) => [`&lt;${esc(c.tag.toLowerCase())}&gt;`, esc(c.name ?? ''), esc(c.id ?? ''), esc(c.type ?? ''), String(c.visible)]))}
      <h3>noscript / iframes / forms</h3>
      ${d.noscripts.length ? `<pre class="det">${esc(d.noscripts.join('\n'))}</pre>` : '<p class="muted">No &lt;noscript&gt;.</p>'}
      ${table(['iframe src', 'id', 'visible'], d.iframes.map((f) => [esc(shortUrl(f.src ?? '')), esc(f.id ?? ''), String(f.visible)]))}
      ${table(['form id/name', 'action', 'method', 'inputs'], d.forms.map((f) => [esc(f.id ?? f.name ?? ''), esc(f.action ?? ''), esc(f.method ?? ''), String(f.inputs)]))}`
    : '<p class="muted">No DOM snapshot (page did not load).</p>';
  parts.push(section('dom', 4, 'Elements / DOM', domBody));

  // 5 Console
  parts.push(
    section(
      'console',
      5,
      'Console',
      `${checkRows(byGroup('CONSOLE'))}${table(
        ['Time', 'Category', 'Type', 'Tracker', 'Message', 'Action'],
        r.consoleErrors.slice(0, 300).map((c) => [fmtTs(c.ts), badge(c.category === 'TRACKING' ? (c.blocking ? 'FAIL' : 'WARNING') : c.category === 'APPLICATION' || c.category === 'NETWORK' ? 'INFO' : c.category), esc(c.type), esc(c.tracker ?? ''), `<span class="wrap">${esc(c.text.slice(0, 400))}</span>${c.location ? `<br><small>${esc(c.location)}</small>` : ''}`, esc(c.actionId ?? '')]),
      )}`,
    ),
  );

  // 6 Network
  parts.push(
    section(
      'network',
      6,
      'Network',
      `${checkRows(byGroup('NETWORK'))}<p class="muted">Tracking-related, failed and document requests. Full capture: <a href="network/requests.json">network/requests.json</a></p>${table(
        ['Time', 'Category', 'Method', 'URL', 'Type', 'Status', 'ms', 'Action'],
        r.networkRequests.slice(0, 500).map((n) => [fmtTs(n.ts), `<code>${esc(n.category)}</code>`, esc(n.method), `<span class="wrap">${esc(shortUrl(n.url, 140))}</span>`, esc(n.resourceType), n.failure ? badge('FAIL') + ` <small>${esc(n.failure)}</small>` : esc(n.status ?? '…'), esc(n.durationMs ?? ''), esc(n.actionId ?? '')]),
      )}`,
    ),
  );

  // 7 Payloads
  const trackingEvents = r.events.filter((e) => e.tracker !== 'gtm');
  parts.push(
    section(
      'payloads',
      7,
      'Request Payloads',
      trackingEvents.length
        ? trackingEvents.map((e) => details(`${fmtTs(e.ts)} ${badge(e.tracker.toUpperCase())} <b>${esc(e.name)}</b> <small>${esc(e.actionId ?? '')} · ${esc(e.requestId ?? e.source)}</small>`, json(e.payload))).join('')
        : '<p class="muted">No tracking payloads captured.</p>',
    ),
  );

  // 8 Application
  const st = r.storage.final;
  const kvTable = (o: Record<string, string>) => table(['Key', 'Value'], Object.entries(o).map(([k, v]) => [`<code>${esc(k)}</code>`, `<span class="wrap">${esc(v.slice(0, 300))}</span>`]));
  parts.push(
    section(
      'application',
      8,
      'Application',
      `${checkRows(byGroup('STORAGE'))}${
        st
          ? `<p class="muted">Final state for ${esc(st.pageUrl)}. Per-action snapshots in <code>storage/</code>.</p>
      <h3>localStorage</h3>${kvTable(st.localStorage)}<h3>sessionStorage</h3>${kvTable(st.sessionStorage)}
      <h3>Cookies</h3>${table(['Name', 'Value', 'Domain', 'Path', 'Secure', 'SameSite'], st.cookies.map((c) => [`<code>${esc(c.name)}</code>`, `<span class="wrap">${esc(c.value.slice(0, 120))}</span>`, esc(c.domain), esc(c.path), String(c.secure), esc(c.sameSite)]))}`
          : '<p class="muted">No storage snapshot.</p>'
      }`,
    ),
  );

  // 9 DataLayer
  const dl = r.dataLayer.filter((p) => p.global === 'dataLayer');
  const tags = r.dataLayer.filter((p) => p.global !== 'dataLayer');
  parts.push(
    section(
      'datalayer',
      9,
      'DataLayer',
      `${table(
        ['Time', 'Kind', 'Event', 'Action', 'Data'],
        dl.slice(0, 300).map((p) => [fmtTs(p.ts), esc(p.kind), p.eventName ? `<b>${esc(p.eventName)}</b>` : '<span class="muted">(no event)</span>', esc(p.actionId ?? ''), details('data', json(p.data))]),
      )}${tags.length ? `<h3>_rgba_tags (Ringba)</h3>${table(['Time', 'Action', 'Data'], tags.map((p) => [fmtTs(p.ts), esc(p.actionId ?? ''), json(p.data)]))}` : ''}`,
    ),
  );

  // 10 User flow + timeline
  const flowRows = r.actions.map((a) => [
    `<a id="${esc(a.id)}"></a><code>${esc(a.id)}</code>`,
    `${esc(a.label)}${a.element ? `<br><small>${esc(a.element)}</small>` : ''}${a.notes.length ? `<br><small class="warn">${esc(a.notes.join('; '))}</small>` : ''}${a.error ? `<br><small class="err">${esc(a.error)}</small>` : ''}`,
    badge(a.dom),
    esc(a.dataLayerEvents.join(', ') || '—'),
    esc(a.jitsuEvents.join(', ') || '—'),
    esc(Object.entries(a.network).map(([k, v]) => `${k}:${v}`).join(' ') || '—'),
    badge(a.payload),
    a.duplicates ? badge('FAIL') + ` ${a.duplicates}` : '0',
    esc(a.missing.join(', ') || '—'),
    badge(a.result),
  ]);
  parts.push(
    section(
      'flow',
      10,
      'User Flow',
      `<p>Type <b>${esc(r.flow.type)}</b> · CTA clicked: ${r.flow.ctaClicked} · quiz answers: ${r.flow.quizSteps} · quiz completed: ${r.flow.quizCompleted} · ZIP: ${r.flow.zipSubmitted} · lead stage: ${r.flow.leadStageReached} · phone clicked: ${r.flow.phoneClicked}</p>
      ${table(['Action', 'What happened', 'DOM', 'DataLayer', 'Jitsu', 'Network', 'Payload', 'Duplicates', 'Missing', 'Result'], flowRows)}
      ${r.notes.length ? `<ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <h3>Timeline</h3><pre class="timeline">${r.timeline
        .map((t) => `<span class="tl-${t.kind}${t.status === 'FAIL' ? ' err' : ''}">${fmtTs(t.ts)} ${t.kind.padEnd(10)} ${esc(t.label)}</span>`)
        .join('\n')}</pre>`,
    ),
  );

  // 11 Provider
  const keyRows = Object.entries(r.providerKeys).map(([k, occ]) => [`<code>${esc(k)}</code>`, occ.length ? occ.slice(0, 6).map((o) => `${badge(o.tier === 'runtime' ? 'PASS' : o.tier === 'config' ? 'INFO' : 'SKIPPED')} <small>${esc(o.tier)}</small> ${o.hasValue ? `<code>${esc(JSON.stringify(o.value))}</code>` : ''} <small>${esc(o.source)}</small>`).join('<br>') : '<span class="muted">not found</span>']);
  parts.push(section('provider', 11, 'Provider Validation', `${checkRows(byGroup('PROVIDER', 'RINGBA', 'CALLGRID').filter((c) => c.group === 'PROVIDER' || /QUIZ|CALLGRID/.test(c.id)))}<h3>Provider key evidence</h3><p class="muted">runtime = seen in real traffic/state · config = page configuration · bundle = JS source only</p>${table(['Key', 'Occurrences'], keyRows)}`));

  // 12 Event validation
  parts.push(
    section(
      'events',
      12,
      'Event Validation',
      table(
        ['Tracker', 'Event', 'Action', 'Expected', 'Actual', 'Status', 'Issues'],
        r.eventValidations.map((v) => [
          esc(v.tracker),
          `<b>${esc(v.event)}</b>${v.checkId ? ` <small>${esc(v.checkId)}</small>` : ''}`,
          `${esc(v.actionId ?? v.trigger)}<br><small>${esc(v.actionLabel ?? '')}</small>`,
          String(v.expectedCount),
          String(v.actualCount),
          badge(v.status),
          v.issues.length ? `<pre class="det">${esc(v.issues.map((i) => `${i.severity} ${i.kind}${i.field ? ` ${i.field}` : ''}: ${i.message}${i.expected !== undefined ? `\n   expected: ${JSON.stringify(i.expected)}` : ''}${i.actual !== undefined ? `\n   actual:   ${JSON.stringify(i.actual)}` : ''}`).join('\n'))}</pre>` : '—',
        ]),
      ),
    ),
  );

  // 13 / 14
  parts.push(section('duplicates', 13, 'Duplicate Events', `${checkRows(r.checks.filter((c) => c.id === 'GTM-005' || c.id === 'JITSU-009'))}${table(['Tracker', 'Event', 'Action', 'Expected', 'Actual', 'Message'], r.duplicates.map((x) => [esc(x.tracker), esc(x.event), esc(x.actionId ?? ''), String(x.expected), String(x.actual), esc(x.message)]))}`));
  parts.push(section('missing', 14, 'Missing Events', table(['Tracker', 'Event', 'Action', 'Severity', 'Message'], r.missing.map((x) => [esc(x.tracker), esc(x.event), esc(x.actionId ?? ''), badge(x.severity), esc(x.message)]))));

  // 15 Screenshots
  parts.push(section('screenshots', 15, 'Screenshots', r.screenshots.length ? `<div class="shots">${r.screenshots.map((sh) => `<figure><a href="${esc(sh.file)}"><img loading="lazy" src="${esc(sh.file)}" alt="${esc(sh.actionId)}"></a><figcaption><code>${esc(sh.actionId)}</code> ${esc(sh.label)}</figcaption></figure>`).join('')}</div>` : '<p class="muted">No screenshots.</p>'));

  // 16 Failures
  const failCard = (c: CheckResult) => `<div class="fail st-${c.status}"><div class="ct"><code>${esc(c.id)}</code> — ${badge(c.status)} ${esc(c.title)}</div>
    <p>${esc(c.message)}</p>
    <div class="kv small">
      ${c.actionId ? `<div><span>Action</span><b><a href="#${esc(c.actionId)}">${esc(c.actionId)}</a></b></div>` : ''}
      ${c.expected !== undefined ? `<div><span>Expected</span><b><code>${esc(typeof c.expected === 'string' ? c.expected : JSON.stringify(c.expected))}</code></b></div>` : ''}
      ${c.actual !== undefined ? `<div><span>Actual</span><b><code>${esc(typeof c.actual === 'string' ? c.actual : JSON.stringify(c.actual))}</code></b></div>` : ''}
      ${c.classification ? `<div><span>Classification</span><b>${esc(c.classification)}</b></div>` : ''}
    </div>
    ${c.details?.length ? `<pre class="det">${esc(c.details.join('\n'))}</pre>` : ''}
    ${c.evidence?.length ? `<p class="small">Evidence: ${c.evidence.map((e) => `<a href="${esc(e)}">${esc(e)}</a>`).join(' · ')}</p>` : ''}</div>`;
  parts.push(section('failures', 16, 'Failures', r.failures.length || r.warnings.length ? [...r.failures, ...r.warnings].map(failCard).join('') : '<p>No failures or warnings. 🎉</p>'));

  // 17 Summary
  parts.push(
    section(
      'summary',
      17,
      'Final Summary',
      `<div class="hero hero-${r.status}"><div class="big">${esc(r.status)}</div><div>${Object.entries(r.trackers)
        .map(([k, v]) => `${esc(k.toUpperCase())} ${badge(v)}`)
        .join(' &nbsp; ')}</div></div>
      <ol class="answers">${r.answers.map((a) => `<li>${badge(a.status)} <b>${esc(a.question)}</b><br><span class="muted">${esc(a.answer)}</span></li>`).join('')}</ol>`,
    ),
  );

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tracking QA ${esc(r.runId)} — ${esc(r.status)}</title>
<style>
:root{--bg:#f6f7f9;--fg:#1d2330;--muted:#6b7280;--card:#fff;--line:#e3e6eb;--pass:#16a34a;--fail:#dc2626;--warn:#d97706;--skip:#9ca3af;--info:#2563eb;--code:#eef1f5}
@media (prefers-color-scheme:dark){:root{--bg:#0f1218;--fg:#e5e7eb;--muted:#9aa3b2;--card:#171b23;--line:#2a303b;--code:#1f2530}}
*{box-sizing:border-box}body{margin:0;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
nav{position:fixed;top:0;left:0;bottom:0;width:210px;overflow:auto;background:var(--card);border-right:1px solid var(--line);padding:16px 10px}
nav .st{margin:0 6px 12px}nav a{display:block;padding:3px 8px;border-radius:6px;color:var(--fg);text-decoration:none;font-size:13px}nav a:hover{background:var(--code)}
main{margin-left:210px;padding:20px 28px;max-width:1500px}
@media (max-width:900px){nav{position:static;width:auto;border-right:0;border-bottom:1px solid var(--line)}main{margin-left:0;padding:16px}}
h1{font-size:20px;margin:0 0 4px}h2{font-size:17px;margin:34px 0 12px;display:flex;align-items:center;gap:10px}h3{font-size:14px;margin:18px 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
h2 .n{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--code);font-size:12px}
section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 20px 18px;margin-bottom:16px}
.b{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.03em;color:#fff;background:var(--info);white-space:nowrap}
.b-PASS{background:var(--pass)}.b-FAIL{background:var(--fail)}.b-WARNING{background:var(--warn)}.b-SKIPPED{background:var(--skip)}.b-INFO,.b-TRACKING{background:var(--info)}
.hero{border-radius:12px;padding:18px;margin:8px 0 14px;border:2px solid var(--line)}.hero .big{font-size:30px;font-weight:800}
.hero-PASS{border-color:var(--pass)}.hero-PASS .big{color:var(--pass)}.hero-FAIL{border-color:var(--fail)}.hero-FAIL .big{color:var(--fail)}.hero-WARNING{border-color:var(--warn)}.hero-WARNING .big{color:var(--warn)}
.kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px 18px}.kv div{display:flex;flex-direction:column}.kv span{font-size:11px;color:var(--muted);text-transform:uppercase}.kv.small{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}.card{border:1px solid var(--line);border-left:4px solid var(--skip);border-radius:10px;padding:10px 12px}.card ul{margin:6px 0 0;padding-left:18px;font-size:12px}.ct{font-weight:700;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.st-PASS{border-left-color:var(--pass)}.st-FAIL{border-left-color:var(--fail)}.st-WARNING{border-left-color:var(--warn)}.st-INFO{border-left-color:var(--info)}
.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}th{font-size:11px;text-transform:uppercase;color:var(--muted);background:var(--code)}
code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}code{background:var(--code);padding:0 4px;border-radius:4px}
pre{background:var(--code);padding:10px;border-radius:8px;overflow:auto;max-height:420px;margin:6px 0}pre.det{white-space:pre-wrap}.wrap{word-break:break-all}
details summary{cursor:pointer;color:var(--info);margin:4px 0}.muted{color:var(--muted)}.warn{color:var(--warn)}.err{color:var(--fail)}small{color:var(--muted)}
.fail{border:1px solid var(--line);border-left:4px solid var(--fail);border-radius:10px;padding:10px 14px;margin:10px 0}.fail.st-WARNING{border-left-color:var(--warn)}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.shots img{width:100%;border:1px solid var(--line);border-radius:8px}figure{margin:0}figcaption{font-size:12px}
.timeline{max-height:520px;line-height:1.55}.tl-ACTION{font-weight:700;color:var(--info)}.tl-CONSOLE{color:var(--warn)}.tl-DATALAYER{color:#a16207}.tl-EVENT{color:var(--pass)}
.filters{margin:6px 0 12px;display:flex;gap:12px;flex-wrap:wrap}.answers li{margin:6px 0}
</style></head><body>
<nav><div class="st"><b>Tracking QA</b><br><small>${esc(r.runId)}</small><br>${badge(r.status)}</div>${nav.map(([id, t], i) => `<a href="#${id}">${i + 1}. ${esc(t)}</a>`).join('')}</nav>
<main><h1>${esc(r.site)} ${badge(r.status)}</h1><p class="muted">${esc(r.url)} · ${esc(r.type)} · provider ${esc(r.provider)} · ${esc(r.tool.name)} v${esc(r.tool.version)}</p>
${parts.join('\n')}
</main>
<script>
document.querySelectorAll('.filters input').forEach(function (cb) {
  cb.addEventListener('change', function () {
    var off = Array.prototype.slice.call(document.querySelectorAll('.filters input')).filter(function (x) { return !x.checked; }).map(function (x) { return x.dataset.st; });
    document.querySelectorAll('table.checks tbody tr').forEach(function (tr) {
      var b = tr.querySelector('.b'); tr.style.display = b && off.indexOf(b.textContent) >= 0 ? 'none' : '';
    });
  });
});
</script>
</body></html>`;
}
