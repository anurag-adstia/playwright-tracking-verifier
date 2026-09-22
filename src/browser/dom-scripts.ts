/**
 * Browser-side DOM inspection (the "Elements" panel). Plain JS strings, see instrumentation.ts.
 * Elements the flows may click get a `data-tqa-ref` attribute so Node can target them precisely.
 */

const HELPERS = `
  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (el.checkVisibility) return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    var s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05;
  }
  function isEnabled(el) {
    if (el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    var fs = el.closest && el.closest('fieldset[disabled]');
    return !fs;
  }
  function txt(el) {
    var t = (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').replace(/\\s+/g, ' ').trim();
    return t.length > 160 ? t.slice(0, 160) : t;
  }
  function ref(el) {
    if (!el.getAttribute('data-tqa-ref')) {
      window.__tqaRefSeq = (window.__tqaRefSeq || 0) + 1;
      el.setAttribute('data-tqa-ref', 'r' + window.__tqaRefSeq);
    }
    return el.getAttribute('data-tqa-ref');
  }
  function inChrome(el) {
    return !!(el.closest && el.closest('header, nav, footer, [role=navigation], [role=banner], [role=contentinfo], [class*="cookie" i], [id*="cookie" i]'));
  }
  function info(el, extra) {
    var r = el.getBoundingClientRect();
    var o = {
      ref: ref(el),
      tag: el.tagName,
      text: txt(el),
      href: el.getAttribute('href') || undefined,
      id: el.id || undefined,
      name: el.getAttribute('name') || undefined,
      type: el.getAttribute('type') || undefined,
      value: (el.value !== undefined && el.value !== '' && typeof el.value === 'string') ? el.value.slice(0, 80) : (el.getAttribute('value') || undefined),
      classes: (typeof el.className === 'string' ? el.className : '').slice(0, 120) || undefined,
      visible: isVisible(el),
      enabled: isEnabled(el),
      inHeader: inChrome(el),
      rect: { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) }
    };
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (/^(data-|aria-|onclick|target|rel|role)/.test(a.name) && a.name !== 'data-tqa-ref' && a.name !== 'data-tqa-seen') attrs[a.name] = String(a.value).slice(0, 120);
    }
    if (Object.keys(attrs).length) o.attrs = attrs;
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function safeQsa(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; }
  }
  function excluded(el, excludeSel) {
    if (!excludeSel) return false;
    try { return !!el.closest(excludeSel); } catch (e) { return false; }
  }
  var PHONE_TEXT = /\\(?\\b\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b/;
  var NEGATIVE = /(privacy|terms|cookie|accept all|reject|close|menu|log ?in|sign ?in|policy|faq|contact us|about us|blog|unsubscribe|do not sell|skip to|back$|^back|^x$|^×$|language|español|english)/i;
`;

const CTA_POSITIVE =
  "(get (started|my|your|a|quote|free|help|covered|benefits|plan|now)|start|check (eligibility|now|my|if|rates)|see (if|my|how|plans|options)|find (my|out|plans|a)|apply|claim|continue|next|compare|qualif|learn more|sign ?up|get quote|shop|enroll|begin|submit|search|view (plans|rates|quotes)|let'?s go|i'?m ready|yes[,!]? |unlock|discover|calculate|get it)";

