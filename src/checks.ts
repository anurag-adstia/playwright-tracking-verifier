import type { Capture, Req } from './capture';
import type { SiteConfig } from './config';

/** skip = not applicable (the call-tracking provider the page does not use). */
export type Mark = 'ok' | 'warn' | 'fail' | 'skip';
/** Text with inline code chips ({ c }) and status icons ({ m }). */
export type Rich = Array<string | { c: string } | { m: Mark }>;

export interface Section {
  title: string;
  head: Rich;
  mark: Mark;
  rows: Array<{ label: Rich; lines: Rich[] }>;
  flow?: string[];
  issues: Array<{ issue: Rich; detail: Rich; mark: Mark }>;
}

const code = (c: string) => ({ c });
const m = (mark: Mark) => ({ m: mark });
const chips = (keys: string[]): Rich => keys.flatMap((k, i) => (i ? [', ', code(k)] : [code(k)]));
const unique = <T>(a: T[]) => [...new Set(a)];
const ok2xx = (r?: Req) => !!r?.status && r.status >= 200 && r.status < 300;
const trunc = (s: string, n = 45) => (s.length > n ? `${s.slice(0, n)}…` : s);
const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};
const noQuery = (url: string) => url.split('?')[0];
const safeParam = (url: string, key: string) => {
  try {
    return new URL(url).searchParams.get(key) ?? undefined;
  } catch {
    return undefined;
  }
};
const digits = (s: string) => s.replace(/\D/g, '').slice(-10);

const STATUS_TEXT: Record<number, string> = { 200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 301: 'Moved', 302: 'Found', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Server Error', 502: 'Bad Gateway', 503: 'Unavailable' };
const statusHead = (r?: Req): Rich => (r ? [`${r.status ?? 'no response'} ${STATUS_TEXT[r.status ?? 0] ?? ''}`.trim()] : ['not loaded']);

// ------------------------------------------------------------------ shared helpers

const KEY_GROUPS: Array<[string, RegExp]> = [
  ['Device', /^(device|deviceModel|browser|browserVersion|os|osVersion|userAgent|screenResolution|connectionType)$/i],
  ['URL', /^(domainName|domainSlug|finalUrl|url|referrer|landingUrl|vl_click_id|clickid|click_id|gclid|wbraid|gbraid)$|^utm_/i],
  ['IP', /^ip/i],
  ['FB', /^(_fbp|_fbc|fbclid)$/i],
];

/** Device / URL / IP / Quiz Data / FB lines, like the report screenshots. */
function groupKeys(keys: string[]): Rich[] {
  const groups = new Map<string, string[]>();
  for (const k of keys) {
    const g = KEY_GROUPS.find(([, re]) => re.test(k))?.[0] ?? 'Quiz Data';
    groups.set(g, [...(groups.get(g) ?? []), k]);
  }
  return ['Device', 'URL', 'IP', 'Quiz Data', 'FB'].filter((g) => groups.has(g)).map((g) => [`${g}: `, ...chips(groups.get(g)!)]);
}

const HIDDEN_FIELDS = /^(session_?id|sessionId|user_?id|userId|anonymous_?id|anonymousId|domainName|domainSlug|finalUrl|event|type|timestamp|path|url|gtm\..*)$/i;

/**
 * "pageView (/quiz/abcd)", "quiz (beneficiary: spouse)", "cta_click (cta_text: Yes)".
 * Quiz pushes carry device / IP / URL data and every earlier answer, so the answer shown is the
 * field that is new compared with the previous event of the same name.
 */
function describe(name: string, props: Record<string, unknown>, pagePath: string, prev?: Record<string, unknown>): string {
  if (/^page(_?view)?$/i.test(name)) return `${name} (${pagePath})`;
  const val = (v: unknown) => (Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));
  if (props.question_key !== undefined) return `${name} (${val(props.question_key)}: ${val(props.answer_value)})`;
  const answers = Object.entries(props).filter(
    ([k, v]) => !HIDDEN_FIELDS.test(k) && !KEY_GROUPS.some(([, re]) => re.test(k)) && v !== undefined && v !== '' && (typeof v !== 'object' || Array.isArray(v) || v === null),
  );
  const fresh = prev ? answers.filter(([k, v]) => JSON.stringify(prev[k]) !== JSON.stringify(v)) : answers;
  const shown = fresh.length ? fresh : answers;
  return shown.length ? `${name} (${shown.slice(0, 2).map(([k, v]) => `${k}: ${val(v)}`).join(', ')})` : name;
}

