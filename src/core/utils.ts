export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Digits only, last 10 (US numbers). Matches the template's phone normalization. */
export function normalizePhone(value: unknown): string {
  return String(value ?? '').replace(/[^\d]/g, '').slice(-10);
}

/** Lowercase, collapse whitespace, strip punctuation/emoji at the edges. */
export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: any = obj;
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

export function hasPath(obj: unknown, path: string): boolean {
  let cur: any = obj;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return false;
    cur = cur[part];
  }
  return true;
}

/** Flatten to leaf paths. Arrays of primitives are treated as leaves. */
export function flatten(obj: unknown, prefix = '', out: Record<string, unknown> = {}, depth = 0): Record<string, unknown> {
  if (depth > 8) {
    out[prefix] = obj;
    return out;
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (!entries.length && prefix) out[prefix] = obj;
    for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
  } else if (Array.isArray(obj) && obj.some((x) => x && typeof x === 'object')) {
    obj.forEach((v, i) => flatten(v, `${prefix}.${i}`, out, depth + 1));
  } else if (prefix) {
    out[prefix] = obj;
  }
  return out;
}

export function tryParseJson(text: string | undefined | null): unknown {
  if (text === undefined || text === null) return undefined;
  const t = text.trim();
  if (!t || !/^[[{"]/.test(t)) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

/** Parse a request body: JSON, or form-urlencoded into an object. */
export function parseBody(text: string | undefined): unknown {
  if (!text) return undefined;
  const json = tryParseJson(text);
  if (json !== undefined) return json;
  if (/^[\w.%-]+=/.test(text) && !/\s/.test(text.slice(0, 200))) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of new URLSearchParams(text)) out[k] = tryParseJson(v) ?? v;
    return out;
  }
  return undefined;
}

export function fmtTs(ms: number): string {
  const sign = ms < 0 ? '-' : '';
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const r = Math.floor(abs % 1000);
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function shortUrl(url: string, n = 110): string {
  try {
    const u = new URL(url);
    return truncate(`${u.host}${u.pathname}${u.search}`, n);
  } catch {
    return truncate(url, n);
  }
}

export function safeStringify(v: unknown, space?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(
    v,
    (_k, val) => {
      if (val && typeof val === 'object') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    },
    space,
  );
}

export function looseEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a === 'object' || typeof b === 'object') return safeStringify(a) === safeStringify(b);
  return String(a) === String(b);
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}