export function inspectDomScript(opts: {
  ctaSelector?: string;
  ctaPattern?: string;
  phoneSelector?: string;
  zipSelector?: string;
  excludeSelector?: string;
}): string {
  return `(() => {
  ${HELPERS}
  var OPTS = ${JSON.stringify(opts)};
  var CTA_RE = new RegExp(OPTS.ctaPattern || ${JSON.stringify(CTA_POSITIVE)}, 'i');
  var out = { url: location.href, title: document.title, scripts: [], noscripts: [], iframes: [], forms: [], inputs: [], buttons: [], anchors: 0, ctaCandidates: [], phoneLinks: [], phoneLikeNonAnchors: [], zipInputs: [], meta: {} };

  safeQsa('script').forEach(function (s) {
    var inline = !s.src;
    var code = inline ? (s.textContent || '') : '';
    var snippet;
    if (inline && /googletagmanager|clarity\\.ms|ringba|jitsu|callgrid|dataLayer|cf_variable|_rgba_tags/i.test(code)) snippet = code.replace(/\\s+/g, ' ').slice(0, 600);
    out.scripts.push({ src: s.src || undefined, id: s.id || undefined, type: s.type || undefined, async: !!s.async, defer: !!s.defer, inline: inline, inlineSize: code.length, nscript: s.getAttribute('data-nscript') || undefined, snippet: snippet });
  });
  safeQsa('noscript').forEach(function (n) { out.noscripts.push((n.innerHTML || n.textContent || '').slice(0, 500)); });
  safeQsa('iframe').forEach(function (f) { out.iframes.push({ src: f.getAttribute('src') || undefined, id: f.id || undefined, visible: isVisible(f) }); });
  safeQsa('form').forEach(function (f) { out.forms.push({ id: f.id || undefined, name: f.getAttribute('name') || undefined, action: f.getAttribute('action') || undefined, method: f.getAttribute('method') || undefined, inputs: f.querySelectorAll('input,select,textarea').length }); });
  safeQsa('input, select, textarea').slice(0, 60).forEach(function (i) {
    if (i.type === 'hidden') return;
    out.inputs.push(info(i, { placeholder: i.getAttribute('placeholder') || undefined }));
  });
  safeQsa('meta[name], meta[property]').forEach(function (m) { out.meta[m.getAttribute('name') || m.getAttribute('property')] = (m.getAttribute('content') || '').slice(0, 200); });
  var nd = document.getElementById('__NEXT_DATA__');
  if (nd) out.nextData = (nd.textContent || '').slice(0, 400000);
  out.anchors = document.querySelectorAll('a').length;

  // Phone anchors (tel:)
  safeQsa(OPTS.phoneSelector || 'a[href^="tel:" i]').forEach(function (a) {
    out.phoneLinks.push(info(a));
  });
  // Phone numbers rendered in clickable non-anchor elements (should be <a href="tel:">)
  safeQsa('button, [role=button], [onclick]').forEach(function (b) {
    if (b.closest('a[href^="tel:" i]')) return;
    if (PHONE_TEXT.test(txt(b)) && isVisible(b)) out.phoneLikeNonAnchors.push(info(b));
  });

  // ZIP inputs
  var zipSel = OPTS.zipSelector || 'input[name*="zip" i], input[id*="zip" i], input[placeholder*="zip" i], input[aria-label*="zip" i], input[autocomplete="postal-code"], input[name*="postal" i]';
  safeQsa(zipSel).forEach(function (z) { if (isVisible(z)) out.zipInputs.push(info(z, { placeholder: z.getAttribute('placeholder') || undefined })); });

  // Buttons / CTA candidates
  var clickables = OPTS.ctaSelector ? safeQsa(OPTS.ctaSelector) : safeQsa('button, a[href], [role="button"], input[type="submit"], input[type="button"]');
  var vh = window.innerHeight;
  clickables.forEach(function (el) {
    var href = (el.getAttribute('href') || '').trim();
    if (/^(tel|mailto|sms):/i.test(href)) return;
    if (excluded(el, OPTS.excludeSelector)) return;
    var t = txt(el);
    var vis = isVisible(el);
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.tagName === 'INPUT') {
      if (out.buttons.length < 80) out.buttons.push(info(el));
    }
    if (!vis || !isEnabled(el)) return;
    if (!OPTS.ctaSelector) {
      if (!t || t.length < 2 || t.length > 70) return;
      if (NEGATIVE.test(t)) return;
      if (PHONE_TEXT.test(t)) return;
    }
    var score = 0;
    if (OPTS.ctaSelector) score += 100;
    if (CTA_RE.test(t)) score += 60;
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') score += 10;
    if (/cta|btn|button|primary|start|quiz/i.test((typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('data-cta') || ''))) score += 10;
    var r = el.getBoundingClientRect();
    if (r.top + window.scrollY < vh) score += 10;
    if (r.width * r.height > 6000) score += 5;
    if (inChrome(el)) score -= 15;
    if (href && !href.startsWith('#') && !href.startsWith('/') && !href.startsWith('?')) {
      try { if (new URL(href, location.href).host !== location.host) score -= /learn more|read more/i.test(t) ? 40 : 20; } catch (e) {}
    }
    if (score >= 60) out.ctaCandidates.push(info(el, { score: score }));
  });
  out.ctaCandidates.sort(function (a, b) { return b.score - a.score || a.rect.y - b.rect.y; });
  out.ctaCandidates = out.ctaCandidates.slice(0, 10);
  return out;
})()`;
}

/**
 * Current quiz state: question text, answer candidates (newest first), ZIP input, other
 * form inputs and a "Next/Continue" button. Candidates already seen before the last
 * action are flagged isNew=false (ChatQuiz keeps old bubbles on screen).
 */
