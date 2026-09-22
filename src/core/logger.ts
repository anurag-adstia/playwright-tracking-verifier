import { fmtTs } from './utils';

const COLORS: Record<string, string> = {
  PAGE: '\x1b[36m',
  TRACKER: '\x1b[35m',
  NETWORK: '\x1b[90m',
  JITSU: '\x1b[34m',
  GTM: '\x1b[33m',
  DATALAYER: '\x1b[33m',
  CLARITY: '\x1b[35m',
  RINGBA: '\x1b[32m',
  CALLGRID: '\x1b[32m',
  ACTION: '\x1b[1m\x1b[37m',
  CONSOLE: '\x1b[31m',
  VALIDATION: '\x1b[1m\x1b[32m',
  WARN: '\x1b[33m',
  INFO: '\x1b[37m',
};
const RESET = '\x1b[0m';

export class Logger {
  private readonly color: boolean;

  constructor(
    readonly debugEnabled: boolean,
    private readonly clock: () => number = () => 0,
    readonly quiet = false,
  ) {
    this.color = !!process.stdout.isTTY && !process.env.NO_COLOR;
  }

  private fmt(tag: string, msg: string): string {
    const t = `${fmtTs(this.clock())}`;
    const label = `[${tag}]`;
    return this.color ? `\x1b[90m${t}${RESET} ${COLORS[tag] ?? ''}${label}${RESET} ${msg}` : `${t} ${label} ${msg}`;
  }

  /** Verbose tracing, only with --debug. */
  debug(tag: string, msg: string): void {
    if (this.debugEnabled && !this.quiet) console.log(this.fmt(tag, msg));
  }

  /** Progress lines shown in normal mode. */
  info(tag: string, msg: string): void {
    if (!this.quiet) console.log(this.fmt(tag, msg));
  }

  warn(msg: string): void {
    if (!this.quiet) console.warn(this.fmt('WARN', msg));
  }
}
