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
/** "200 OK", "400 Bad Request" or the network error when the request never completed. */
const statusHead = (r?: Req): Rich => (r ? [r.status ? `${r.status} ${STATUS_TEXT[r.status] ?? ''}`.trim() : (r.failure ?? 'no response')] : ['not loaded']);

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

function gtmSection(cap: Capture, cfg: SiteConfig, facts: RunFacts): Section {
  const tagReqs = cap.requests.filter((r) => /googletagmanager\.com\/(gtm\.js|gtag\/js)/.test(r.url));
  const dl = cap.pushes.filter((p) => p.global === 'dataLayer');
  // Google Ads conversion hits: googleadservices.com/pagead/conversion/<id>/ (the AW- ID).
  const conversions = cap.requests.filter((r) => /pagead\/(conversion|viewthroughconversion)\/\d+/.test(r.url));
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

  // layout.tsx exposes the container id from NEXT_PUBLIC_GTM_CONTAINER_ID.
  const cfId = cap.scans.map((s) => s.cfGtmId).find(Boolean) ?? null;
  const loadedId = gtmJs ? new URL(gtmJs.url).searchParams.get('id') : null;
  const idMatch = !cfId || !loadedId || cfId === loadedId;
  const noscript = cap.scans.map((s) => s.gtmNoscript).find(Boolean) ?? null;

  const wantedId = cfg.gtmContainerId;
  const expectedOk = !wantedId || wantedId === (cfId ?? loadedId);
  const rows: Section['rows'] = [
    {
      label: ['Container ID'],
      lines: [
        cfId
          ? [
              code(`window.cf_variable.GTM_ID = ${cfId}`),
              ' ',
              m(idMatch && expectedOk ? 'ok' : 'fail'),
              ...(idMatch ? [] : [' — ', code('gtm.js'), ` loaded ${loadedId} instead`]),
              ...(expectedOk ? [] : [' — expected ', code(wantedId!)]),
            ]
          : ['not exposed as ', code('window.cf_variable.GTM_ID'), ' ', m('warn'), ' — check ', code('NEXT_PUBLIC_GTM_CONTAINER_ID')],
      ],
    },
    { label: [code('gtm.js')], lines: [gtmJs ? [code(noQuery(gtmJs.url)), `?id=${loadedId} → ${statusHead(gtmJs).join('')} `, m(ok2xx(gtmJs) ? 'ok' : 'fail')] : ['no request to ', code('googletagmanager.com/gtm.js'), ' ', m('fail')]] },
    { label: [code('<noscript>')], lines: [[noscript ? `ns.html?id=${noscript} ` : 'fallback iframe not found ', m(noscript ? 'ok' : 'warn')]] },
  ];

  const issues: Section['issues'] = [];
  // Every push should carry the ids the template sends (session_id, user_id, anonymous_id).
  for (const name of unique(events.map((p) => p.data.event as string))) {
    const pushes = events.filter((p) => p.data.event === name);
    const missing = unique(
      pushes.flatMap((p) => {
        const d = (p.data.data ?? p.data) as Record<string, unknown>;
        return ['session_id', 'user_id', 'anonymous_id'].filter((k) => d[k] === undefined || d[k] === null || d[k] === '');
      }),
    );
    issues.push({
      issue: [code(name)],
      detail: missing.length ? ['missing ', ...chips(missing), ` in ${pushes.length > 1 ? `${pushes.length} pushes` : 'the push'}`] : [`${pushes.length} push(es) with `, ...chips(['session_id', 'user_id', 'anonymous_id'])],
      mark: missing.length ? 'warn' : 'ok',
    });
  }
  const macros = findMacros(cap);
  issues.push(
    macros.length
      ? { issue: ['Macro placeholders'], detail: [...chips(macros), ' sent literally'], mark: 'warn' }
      : { issue: ['Macro placeholders'], detail: ['none — all macros replaced'], mark: 'ok' },
  );
  const conversion = conversions[0];
  issues.push({
    issue: ['Google Ads conversion'],
    detail: conversion ? [code(`AW-${/conversion\/(\d+)/.exec(conversion.url)![1]}`), ' conversion request fired'] : ['no conversion request during this run (fired by a GTM trigger, not by the page)'],
    mark: conversion ? 'ok' : 'warn',
  });

  // The templates call pushLocalDataToDataLayer('Lead') on the final quiz step, but that helper
  // ignores its argument and always pushes `quiz` — so `Lead` never reaches GTM.
  if (facts.congrats) {
    const lead = events.find((p) => p.data.event === cfg.leadEvent);
    const quizAtEnd = events.some((p) => p.data.event === 'quiz');
    issues.push({
      issue: [code(cfg.leadEvent), ' on lead submit'],
      detail: lead
        ? [code(cfg.leadEvent), ' pushed when the quiz completed']
        : [
            'the quiz completed but only ',
            code(quizAtEnd ? 'quiz' : 'no event'),
            ' was pushed — ',
            code('pushLocalDataToDataLayer(\'Lead\')'),
            ' ignores its argument in ',
            code('src/utils/analytics.ts'),
            ', so a GTM trigger on ',
            code(cfg.leadEvent),
            ' never fires',
          ],
      mark: lead ? 'ok' : 'fail',
    });
  }

  const consoleErrors = cap.consoleErrors.filter((e) => /gtm|googletagmanager|datalayer/i.test(e));
  if (consoleErrors.length) issues.push({ issue: ['Console'], detail: chips(unique(consoleErrors).slice(0, 3).map((e) => trunc(e, 80))), mark: 'fail' });

  return {
    title: 'GTM',
    head: ids.length ? ids.flatMap((id, i) => (i ? [' + ', code(id)] : [code(id)])) : ['not installed'],
    mark: ids.length && ok2xx(gtmJs) ? 'ok' : 'fail',
    rows,
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

/**
 * Endpoint + the keys it sent — nothing else. The quiz JSON carries `pabblyUrl`; when it is empty
 * the quiz sends no submission at all, so the check only applies to quizzes that configure it.
 */
function pabblySection(cap: Capture, cfg: SiteConfig): Section {
  const re = new RegExp(cfg.pabblyPattern, 'i');
  const req = cap.requests.find((r) => r.method === 'POST' && re.test(r.url));
  if (!req) {
    const configured = findKey(cap, 'pabblyUrl').some((h) => typeof h.value === 'string' && h.value.length > 4);
    return {
      title: 'Pabbly',
      head: configured ? ['no submission'] : ['not used by this quiz'],
      mark: configured ? 'fail' : 'skip',
      rows: [
        {
          label: ['Endpoint'],
          lines: [configured ? [code('pabblyUrl'), ' is configured but no ', code(`POST …/${cfg.pabblyPattern}`), ' was sent'] : [code('pabblyUrl'), ' is empty in the quiz config — no submission is sent']],
        },
      ],
      issues: [],
    };
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

/**
 * Integrated (pass/fail) = our loader ran and Voluum's own custom domain was used
 * (track. / gotrack. / tracking. / gotracking. on the site's domain, or the dtp request signature).
 * Whether Voluum could attribute the visit is reported separately: without a campaign id in the
 * URL its request fails, which says nothing about the integration.
 */
function voluumSection(cap: Capture, cfg: SiteConfig): Section {
  const loader = cap.requests.find((r) => new RegExp(cfg.voluumLoaderPattern, 'i').test(r.url));
  const host = new RegExp(cfg.voluumHostPattern, 'i');
  const onVoluumHost = (url: string) => {
    try {
      return host.test(new URL(url).hostname);
    } catch {
      return false;
    }
  };
  // voluum-scripts.js builds <voluum domain>/d/.js?lpref=…&lpurl=…&lpt=…&vtm=… — find it by that
  // signature too, so a custom domain with another name (tracking., gotracking., …) still counts.
  const isDtp = (r: Req) => /[?&]lpref=/.test(r.url) && /[?&]lpurl=/.test(r.url);
  const domainReqs = cap.requests.filter((r) => onVoluumHost(r.url) || isDtp(r));
  const dtpReq = domainReqs.find(isDtp) ?? domainReqs.find((r) => new RegExp(cfg.voluumScriptPattern, 'i').test(r.url)) ?? domainReqs[0];
  const links = unique(cap.scans.flatMap((s) => s.links).map((l) => JSON.stringify(l))).map((s) => JSON.parse(s) as { text: string; kind: string; href: string });
  const domains = unique([...domainReqs, ...links.map((l) => ({ url: l.href }))].map((r) => new URL(r.url).hostname));
  const dtp = cap.scans.some((s) => s.dtp);
  const clickId = cap.scans.map((s) => s.clickId).filter(Boolean).at(-1);
  // A real campaign id: present, non-empty and not an unreplaced macro like {CAMPAIGN_ID}.
  const hasCampaign = (() => {
    try {
      for (const [k, v] of new URL(cfg.url).searchParams) {
        if (/^(cpid|campaign_id|clickid|cep|vlsid)$/i.test(k) && v && !MACRO.test(v)) return true;
      }
    } catch {
      /* not a URL */
    }
    return false;
  })();

  const scripts = cap.scans.some((s) => s.globals.VoluumScripts);
  const onVoluumPath = new RegExp(cfg.voluumPathPattern, 'i').test(pathOf(cfg.url));
  const integrated = !!loader && (!!domainReqs.length || !!links.length || (scripts && onVoluumPath));

  // VoluumScripts.init() only runs on the lander / quiz paths listed in layout.tsx.
  if (loader && scripts && !onVoluumPath && !domainReqs.length && !links.length) {
    return {
      title: 'Voluum',
      head: ['loaded, not started on this path'],
      mark: 'skip',
      rows: [
        { label: ['Loader'], lines: [[code(noQuery(loader.url)), ` ${statusHead(loader).join('')} `, m('ok')]] },
        { label: ['Path'], lines: [[code(pathOf(cfg.url)), ' does not match ', code(cfg.voluumPathPattern), ' — ', code('VoluumScripts.init()'), ' only runs on the lander / quiz paths']] },
      ],
      issues: [],
    };
  }

  const rows: Section['rows'] = [
    { label: ['Loader'], lines: [loader ? [code(noQuery(loader.url)), ` ${statusHead(loader).join('')} `, m(ok2xx(loader) ? 'ok' : 'fail')] : ['no request matching ', code(cfg.voluumLoaderPattern), ' ', m('fail')]] },
    {
      label: ['Voluum domain'],
      lines: domains.length
        ? domains.map((d) => [code(d), ' ', m(host.test(d) ? 'ok' : 'warn'), ...(host.test(d) ? [] : [' — not a ', code('track./gotrack.<site domain>'), ' custom domain'])])
        : [['no request, button or link to ', code('track.<domain>'), ' / ', code('gotrack.<domain>'), ' ', m('fail')]],
    },
    { label: [code('VoluumScripts')], lines: [[scripts ? 'installed by the loader ' : 'not installed ', m(scripts ? 'ok' : 'fail')]] },
    { label: [code('dtpCallback')], lines: [[dtp ? 'installed on the page ' : 'not installed ', m(dtp ? 'ok' : integrated ? 'warn' : 'fail')]] },
    { label: ['Redirect elements'], lines: links.length ? links.map((l) => [code(l.text || '(no text)'), ` (${l.kind}) → `, code(trunc(l.href, 60))]) : [['none on the tested pages (landers carry them, quiz pages usually do not)']] },
  ];

  // Attribution: informative only — a missing campaign id is a link problem, not an integration one.
  const attribution: Section['issues'] = [];
  if (dtpReq) {
    const fine = ok2xx(dtpReq);
    // A network-level failure means the custom domain itself is not set up (Voluum → Domains).
    const dns = /ERR_NAME_NOT_RESOLVED|ERR_ADDRESS_UNREACHABLE/i.test(dtpReq.failure ?? '');
    const cert = /ERR_CERT|SSL/i.test(dtpReq.failure ?? '');
    const why: Rich = dns
      ? [' — the domain does not resolve: the DNS record is missing, so ', code('Domain status'), ' will not be ', code('Connected')]
      : cert
        ? [' — certificate error: the certificate record is missing, so ', code('Certificate Status'), ' will not be ', code('Issued')]
        : hasCampaign
          ? [' — the Voluum domain rejected it; check ', code('Certificate Status'), ' / ', code('Domain status'), ' in Voluum → Domains']
          : [' — no campaign id (', code('cpid'), ') in the URL, so Voluum cannot attribute this visit'];
    attribution.push({
      issue: ['Tracking request'],
      detail: [code(noQuery(dtpReq.url)), ` → ${statusHead(dtpReq).join('')}`, ...(fine ? [] : why)],
      mark: fine ? 'ok' : dns || cert || hasCampaign ? 'fail' : 'warn',
    });
  }
  attribution.push({
    issue: [code('clickId')],
    detail: clickId ? [code(trunc(clickId, 40)), ' stored in sessionStorage'] : ['not stored', ...(hasCampaign ? [' — expected with a campaign id in the URL'] : [' (no campaign id in the tested URL)'])],
    mark: clickId ? 'ok' : 'warn',
  });

  // The Voluum click id travels on into the payloads (Jitsu /api/s/track, Ringba tags, CallGrid).
  const vl = findKey(cap, 'vl_click_id').filter((h) => h.value !== '' && h.value !== null);
  attribution.push({
    issue: [code('vl_click_id'), ' in payloads'],
    detail: vl.length
      ? [code(trunc(String(vl[0].value), 40)), ` — reached ${unique(vl.map((h) => h.source)).slice(0, 3).join(', ')}`]
      : ['not present in any tracking payload', ...(clickId ? [' although a click id was stored'] : [' (no Voluum click id for this visit)'])],
    mark: vl.length ? 'ok' : clickId ? 'fail' : 'warn',
  });

  return {
    title: 'Voluum',
    head: integrated ? ['integrated — ', ...chips(domains.length ? domains : ['custom domain'])] : ['not integrated'],
    mark: integrated ? 'ok' : 'fail',
    rows,
    issues: attribution,
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
  // Minified bundles write true/false as !0/!1 and may use single quotes.
  const re = new RegExp(`["']?${key}["']?\\s*:\\s*("([^"]*)"|'([^']*)'|true|false|!0|!1|null|-?\\d+(?:\\.\\d+)?)`, 'g');
  const literal = (raw: string) => (raw === '!0' ? true : raw === '!1' ? false : JSON.parse(raw));
  const scanText = (text: string, source: string) => {
    for (const mt of text.replace(/\\"/g, '"').matchAll(re)) hits.push({ value: mt[2] ?? mt[3] ?? literal(mt[1]), source });
  };
  for (const [url, html] of cap.documents) scanText(html, `page HTML ${pathOf(url)}`);
  // The quiz JSON (ringbaScriptId, callgridCampaignSourceId, pabblyUrl…) is bundled into the chunks.
  for (const b of cap.bodies) if (b.text.includes(key)) scanText(b.text, `quiz config in ${pathOf(b.url).split('/').pop()}`);
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

/** A config key that is not readable from outside, but whose effect is visible at runtime. */
const inferred = (key: string, note: string): Rich => [code(key), ' not visible in page data ', m('warn'), ` — ${note}`];
const zipOf = (cfg: SiteConfig) => cfg.inputs.find((r) => /zip/i.test(r.question))?.value ?? '';

/**
 * The provider ZIP key (ringba_zip / collectedzipcode). The quiz stores `zipcodeResponse.postCode`,
 * so an unknown ZIP is stored as "" — that is the test ZIP's fault, not the integration's.
 */
function zipLine(cap: Capture, cfg: SiteConfig, key: string): Rich {
  const zip = zipOf(cfg);
  const hits = findKey(cap, key);
  const match = hits.find((h) => String(h.value) === zip);
  if (match) return [code(`${key}: ${zip}`), ' ', m('ok'), ` ${match.source}`];

  const stored = cap.scans.map((s) => s.quizValues?.[key]).find((v) => v !== undefined);
  const emptyValue = stored === '' || hits.some((h) => h.value === '' || h.value === null);
  const lookedUp = cap.requests.some((r) => /\/api\/zipcode\/us\//.test(r.url));
  if (emptyValue && lookedUp) {
    return [code(`${key}: ""`), ' ', m('warn'), ' — the ZIP lookup returned no ', code('postCode'), ` for ${zip}, so the quiz stored an empty value. Test with a real US ZIP to verify this key.`];
  }
  // "Do not assume every quiz requires ZIP": no ZIP step at all is not a failure.
  const askedZip = lookedUp || cap.scans.some((s) => Object.keys(s.quizValues ?? {}).some((k) => /zip/i.test(k)));
  if (!hits.length && !askedZip) return [code(key), ' — this quiz has no ZIP step ', m('skip')];
  if (!hits.length) return [code(key), ' not set although a ZIP was entered ', m('warn')];
  return keyLine(cap, key, (v) => String(v) === zip, `ZIP ${zip}`);
}

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
 * No provider evidence. Ringba / CallGrid are injected only at the end of the quiz, when the
 * number appears — if the run never got there, the result is inconclusive, not a failure.
 */
function providerMissing(title: string, facts: RunFacts, detail: Rich): Section {
  if (!facts.leadStage) {
    return {
      title,
      head: ['not verified — the quiz did not finish'],
      mark: 'skip',
      rows: [{ label: [title], lines: [[`${title} loads only when the quiz reaches the phone number; this run stopped earlier, so nothing could be checked`]] }],
      issues: [],
    };
  }
  return { title, head: ['not integrated'], mark: 'fail', rows: [{ label: [title], lines: [[...detail, ' although the quiz reached the phone number']] }], issues: [] };
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

function ringbaSection(cap: Capture, cfg: SiteConfig, facts: RunFacts): Section {
  const used = providers(cap);
  if (!used.ringba && used.callgrid) return notUsed('Ringba', 'CallGrid');
  const script = cap.requests.find((r) => /ringba\.com\/CA[0-9a-f]{8,}/i.test(r.url)) ?? cap.requests.find((r) => /ringba\.com/.test(r.url) && r.resourceType === 'script');
  if (!script) return providerMissing('Ringba', facts, ['no request to ', code('b-js.ringba.com/<RINGBA_ID>')]);

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
      {
        label: ['Ringba ID'],
        lines: [
          [
            code(id),
            ...(jsTag ? [' (JS tag ', code(jsTag), ')'] : []),
            ' — loaded on ',
            code(pathOf(script.pageUrl)),
            ...(cfg.ringbaId ? [' ', m(cfg.ringbaId === id ? 'ok' : 'fail'), ...(cfg.ringbaId === id ? [] : [' — expected ', code(cfg.ringbaId)])] : []),
          ],
        ],
      },
      {
        label: ['Script tag'],
        lines: [tag ? [code(`<script${tag.id ? ` id="${tag.id}"` : ''} src="${tag.src}">`), ' ', m(tag.id === 'ringba-script-med' ? 'ok' : 'warn'), ...(tag.id === 'ringba-script-med' ? [] : [' (expected id ', code('ringba-script-med'), ')'])] : ['not found in the DOM ', m('fail')]],
      },
      { label: [code('<PushDataToRingbaTags />')], lines: [rgba.length ? [`${rgba.length} push(es) to `, code('_rgba_tags'), ' ', m('ok')] : ['nothing pushed to ', code('_rgba_tags'), ' ', m('fail')]] },
      {
        label: ['ChatQuiz keys'],
        lines: [
          zipLine(cap, cfg, 'ringba_zip'),
          // The loaded script proves the id even when the quiz config is not readable from outside.
          findKey(cap, 'ringbaScriptId').length ? keyLine(cap, 'ringbaScriptId', (v) => String(v) === id, id) : inferred('ringbaScriptId', `the page loaded b-js.ringba.com/${id}`),
          findKey(cap, 'callRingba').length ? keyLine(cap, 'callRingba', isTrue, 'true') : inferred('callRingba', 'Ringba is loaded and is the active CTA provider'),
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

function callgridSection(cap: Capture, cfg: SiteConfig, facts: RunFacts): Section {
  const used = providers(cap);
  if (!used.callgrid && used.ringba) return notUsed('CallGrid', 'Ringba');
  const reqs = cap.requests.filter((r) => /callgrid/i.test(r.url));
  const flag = findKey(cap, 'callCallgrid').some((h) => isTrue(h.value));
  if (!reqs.length && !flag) {
    return providerMissing('CallGrid', facts, ['no CallGrid request and no ', code('callCallgrid: true')]);
  }
  const failed = reqs.filter((r) => r.failure || (r.status ?? 0) >= 400);

  // What CallGrid itself used: campaign source and the number it swapped in.
  const sourceInTraffic = reqs.map((r) => (r.json?.campaignSourceId as string | undefined) ?? safeParam(r.url, 'campaignSourceId')).find(Boolean);
  const swap = reqs.map((r) => r.json).find((j) => j?.number && j?.originalNumber);
  const hasKey = (key: string) => findKey(cap, key).length > 0;

  return {
    title: 'CallGrid',
    head: reqs.length ? [`${reqs.length - failed.length}/${reqs.length} requests OK`] : ['no CallGrid requests'],
    mark: reqs.length && !failed.length ? 'ok' : 'fail',
    rows: [
      { label: ['Requests'], lines: reqs.length ? unique(reqs.map((r) => `${r.status ?? r.failure ?? '…'} ${trunc(noQuery(r.url), 80)}`)).slice(0, 6).map((l) => [code(l)]) : [['none']] },
      {
        label: ['Campaign source'],
        lines: [
          sourceInTraffic
            ? [
                code(sourceInTraffic),
                ' (sent by CallGrid) ',
                m(!cfg.callgridCampaignSourceId || cfg.callgridCampaignSourceId === sourceInTraffic ? 'ok' : 'fail'),
                ...(!cfg.callgridCampaignSourceId || cfg.callgridCampaignSourceId === sourceInTraffic ? [] : [' — expected ', code(cfg.callgridCampaignSourceId)]),
              ]
            : ['not sent by CallGrid ', m('fail')],
        ],
      },
      { label: ['Number swap'], lines: [swap ? [code(String(swap.originalNumber)), ' → ', code(String(swap.number)), ' ', m(digits(swap.number) !== digits(swap.originalNumber) ? 'ok' : 'warn')] : ['no swap reported by CallGrid']] },
      {
        label: ['ChatQuiz keys'],
        lines: [
          zipLine(cap, cfg, 'collectedzipcode'),
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

// ------------------------------------------------------------------ 6. Clarity

/** Tag script with the project ID, window.clarity, and a successful /collect request. */
function claritySection(cap: Capture, cfg: SiteConfig): Section {
  const tag = cap.requests.find((r) => /clarity\.ms\/tag\//.test(r.url));
  const library = cap.requests.find((r) => /clarity\.ms\/.*clarity\.js/.test(r.url));
  const collects = cap.requests.filter((r) => /clarity\.ms\/collect/.test(r.url));
  const okCollect = collects.find((r) => ok2xx(r) || r.status === 204);
  const installed = cap.scans.some((s) => s.clarity);
  const projectId = tag ? /clarity\.ms\/tag\/([^/?]+)/.exec(tag.url)?.[1] : undefined;
  const wanted = cfg.clarityProjectId;
  const idOk = !wanted || wanted === projectId;
  // Only some templates include Clarity (ClarityTracker + the tag in layout.tsx).
  if (!tag && !installed) {
    return { title: 'Clarity', head: ['not used on this page'], mark: 'skip', rows: [{ label: ['Tag script'], lines: [['no ', code('clarity.ms/tag/<project id>'), ' request — this template does not include Clarity']] }], issues: [] };
  }

  const consoleErrors = cap.consoleErrors.filter((e) => /clarity/i.test(e));
  // Clarity works if the tag loaded, or if it was cached and clarity is running and collecting.
  const working = (tag ? ok2xx(tag) : installed && !!okCollect) && idOk;
  return {
    title: 'Clarity',
    head: projectId ? [code(projectId)] : ['installed'],
    mark: working ? 'ok' : 'fail',
    rows: [
      {
        label: ['Tag script'],
        lines: [tag ? [code(noQuery(tag.url)), ` ${statusHead(tag).join('')} `, m(ok2xx(tag) && idOk ? 'ok' : 'fail'), ...(idOk ? [] : [' — expected project ', code(wanted!)])] : ['no request (served from cache?) ', m(installed ? 'warn' : 'fail')]],
      },
      { label: [code('clarity.js')], lines: [[library ? `${noQuery(library.url)} ${statusHead(library).join('')} ` : 'library not loaded ', m(library && ok2xx(library) ? 'ok' : 'warn')]] },
      { label: [code('window.clarity')], lines: [[installed ? 'installed ' : 'not installed ', m(installed ? 'ok' : 'fail')]] },
      {
        label: ['Collect'],
        lines: [collects.length ? [`${collects.length} request(s), last status ${collects[collects.length - 1].status ?? '—'} `, m(okCollect ? 'ok' : 'fail')] : ['no ', code('/collect'), ' request — Clarity is not sending data ', m('fail')]],
      },
    ],
    issues: consoleErrors.length ? [{ issue: ['Console'], detail: chips(unique(consoleErrors).slice(0, 3).map((e) => trunc(e, 80))), mark: 'fail' }] : [{ issue: ['Console'], detail: ['no Clarity errors'], mark: 'ok' }],
  };
}

// ------------------------------------------------------------------ 7. Jitsu

/**
 * Properties each event must carry (from the tracking docs). `soft` fields are reported when
 * missing but are not a failure; `nullable` fields may legitimately be null (first/last step).
 */
const JITSU_EVENTS: Record<string, { required: string[]; nullable?: string[]; soft?: string[]; expect: keyof RunFacts | 'always'; soften?: boolean }> = {
  page_view: { required: ['path', 'session_id', 'userId'], soft: ['anonymousId', 'context.page', 'context.campaign'], expect: 'always' },
  // Only buttons flagged callRingba / callCallgrid send cta_click, so a missing one is a warning.
  cta_click: { required: ['cta_text', 'session_id', 'userId'], expect: 'answered', soften: true },
  quiz_data: { required: ['question_key', 'answer_value', 'current_step', 'session_id', 'user_id'], nullable: ['previous_step', 'next_step'], soft: ['question_type', 'previous_step', 'next_step'], expect: 'answered' },
  lead_submit: { required: ['session_id'], soft: ['user_id', 'device', 'browser', 'os', 'domainName', 'domainSlug', 'finalUrl', 'screenResolution'], expect: 'congrats' },
  phone_number_click: { required: ['phone', 'session_id', 'userId'], expect: 'phoneClicked' },
};

/** What the run actually did — an event is only expected when its action happened. */
export interface RunFacts {
  answered: boolean;
  congrats: boolean;
  /** The quiz reached the point where the phone number appears — where Ringba / CallGrid load. */
  leadStage: boolean;
  phoneClicked: boolean;
}

/** Expected types per property ("Data types" in the verification guide). */
const JITSU_TYPES: Record<string, Array<'string' | 'number' | 'boolean' | 'object' | 'array'>> = {
  path: ['string'],
  session_id: ['string'],
  userId: ['string'],
  user_id: ['string'],
  anonymousId: ['string'],
  cta_text: ['string'],
  phone: ['string', 'number'],
  question_key: ['string'],
  question_type: ['string'],
  current_step: ['string', 'number'],
  previous_step: ['string', 'number'],
  next_step: ['string', 'number'],
  'context.page': ['object'],
  'context.campaign': ['object'],
};

const typeOf = (v: unknown) => (Array.isArray(v) ? 'array' : typeof v);

/** `properties.x`, `x` or a dotted path like `context.page`. */
function prop(payload: Record<string, any>, path: string): unknown {
  const walk = (o: unknown, p: string) => p.split('.').reduce<any>((v, k) => (v == null ? undefined : v[k]), o);
  return walk(payload.properties, path) ?? walk(payload, path);
}

function jitsuSection(cap: Capture, cfg: SiteConfig, facts: RunFacts): Section {
  const loader = cap.requests.find((r) => new RegExp(cfg.jitsuLoaderPattern, 'i').test(r.url));
  const library = cap.requests.find((r) => new RegExp(cfg.jitsuScriptPattern, 'i').test(r.url));
  const posts = cap.requests.filter((r) => r.method === 'POST' && /\/api\/s\/(track|page|identify)/.test(r.url) && r.json);
  const events = posts.map((r) => {
    const j = r.json as Record<string, any>;
    const props = (j.properties ?? {}) as Record<string, unknown>;
    return { name: String(j.event ?? j.type), payload: j, props, path: String(props.path ?? j.context?.page?.path ?? pathOf(r.pageUrl)), status: r.status };
  });
  const failed = posts.filter((r) => r.failure || (r.status ?? 0) >= 400);

  const rows: Section['rows'] = [
    { label: ['Loader'], lines: [loader ? [code(noQuery(loader.url)), ` ${statusHead(loader).join('')} `, m(ok2xx(loader) ? 'ok' : 'fail')] : ['no request matching ', code(cfg.jitsuLoaderPattern), ' ', m('fail')]] },
    {
      label: ['Library'],
      lines: [library ? [code(noQuery(library.url)), ` ${statusHead(library).join('')} `, m(ok2xx(library) ? 'ok' : 'fail')] : [posts.length ? 'no request (served from cache) but events are being sent ' : 'not loaded ', m(posts.length ? 'ok' : 'fail')]],
    },
    { label: ['Endpoint'], lines: [posts.length ? [code(noQuery(posts[0].url)), ` — ${posts.length} event(s), ${failed.length} failed `, m(failed.length ? 'fail' : 'ok')] : ['no ', code('/api/s/track'), ' request ', m('fail')]] },
  ];

  const issues: Section['issues'] = [];
  for (const [name, spec] of Object.entries(JITSU_EVENTS)) {
    const seen = events.filter((e) => e.name === name);
    const expected = spec.expect === 'always' || facts[spec.expect];
    if (!seen.length) {
      // Not every quiz has every step: only require the event when its action happened.
      issues.push({
        issue: [code(name)],
        detail: expected
          ? [spec.soften ? 'not sent — only buttons flagged callRingba / callCallgrid send it' : 'not sent although the action happened in this run']
          : ['not sent (the action did not happen in this run)'],
        mark: expected ? (spec.soften ? 'warn' : 'fail') : 'skip',
      });
      continue;
    }
    const missing = unique(
      seen.flatMap((e) =>
        spec.required.filter((f) => {
          const v = prop(e.payload, f);
          return v === undefined || v === '' || (v === null && !spec.nullable?.includes(f));
        }),
      ),
    );
    const softMissing = unique(seen.flatMap((e) => (spec.soft ?? []).filter((f) => prop(e.payload, f) === undefined)));
    // Data types: a value of the wrong type breaks the destination even when the field is there.
    const badTypes = unique(
      seen.flatMap((e) =>
        [...spec.required, ...(spec.soft ?? [])]
          .filter((f) => {
            const v = prop(e.payload, f);
            const want = JITSU_TYPES[f];
            return want && v !== undefined && v !== null && !want.includes(typeOf(v) as (typeof want)[number]);
          })
          .map((f) => `${f}: ${typeOf(prop(e.payload, f))}, expected ${JITSU_TYPES[f].join(' | ')}`),
      ),
    );
    issues.push({
      issue: [code(name)],
      detail: missing.length
        ? [`${seen.length}× — missing `, ...chips(missing)]
        : badTypes.length
          ? [`${seen.length}× — wrong type: `, ...chips(badTypes)]
          : [`${seen.length}× — `, ...chips(spec.required), ' present', ...(softMissing.length ? [' · also missing ', ...chips(softMissing)] : [])],
      mark: missing.length || badTypes.length ? 'fail' : softMissing.length ? 'warn' : 'ok',
    });
  }

  // Duplicates: one action should produce one event (page_view per page, one event per answer).
  const duplicates: string[] = [];
  const pageViews = events.filter((e) => /^page(_?view)?$/i.test(e.name));
  for (const path of unique(pageViews.map((e) => e.path))) {
    const n = pageViews.filter((e) => e.path === path).length;
    if (n > 1) duplicates.push(`page_view ×${n} for ${path}`);
  }
  for (const key of unique(events.filter((e) => e.name === 'quiz_data').map((e) => `${prop(e.payload, 'question_key')}|${prop(e.payload, 'current_step')}`))) {
    const n = events.filter((e) => e.name === 'quiz_data' && `${prop(e.payload, 'question_key')}|${prop(e.payload, 'current_step')}` === key).length;
    if (n > 1) duplicates.push(`quiz_data ×${n} for ${key.split('|')[0]}`);
  }
  for (const name of ['lead_submit', 'phone_number_click']) {
    const n = events.filter((e) => e.name === name).length;
    if (n > 1) duplicates.push(`${name} ×${n}`);
  }
  issues.push(
    duplicates.length
      ? { issue: ['Duplicate events'], detail: chips(duplicates), mark: 'warn' }
      : { issue: ['Duplicate events'], detail: ['one event per action'], mark: 'ok' },
  );

  // Step sequence: the next_step announced by one quiz_data should be the next current_step.
  const steps = events.filter((e) => e.name === 'quiz_data');
  const jumps = steps
    .map((e, i) => ({ next: prop(e.payload, 'next_step'), then: steps[i + 1] ? prop(steps[i + 1].payload, 'current_step') : undefined }))
    .filter((x) => x.then !== undefined && x.next !== undefined && x.next !== null && String(x.next) !== String(x.then));
  if (jumps.length) {
    issues.push({
      issue: ['Step sequence'],
      detail: [jumps.slice(0, 3).map((x) => `announced next_step=${String(x.next)} but the next event had current_step=${String(x.then)}`).join('; ')],
      mark: 'warn',
    });
  }

  const consoleErrors = cap.consoleErrors.filter((e) => /jitsu|adstiacms/i.test(e));
  if (consoleErrors.length) issues.push({ issue: ['Console'], detail: chips(unique(consoleErrors).slice(0, 3).map((e) => trunc(e, 80))), mark: 'fail' });

  // Events prove the library ran, even when it was served from cache.
  const working = ok2xx(library) || posts.length > 0;
  return {
    title: 'Jitsu',
    head: loader && working ? [code(noQuery(library?.url ?? loader.url))] : ['not integrated'],
    mark: ok2xx(loader) && working ? 'ok' : 'fail',
    rows,
    flow: describeAll(events),
    issues,
  };
}

// ------------------------------------------------------------------

export function buildSections(cap: Capture, cfg: SiteConfig, facts: RunFacts): Section[] {
  return [gtmSection(cap, cfg, facts), pabblySection(cap, cfg), voluumSection(cap, cfg), ringbaSection(cap, cfg, facts), callgridSection(cap, cfg, facts), jitsuSection(cap, cfg, facts), claritySection(cap, cfg)];
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
    // Both skipped = neither provider could be judged (quiz unfinished / other provider in use).
    const best = marks.filter((mk) => mk !== 'skip').sort((a, b) => RANK[a] - RANK[b])[0] ?? 'skip';
    out.push({
      title: 'Call tracking',
      mark: best,
      head: idx.flatMap((j, k) => [...(k ? [' · '] : []), `${sections[j].title} `, { m: marks[k] } as const]),
      sections: idx,
    });
  });
  return out;
}
