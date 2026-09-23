import * as fs from 'fs';
import * as path from 'path';
import { verdicts, type Mark, type Rich, type Section } from './checks';

/** One site: the quiz walked once, then every check. */
export interface RunResult {
  site: string;
  url: string;
  sections: Section[];
  notes: string[];
  error?: string;
}

const ICON: Record<Mark, string> = { ok: '✅', warn: '⚠️', fail: '❌', skip: '➖' };
const VERDICT: Record<Mark, string> = { ok: 'integrated correctly', warn: 'integrated, with warnings', fail: 'not integrated correctly', skip: 'not used on this page' };
const SHORT: Record<Mark, string> = { ok: 'Pass', warn: 'Warning', fail: 'Fail', skip: 'Not used' };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const rich = (r: Rich) => r.map((x) => (typeof x === 'string' ? esc(x) : 'c' in x ? `<code>${esc(x.c)}</code>` : pill(x.m, true))).join('');
/** Rich text without markup, for JSON / the terminal. */
export const plain = (r: Rich) => r.map((x) => (typeof x === 'string' ? x : 'c' in x ? x.c : ICON[x.m])).join('');
export { ICON, SHORT, VERDICT };

const pill = (m: Mark, iconOnly = false) => `<span class="pill ${m}">${ICON[m]}${iconOnly ? '' : ` ${SHORT[m]}`}</span>`;
const overall = (sections: Section[]): Mark => {
  const marks = verdicts(sections).map((v) => v.mark);
  return marks.includes('fail') ? 'fail' : marks.includes('warn') ? 'warn' : 'ok';
};

function section(s: Section, n: number, id: string): string {
  const head = `<div class="check-head" id="${id}-s${n}"><h3><span class="num">${n}</span> ${esc(s.title)}</h3><div class="head-meta">${rich(s.head)} ${pill(s.mark)}</div></div>`;
  const flow = s.flow ? `<pre>${s.flow.length ? s.flow.map((f, i) => esc(i ? `  → ${f}` : f)).join('\n') : 'no events'}</pre>` : '';
  const rows = s.rows.length ? `<table class="kv">${s.rows.map((r) => `<tr><th>${rich(r.label)}</th><td>${r.lines.map(rich).join('<br>')}</td></tr>`).join('')}</table>` : '';
  const issues = s.issues.length
    ? `<table class="issues"><thead><tr><th>Issue</th><th>Detail</th><th class="st">Status</th></tr></thead><tbody>${s.issues
        .map((i) => `<tr class="${i.mark}"><th>${rich(i.issue)}</th><td>${rich(i.detail)}</td><td class="st">${pill(i.mark)}</td></tr>`)
        .join('')}</tbody></table>`
    : '';
  return `<article class="check">${head}${flow}${rows}${issues}</article>`;
}

