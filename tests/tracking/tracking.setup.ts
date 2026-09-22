import * as fs from 'fs';
import * as path from 'path';
import { test as setup } from '@playwright/test';
import { runTracking } from '../../src/runner';
import { configFromEnv, RESULT_FILE } from '../fixtures/tracking.fixture';

setup('run tracking verification once', async () => {
  fs.rmSync(RESULT_FILE, { force: true });
  const cfg = await configFromEnv();
  setup.skip(!cfg, 'Set TRACKING_URL or TRACKING_CONFIG to run the tracking suites');
  const result = await runTracking(cfg!, { debug: !!process.env.TRACKING_DEBUG });
  fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result.report));
  setup.info().annotations.push({ type: 'report', description: result.report.artifacts.html });
});