/** describe() for a list of events, passing each event's predecessor of the same name. */
function describeAll(events: Array<{ name: string; props: Record<string, unknown>; path: string }>): string[] {
  const last = new Map<string, Record<string, unknown>>();
  return events.map((e) => {
    const line = describe(e.name, e.props, e.path, last.get(e.name));
    last.set(e.name, e.props);
    return line;
  });
}

function worst(marks: Mark[]): Mark {
  return marks.includes('fail') ? 'fail' : marks.includes('warn') ? 'warn' : 'ok';
}

// ------------------------------------------------------------------ 1. GTM

function gtmSection(cap: Capture, cfg: SiteConfig): Section {
  const congrats = new RegExp(cfg.congratsPattern, 'i');
  const tagReqs = cap.requests.filter((r) => /googletagmanager\.com\/(gtm\.js|gtag\/js)/.test(r.url));
  const dl = cap.pushes.filter((p) => p.global === 'dataLayer');
  // Google Ads conversion hits: googleadservices.com/pagead/conversion/<id>/ (the AW- ID).
  const conversions = cap.requests.filter((r) => /googleadservices\.com\/pagead\/conversion\/\d+/.test(r.url));
  const ids = unique([
    ...tagReqs.map((r) => new URL(r.url).searchParams.get('id') ?? ''),
    ...dl.filter((p) => p.data?.__arguments?.[0] === 'config').map((p) => String(p.data.__arguments[1])),
    ...conversions.map((r) => `AW-${/conversion\/(\d+)/.exec(r.url)![1]}`),
  ]).filter((id) => /^(GTM|AW|G|DC)-/.test(id));
  const gtmJs = tagReqs.find((r) => r.url.includes('gtm.js'));

  const events = dl.filter((p) => typeof p.data?.event === 'string' && !/^gtm\./.test(p.data.event));
  const flow = describeAll(
    events.map((p) => {
      const { event, data, ...rest } = p.data;
      return { name: event, props: (data && typeof data === 'object' ? data : rest) as Record<string, unknown>, path: data?.domainSlug ?? pathOf(p.pageUrl) };
    }),
  );

  const issues: Section['issues'] = [];
  const macros = findMacros(cap);
  issues.push(
    macros.length
      ? { issue: ['Macro placeholders'], detail: [...chips(macros), ' sent literally'], mark: 'warn' }
      : { issue: ['Macro placeholders'], detail: ['none — all macros replaced'], mark: 'ok' },
  );
  const leads = events.filter((p) => p.data.event === cfg.leadEvent);
  const onCongrats = leads.some((p) => congrats.test(p.pageUrl));
  const conv: Rich = conversions.length ? [', but the Google Ads conversion request ', code(`AW-${/conversion\/(\d+)/.exec(conversions[0].url)![1]}`), ' fired'] : [' → Google Ads records nothing'];
  issues.push({
    issue: ['Conversion event'],
    detail: onCongrats
      ? [code(cfg.leadEvent), ' pushed on congrats page']
      : leads.length
        ? [code(cfg.leadEvent), ` pushed on ${pathOf(leads[0].pageUrl)}, not on the congrats page`, ...conv]
        : ['no ', code(cfg.leadEvent), ' push on congrats page', ...conv],
    mark: onCongrats ? 'ok' : conversions.length ? 'warn' : 'fail',
  });

  return {
    title: 'GTM',
    head: ids.length ? ids.flatMap((id, i) => (i ? [' + ', code(id)] : [code(id)])) : ['not installed'],
    mark: ids.length && ok2xx(gtmJs) ? 'ok' : 'fail',
    rows: [],
    flow,
    issues,
  };
}

