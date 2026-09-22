import type { NetworkRecord, Status } from '../core/types';
import { shortUrl } from '../core/utils';

export function isOk(rec: NetworkRecord, allowed?: number[]): boolean {
  if (rec.failure) return false;
  if (rec.status === undefined) return false;
  if (allowed?.length) return allowed.includes(rec.status);
  return rec.status >= 200 && rec.status < 400;
}

export function describeRequest(rec: NetworkRecord): string {
  const status = rec.failure ? `FAILED (${rec.failure})` : rec.status !== undefined ? `HTTP ${rec.status}` : 'no response';
  return `${rec.method} ${shortUrl(rec.url)} → ${status}${rec.durationMs !== undefined ? ` in ${rec.durationMs}ms` : ''} [${rec.id}]`;
}

export interface RequestCheckOutcome {
  status: Status;
  message: string;
  details: string[];
}

/**
 * "The script loaded" = at least one matching request, all of them without failure and with an
 * OK status. ERR_BLOCKED_BY_CLIENT is called out explicitly (ad blockers / CSP).
 */
export function checkScriptRequests(label: string, requests: NetworkRecord[], opts: { required: boolean; allowed?: number[] }): RequestCheckOutcome {
  const details = requests.map(describeRequest);
  if (!requests.length) {
    return {
      status: opts.required ? 'FAIL' : 'SKIPPED',
      message: opts.required ? `${label}: no request observed` : `${label}: not present`,
      details,
    };
  }
  const ok = requests.filter((r) => isOk(r, opts.allowed));
  const blocked = requests.filter((r) => /BLOCKED/i.test(r.failure ?? ''));
  const pending = requests.filter((r) => r.status === undefined && !r.failure);
  if (blocked.length) {
    return { status: 'FAIL', message: `${label}: request blocked (${blocked[0].failure})`, details };
  }
  if (!ok.length) {
    if (pending.length === requests.length) {
      return { status: 'WARNING', message: `${label}: request sent but no response received before the run ended`, details };
    }
    const bad = requests[0];
    return { status: 'FAIL', message: `${label}: request failed — ${bad.failure ?? `HTTP ${bad.status}`}`, details };
  }
  if (ok.length < requests.length - pending.length) {
    return { status: 'WARNING', message: `${label}: ${ok.length}/${requests.length} requests succeeded`, details };
  }
  return { status: 'PASS', message: `${label}: loaded (${ok.map((r) => `HTTP ${r.status}`).join(', ')})`, details };
}
