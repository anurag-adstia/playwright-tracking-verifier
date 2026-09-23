import type { Page } from '@playwright/test';
import { BIRTH_YEAR, type SiteConfig } from './config';

/** A form field on the current quiz step. */
interface Field {
  /** label, placeholder, name, id, aria-label, autocomplete, type, inputmode */
  hint: string;
  tag: string;
  type: string;
  placeholder: string;
  maxLength: number;
  max: number;
  /**
   * Text shown in front of the field, which the quiz prepends to what you type
   * (the chat year input shows "19" and accepts 2 digits → submits 19 + "65").
   */
  prefix: string;
  /** <select> option texts */
  options: string[];
}

/** The current quiz step, read from the page (see readUi). */
interface Ui {
  question: string;
  /** answer choices of the newest question (buttons, radio labels, option cards, …) */
  options: string[];
  fields: Field[];
  hasNext: boolean;
  sig: string;
}

/**
 * Walks any quiz (chat or form, one question per screen or several) until the congrats page.
 *  - choice questions: "Yes", otherwise the first option, unless `cfg.answers` fixes the answer
 *  - fields: the value comes from `cfg.inputs` (ZIP 54321, birth year 1965, …), matched on the
 *    field itself first and then on the question
 *  - consent checkboxes are ticked; "Continue / Next / Submit" is clicked after fields or a
 *    selection that does not advance on its own
 * Every answered step is added to `notes`.
 */
export async function walkQuiz(page: Page, cfg: SiteConfig, notes: string[]): Promise<void> {
  const congrats = new RegExp(cfg.congratsPattern, 'i');
  const knownTels = new Set(await telHrefs(page));
  let lastSig = '';
  for (let step = 0; step < cfg.maxSteps && !congrats.test(page.url()); step++) {
    // The first question is the slow one: the chat types its intro before showing any answer.
    const timeout = step === 0 ? cfg.firstQuestionTimeout : cfg.stepTimeout;
    // Only a phone that appears after an answer ends the quiz, so pass the ones already on screen.
    const ui = await nextUi(page, lastSig, congrats, timeout, step ? knownTels : undefined);
    if (!ui) {
      const secs = Math.round(timeout / 1000);
      if (congrats.test(page.url())) return;
      // The phone number appearing is the normal end of a chat quiz, not a stall.
      if (step && (await newTel(page, knownTels))) notes.push(`quiz finished after ${step} step(s): the phone number appeared`);
      else notes.push(step ? `quiz ended after ${step} step(s): no new question within ${secs}s` : `no quiz question appeared within ${secs}s`);
      return;
    }
    lastSig = ui.sig;
    await page.locator('[data-qa-consent]').evaluateAll((els) => els.forEach((e) => ((e as HTMLInputElement).checked ? null : (e as HTMLElement).click()))).catch(() => undefined);

    if (ui.fields.length) {
      for (let i = 0; i < ui.fields.length; i++) {
        const f = ui.fields[i];
        const v = valueFor(f, ui.question, cfg);
        const el = page.locator(`[data-qa-in="${i}"]`);
        if (f.tag === 'SELECT') {
          const label = f.options[v.index];
          await el.selectOption({ index: v.index }, { timeout: 5000 }).catch(() => undefined);
          notes.push(`${ui.question || f.hint} → ${label}${v.note}`);
        } else {
          await el.fill(v.value, { timeout: 5000 }).catch(() => el.pressSequentially(v.value).catch(() => undefined));
          notes.push(`${ui.question || f.hint} → ${v.value}${v.note}`);
        }
      }
      // Next buttons are often disabled until the fields are filled: read the page again.
      const after = await readPage(page).catch(() => undefined);
      await clickNext(page, !!after?.hasNext);
      continue;
    }

    const pick = chooseOption(ui.options, ui.question, cfg);
    notes.push(`${ui.question || 'question'} → ${ui.options[pick.index]}${pick.note}`);
    const option = page.locator(`[data-qa-opt="${pick.index}"]`);
    await option.click({ timeout: 5000 }).catch(() => option.dispatchEvent('click'));
    // Multi-select, or "select then Continue": nothing new appeared, but a Continue button did.
    // Long enough that a chat still typing its next question is not mistaken for one of those.
    await page.waitForTimeout(2500);
    const after = await readPage(page).catch(() => undefined);
    if (after && after.sig === ui.sig && after.hasNext) await clickNext(page, true);
  }
}