/** Unreplaced ad-platform macros: __PIXEL_ID__, {{campaign.id}}, {CAMPAIGN_ID}. */
const MACRO = /__[A-Z][A-Z0-9_]*__|\{\{[^}]+\}\}|\{[A-Z][A-Z0-9_]*\}/;

/** "key: value" for every unreplaced macro in dataLayer pushes and request / page URLs. */
function findMacros(cap: Capture): string[] {
  const out: string[] = [];
  const walk = (v: unknown, key: string, depth = 0) => {
    if (depth > 8 || v === null || v === undefined) return;
    if (typeof v === 'string') {
      if (MACRO.test(v)) out.push(`${key}: ${trunc(v, 60)}`);
    } else if (typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, Array.isArray(v) ? key : k, depth + 1);
    }
  };
  for (const p of cap.pushes) walk(p.data, 'dataLayer');
  const urls = unique([...cap.requests.filter((r) => !/image|font|stylesheet|media/.test(r.resourceType)).map((r) => r.url), ...cap.requests.map((r) => r.pageUrl)]);
  for (const u of urls) {
    try {
      new URL(u).searchParams.forEach((v, k) => walk(v, k));
    } catch {
      /* not a URL */
    }
  }
  return unique(out);
}

// ------------------------------------------------------------------ 2. Pabbly

function pabblySection(cap: Capture, cfg: SiteConfig): Section {
  const re = new RegExp(cfg.pabblyPattern, 'i');
  const req = cap.requests.find((r) => r.method === 'POST' && re.test(r.url));
  if (!req) {
    return { title: 'Pabbly', head: ['no submission'], mark: 'fail', rows: [{ label: ['Endpoint'], lines: [['no POST matching ', code(cfg.pabblyPattern), ' (the quiz must be completed)']] }], issues: [] };
  }
  const body = (req.json ?? {}) as Record<string, unknown>;
  const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? Object.keys(body.data) : [];
  return {
    title: 'Pabbly',
    head: statusHead(req),
    mark: ok2xx(req) ? 'ok' : 'fail',
    rows: [
      { label: ['Endpoint'], lines: [[code(`POST ${noQuery(req.url)}`)]] },
      { label: ['Keys'], lines: req.json ? [['Top level: ', ...chips(Object.keys(body))], ...groupKeys(data)] : [['body is not JSON: ', code(trunc(req.postData ?? '', 80))]] },
    ],
    issues: [],
  };
}

// ------------------------------------------------------------------ 3. Voluum

/** Integrated = at least one button / link targets the Voluum domain (track.<domain> / gotrack.<domain>). */
function voluumSection(cap: Capture, cfg: SiteConfig): Section {
  const re = new RegExp(cfg.voluumScriptPattern, 'i');
  const reqs = cap.requests.filter((r) => re.test(r.url));
  const script = reqs.find((r) => r.resourceType === 'script') ?? reqs[0];
  const links = unique(cap.scans.flatMap((s) => s.links).map((l) => JSON.stringify(l))).map((s) => JSON.parse(s) as { text: string; kind: string; href: string });
  const domains = unique(links.map((l) => new URL(l.href).hostname));
  return {
    title: 'Voluum',
    head: links.length ? ['integrated — ', ...chips(domains)] : ['not integrated'],
    mark: links.length ? 'ok' : 'fail',
    rows: [
      { label: ['Voluum URL'], lines: domains.length ? domains.map((d) => [code(`https://${d}`)]) : [['no button or link to ', code('track.<domain>'), ' / ', code('gotrack.<domain>')]] },
      { label: ['Redirect elements'], lines: links.length ? links.map((l) => [code(l.text || '(no text)'), ` (${l.kind}) → `, code(trunc(l.href, 60))]) : [['none on the tested pages']] },
      {
        label: ['Tracking script'],
        lines: [script ? [code(noQuery(script.url)), ` ${statusHead(script).join('')} `, m(ok2xx(script) ? 'ok' : 'warn')] : ['no ', code('/d/.js'), ' request']],
      },
    ],
    issues: [],
  };
}

