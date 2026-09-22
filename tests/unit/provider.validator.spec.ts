import { expect, test } from '@playwright/test';
import { RunState } from '../../src/core/run-state';
import { KeyScanner, providerSafetyCheck, scanObject, scanText, splitHtml } from '../../src/validators/provider.validator';

test('scanText reads JSON, JS object and escaped RSC assignments', () => {
  expect(scanText('{"ringbaScriptId":"CA123"}', 'ringbaScriptId', 'config', 's')[0]).toMatchObject({ value: 'CA123', hasValue: true });
  expect(scanText('cta:{callRingba:true,phone:"1"}', 'callRingba', 'config', 's')[0]).toMatchObject({ value: true });
  expect(scanText('self.__next_f.push([1,"{\\"callCallgrid\\":false}"])', 'callCallgrid', 'config', 's')[0]).toMatchObject({ value: false });
  expect(scanText('https://x.test/?collectedzipcode=10001&a=1', 'collectedzipcode', 'runtime', 's')[0]).toMatchObject({ value: '10001' });
  expect(scanText('p.ringba_zip = zip', 'ringba_zip', 'bundle', 's')[0]).toMatchObject({ hasValue: false });
});

test('scanObject finds nested keys', () => {
  const occ = scanObject({ a: [{ b: { collectedzipcode: '10001' } }] }, 'collectedzipcode', 'runtime', 'payload');
  expect(occ[0]).toMatchObject({ value: '10001', tier: 'runtime' });
});

test('splitHtml separates inline JS (code) from markup and JSON data (config)', () => {
  const html = '<div data-x="1"></div><script>if (BAD) p.ringba_zip = z;</script><script id="__NEXT_DATA__" type="application/json">{"collectedzipcode":"1"}</script>';
  const parts = splitHtml(html);
  expect(parts.code).toContain('ringba_zip');
  expect(parts.config).not.toContain('ringba_zip');
  expect(parts.config).toContain('collectedzipcode');
});

test('provider safety: ringba_zip at runtime on a CallGrid site fails; bundle-only is fine', () => {
  const run = new RunState('T');
  run.events.push({ id: 'E1', ts: 1, tracker: 'jitsu', source: 'network', name: 'quiz_data', payload: { properties: { ringba_zip: '10001' } } });
  expect(providerSafetyCheck('callgrid', new KeyScanner(run, [])).status).toBe('FAIL');

  const clean = new RunState('T2');
  clean.bodies.push({ url: 'https://x.test/_next/chunk.js', contentType: 'application/javascript', body: 'if(p==="ringba")o.ringba_zip=z', tier: 'bundle' });
  const r = providerSafetyCheck('callgrid', new KeyScanner(clean, []));
  expect(r.status).toBe('PASS');
  expect(r.details?.join(' ')).toContain('only in JS bundle');
});

test('callRingba:false on a CallGrid site is not a violation', () => {
  const run = new RunState('T');
  run.domSnapshots.push({ ts: 0, url: 'https://x.test/', title: '', scripts: [], noscripts: [], iframes: [], forms: [], inputs: [], buttons: [], anchors: 0, ctaCandidates: [], phoneLinks: [], phoneLikeNonAnchors: [], zipInputs: [], meta: {}, nextData: '{"cta":{"callRingba":false,"callCallgrid":true}}' });
  expect(providerSafetyCheck('callgrid', new KeyScanner(run, [])).status).toBe('PASS');
});