async function clickNext(page: Page, hasNext: boolean): Promise<void> {
  const next = page.locator('[data-qa-next]').first();
  if (hasNext && (await next.count())) await next.click({ timeout: 5000 }).catch(() => page.keyboard.press('Enter'));
  else await page.keyboard.press('Enter');
}

/** Choice: configured answer, else "Yes", else the first option. */
function chooseOption(options: string[], question: string, cfg: SiteConfig): { index: number; note: string } {
  for (const rule of cfg.answers) {
    if (!new RegExp(rule.question, 'i').test(question)) continue;
    const i = options.findIndex((o) => new RegExp(rule.answer, 'i').test(o));
    if (i >= 0) return { index: i, note: ' (configured answer)' };
  }
  return { index: Math.max(0, options.findIndex((o) => /^yes\b/i.test(o))), note: '' };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Value for one field. Selects get an option index, everything else a string. */
function valueFor(f: Field, question: string, cfg: SiteConfig): { value: string; index: number; note: string } {
  const test = (text: string) => cfg.inputs.find((r) => new RegExp(r.question, 'i').test(text));
  const rule = test(f.hint) ?? test(question);
  let value = rule?.value;
  let note = '';

  if (f.type === 'date') value = `${BIRTH_YEAR}-01-15`;
  else if (/mm.?dd.?yy/i.test(f.placeholder)) value = `01/15/${BIRTH_YEAR}`;
  else if (value === String(BIRTH_YEAR)) {
    // A "19" shown before the field means the year is still wanted — just its last digits.
    const yearPrefix = !!f.prefix && String(BIRTH_YEAR).startsWith(f.prefix);
    // "How old are you?" needs an age, not a year: the field only accepts 1–3 digits or up to ~150.
    const askedAge = /\bage\b|how old/i.test(`${f.hint} ${question}`) && !/year|born|birth|dob|bday/i.test(`${f.hint} ${question}`);
    const small = (f.maxLength > 0 && f.maxLength <= 3) || (f.max > 0 && f.max <= 150);
    if (!yearPrefix && (askedAge || small)) {
      value = String(new Date().getFullYear() - BIRTH_YEAR);
      note = ` (age for birth year ${BIRTH_YEAR})`;
    }
  } else if (!rule && f.maxLength === 5 && f.tag !== 'SELECT') value = cfg.inputs.find((r) => /zip/.test(r.question))?.value;

  if (f.tag === 'SELECT') {
    const real = f.options.map((o, i) => ({ o, i })).filter(({ o }) => o && !/^(select|choose|please|--|-)/i.test(o));
    const wanted = value?.toLowerCase();
    const match = wanted
      ? real.find(({ o }) => {
          const t = o.toLowerCase();
          return t === wanted || (/^\d+$/.test(wanted) && Number(t) === Number(wanted)) || (/^\d+$/.test(wanted) && t.startsWith(MONTHS[Number(wanted) - 1] ?? '§'));
        })
      : undefined;
    const pick = match ?? real[0] ?? { i: 0 };
    return { value: '', index: pick.i, note: match ? '' : ' (no matching value; picked an option)' };
  }
  if (value === undefined) {
    value = f.type === 'number' ? '1' : 'Test';
    note = ' (no input rule — add one to `inputs`)';
  }

  // "19" is already on screen and the field takes 2 digits: type 65, not 1965.
  if (f.prefix && value.startsWith(f.prefix) && value.length > f.prefix.length) {
    value = value.slice(f.prefix.length);
    note += ` (after the "${f.prefix}" shown before the field)`;
  }
  // Still too long for the field: keep the end (a year's last digits), never a truncated start.
  if (f.maxLength > 0 && value.length > f.maxLength) {
    value = value.slice(-f.maxLength);
    note += ` (field takes ${f.maxLength} characters)`;
  }
  return { value, index: 0, note };
}

/** Waits for a quiz step that differs from the last one (chat typing, step transitions, branches). */
/**
 * esbuild (via tsx) rewrites named functions with `__name()` calls. Playwright sends the function
 * source to the page, where that helper does not exist — every read would throw ReferenceError.
 * Evaluating as source with a one-line shim keeps it working under tsx and under the test runner.
 */
function readPage(page: Page): Promise<Ui> {
  return page.evaluate<Ui>(`(() => { window.__name = window.__name || ((f) => f); return (${readUi.toString()})(); })()`);
}

/** Phone links visible right now. */
async function telHrefs(page: Page): Promise<string[]> {
  return page.locator('a[href^="tel:"]:visible').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? '')).catch(() => []);
}

