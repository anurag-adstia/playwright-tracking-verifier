#!/usr/bin/env node
/**
 * npm run tracking -- --url=https://example.com [--type=quiz] [--provider=ringba] [--headed] [--debug]
 * npm run tracking -- --config=configs/sites/my-site.ts
 * npm run tracking -- --site=my-site          (configs/sites/my-site.ts)
 * npm run tracking -- --all                   (every config in configs/sites)
 *
 * Exit codes: 0 = all required tracking checks passed, 1 = tracking failure, 2 = config/framework error.
 */
import * as path from 'path';
import { chromium, type Browser } from '@playwright/test';
import { CliOverrides, ConfigError, listSiteConfigs, loadConfigFile, resolveConfig } from './config/config.loader';
import type { SiteConfigInput } from './config/tracking.config';
import type { Status } from './core/types';
import type { RunReport } from './reports/report.types';
import { runTracking } from './runner';

const HELP = `
Tracking QA — automated GTM / Jitsu / Clarity / Ringba / CallGrid verification

Usage:
  npm run tracking -- --url=<url> [options]
  npm run tracking -- --config=<file|site-name> [options]
  npm run tracking -- --site=<site-name> [options]
  npm run tracking -- --all [options]

Options:
  --url=<url>              Page to test (overrides config url)
  --config=<path|name>     Site config (.ts/.js/.json). A bare name is looked up in configs/sites/
  --site=<name>            Same as --config=<name>
  --all                    Run every config in configs/sites/
  --type=<t>               lander | quiz | chatquiz | auto (default auto)
  --provider=<p>           ringba | callgrid | none | auto (default auto)
  --zip=<zip>              Test ZIP for quizzes (default 90210)
  --out=<dir>              Reports directory (default reports/)
  --strict                 Additional payload fields become FAIL instead of INFO
  --trace                  Record a Playwright trace (slower; for debugging a failure)
  --headed                 Show the browser
  --debug                  Verbose [PAGE]/[NETWORK]/[JITSU]/[DATALAYER]/[VALIDATION] log
  -h, --help               This help

Exit codes: 0 pass · 1 tracking failure · 2 configuration/framework error
`;

interface Args {
  url?: string;
  config?: string;
  all: boolean;
  type?: string;
  provider?: string;
  zip?: string;
  out?: string;
  strict: boolean;
  trace: boolean;
  headed: boolean;
  debug: boolean;
  help: boolean;
}

const VALUE_FLAGS = new Set(['url', 'config', 'site', 'type', 'provider', 'zip', 'out']);
const BOOL_FLAGS = new Set(['all', 'strict', 'trace', 'headed', 'debug', 'help']);

export function parseArgs(argv: string[]): Args {
  const a: Args = { all: false, strict: false, trace: false, headed: false, debug: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (raw === '-h') {
      a.help = true;
      continue;
    }
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(raw);
    if (!m) {
      // allow a bare URL as positional argument
      if (/^https?:\/\//.test(raw) && !a.url) {
        a.url = raw;
        continue;
      }
      throw new ConfigError(`Unexpected argument "${raw}". See --help.`);
    }
    const [, name, inline] = m;
    if (BOOL_FLAGS.has(name)) {
      (a as unknown as Record<string, boolean>)[name] = inline === undefined ? true : inline !== 'false';
      continue;
    }
    if (!VALUE_FLAGS.has(name)) throw new ConfigError(`Unknown option --${name}. See --help.`);
    const value = inline ?? argv[++i];
    if (value === undefined || value.startsWith('--')) throw new ConfigError(`--${name} requires a value`);
    switch (name) {
      case 'url':
        a.url = value;
        break;
      case 'config':
      case 'site':
        a.config = value;
        break;
      default:
        (a as unknown as Record<string, string>)[name] = value;
    }
  }
  return a;
}

const COLOR: Record<Status, string> = { PASS: '\x1b[32m', FAIL: '\x1b[31m', WARNING: '\x1b[33m', SKIPPED: '\x1b[90m', INFO: '\x1b[36m' };
const tty = !!process.stdout.isTTY && !process.env.NO_COLOR;
const col = (s: Status, text: string = s) => (tty ? `${COLOR[s]}${text}\x1b[0m` : text);