// ------------------------------------------------------------------ call-tracking helpers

interface Hit {
  value: unknown;
  source: string;
}

/** Every place a ChatQuiz key (ringba_zip, callCallgrid, …) was set: pushes, request bodies/URLs, page HTML. */
function findKey(cap: Capture, key: string): Hit[] {
  const hits: Hit[] = [];
  const walk = (v: unknown, source: string, depth = 0) => {
    if (depth > 10 || !v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (k === key && (x === null || typeof x !== 'object')) hits.push({ value: x, source });
      else walk(x, source, depth + 1);
    }
  };
  for (const p of cap.pushes) walk(p.data, p.global === 'dataLayer' ? `dataLayer ${p.data?.event ?? 'push'}` : '_rgba_tags');
  for (const r of cap.requests) {
    let host = '';
    try {
      const u = new URL(r.url);
      host = u.host + u.pathname;
      const q = u.searchParams.get(key);
      if (q !== null) hits.push({ value: q, source: `URL ${host}` });
    } catch {
      /* not a URL */
    }
    if (r.json) walk(r.json, `${r.method} ${host}`);
  }
  const re = new RegExp(`["']?${key}["']?\\s*:\\s*("([^"]*)"|true|false|null|-?\\d+(?:\\.\\d+)?)`, 'g');
  for (const [url, html] of cap.documents) {
    for (const mt of html.replace(/\\"/g, '"').matchAll(re)) hits.push({ value: mt[2] ?? JSON.parse(mt[1]), source: `page HTML ${pathOf(url)}` });
  }
  const seen = new Set<string>();
  return hits.filter((h) => {
    const sig = `${String(h.value)}|${h.source}`;
    return seen.has(sig) ? false : (seen.add(sig), true);
  });
}

/** One "key: value ✅ (source)" line per ChatQuiz key; `expect` checks the value. */
function keyLine(cap: Capture, key: string, expect: (v: unknown) => boolean, want: string): Rich {
  const hits = findKey(cap, key);
  const hit = hits.find((h) => expect(h.value)) ?? hits[0];
  if (!hit) return [code(key), ' not found ', m('fail'), ` (expected ${want})`];
  const good = expect(hit.value);
  return [code(`${key}: ${JSON.stringify(hit.value)}`), ' ', m(good ? 'ok' : 'fail'), ` ${hit.source}`, ...(good ? [] : [` — expected ${want}`])];
}

const isTrue = (v: unknown) => v === true || v === 'true';
const zipOf = (cfg: SiteConfig) => cfg.inputs.find((r) => /zip/i.test(r.question))?.value ?? '';

/** Which call-tracking provider the page uses. */
function providers(cap: Capture): { ringba: boolean; callgrid: boolean } {
  return {
    ringba: cap.requests.some((r) => /ringba\.com/i.test(r.url)) || findKey(cap, 'callRingba').some((h) => isTrue(h.value)),
    callgrid: cap.requests.some((r) => /callgrid/i.test(r.url)) || findKey(cap, 'callCallgrid').some((h) => isTrue(h.value)),
  };
}

/** Section for a provider the page does not use. */
function notUsed(title: string, other: string): Section {
  return { title, head: [`not used — this page uses ${other}`], mark: 'skip', rows: [], issues: [] };
}

/**
 * Phone CTA checks shared by Ringba and CallGrid: <a href="tel:">, and after the click
 * Jitsu phone_number_click + GTM phoneNumberClick carrying the displayed number and the IDs.
 */
function phoneIssues(cap: Capture, provider: string): Section['issues'] {
  const click = cap.phoneClick;
  if (!click) return [{ issue: ['Phone CTA'], detail: ['no visible ', code('<a href="tel:">'), ' to click'], mark: 'fail' }];
  const shown = digits(click.text);
  const issues: Section['issues'] = [];

  const anchorOk = shown.length === 10 && digits(click.href) === shown;
  issues.push({
    issue: ['Elements'],
    detail: [code(`<a href="${click.href}">`), ' ', code(click.text), anchorOk ? ' — tel: href matches the displayed number' : ' — href does not match the displayed number'],
    mark: anchorOk ? 'ok' : 'fail',
  });

  const fields = (name: string, payload: Record<string, unknown> | undefined, keys: Array<[string, unknown]>): Section['issues'][number] => {
    if (!payload) return { issue: [name], detail: ['not sent after the phone click'], mark: 'fail' };
    const missing = keys.filter(([, v]) => v === undefined || v === null || v === '').map(([k]) => k);
    const phone = String(keys[0][1] ?? '');
    const phoneOk = digits(phone) === shown;
    return {
      issue: [name],
      detail: [
        code(`phone: ${phone || '""'}`),
        phoneOk ? ` = displayed ${provider} number` : ` ≠ displayed ${click.text}`,
        ...(missing.length ? [' · missing ', ...chips(missing)] : [' · ', ...chips(keys.slice(1).map(([k]) => k)), ' present']),
      ],
      mark: phoneOk && !missing.length ? 'ok' : 'fail',
    };
  };

  const jitsu = cap.requests.find((r) => r.ts >= click.ts - 200 && r.json?.event === 'phone_number_click')?.json as Record<string, any> | undefined;
  const jp = (jitsu?.properties ?? {}) as Record<string, unknown>;
  issues.push(fields('Jitsu phone_number_click', jitsu, [['phone', jp.phone], ['session_id', jp.session_id], ['userId', jitsu?.userId ?? jp.userId ?? jp.user_id]]));

  const gtm = cap.pushes.find((p) => p.ts >= click.ts - 200 && p.data?.event === 'phoneNumberClick')?.data as Record<string, any> | undefined;
  const gd = { ...(gtm ?? {}), ...((gtm?.data ?? {}) as Record<string, unknown>) };
  issues.push(fields('GTM phoneNumberClick', gtm, [['phone', gd.phone], ['session_id', gd.session_id], ['user_id', gd.user_id], ['anonymous_id', gd.anonymous_id]]));
  return issues;
}

/** Failed / 4xx+ provider requests and console errors that mention the provider. */
function networkIssue(cap: Capture, re: RegExp, provider: string): Section['issues'][number] {
  const bad = cap.requests.filter((r) => re.test(r.url) && (r.failure || (r.status ?? 0) >= 400)).map((r) => `${r.status ?? r.failure} ${trunc(noQuery(r.url), 70)}`);
  const logs = cap.consoleErrors.filter((e) => re.test(e)).map((e) => trunc(e, 90));
  const all = [...bad, ...logs];
  return { issue: ['Network / Console'], detail: all.length ? chips(unique(all).slice(0, 5)) : [`no ${provider} errors`], mark: all.length ? 'fail' : 'ok' };
}

// ------------------------------------------------------------------ 4. Ringba

function ringbaSection(cap: Capture, cfg: SiteConfig): Section {
  const used = providers(cap);
  if (!used.ringba && used.callgrid) return notUsed('Ringba', 'CallGrid');
  const script = cap.requests.find((r) => /ringba\.com\/CA[0-9a-f]{8,}/i.test(r.url)) ?? cap.requests.find((r) => /ringba\.com/.test(r.url) && r.resourceType === 'script');
  if (!script) return { title: 'Ringba', head: ['not integrated'], mark: 'fail', rows: [{ label: ['Ringba script'], lines: [['no request to ', code('b-js.ringba.com/<RINGBA_ID>')]] }], issues: [] };

  const id = /\/(CA[0-9a-f]{8,})/i.exec(script.url)?.[1] ?? '?';
  const tag = cap.scans.flatMap((s) => s.scripts).find((s) => s.id === 'ringba-script-med' || /ringba\.com/.test(s.src));
  const rgba = cap.pushes.filter((p) => p.global === '_rgba_tags');
  const haystack = [...cap.requests.filter((r) => /ringba/.test(r.url)).map((r) => r.url + (r.postData ?? '')), JSON.stringify(rgba.map((p) => p.data)), ...cap.documents.values()].join('\n');
  const jsTag = /\bJS[0-9a-f]{20,}\b/i.exec(haystack)?.[0];

  // Number the server rendered vs. the one on the page after Ringba ran.
  const page = script.pageUrl;
  const html = cap.documents.get(page) ?? [...cap.documents.entries()].find(([u]) => pathOf(u) === pathOf(page))?.[1] ?? '';
  const staticNum = /\(?\d{3}\)?[ .-]?\d{3}[ .-]\d{4}/.exec(html.replace(/<[^>]+>/g, ' '))?.[0] ?? /href="tel:([^"]+)"/.exec(html)?.[1];
  const scan = [...cap.scans].reverse().find((s) => pathOf(s.url) === pathOf(page) && s.tel.length);
  const tel = scan?.tel[0];
  let numberMark: Mark = 'fail';
  let numberNote = '';
  if (tel) {
    if (digits(tel.href) !== digits(tel.text)) numberNote = ' href does not match the displayed number';
    else if (staticNum && digits(staticNum) === digits(tel.text)) {
      numberMark = 'warn';
      numberNote = ' not swapped by Ringba';
    } else numberMark = 'ok';
  }

  // _fbp / _fbc: pushed to Ringba, else the cookie.
  const pushed = (key: string) => [...rgba].reverse().map((p) => p.data?.[key]).find((v) => v !== undefined);
  const cookie = (key: string) => cap.cookies.find((c) => c.name === key)?.value;
  const fbp = String(pushed('_fbp') ?? cookie('_fbp') ?? '');
  const fbc = String(pushed('_fbc') ?? cookie('_fbc') ?? '');
  const hasFbclid = /[?&]fbclid=/.test(cfg.url);

  const userPushes = rgba.filter((p) => p.data?.type === 'User');
  const keys = unique((userPushes.length ? userPushes : rgba).flatMap((p) => (p.data && typeof p.data === 'object' ? Object.keys(p.data) : [])).filter((k) => k !== 'type'));

  return {
    title: 'Ringba',
    head: statusHead(script),
    mark: ok2xx(script) ? 'ok' : 'fail',
    rows: [
      { label: ['Ringba ID'], lines: [[code(id), ...(jsTag ? [' (JS tag ', code(jsTag), ')'] : []), ' — loaded on ', code(pathOf(script.pageUrl))]] },
      {
        label: ['Script tag'],
        lines: [tag ? [code(`<script${tag.id ? ` id="${tag.id}"` : ''} src="${tag.src}">`), ' ', m(tag.id === 'ringba-script-med' ? 'ok' : 'warn'), ...(tag.id === 'ringba-script-med' ? [] : [' (expected id ', code('ringba-script-med'), ')'])] : ['not found in the DOM ', m('fail')]],
      },
      { label: [code('<PushDataToRingbaTags />')], lines: [rgba.length ? [`${rgba.length} push(es) to `, code('_rgba_tags'), ' ', m('ok')] : ['nothing pushed to ', code('_rgba_tags'), ' ', m('fail')]] },
      {
        label: ['ChatQuiz keys'],
        lines: [
          keyLine(cap, 'ringba_zip', (v) => String(v) === zipOf(cfg), `ZIP ${zipOf(cfg)}`),
          keyLine(cap, 'ringbaScriptId', (v) => String(v) === id, id),
          keyLine(cap, 'callRingba', isTrue, 'true'),
        ],
      },
      { label: ['Static number'], lines: [[staticNum ? code(staticNum) : 'not found in the page HTML']] },
      { label: ['Changed number'], lines: [tel ? [code(tel.text), ' — href ', code(tel.href), numberNote, ' ', m(numberMark)] : ['no visible tel: link ', m('fail')]] },
      {
        label: [code('_fbp'), ' / ', code('_fbc')],
        lines: [[code(`_fbp: ${trunc(fbp) || '""'}`), ' ', m(fbp ? 'ok' : 'warn'), ' · ', code(`_fbc: ${fbc ? trunc(fbc) : '""'}`), ' ', m(fbc ? 'ok' : hasFbclid ? 'fail' : 'warn'), ...(fbc ? [] : [hasFbclid ? ' (fbclid is in the URL)' : ' (no fbclid in URL)'])]],
      },
      { label: ['Keys pushed', ...(userPushes.length ? [' (', code('type: "User"'), ')'] : [])], lines: keys.length ? groupKeys(keys) : [['nothing pushed to ', code('_rgba_tags')]] },
    ],
    issues: [...phoneIssues(cap, 'Ringba'), networkIssue(cap, /ringba/i, 'Ringba')],
  };
}