export function quizStateScript(opts: {
  container?: string;
  answer?: string;
  question?: string;
  next?: string;
  exclude?: string;
  zipSelector?: string;
  markSeen?: boolean;
}): string {
  return `(() => {
  ${HELPERS}
  var OPTS = ${JSON.stringify(opts)};
  var root = (OPTS.container && document.querySelector(OPTS.container)) || document.body;
  var zipSel = OPTS.zipSelector || 'input[name*="zip" i], input[id*="zip" i], input[placeholder*="zip" i], input[aria-label*="zip" i], input[autocomplete="postal-code"], input[name*="postal" i]';
  var sel = OPTS.answer || 'button, [role="button"], [role="radio"], [role="option"], [role="checkbox"], label, a[href="#"], a:not([href]), [class*="option" i], [class*="answer" i], [class*="choice" i]';
  var els = safeQsa(sel, root);
  var cands = [];
  els.forEach(function (el) {
    if (!isVisible(el) || !isEnabled(el)) return;
    if (excluded(el, OPTS.exclude)) return;
    var href = (el.getAttribute('href') || '').trim();
    if (/^(tel|mailto|sms):/i.test(href)) return;
    if (el.closest('a[href^="tel:" i]')) return;
    if (!OPTS.container && !OPTS.answer && inChrome(el)) return;
    var t = txt(el);
    if (!t || t.length > 90) return;
    if (NEGATIVE.test(t)) return;
    if (el.tagName === 'LABEL' && !el.querySelector('input[type=radio],input[type=checkbox]') && !el.getAttribute('for')) return;
    if (!OPTS.answer && (el.matches('[class*="option" i],[class*="answer" i],[class*="choice" i]')) && !/^(BUTTON|LABEL|A)$/.test(el.tagName)) {
      var cs = getComputedStyle(el);
      if (cs.cursor !== 'pointer') return;
    }
    if (el.matches('input[type=submit]') ) return;
    cands.push(el);
  });
  // keep innermost clickable (a card wrapping a button -> the button)
  cands = cands.filter(function (el) { return !cands.some(function (o) { return o !== el && el.contains(o); }); });
  function follows(a, b) { return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }

  // Question: configured selector, else the last text block that has answer options after it
  // (ChatQuiz keeps old bubbles on screen; the current question is the latest one).
  var question = '';
  var questionEl = null;
  if (OPTS.question) {
    var qs = safeQsa(OPTS.question).filter(isVisible);
    if (qs.length) { questionEl = qs[qs.length - 1]; question = txt(questionEl); }
  } else if (cands.length) {
    var blocks = safeQsa('h1, h2, h3, h4, legend, p, [class*="question" i], [class*="message" i], [class*="bubble" i], [class*="title" i]', root)
      .filter(function (b) { return isVisible(b) && !cands.some(function (c) { return c === b || c.contains(b) || b.contains(c); }); });
    for (var i = blocks.length - 1; i >= 0; i--) {
      var bt = txt(blocks[i]);
      if (bt.length < 3 || bt.length > 300) continue;
      if (cands.some(function (c) { return follows(blocks[i], c); })) { questionEl = blocks[i]; question = bt; break; }
    }
  }
  // Current options: after the question, and not already offered for this same question.
  var list = cands.map(function (el) {
    var input = el.tagName === 'LABEL' ? (el.querySelector('input') || (el.getAttribute('for') && document.getElementById(el.getAttribute('for')))) : null;
    var seen = (el.getAttribute('data-tqa-seen') || '').split(' || ');
    var current = (!questionEl || follows(questionEl, el)) && seen.indexOf(question + '|' + txt(el)) < 0;
    return info(el, { isNew: current, value: (input && input.value) || el.getAttribute('value') || el.getAttribute('data-value') || undefined });
  });

  var zip = safeQsa(zipSel).filter(function (z) { return isVisible(z) && isEnabled(z); }).map(function (z) { return info(z, { placeholder: z.getAttribute('placeholder') || undefined }); });
  var inputs = safeQsa('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=submit]):not([type=button]), textarea, select', root)
    .filter(function (i) { return isVisible(i) && isEnabled(i) && !zip.some(function (z) { return z.ref === i.getAttribute('data-tqa-ref'); }); })
    .map(function (i) {
      var lab = (i.id && document.querySelector('label[for="' + i.id + '"]')) || i.closest('label');
      return info(i, { placeholder: i.getAttribute('placeholder') || undefined, label: lab ? txt(lab) : undefined, value: i.value || undefined });
    });
  var nextSel = OPTS.next || 'button[type=submit], input[type=submit], button, [role=button]';
  var NEXT_RE = /^(next|continue|submit|get (my|your) (quote|results|rates|plan)s?|see (my )?results|finish|done|check|search|find|get started|go|→|>)/i;
  var next = safeQsa(nextSel, root).filter(function (b) { return isVisible(b) && isEnabled(b) && (OPTS.next || NEXT_RE.test(txt(b)) || b.getAttribute('type') === 'submit'); }).map(function (b) { return info(b); });
  var telVisible = safeQsa('a[href^="tel:" i]').some(isVisible);

  // Mark only the options offered for the current question; markers accumulate per question.
  if (OPTS.markSeen) cands.forEach(function (el, i) {
    if (!list[i].isNew) return;
    var prev = el.getAttribute('data-tqa-seen');
    el.setAttribute('data-tqa-seen', (prev ? prev + ' || ' : '') + question + '|' + txt(el));
  });
  var fp = question + '|' + list.map(function (c) { return c.text; }).join('|') + '|' + zip.length + '|' + inputs.length + '|' + location.pathname;
  return { url: location.href, question: question, candidates: list, zipInputs: zip, inputs: inputs, nextButtons: next, telVisible: telVisible, fingerprint: fp };
})()`;
}

