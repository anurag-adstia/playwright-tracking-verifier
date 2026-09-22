import { defineConfig } from '@playwright/test';

/** npx playwright test → checks every site in configs/sites/ and writes ONE report: reports/report.html */
export default defineConfig({
  testDir: 'tests',
  testMatch: /[\\/]tests[\\/]tracking\.spec\.ts$/,
  timeout: 300_000,
  reporter: [['list'], ['./src/reporter.ts']],
});