// ------------------------------------------------------------------ 5. CallGrid

function callgridSection(cap: Capture, cfg: SiteConfig): Section {
  const used = providers(cap);
  if (!used.callgrid && used.ringba) return notUsed('CallGrid', 'Ringba');
  const reqs = cap.requests.filter((r) => /callgrid/i.test(r.url));
  const flag = findKey(cap, 'callCallgrid').some((h) => isTrue(h.value));
  if (!reqs.length && !flag) {
    return { title: 'CallGrid', head: ['not integrated'], mark: 'fail', rows: [{ label: ['CallGrid'], lines: [['no CallGrid request and no ', code('callCallgrid: true')]] }], issues: [] };
  }
  const failed = reqs.filter((r) => r.failure || (r.status ?? 0) >= 400);

  // What CallGrid itself used: campaign source and the number it swapped in.
  const sourceInTraffic = reqs.map((r) => (r.json?.campaignSourceId as string | undefined) ?? safeParam(r.url, 'campaignSourceId')).find(Boolean);
  const swap = reqs.map((r) => r.json).find((j) => j?.number && j?.originalNumber);
  const hasKey = (key: string) => findKey(cap, key).length > 0;
  const inferred = (key: string, note: string): Rich => [code(key), ' not visible in page data ', m('warn'), ` — ${note}`];

  return {
    title: 'CallGrid',
    head: reqs.length ? [`${reqs.length - failed.length}/${reqs.length} requests OK`] : ['no CallGrid requests'],
    mark: reqs.length && !failed.length ? 'ok' : 'fail',
    rows: [
      { label: ['Requests'], lines: reqs.length ? unique(reqs.map((r) => `${r.status ?? r.failure ?? '…'} ${trunc(noQuery(r.url), 80)}`)).slice(0, 6).map((l) => [code(l)]) : [['none']] },
      { label: ['Campaign source'], lines: [sourceInTraffic ? [code(sourceInTraffic), ' (sent by CallGrid) ', m('ok')] : ['not sent by CallGrid ', m('fail')]] },
      { label: ['Number swap'], lines: [swap ? [code(String(swap.originalNumber)), ' → ', code(String(swap.number)), ' ', m(digits(swap.number) !== digits(swap.originalNumber) ? 'ok' : 'warn')] : ['no swap reported by CallGrid']] },
      {
        label: ['ChatQuiz keys'],
        lines: [
          keyLine(cap, 'collectedzipcode', (v) => String(v) === zipOf(cfg), `ZIP ${zipOf(cfg)}`),
          hasKey('callgridCampaignSourceId') || !sourceInTraffic
            ? keyLine(cap, 'callgridCampaignSourceId', (v) => typeof v === 'string' && v.length > 0, 'a campaign source ID')
            : inferred('callgridCampaignSourceId', `CallGrid received campaign source ${sourceInTraffic}`),
          hasKey('callCallgrid') || !reqs.length ? keyLine(cap, 'callCallgrid', isTrue, 'true') : inferred('callCallgrid', 'CallGrid is loaded and is the active CTA provider'),
        ],
      },
    ],
    issues: [...phoneIssues(cap, 'CallGrid'), networkIssue(cap, /callgrid/i, 'CallGrid')],
  };
}