/** Final result for one site: is each tracker integrated and working? */
function finalResult(r: RunResult, id: string): string {
  const rows = verdicts(r.sections).map((v, i) => {
    const note = v.title === 'Call tracking' ? '<div class="sub">Ringba or CallGrid</div>' : '';
    return `<tr class="${v.mark}"><th><a href="#${id}-s${v.sections[0] + 1}">${i + 1}. ${esc(v.title)}</a>${note}</th><td>${VERDICT[v.mark]}<div class="sub">${rich(v.head)}</div></td><td class="st">${pill(v.mark)}</td></tr>`;
  });
  return `<table class="final"><thead><tr><th>Check</th><th>Result</th><th class="st">Status</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function site(r: RunResult, id: string, embed: boolean): string {
  if (r.error) return `<section class="site site-card"><header class="site-head"><h2>${esc(r.site)}</h2>${pill('fail')}</header><p class="err">Run failed: ${esc(r.error)}</p></section>`;
  const head = embed
    ? ''
    : `<header class="site-head"><div><h2>${esc(r.site)}</h2><a class="url" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a></div>${pill(overall(r.sections))}</header>${finalResult(r, id)}`;
  const path = `<details class="path"${embed ? '' : ' open'}><summary>Quiz path <span class="sub">${r.notes.length} step(s)</span></summary><ol>${r.notes.map((n) => `<li>${esc(n)}</li>`).join('') || '<li>no quiz steps</li>'}</ol></details>`;
  return `<section class="site site-card">${head}<div class="checks">${r.sections.map((s, i) => section(s, i + 1, id)).join('')}</div>${path}</section>`;
}

/**
 * The report for a run.
 * `embed`: only the check details (the web UI shows its own header and final result).
 */
export function renderReport(runs: RunResult[], startedAt: Date, opts: { embed?: boolean } = {}): string {
  const embed = !!opts.embed;
  const body = runs.map((r, i) => site(r, `site${i + 1}`, embed));
  const totals = runs.reduce(
    (acc, r) => {
      const mark = r.error ? 'fail' : overall(r.sections);
      acc[mark]++;
      return acc;
    },
    { ok: 0, warn: 0, fail: 0 } as Record<Mark, number>,
  );
  const header = embed
    ? ''
    : `<header class="page">
        <div class="page-kicker">Quality assurance</div>
        <div class="page-title"><div><h1>Tracking Report</h1><p class="sub">${esc(startedAt.toLocaleString())} · ${runs.length} site(s)</p></div><span class="report-badge">Playwright</span></div>
        <p class="page-description">A visual summary of tracker integration, event delivery, provider checks, and quiz flow behavior.</p>
        <div class="summary"><div class="summary-item ok"><strong>${totals.ok}</strong><span>Passing</span></div><div class="summary-item warn"><strong>${totals.warn}</strong><span>Warnings</span></div><div class="summary-item fail"><strong>${totals.fail}</strong><span>Failing</span></div></div>
      </header>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tracking Report</title>
<style>${CSS()}${embed ? 'body{background:transparent}main{padding:0 4px}' : ''}</style></head>
<body><main>${header}${body.join('')}</main></body></html>`;
}

/** Page frame — only for the standalone report (the web UI has its own). */
const PAGE_CSS = `
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(circle at 85% -10%,rgba(91,140,255,.16),transparent 34%),var(--bg);color:var(--text);font:15px/1.6 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1080px;margin:0 auto;padding:48px 24px 72px}
h1{font-size:clamp(28px,4vw,40px);letter-spacing:-.04em;line-height:1.1;margin:0 0 6px}
header.page{margin-bottom:30px}
a{color:var(--accent)}
.page-kicker{color:var(--accent);font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px}
.page-title{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
.page-description{max-width:680px;color:var(--muted);margin:14px 0 20px}
.report-badge{border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:12px;font-weight:700;padding:5px 11px}
.summary{display:flex;gap:10px;flex-wrap:wrap}
.summary-item{display:flex;align-items:baseline;gap:8px;border:1px solid var(--line);border-radius:10px;background:var(--card);padding:8px 13px;box-shadow:var(--shadow)}
.summary-item strong{font-size:19px;line-height:1}
.summary-item span{color:var(--muted);font-size:12px;font-weight:600}
.summary-item.ok strong{color:var(--ok)}.summary-item.warn strong{color:var(--warn)}.summary-item.fail strong{color:var(--fail)}
@media (max-width:640px){main{padding:28px 14px 48px}.page-title{display:block}.report-badge{display:inline-block;margin-top:14px}}
`;

/**
 * Tokens + components live in public/report.css so the UI and the report always share one file,
 * and editing it needs no server restart. The standalone report inlines it.
 */
const SHARED_CSS_FILE = path.resolve(__dirname, '../public/report.css');
export const sharedCss = (): string => {
  try {
    return fs.readFileSync(SHARED_CSS_FILE, 'utf8');
  } catch {
    return '';
  }
};

const CSS = () => sharedCss() + PAGE_CSS;

