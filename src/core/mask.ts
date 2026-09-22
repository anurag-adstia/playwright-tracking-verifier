/**
 * Masking of lead data (phone, email, name, address) and identifiers in reports.
 * Raw values stay in memory for comparisons; everything written to disk goes through here.
 */

const PHONE_KEY = /(^|[_.-])(phone|phone_?number|tel|mobile|cell|caller_?id|callerid)$/i;
const EMAIL_KEY = /(^|[_.-])e_?mail(_?address)?$/i;
const NAME_KEY = /^(first_?name|last_?name|full_?name|f_?name|l_?name|firstName|lastName|fullName|given_?name|family_?name|surname)$/i;
const ADDRESS_KEY = /(^|[_.-])(address\d?|street(_?address)?|address_?line_?\d?|dob|date_?of_?birth|birth_?date|ssn)$/i;
const ID_KEY = /^(session_?id|user_?id|userId|anonymous_?id|anonymousId|__eventn_id|sessionId|click_?id|vl_click_id)$/i;

export function maskPhone(v: string): string {
  const digits = v.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return '*'.repeat(Math.max(4, digits.length - 4)) + digits.slice(-4);
}

export function maskEmail(v: string): string {
  const [user, domain] = v.split('@');
  if (!domain) return '***';
  const [dom, ...tld] = domain.split('.');
  return `${user.slice(0, 1)}***@${dom.slice(0, 1)}***.${tld.join('.') || '***'}`;
}

export function maskId(v: string): string {
  if (v.length <= 10) return `${v.slice(0, 2)}***`;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

function maskGeneric(v: string): string {
  return v ? `${v.slice(0, 1)}***` : v;
}

export function maskByKey(key: string, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return value;
  if (typeof value !== 'string' && typeof value !== 'number') return value;
  const s = String(value);
  const leaf = key.split('.').pop() ?? key;
  if (PHONE_KEY.test(leaf)) return maskPhone(s);
  if (EMAIL_KEY.test(leaf)) return maskEmail(s);
  if (NAME_KEY.test(leaf) || ADDRESS_KEY.test(leaf)) return maskGeneric(s);
  if (ID_KEY.test(leaf)) return maskId(s);
  return value;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const TEL_RE = /tel:\+?[\d\s().-]{7,}/gi;

/** Mask emails and tel: numbers inside free text (console lines, URLs). */
export function maskText(text: string): string {
  return text.replace(EMAIL_RE, (m) => maskEmail(m)).replace(TEL_RE, (m) => `tel:${maskPhone(m)}`);
}

export function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    let changed = false;
    for (const [k, v] of [...u.searchParams]) {
      const m = maskByKey(k, v);
      if (m !== v) {
        u.searchParams.set(k, String(m));
        changed = true;
      }
    }
    return maskText(changed ? u.toString() : url);
  } catch {
    return maskText(url);
  }
}

export function deepMask<T>(value: T, key = '', depth = 0): T {
  if (depth > 12) return value;
  if (Array.isArray(value)) return value.map((v) => deepMask(v, key, depth + 1)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepMask(v, k, depth + 1);
    return out as T;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const m = maskByKey(key, value);
    if (m !== value) return m as T;
    if (typeof value === 'string') return maskText(value) as T;
  }
  return value;
}

export class Masker {
  constructor(readonly enabled: boolean) {}
  obj<T>(v: T): T {
    return this.enabled ? deepMask(v) : v;
  }
  field(key: string, v: unknown): unknown {
    return this.enabled ? maskByKey(key, v) : v;
  }
  /** Masks values that contain a phone number; text like "Call now" is returned unchanged. */
  phone(v: string | undefined): string {
    if (!v) return '';
    if (!this.enabled || v.replace(/\D/g, '').length < 7) return v;
    return maskPhone(v);
  }
  url(v: string): string {
    return this.enabled ? maskUrl(v) : v;
  }
  text(v: string): string {
    return this.enabled ? maskText(v) : v;
  }
}
