import type { TrackerId } from '../config/tracking.config';
import { callgridAdapter } from './callgrid';
import { clarityAdapter } from './clarity';
import { gtmAdapter } from './gtm';
import { jitsuAdapter } from './jitsu';
import { ringbaAdapter } from './ringba';
import type { TrackerAdapter } from './types';

/** Registry of tracker adapters. Register new providers here. */
export const TRACKERS: TrackerAdapter[] = [gtmAdapter, jitsuAdapter, clarityAdapter, ringbaAdapter, callgridAdapter];

export function trackerById(id: TrackerId): TrackerAdapter | undefined {
  return TRACKERS.find((t) => t.id === id);
}

export type { TrackerAdapter, EvalContext, DetectContext } from './types';
