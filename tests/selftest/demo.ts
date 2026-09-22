/**
 * npm run demo [-- lander|landerBroken|ringbaQuiz|callgridQuiz|callgridQuizBad] [--debug]
 * Runs the verifier against the offline mock site and prints where the report is.
 */
import { resolveConfig } from '../../src/config/config.loader';
import { runTracking } from '../../src/runner';
import { MOCK_ROUTES, startMockSite } from './mock-site/server';
import { SCENARIOS, withBase } from './scenarios';

async function main() {
  const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const debug = process.argv.includes('--debug');
  const selected = names.length ? names : Object.keys(SCENARIOS);
  const site = await startMockSite();
  let exit = 0;
  try {
    for (const name of selected) {
      const input = SCENARIOS[name];
      if (!input) throw new Error(`unknown scenario ${name}; choose from ${Object.keys(SCENARIOS).join(', ')}`);
      const cfg = resolveConfig(withBase(input, site.baseUrl, 'reports'));
      cfg.report.trace = 'on';
      const r = await runTracking(cfg, { routes: MOCK_ROUTES, debug });
      console.log(`\n${name}: ${r.report.status}  →  ${r.report.artifacts.html}`);
      for (const f of r.report.failures) console.log(`   FAIL ${f.id} ${f.message}`);
      exit = Math.max(exit, r.exitCode);
    }
  } finally {
    await site.close();
  }
  process.exit(exit);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