/** A phone link that was not on the page when the quiz started = the quiz finished. */
async function newTel(page: Page, known: Set<string>): Promise<boolean> {
  return (await telHrefs(page)).some((href) => !known.has(href));
}

async function nextUi(page: Page, lastSig: string, congrats: RegExp, timeout: number, knownTels?: Set<string>): Promise<Ui | undefined> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (congrats.test(page.url())) return undefined;
    // The chat ends by typing the congrats messages and a NEW phone number: no question follows.
    // (A phone in the header was there from the start and means nothing.)
    if (knownTels && (await newTel(page, knownTels))) return undefined;
    const ui = await readPage(page).catch(() => undefined);
    if (ui && (ui.options.length || ui.fields.length) && ui.sig !== lastSig) {
      await page.waitForTimeout(400); // let the chat / transition animation finish
      return (await readPage(page).catch(() => undefined)) ?? ui;
    }
    await page.waitForTimeout(300);
  }
  return undefined;
}

/**
 * Runs in the page. Finds the newest question and marks what to act on:
 * data-qa-opt (answer choices), data-qa-in (fields), data-qa-next (Continue/Next/Submit),
 * data-qa-consent (consent / TCPA checkboxes).
 */
export function readUi(): Ui {
  const NAV = /^(menu|open menu|close menu|close|privacy( policy)?|terms( of (use|service))?|contact( us)?|cookies?|back|previous|prev|skip|log ?in|sign ?in|accept( all)?|reject( all)?|x|×)$/i;
  const NEXT = /^(continue|next|submit|confirm|proceed|finish|done|send|go|→|›|>|see (my )?results|get (my )?(quote|results|started)|check (my )?eligibility|start( now)?)\b/i;
  const CONSENT = /agree|consent|terms|tcpa|authori[sz]e|contact me|permission/i;

  const skip = (e: Element) => !!e.closest('header, nav, footer, [aria-hidden="true"], [hidden]');
  const vis = (e: Element) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const enabled = (e: Element) => !(e as HTMLButtonElement).disabled && e.getAttribute('aria-disabled') !== 'true';
  const text = (e: Element) => ((e as HTMLElement).innerText || (e as HTMLInputElement).value || '').trim().replace(/\s+/g, ' ');
  for (const a of ['data-qa-opt', 'data-qa-in', 'data-qa-next', 'data-qa-consent']) document.querySelectorAll(`[${a}]`).forEach((e) => e.removeAttribute(a));

  const labelFor = (e: Element) => {
    const el = e as HTMLInputElement;
    return ((el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent) || el.closest('label')?.textContent || '').trim();
  };
  const hintOf = (e: Element) => {
    const el = e as HTMLInputElement;
    return [labelFor(e), el.placeholder, el.name, el.id, el.getAttribute('aria-label'), el.getAttribute('autocomplete'), el.type, el.getAttribute('inputmode')]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ');
  };

  // Consent checkboxes (often visually hidden behind a styled label).
  const consent = [...document.querySelectorAll('input[type="checkbox"]')].filter(
    (e) => !skip(e) && !(e as HTMLInputElement).checked && CONSENT.test(`${labelFor(e)} ${e.parentElement?.textContent ?? ''}`),
  );
  consent.forEach((e, i) => e.setAttribute('data-qa-consent', String(i)));

  const fields = [...document.querySelectorAll('input, select, textarea')].filter(
    (e) => vis(e) && enabled(e) && !skip(e) && !/^(hidden|submit|button|image|reset|file|radio|checkbox|range)$/i.test((e as HTMLInputElement).type),
  );
  fields.forEach((e, i) => e.setAttribute('data-qa-in', String(i)));

  const OPT = 'button, [role="button"], [role="radio"], [role="option"], [role="checkbox"], label, input[type="button"], [class*="option" i], [class*="answer" i], [class*="choice" i]';
  const external = (e: Element) => {
    const a = e.closest('a[href]') as HTMLAnchorElement | null;
    return !!a && (/^tel:/i.test(a.getAttribute('href') ?? '') || (/^https?:/i.test(a.getAttribute('href') ?? '') && a.host !== location.host));
  };
  let cands = [...document.querySelectorAll(OPT)].filter((e) => {
    const t = text(e);
    if (!vis(e) || !enabled(e) || skip(e) || !t || t.length > 80 || NAV.test(t) || external(e)) return false;
    // labels of fields / consent boxes are not answers
    if (e.tagName === 'LABEL') {
      const forId = (e as HTMLLabelElement).htmlFor;
      if ([...fields, ...consent].some((f) => e.contains(f) || (forId && f.id === forId))) return false;
    }
    return true;
  });
  cands = cands.filter((e) => !cands.some((c) => c !== e && e.contains(c))); // innermost clickable

  const nexts = cands.filter((e) => NEXT.test(text(e)));
  let options = cands.filter((e) => !NEXT.test(text(e)));
  if (!options.length && !fields.length) options = nexts.splice(-1); // a lone "Get Started" / "Start" is the answer
  // Newest question only: the group around the last choice (a chat keeps earlier answers on screen).
  if (options.length > 1) {
    let box: Element | null = options[options.length - 1].parentElement;
    for (let d = 0; box && d < 5 && options.filter((o) => box!.contains(o)).length < 2; d++) box = box.parentElement;
    if (box) options = options.filter((o) => box!.contains(o));
  }
  options.forEach((e, i) => e.setAttribute('data-qa-opt', String(i)));
  const next = nexts[nexts.length - 1];
  next?.setAttribute('data-qa-next', '');

  // Question: the last visible text before the first answer / field (works without a "?").
  const target = fields[0] ?? options[0];
  let question = '';
  if (target) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (target.contains(n) || target.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) break;
      const p = n.parentElement;
      if (!p || skip(p) || p.closest('script, style, noscript, button, label, [role="button"]') || !vis(p)) continue;
      const block = (p.closest('p, h1, h2, h3, h4, h5, h6, li, span, div') as HTMLElement | null)?.innerText?.trim().replace(/\s+/g, ' ') ?? '';
      const t = block && block.length <= 200 ? block : (n.textContent ?? '').trim();
      if (t.length >= 3) question = t;
    }
  }

  const fieldInfo = fields.map((e) => {
    const el = e as HTMLInputElement;
    return {
      hint: hintOf(e),
      tag: e.tagName,
      type: (el.type || '').toLowerCase(),
      placeholder: el.placeholder || '',
      maxLength: el.maxLength > 0 ? el.maxLength : 0,
      max: Number(el.max) || 0,
      prefix: (e.parentElement?.querySelector('[class*="prefix" i]')?.textContent ?? '').trim(),
      options: e.tagName === 'SELECT' ? [...(e as HTMLSelectElement).options].map((o) => o.text.trim()) : [],
    };
  });
  const optionTexts = options.map(text);
  return {
    question,
    options: optionTexts,
    fields: fieldInfo,
    hasNext: !!next,
    sig: `${question}|${optionTexts.join(',')}|${fieldInfo.map((f) => f.hint).join(',')}`,
  };
}
