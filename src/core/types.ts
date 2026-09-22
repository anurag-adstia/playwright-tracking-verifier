import type { ActionTrigger, SiteType, CallProvider, TrackerId } from '../config/tracking.config';

export type Status = 'PASS' | 'FAIL' | 'WARNING' | 'SKIPPED' | 'INFO';

export type ActionKind = 'page_load' | 'navigation' | 'cta_click' | 'quiz_answer' | 'zip_submit' | 'lead_submit' | 'phone_click';

export interface NetworkRecord {
  id: string;
  ts: number;
  url: string;
  method: string;
  resourceType: string;
  category: string;
  isNavigation: boolean;
  pageUrl?: string;
  frameUrl?: string;
  requestHeaders?: Record<string, string>;
  postData?: string;
  postDataSize?: number;
  postDataBinary?: boolean;
  postDataJson?: unknown;
  status?: number;
  statusText?: string;
  responseHeaders?: Record<string, string>;
  responseTs?: number;
  durationMs?: number;
  failure?: string;
  responseBody?: string;
  actionId?: string;
}

export interface TrackingEvent {
  id: string;
  ts: number;
  tracker: TrackerId | string;
  source: 'network' | 'datalayer' | 'ringba_tags';
  name: string;
  payload: any;
  requestId?: string;
  pageUrl?: string;
  actionId?: string;
}

export interface DataLayerPush {
  id: string;
  ts: number;
  global: string;
  kind: 'initial' | 'push';
  pageUrl: string;
  frameUrl?: string;
  data: unknown;
  eventName?: string;
  actionId?: string;
}

export type ConsoleCategory = 'TRACKING' | 'APPLICATION' | 'NETWORK' | 'WARNING' | 'INFO';

export interface ConsoleRecord {
  id: string;
  ts: number;
  type: string;
  text: string;
  location?: string;
  pageUrl?: string;
  category: ConsoleCategory;
  tracker?: TrackerId;
  blocking: boolean;
  actionId?: string;
}

export interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

export interface StorageSnapshot {
  ts: number;
  pageUrl: string;
  origin: string;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: CookieInfo[];
}

export interface ElementInfo {
  ref?: string;
  tag: string;
  text: string;
  href?: string;
  id?: string;
  name?: string;
  type?: string;
  value?: string;
  classes?: string;
  visible: boolean;
  enabled: boolean;
  score?: number;
  isNew?: boolean;
  inHeader?: boolean;
  rect?: { x: number; y: number; w: number; h: number };
  attrs?: Record<string, string>;
}

export interface DomSnapshot {
  ts: number;
  url: string;
  title: string;
  scripts: Array<{ src?: string; id?: string; type?: string; async: boolean; defer: boolean; inline: boolean; inlineSize: number; nscript?: string; snippet?: string }>;
  noscripts: string[];
  iframes: Array<{ src?: string; id?: string; visible: boolean }>;
  forms: Array<{ id?: string; name?: string; action?: string; method?: string; inputs: number }>;
  inputs: ElementInfo[];
  buttons: ElementInfo[];
  anchors: number;
  ctaCandidates: ElementInfo[];
  phoneLinks: ElementInfo[];
  phoneLikeNonAnchors: ElementInfo[];
  zipInputs: ElementInfo[];
  meta: Record<string, string>;
  nextData?: string;
}

export interface ActionContext {
  ctaText?: string;
  phone?: string;
  phoneRaw?: string;
  phoneHref?: string;
  pagePath?: string;
  pageUrl?: string;
  answerText?: string;
  answerValue?: string;
  questionText?: string;
  zip?: string;
  host?: string;
  step?: number;
}

export interface ActionRecord {
  id: string;
  kind: ActionKind;
  trigger: ActionTrigger;
  label: string;
  startTs: number;
  endTs: number;
  pageUrlBefore: string;
  pageUrlAfter: string;
  navigated: boolean;
  context: ActionContext;
  element?: ElementInfo;
  status: 'done' | 'error';
  error?: string;
  notes: string[];
  screenshot?: string;
  storage?: StorageSnapshot;
  dataLayerState?: unknown[];
  domHtml?: string;
  domFile?: string;
}

export interface CheckResult {
  id: string;
  title: string;
  group: string;
  status: Status;
  message: string;
  expected?: unknown;
  actual?: unknown;
  classification?: string;
  actionId?: string;
  details?: string[];
  evidence?: string[];
}

export type IssueKind =
  | 'MISSING_EVENT'
  | 'DUPLICATE_EVENT'
  | 'MISSING_FIELD'
  | 'EMPTY_VALUE'
  | 'TYPE_MISMATCH'
  | 'VALUE_MISMATCH'
  | 'CONTEXT_MISMATCH'
  | 'IDENTITY_MISMATCH'
  | 'ADDITIONAL_FIELD'
  | 'SEQUENCE_MISMATCH';

export interface Issue {
  kind: IssueKind;
  severity: 'FAIL' | 'WARNING' | 'INFO';
  field?: string;
  expected?: unknown;
  actual?: unknown;
  message: string;
}

export interface EventValidation {
  tracker: string;
  event: string;
  checkId?: string;
  actionId?: string;
  actionLabel?: string;
  trigger: ActionTrigger;
  expectedCount: number;
  actualCount: number;
  required: boolean;
  status: Status;
  eventIds: string[];
  issues: Issue[];
}

export interface TimelineEntry {
  ts: number;
  kind: 'ACTION' | 'NETWORK' | 'EVENT' | 'DATALAYER' | 'CONSOLE' | 'NAVIGATION' | 'SCRIPT';
  label: string;
  tracker?: string;
  actionId?: string;
  status?: Status;
}

export interface TrackerState {
  id: TrackerId;
  toggle: boolean | 'auto';
  detected: boolean;
  enabled: boolean;
  required: boolean;
  evidence: string[];
}

export interface FlowSummary {
  type: SiteType;
  provider: CallProvider;
  ctaClicked: boolean;
  quizSteps: number;
  quizCompleted: boolean;
  zipSubmitted: boolean;
  leadStageReached: boolean;
  phoneClicked: boolean;
  notes: string[];
}
