import type { Masker } from '../core/mask';
import type { ActionRecord, DomSnapshot, Status, TrackingEvent, TrackerState } from '../core/types';
import { normalizePhone } from '../core/utils';
import { resolveField } from './payload.validator';

export interface PhoneOutcome {
  status: Status;
  message: string;
  details: string[];
  expected?: unknown;
  actual?: unknown;
  classification?: string;
}

/** <a href="tel:…"> element checks for the clicked phone CTA (or the first one on the page). */
export function phoneAnchorOutcome(action: ActionRecord | undefined, doms: DomSnapshot[], masker: Masker, required: boolean): PhoneOutcome {
  const details: string[] = [];
  const nonAnchors = doms.flatMap((d) => d.phoneLikeNonAnchors);
  const el = action?.element ?? doms.flatMap((d) => d.phoneLinks)[0];
  if (!el) {
    if (nonAnchors.length) {
      return {
        status: 'FAIL',
        message: `phone number rendered in <${nonAnchors[0].tag.toLowerCase()}> instead of <a href="tel:">`,
        details: nonAnchors.map((n) => `${n.tag} "${masker.text(n.text)}"`),
        classification: 'WRONG ELEMENT',
      };
    }
    return { status: required ? 'FAIL' : 'SKIPPED', message: required ? 'no <a href="tel:"> phone CTA found' : 'SKIPPED — element not present', details };
  }
  const problems: string[] = [];
  const textDigits = normalizePhone(el.text);
  const hrefDigits = normalizePhone(el.href ?? '');
  details.push(`element: <${el.tag.toLowerCase()}> href="${masker.enabled ? `tel:${masker.phone(el.href ?? '')}` : el.href}" text="${masker.phone(el.text) || '(none)'}"`);
  details.push(`visible=${el.visible} enabled=${el.enabled}`);
  if (el.tag !== 'A') problems.push(`element is <${el.tag.toLowerCase()}>, expected <a>`);
  if (!/^tel:/i.test(el.href ?? '')) problems.push('href does not start with tel:');
  if (!textDigits || textDigits.length < 10) problems.push('phone text missing (no 10-digit number in link text)');
  if (!el.visible) problems.push('phone link is not visible');
  if (!el.enabled) problems.push('phone link is disabled');
  if (textDigits.length >= 10 && hrefDigits && textDigits !== hrefDigits) {
    problems.push(`displayed number (${masker.phone(textDigits)}) differs from dialed tel: number (${masker.phone(hrefDigits)})`);
  }
  if (nonAnchors.length) details.push(`also found phone numbers in non-anchor elements: ${nonAnchors.map((n) => n.tag).join(', ')}`);
  if (problems.length) {
    return { status: 'FAIL', message: problems.join('; '), details, expected: '<a href="tel:…"> visible, enabled, with phone text', actual: problems[0], classification: 'PHONE ANCHOR' };
  }
  return { status: nonAnchors.length ? 'WARNING' : 'PASS', message: `<a href="tel:"> ${masker.phone(textDigits)} is visible and enabled`, details };
}

/** DOM phone → normalized → Jitsu phone → GTM phone. */
export function phoneCorrelationOutcome(
  action: ActionRecord | undefined,
  events: TrackingEvent[],
  trackers: { jitsu: TrackerState; gtm: TrackerState },
  masker: Masker,
): PhoneOutcome {
  if (!action) return { status: 'SKIPPED', message: 'SKIPPED — phone CTA was not clicked (element not present)', details: [] };
  const dom = action.context.phoneRaw ?? '';
  const normalized = action.context.phone ?? normalizePhone(dom);
  const inAction = events.filter((e) => e.actionId === action.id);
  const details = [`DOM:        ${masker.phone(dom) || '(no text)'}`, `Normalized: ${masker.phone(normalized)}`];
  const problems: string[] = [];
  let actual: string | undefined;

  const jitsuEv = inAction.find((e) => e.tracker === 'jitsu' && e.name === 'phone_number_click');
  if (trackers.jitsu.enabled) {
    const r = jitsuEv ? resolveField(jitsuEv.payload, 'phone', [], ['properties', '']) : undefined;
    const v = r?.found ? normalizePhone(r.value) : undefined;
    details.push(`Jitsu:      ${jitsuEv ? masker.phone(v) || '(no phone field)' : 'phone_number_click not captured'}`);
    if (!jitsuEv) problems.push('Jitsu phone_number_click not captured');
    else if (v !== normalized) {
      problems.push(`Jitsu phone ${masker.phone(v) || '(empty)'} ≠ DOM ${masker.phone(normalized)}`);
      actual ??= v;
    }
  }
  const gtmEv = inAction.find((e) => e.tracker === 'gtm' && e.name === 'phoneNumberClick');
  if (trackers.gtm.enabled) {
    const r = gtmEv ? resolveField(gtmEv.payload, 'data.phone') : undefined;
    const v = r?.found ? normalizePhone(r.value) : undefined;
    details.push(`GTM:        ${gtmEv ? masker.phone(v) || '(no data.phone)' : 'phoneNumberClick not pushed'}`);
    if (!gtmEv) problems.push('GTM phoneNumberClick not pushed to dataLayer');
    else if (v !== normalized) {
      problems.push(`GTM data.phone ${masker.phone(v) || '(empty)'} ≠ DOM ${masker.phone(normalized)}`);
      actual ??= v;
    }
  }
  if (!trackers.jitsu.enabled && !trackers.gtm.enabled) {
    return { status: 'SKIPPED', message: 'no Jitsu/GTM tracking active to correlate', details };
  }
  if (problems.length) {
    return {
      status: 'FAIL',
      message: problems.join('; '),
      details,
      expected: masker.phone(normalized),
      actual: actual !== undefined ? masker.phone(actual) : problems[0],
      classification: actual !== undefined ? 'VALUE MISMATCH' : 'MISSING EVENT',
    };
  }
  return { status: 'PASS', message: `phone ${masker.phone(normalized)} consistent across DOM, Jitsu and GTM`, details };
}
