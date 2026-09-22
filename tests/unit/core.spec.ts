import { expect, test } from '@playwright/test';
import { parseArgs } from '../../src/cli';
import { ConfigError, resolveConfig } from '../../src/config/config.loader';
import { classifyConsole, RequestClassifier } from '../../src/core/classifier';
import { deepMask, maskUrl } from '../../src/core/mask';
import { DEFAULT_CLASSIFIER } from '../../src/config/tracking.config';

test('request classifier', () => {
  const c = new RequestClassifier(DEFAULT_CLASSIFIER);
  expect(c.classify('https://www.googletagmanager.com/gtm.js?id=GTM-ABC1234')).toBe('GTM');
  expect(c.classify('https://adstia-scripts.netlify.app/jitsu-script.js')).toBe('JITSU');
  expect(c.classify('https://tracking.adstiacms.com/api/s/track')).toBe('JITSU');
  expect(c.classify('https://y.clarity.ms/collect')).toBe('CLARITY');
  expect(c.classify('https://b-js.ringba.com/CA123')).toBe('RINGBA');
  expect(c.classify('https://api.callgrid.com/x')).toBe('CALLGRID');
  expect(c.classify('https://example.com/app.js')).toBe('OTHER');
});

test('console classification separates tracking failures from noise', () => {
  expect(classifyConsole('error', '❌ Jitsu script URL is missing')).toMatchObject({ category: 'TRACKING', tracker: 'jitsu', blocking: true });
  expect(classifyConsole('warning', 'Image with src "/a.png" was detected as the Largest Contentful Paint (LCP).')).toMatchObject({ category: 'WARNING', blocking: false });
  expect(classifyConsole('error', "Failed to launch 'tel:+18002650896' because the scheme does not have a registered handler.")).toMatchObject({ category: 'INFO' });
  expect(classifyConsole('requestfailed', 'POST y.clarity.ms/collect — net::ERR_ABORTED', 'https://y.clarity.ms/collect', 'CLARITY')).toMatchObject({ category: 'TRACKING', blocking: false });
  expect(classifyConsole('requestfailed', 'GET x — net::ERR_BLOCKED_BY_CLIENT', 'https://www.googletagmanager.com/gtm.js', 'GTM')).toMatchObject({ category: 'TRACKING', blocking: true });
  expect(classifyConsole('pageerror', 'TypeError: x is undefined')).toMatchObject({ category: 'APPLICATION' });
});

test('masking of phone, email, names and identifiers', () => {
  const m = deepMask({ phone: '8002650896', data: { email: 'jane.doe@mail.com', first_name: 'Jane', session_id: 'sess_id_1234567890abcdef' }, other: 'keep' });
  expect(m.phone).toBe('******0896');
  expect(m.data.email).toBe('j***@m***.com');
  expect(m.data.first_name).toBe('J***');
  expect(m.data.session_id).toBe('sess_i…cdef');
  expect(m.other).toBe('keep');
  expect(maskUrl('https://x.test/?phone=8002650896&a=1')).toContain('phone=******0896');
});

test('config: defaults, event lists, provider implications, validation', () => {
  const cfg = resolveConfig({ url: 'https://example.com', expected: { jitsu: { events: ['page_view', 'cta_click'] }, callTracking: { provider: 'callgrid' } } });
  expect(Object.keys(cfg.expected.jitsu.events)).toEqual(['page_view', 'cta_click']);
  expect(cfg.expected.jitsu.events.cta_click.checkId).toBe('JITSU-004');
  expect(cfg.tracking.callgrid).toBe(true);
  expect(cfg.tracking.ringba).toBe(false);
  expect(cfg.name).toBe('example.com');
  expect(() => resolveConfig({ url: 'not a url' })).toThrow(ConfigError);
  expect(() => resolveConfig({ url: 'https://x.test', type: 'website' as never })).toThrow(/type must be/);
  expect(() => resolveConfig({ url: 'https://x.test', expected: { jitsu: { events: { custom_evt: { fields: {} } } } } })).toThrow(/trigger/);
});

test('config: spec example shape (gtmContainerId, clarity.enabled) is accepted', () => {
  const cfg = resolveConfig({ url: 'https://example.com', type: 'lander', expected: { gtmContainerId: 'GTM-XXXXXXX', clarity: { enabled: true } } });
  expect(cfg.expected.gtm.containerId).toBe('GTM-XXXXXXX');
  expect(cfg.tracking.clarity).toBe(true);
});

test('cli argument parsing', () => {
  expect(parseArgs(['--url=https://a.test', '--type', 'quiz', '--provider=ringba', '--headed', '--debug'])).toMatchObject({ url: 'https://a.test', type: 'quiz', provider: 'ringba', headed: true, debug: true });
  expect(parseArgs(['--site=my-site'])).toMatchObject({ config: 'my-site', trace: false });
  expect(parseArgs(['--site=my-site', '--trace'])).toMatchObject({ trace: true });
  expect(() => parseArgs(['--bogus'])).toThrow(ConfigError);
  expect(() => parseArgs(['--url'])).toThrow(/requires a value/);
});