function printSummary(r: RunReport): void {
  const line = '─'.repeat(78);
  console.log(`\n${line}\n ${r.runId}  ${r.site}  →  ${col(r.status, r.status)}   (${(r.durationMs / 1000).toFixed(1)}s, ${r.type}, provider ${r.provider})\n${line}`);
  console.log(' Trackers: ' + Object.entries(r.trackers).map(([k, v]) => `${k.toUpperCase()} ${col(v)}`).join('  '));
  const c = r.summary.checks;
  console.log(` Checks:   ${col('PASS', `${c.PASS} pass`)} · ${col('FAIL', `${c.FAIL} fail`)} · ${col('WARNING', `${c.WARNING} warn`)} · ${c.SKIPPED} skipped · ${c.INFO} info`);
  console.log(`\n Acceptance questions:`);
  for (const a of r.answers) console.log(`  ${col(a.status, a.status.padEnd(7))} ${a.question}${a.status === 'FAIL' || a.status === 'WARNING' ? `\n           ↳ ${a.answer.slice(0, 220)}` : ''}`);
  if (r.failures.length) {
    console.log(`\n Failures:`);
    for (const f of r.failures) {
      console.log(`  ${col('FAIL', f.id)} ${f.title} — ${f.message}`);
      if (f.expected !== undefined) console.log(`      expected: ${typeof f.expected === 'string' ? f.expected : JSON.stringify(f.expected)}`);
      if (f.actual !== undefined) console.log(`      actual:   ${typeof f.actual === 'string' ? f.actual : JSON.stringify(f.actual)}`);
      if (f.classification) console.log(`      class:    ${f.classification}`);
      if (f.evidence?.length) console.log(`      evidence: ${f.evidence.slice(0, 3).join(', ')}`);
    }
  }
  console.log(`\n Report: ${path.relative(process.cwd(), r.artifacts.html)}\n JSON:   ${path.relative(process.cwd(), r.artifacts.json)}${r.artifacts.trace ? `\n Trace:  npx playwright show-trace ${path.relative(process.cwd(), r.artifacts.trace)}` : ''}\n${line}\n`);
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    return 2;
  }
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const overrides: CliOverrides = {
    url: args.url,
    type: args.type,
    provider: args.provider,
    headed: args.headed,
    reportDir: args.out,
    zip: args.zip,
    strict: args.strict,
    trace: args.trace ? 'on' : undefined,
  };

  let inputs: Array<{ label: string; input: SiteConfigInput }>;
  try {
    if (args.all) {
      const files = listSiteConfigs();
      if (!files.length) throw new ConfigError('No configs found in configs/sites/');
      inputs = await Promise.all(files.map(async (f) => ({ label: path.basename(f), input: await loadConfigFile(f) })));
    } else if (args.config) {
      inputs = [{ label: args.config, input: await loadConfigFile(args.config) }];
    } else if (args.url) {
      inputs = [{ label: args.url, input: {} }];
    } else {
      throw new ConfigError('Provide --url, --config/--site or --all. See --help.');
    }
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    return 2;
  }

  let exit = 0;
  let browser: Browser | undefined;
  try {
    for (const { label, input } of inputs) {
      let cfg;
      try {
        cfg = resolveConfig(input, args.all ? { ...overrides, url: undefined } : overrides);
      } catch (e) {
        console.error(`✖ ${label}: ${(e as Error).message}`);
        exit = 2;
        continue;
      }
      // One browser for all sites; every run gets its own isolated context.
      browser ??= await chromium.launch({ headless: cfg.browser.headless });
      const result = await runTracking(cfg, { debug: args.debug, browser });
      printSummary(result.report);
      if (result.exitCode === 1 && exit === 0) exit = 1;
    }
  } catch (e) {
    const err = e as Error;
    console.error(`✖ Framework error: ${err.message}`);
    if (args.debug && err.stack) console.error(err.stack);
    if (/Executable doesn't exist|browserType\.launch/i.test(err.message)) console.error('  Run: npm run install:browsers');
    return 2;
  } finally {
    await browser?.close().catch(() => undefined);
  }
  return exit;
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(`✖ Framework error: ${(e as Error).message}`);
      process.exit(2);
    },
  );
}
