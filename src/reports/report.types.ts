import type { CallProvider, SiteType, TrackerId } from '../config/tracking.config';
import type { ActionSummary } from '../correlation/action-correlator';
import type {
  CheckResult,
  ConsoleRecord,
  DataLayerPush,
  DomSnapshot,
  EventValidation,
  FlowSummary,
  NetworkRecord,
  Status,
  StorageSnapshot,
  TimelineEntry,
  TrackerState,
} from '../core/types';
import type { KeyOccurrence } from '../validators/provider.validator';

export interface ReportEvent {
  id: string;
  ts: number;
  tracker: string;
  source: string;
  name: string;
  actionId?: string;
  pageUrl?: string;
  requestId?: string;
  payload: unknown;
}

export interface AcceptanceAnswer {
  question: string;
  status: Status;
  answer: string;
  checks: string[];
}

export interface RunReport {
  tool: { name: string; version: string };
  runId: string;
  site: string;
  url: string;
  finalUrl: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  type: SiteType;
  configuredType: string;
  provider: CallProvider;
  configuredProvider: string;
  detectedProviders: CallProvider[];
  status: Status;
  exitCode: 0 | 1;
  trackers: Record<TrackerId, Status>;
  trackerDetails: Record<TrackerId, TrackerState & { status: Status; label: string }>;
  summary: {
    checks: Record<Status, number>;
    actions: number;
    events: number;
    trackingRequests: number;
    totalRequests: number;
    dataLayerPushes: number;
    consoleErrors: number;
    trackingErrors: number;
  };
  answers: AcceptanceAnswer[];
  checks: CheckResult[];
  failures: CheckResult[];
  warnings: CheckResult[];
  flow: FlowSummary;
  actions: ActionSummary[];
  timeline: TimelineEntry[];
  events: ReportEvent[];
  eventValidations: EventValidation[];
  duplicates: Array<{ tracker: string; event: string; actionId?: string; expected: number; actual: number; message: string }>;
  missing: Array<{ tracker: string; event: string; actionId?: string; actionLabel?: string; message: string; severity: string }>;
  networkRequests: NetworkRecord[];
  consoleErrors: ConsoleRecord[];
  storage: { final?: StorageSnapshot; perAction: Record<string, StorageSnapshot | undefined> };
  dataLayer: DataLayerPush[];
  dom: { initial?: DomSnapshot; final?: DomSnapshot };
  providerKeys: Record<string, KeyOccurrence[]>;
  globals: Record<string, unknown>;
  screenshots: Array<{ actionId: string; label: string; file: string }>;
  artifacts: { dir: string; html: string; json: string; trace?: string };
  notes: string[];
}
