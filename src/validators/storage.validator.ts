import type { SiteConfig } from '../config/tracking.config';
import { readIdentity } from '../collectors/storage.collector';
import type { Masker } from '../core/mask';
import type { CheckResult, EventValidation, StorageSnapshot, TrackingEvent } from '../core/types';
import { originOf, unique } from '../core/utils';
import { resolveField } from './payload.validator';

/** Storage snapshot of the page where an event fired: same origin, closest after the event. */
export function snapshotFor(snaps: StorageSnapshot[], e: TrackingEvent): StorageSnapshot | undefined {
  const origin = e.pageUrl ? originOf(e.pageUrl) : '';
  const same = snaps.filter((s) => !origin || s.origin === origin);
  if (!same.length) return undefined;
  return same.find((s) => s.ts >= e.ts) ?? same[same.length - 1];
}

export function identityValues(cfg: SiteConfig, snap: StorageSnapshot | undefined): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [name, spec] of Object.entries(cfg.expected.identity)) out[name] = readIdentity(snap, spec.source, spec.key);
  return out;
}

const SOURCE_CHECK: Record<string, { id: string; title: string }> = {
  localStorage: { id: 'STORAGE-001', title: 'localStorage identity' },
  sessionStorage: { id: 'STORAGE-002', title: 'sessionStorage identity' },
  cookie: { id: 'STORAGE-003', title: 'Tracking cookies' },
};

export function storageChecks(params: {
  cfg: SiteConfig;
  snapshots: StorageSnapshot[];
  validations: EventValidation[];
  events: TrackingEvent[];
  masker: Masker;
  jitsuActive: boolean;
}): CheckResult[] {
  const { cfg, snapshots, masker } = params;
  const checks: CheckResult[] = [];
  const primaryOrigin = originOf(cfg.url);
  const siteSnaps = snapshots.filter((s) => s.origin === primaryOrigin);
  const last = (siteSnaps.length ? siteSnaps : snapshots).at(-1);

  for (const source of ['localStorage', 'sessionStorage', 'cookie'] as const) {
    const specs = Object.entries(cfg.expected.identity).filter(([, s]) => s.source === source);
    const meta = SOURCE_CHECK[source];
    if (!specs.length) {
      checks.push({ id: meta.id, title: meta.title, group: 'STORAGE', status: 'SKIPPED', message: `no ${source} identity configured` });
      continue;
    }
    const details: string[] = [];
    let status: CheckResult['status'] = 'PASS';
    const missing: string[] = [];
    for (const [name, spec] of specs) {
      const v = readIdentity(last, spec.source, spec.key);
      if (v === undefined) {
        missing.push(spec.key);
        details.push(`${spec.key} (${name}): not present${spec.required ? ' — REQUIRED' : ''}`);
        if (spec.required) status = 'FAIL';
      } else {
        details.push(`${spec.key} (${name}) = ${masker.field(spec.key, v)}`);
      }
    }
    if (status !== 'FAIL' && missing.length) {
      // Missing identity is only informative unless required; it is a warning if Jitsu is active,
      // because the standard loader always creates session_id / user_id / __eventn_id.
      status = params.jitsuActive ? 'WARNING' : 'INFO';
    }
    checks.push({
      id: meta.id,
      title: meta.title,
      group: 'STORAGE',
      status,
      message: missing.length ? `missing: ${missing.join(', ')}` : `all ${source} identity values present`,
      details,
    });
  }

  // Identity correlation: storage value vs payload value (issues raised by the payload validator).
  const identityIssues = params.validations.flatMap((v) =>
    v.issues.filter((i) => i.kind === 'IDENTITY_MISMATCH').map((i) => ({ v, i })),
  );
  const correlated = params.validations.filter((v) => v.actualCount > 0).length;
  checks.push({
    id: 'STORAGE-004',
    title: 'Storage ↔ payload identity correlation',
    group: 'STORAGE',
    status: identityIssues.length ? 'FAIL' : correlated ? 'PASS' : 'SKIPPED',
    message: identityIssues.length
      ? `${identityIssues.length} tracking identity mismatch(es) between browser storage and payloads`
      : correlated
        ? 'payload identities match browser storage (session_id, user_id, anonymous_id)'
        : 'no tracking events to correlate',
    classification: identityIssues.length ? 'IDENTITY MISMATCH' : undefined,
    details: identityIssues.map(
      ({ v, i }) => `${v.tracker}.${v.event} ${i.field}: storage=${masker.field(i.field ?? '', String(i.expected))} payload=${masker.field(i.field ?? '', String(i.actual))} (${v.actionId ?? ''})`,
    ),
    actionId: identityIssues[0]?.v.actionId,
  });

  // Consistency: one session_id / user id per origin across all trackers.
  const byOrigin = new Map<string, Record<string, string[]>>();
  const fields: Array<[string, string[]]> = [
    ['session_id', ['session_id', 'data.session_id']],
    ['user_id', ['userId', 'user_id', 'data.user_id']],
  ];
  for (const e of params.events) {
    if (e.tracker !== 'jitsu' && e.tracker !== 'gtm') continue;
    const origin = e.pageUrl ? originOf(e.pageUrl) : '';
    const rec = byOrigin.get(origin) ?? {};
    for (const [label, paths] of fields) {
      for (const p of paths) {
        const r = resolveField(e.payload, p, [], ['properties', '']);
        if (r.found && typeof r.value === 'string' && r.value) {
          (rec[label] ??= []).push(r.value);
          break;
        }
      }
    }
    byOrigin.set(origin, rec);
  }
  const inconsistent: string[] = [];
  for (const [origin, rec] of byOrigin) {
    for (const [label, values] of Object.entries(rec)) {
      const u = unique(values);
      if (u.length > 1) inconsistent.push(`${origin}: ${u.length} different ${label} values (${u.map((x) => masker.field(label, x)).join(', ')})`);
    }
  }
  checks.push({
    id: 'STORAGE-005',
    title: 'Identity consistency across events',
    group: 'STORAGE',
    status: inconsistent.length ? 'WARNING' : byOrigin.size ? 'PASS' : 'SKIPPED',
    message: inconsistent.length ? 'identity values change between events on the same origin' : byOrigin.size ? 'one session_id / user_id per origin across all events' : 'no identity-bearing events',
    details: inconsistent,
  });
  return checks;
}
