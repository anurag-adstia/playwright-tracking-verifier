import type { ContextKey, FieldRule, FieldSpec, FieldType } from '../config/tracking.config';
import type { ActionContext, Issue } from '../core/types';
import { getPath, hasPath, looseEquals, normalizePhone, normalizeText, typeOf } from '../core/utils';

export interface PayloadValidationOptions {
  /** Paths tried, in order, as the parent of each field ('' = payload root). Jitsu: ['properties', '']. */
  roots: string[];
  /** Values from the real action (clicked CTA text, phone, answer, page path…). */
  context: ActionContext;
  /** Identity values from browser storage for the page where the event fired. */
  identity: Record<string, string | undefined>;
  /** Object whose keys are checked for additional (unspecified) fields. */
  extrasRoot?: string;
  strict?: boolean;
}

export function normalizeRule(rule: FieldRule): FieldSpec {
  if (typeof rule === 'string' || Array.isArray(rule)) return { type: rule, required: true };
  return { required: true, ...rule };
}

export interface ResolvedField {
  found: boolean;
  value: unknown;
  path?: string;
}

/** Find a field under the configured roots, trying aliases second. */
export function resolveField(payload: unknown, field: string, aliases: string[] = [], roots: string[] = ['']): ResolvedField {
  for (const name of [field, ...aliases]) {
    for (const root of roots) {
      const p = root ? `${root}.${name}` : name;
      if (hasPath(payload, p)) {
        const value = getPath(payload, p);
        // A null/undefined value under an earlier root should not hide a real value under a later one.
        if (value === undefined || value === null) {
          const later = roots.slice(roots.indexOf(root) + 1).map((r) => (r ? `${r}.${name}` : name));
          const hit = later.find((lp) => {
            const v = getPath(payload, lp);
            return v !== undefined && v !== null;
          });
          if (hit) return { found: true, value: getPath(payload, hit), path: hit };
        }
        return { found: true, value, path: p };
      }
    }
  }
  return { found: false, value: undefined };
}

function contextValue(ctx: ActionContext, key: ContextKey): string | undefined {
  const v = (ctx as Record<string, unknown>)[key];
  return v === undefined || v === null || v === '' ? undefined : String(v);
}

export function valuesMatch(actual: unknown, expected: string, mode: FieldSpec['normalize'], key?: ContextKey): boolean {
  if (key === 'phone' || mode === 'phone') {
    const a = normalizePhone(actual);
    return a.length > 0 && a === normalizePhone(expected);
  }
  if (key === 'pagePath') {
    const strip = (s: string) => s.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
    return strip(String(actual)) === strip(expected);
  }
  if (mode === 'none') return String(actual) === expected;
  const values = Array.isArray(actual) ? actual : [actual];
  return values.some((v) => {
    const a = normalizeText(v);
    const e = normalizeText(expected);
    if (!a || !e) return false;
    return a === e || (a.length >= 2 && e.includes(a)) || (e.length >= 2 && a.includes(e));
  });
}