export const STORAGE_SCRIPT = `(() => {
  function dump(s) { var o = {}; try { for (var i = 0; i < s.length; i++) { var k = s.key(i); o[k] = String(s.getItem(k)).slice(0, 4000); } } catch (e) {} return o; }
  return { url: location.href, origin: location.origin, localStorage: dump(window.localStorage), sessionStorage: dump(window.sessionStorage) };
})()`;

/** Snapshot of provider-related globals, never assuming they exist. */
export function globalsScript(names: string[]): string {
  return `(() => {
  var NAMES = ${JSON.stringify(names)};
  function ser(v, d) {
    d = d || 0;
    if (v === null || v === undefined) return v === undefined ? '[undefined]' : null;
    var t = typeof v;
    if (t === 'function') return '[Function]';
    if (t !== 'object') return v;
    if (d > 4) return '[MaxDepth]';
    if (typeof Node !== 'undefined' && v instanceof Node) return '[Element ' + v.nodeName + ']';
    if (Array.isArray(v) || Object.prototype.toString.call(v) === '[object Arguments]') { var a = []; for (var i = 0; i < v.length && i < 300; i++) a.push(ser(v[i], d + 1)); return a; }
    var o = {}; var ks = []; try { ks = Object.keys(v); } catch (e) {}
    for (var k = 0; k < ks.length && k < 200; k++) { try { o[ks[k]] = ser(v[ks[k]], d + 1); } catch (e) { o[ks[k]] = '[Unreadable]'; } }
    return o;
  }
  var out = {};
  NAMES.forEach(function (n) { try { if (n in window) out[n] = ser(window[n]); } catch (e) {} });
  try { if (window.google_tag_manager) out.__gtmContainers = Object.keys(window.google_tag_manager).filter(function (k) { return /^(GTM|G|AW|DC)-/.test(k); }); } catch (e) {}
  try { out.__clarityType = typeof window.clarity; } catch (e) {}
  try { out.__jitsuType = typeof window.jitsu; out.__jitsuMethods = window.jitsu ? Object.keys(window.jitsu).slice(0, 20) : []; } catch (e) {}
  try { out.__dataLayerIsArray = Array.isArray(window.dataLayer); out.__dataLayerLength = window.dataLayer ? window.dataLayer.length : 0; } catch (e) {}
  return out;
})()`;
}

export const DATALAYER_STATE_SCRIPT = `(() => {
  try {
    if (!window.dataLayer) return null;
    return JSON.parse(JSON.stringify(Array.prototype.slice.call(window.dataLayer).slice(-100), function (k, v) {
      if (typeof v === 'function') return '[Function]';
      if (typeof Node !== 'undefined' && v instanceof Node) return '[Element ' + v.nodeName + ']';
      if (v && Object.prototype.toString.call(v) === '[object Arguments]') return { __arguments: Array.prototype.slice.call(v) };
      return v;
    }));
  } catch (e) { return ['[unserializable dataLayer: ' + e.message + ']']; }
})()`;
