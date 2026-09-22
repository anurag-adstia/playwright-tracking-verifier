export { runTracking, type RunOptions, type RunResult } from './runner';
export { resolveConfig, loadConfigFile, ConfigError } from './config/config.loader';
export { defineSiteConfig, DEFAULT_CONFIG } from './config/tracking.config';
export type { SiteConfig, SiteConfigInput, EventSpec, FieldRule, TrackerId } from './config/tracking.config';
export type { RunReport } from './reports/report.types';
export type { CheckResult, Status } from './core/types';
export { TRACKERS } from './trackers';