export function validatePayload(payload: unknown, fields: Record<string, FieldRule>, opts: PayloadValidationOptions): Issue[] {
  const issues: Issue[] = [];
  const names: string[] = [];

  for (const [field, rawRule] of Object.entries(fields)) {
    const rule = normalizeRule(rawRule);
    const required = rule.required !== false;
    const res = resolveField(payload, field, rule.aliases, opts.roots);
    names.push(field, ...(rule.aliases ?? []));

    if (!res.found || res.value === undefined) {
      if (required) issues.push({ kind: 'MISSING_FIELD', severity: 'FAIL', field, expected: describeType(rule.type), actual: 'undefined', message: `required field "${field}" is missing` });
      continue;
    }
    const v = res.value;
    const types = rule.type === undefined ? ['any'] : Array.isArray(rule.type) ? rule.type : [rule.type];
    const actualType = typeOf(v);

    if (v === null && !types.includes('null') && !types.includes('any')) {
      issues.push({ kind: 'EMPTY_VALUE', severity: required ? 'FAIL' : 'WARNING', field, expected: describeType(rule.type), actual: null, message: `"${field}" is null` });
      continue;
    }
    if (typeof v === 'string' && v.trim() === '' && !rule.allowEmpty) {
      issues.push({ kind: 'EMPTY_VALUE', severity: required ? 'FAIL' : 'WARNING', field, expected: 'non-empty', actual: '', message: `"${field}" is an empty string` });
      continue;
    }
    if (!types.includes('any') && !types.includes(actualType as FieldType)) {
      issues.push({ kind: 'TYPE_MISMATCH', severity: 'FAIL', field, expected: describeType(rule.type), actual: `${actualType} (${preview(v)})`, message: `"${field}" should be ${describeType(rule.type)} but is ${actualType}` });
      continue;
    }
    if (rule.equals !== undefined && !looseEquals(v, rule.equals)) {
      issues.push({ kind: 'VALUE_MISMATCH', severity: 'FAIL', field, expected: rule.equals, actual: v, message: `"${field}" has unexpected value` });
    }
    if (rule.oneOf && !rule.oneOf.some((o) => looseEquals(o, v))) {
      issues.push({ kind: 'VALUE_MISMATCH', severity: 'FAIL', field, expected: `one of ${JSON.stringify(rule.oneOf)}`, actual: v, message: `"${field}" is not an allowed value` });
    }
    if (rule.pattern && !new RegExp(rule.pattern).test(String(v))) {
      issues.push({ kind: 'VALUE_MISMATCH', severity: 'FAIL', field, expected: `/${rule.pattern}/`, actual: v, message: `"${field}" does not match pattern` });
    }
    if (rule.matchesContext) {
      const keys = Array.isArray(rule.matchesContext) ? rule.matchesContext : [rule.matchesContext];
      const available = keys.map((k) => [k, contextValue(opts.context, k)] as const).filter(([, val]) => val !== undefined) as Array<[ContextKey, string]>;
      if (available.length && !available.some(([k, e]) => valuesMatch(v, e, rule.normalize, k))) {
        const expected = available.map(([k, e]) => (k === 'phone' ? normalizePhone(e) : e)).join(' | ');
        issues.push({
          kind: 'CONTEXT_MISMATCH',
          severity: 'FAIL',
          field,
          expected,
          actual: keys.includes('phone') ? normalizePhone(v) : v,
          message: `"${field}" does not match the actual ${available.map(([k]) => k).join('/')} of the user action`,
        });
      }
    }
    if (rule.identity) {
      const stored = opts.identity[rule.identity];
      if (stored !== undefined && String(v) !== stored) {
        issues.push({ kind: 'IDENTITY_MISMATCH', severity: 'FAIL', field, expected: stored, actual: v, message: `"${field}" differs from browser storage identity "${rule.identity}" — tracking identity mismatch` });
      }
    }
  }

  if (opts.extrasRoot !== undefined) {
    const root = opts.extrasRoot ? getPath(payload, opts.extrasRoot) : payload;
    const prefix = opts.extrasRoot ? `${opts.extrasRoot}.` : '';
    const known = new Set(names.map((n) => (prefix && n.startsWith(prefix) ? n.slice(prefix.length) : n).split('.')[0]));
    if (root && typeof root === 'object' && !Array.isArray(root)) {
      for (const [k, val] of Object.entries(root as Record<string, unknown>)) {
        if (known.has(k) || k === 'event') continue;
        issues.push({
          kind: 'ADDITIONAL_FIELD',
          severity: opts.strict ? 'FAIL' : 'INFO',
          field: prefix + k,
          actual: preview(val),
          message: `additional field "${prefix}${k}" (not in schema)`,
        });
      }
    }
  }
  return issues;
}

function describeType(t: FieldSpec['type']): string {
  if (!t) return 'any';
  return Array.isArray(t) ? t.join(' | ') : t;
}

export function preview(v: unknown, n = 60): string {
  const s = typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v) ?? String(v);
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