// ------------------------------------------------------------------ 6. Jitsu

function jitsuSection(cap: Capture, cfg: SiteConfig): Section {
  const re = new RegExp(cfg.jitsuScriptPattern, 'i');
  const script = cap.requests.find((r) => re.test(r.url));
  const events = cap.requests
    .filter((r) => r.method === 'POST' && /\/api\/s\/(track|page|identify)/.test(r.url) && r.json)
    .map((r) => {
      const j = r.json as Record<string, any>;
      const props = (j.properties ?? {}) as Record<string, unknown>;
      const name = String(j.event ?? j.type);
      return { name, props, userId: j.userId ?? props.userId ?? props.user_id, path: String(props.path ?? j.context?.page?.path ?? pathOf(r.pageUrl)) };
    });

  const issues: Section['issues'] = [];
  if (!events.length) issues.push({ issue: ['Events'], detail: ['no Jitsu events were sent'], mark: 'fail' });
  else {
    const empty = (e: (typeof events)[number]) => e.userId === null || e.userId === undefined || e.userId === '';
    const missing = unique(events.filter(empty).map((e) => e.name));
    const set = unique(events.filter((e) => !empty(e)).map((e) => e.name)).filter((n) => !missing.includes(n));
    const join = (a: string[]): Rich => a.flatMap((n, i) => (i ? [i === a.length - 1 ? ' and ' : ', ', code(n)] : [code(n)]));
    issues.push(
      missing.length
        ? { issue: [code('userId')], detail: [code('null'), ' on ', ...join(missing), ...(set.length ? [', only set on ', ...join(set)] : [' on every event'])], mark: 'warn' }
        : { issue: [code('userId')], detail: ['set on every event'], mark: 'ok' },
    );
  }

  return {
    title: 'Jitsu',
    head: script ? [code(noQuery(script.url))] : ['script not loaded'],
    mark: ok2xx(script) ? 'ok' : 'fail',
    rows: [],
    flow: describeAll(events),
    issues,
  };
}

// ------------------------------------------------------------------

export function buildSections(cap: Capture, cfg: SiteConfig): Section[] {
  return [gtmSection(cap, cfg), pabblySection(cap, cfg), voluumSection(cap, cfg), ringbaSection(cap, cfg), callgridSection(cap, cfg), jitsuSection(cap, cfg)];
}

/** Worst mark in a section: header, issue rows and inline icons. */
export function sectionMark(s: Section): Mark {
  if (s.mark === 'skip') return 'skip';
  const inline = s.rows.flatMap((r) => r.lines.flat()).flatMap((x) => (typeof x === 'object' && 'm' in x ? [x.m] : []));
  return worst([s.mark, ...s.issues.map((i) => i.mark), ...inline]);
}

export interface Verdict {
  title: string;
  mark: Mark;
  head: Rich;
  /** Indexes of the sections this verdict covers (for links into the details). */
  sections: number[];
}

const CALL_TRACKING = ['Ringba', 'CallGrid'];
const RANK: Record<Mark, number> = { ok: 0, warn: 1, fail: 2, skip: 3 };

/**
 * The requirements: one verdict per check, except Ringba and CallGrid, which form one
 * "Call tracking" requirement that is met when either provider is integrated correctly.
 */
export function verdicts(sections: Section[]): Verdict[] {
  const out: Verdict[] = [];
  sections.forEach((s, i) => {
    if (!CALL_TRACKING.includes(s.title)) {
      out.push({ title: s.title, mark: sectionMark(s), head: s.head, sections: [i] });
      return;
    }
    if (out.some((v) => v.title === 'Call tracking')) return;
    const idx = sections.map((x, j) => (CALL_TRACKING.includes(x.title) ? j : -1)).filter((j) => j >= 0);
    const marks = idx.map((j) => sectionMark(sections[j]));
    const best = marks.filter((mk) => mk !== 'skip').sort((a, b) => RANK[a] - RANK[b])[0] ?? 'fail';
    out.push({
      title: 'Call tracking',
      mark: best,
      head: idx.flatMap((j, k) => [...(k ? [' · '] : []), `${sections[j].title} `, { m: marks[k] } as const]),
      sections: idx,
    });
  });
  return out;
}
