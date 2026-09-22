import type { CallProvider } from '../config/tracking.config';
import type { CheckResult, NetworkRecord } from '../core/types';
import { unique } from '../core/utils';
import { check, EvalContext } from '../trackers/types';
import { phoneAnchorOutcome, phoneCorrelationOutcome } from './phone.validator';
import { describeRequest } from './request.validator';

/** Page, DOM, quiz, phone, console, network and provider-resolution checks (tracker independent). */
export function flowChecks(ctx: EvalContext, doc: { record?: NetworkRecord; error?: string }, detectedProviders: CallProvider[]): CheckResult[] {
  const { cfg, flow, run, masker } = ctx;
  const out: CheckResult[] = [];

  // PAGE-001
  if (doc.error) out.push(check('PAGE-001', 'Page load', 'PAGE', 'FAIL', `navigation failed: ${doc.error}`, { classification: 'PAGE ERROR' }));
  else if (doc.record && doc.record.status !== undefined && doc.record.status >= 400) out.push(check('PAGE-001', 'Page load', 'PAGE', 'FAIL', `document returned HTTP ${doc.record.status}`, { details: [describeRequest(doc.record)] }));
  else out.push(check('PAGE-001', 'Page load', 'PAGE', 'PASS', `loaded ${masker.url(run.actions[0]?.pageUrlAfter ?? cfg.url)}${doc.record?.status ? ` (HTTP ${doc.record.status})` : ''}`, { details: doc.record ? [describeRequest(doc.record)] : [] }));
  out.push(check('PAGE-002', 'Page type', 'PAGE', 'INFO', `${flow.type}${cfg.type === 'auto' ? ' (auto-detected)' : ' (configured)'}`));

  // DOM checks
  const doms = run.domSnapshots;
  const first = doms[0];
  if (flow.type === 'lander') {
    const cta = ctx.actions.find((a) => a.kind === 'cta_click');
    if (cta) out.push(check('DOM-001', 'Primary CTA', 'DOM', cta.status === 'error' ? 'FAIL' : 'PASS', cta.status === 'error' ? `CTA click failed: ${cta.error}` : `CTA "${cta.context.ctaText}" found and clicked`, { actionId: cta.id, details: first?.ctaCandidates.slice(0, 5).map((c) => `candidate <${c.tag.toLowerCase()}> "${c.text}" score=${c.score}`) }));
    else out.push(check('DOM-001', 'Primary CTA', 'DOM', cfg.expected.cta.required ? 'FAIL' : 'SKIPPED', cfg.expected.cta.required ? 'required CTA not found' : 'SKIPPED — element not present (no confident CTA)', { details: first?.buttons.slice(0, 10).map((b) => `<${b.tag.toLowerCase()}> "${b.text}"`) }));
  } else {
    out.push(check('DOM-001', 'Primary CTA', 'DOM', ctx.flow.ctaClicked ? 'PASS' : 'SKIPPED', ctx.flow.ctaClicked ? 'quiz start CTA clicked' : 'not applicable for quiz pages'));
  }
  const phoneLinks = unique(doms.flatMap((d) => d.phoneLinks.map((p) => `${p.href}|${p.text}|${p.visible}`)));
  const phoneRequired = cfg.expected.phoneTracking.enabled === true;
  out.push(
    check('DOM-002', 'Phone CTA present', 'DOM', phoneLinks.length ? 'PASS' : phoneRequired ? 'FAIL' : 'SKIPPED', phoneLinks.length ? `${phoneLinks.length} tel: link(s) found` : phoneRequired ? 'no tel: link found' : 'SKIPPED — element not present', {
      details: phoneLinks.map((l) => {
        const [href, text, vis] = l.split('|');
        return `<a href="tel:${masker.phone(href)}"> "${masker.phone(text)}" visible=${vis}`;
      }),
    }),
  );
  const zipAction = ctx.actions.find((a) => a.kind === 'zip_submit');
  const zipReq = cfg.expected.quiz.zip.required === true;
  out.push(check('DOM-003', 'ZIP input', 'DOM', zipAction ? 'PASS' : zipReq ? 'FAIL' : 'SKIPPED', zipAction ? `ZIP input found; entered ${zipAction.context.zip}` : zipReq ? 'ZIP required but no ZIP input appeared' : 'SKIPPED — ZIP not required', { actionId: zipAction?.id }));
  const tagScripts = unique(doms.flatMap((d) => d.scripts.filter((s) => s.src && /googletagmanager|jitsu|adstia|clarity|ringba|callgrid/i.test(s.src)).map((s) => `${s.id ? `#${s.id} ` : ''}${s.src}${s.nscript ? ` (next/script ${s.nscript})` : ''}`)));
  out.push(check('DOM-004', 'Tracking scripts in DOM', 'DOM', 'INFO', `${tagScripts.length} tracking <script> tag(s)`, { details: tagScripts }));

  // QUIZ-001
  if (flow.type === 'lander') out.push(check('QUIZ-001', 'Quiz progression', 'QUIZ', 'SKIPPED', 'not a quiz page'));
  else {
    const steps = ctx.actions.filter((a) => a.kind === 'quiz_answer');
    const stuck = flow.notes.includes('quiz flow stopped before completion');
    const details = ctx.actions.filter((a) => ['quiz_answer', 'zip_submit', 'lead_submit', 'cta_click'].includes(a.kind)).map((a) => `${a.id} ${a.label}${a.notes.length ? ` — ${a.notes.join('; ')}` : ''}`);
    if (!steps.length) out.push(check('QUIZ-001', 'Quiz progression', 'QUIZ', 'FAIL', 'no quiz answers could be selected (configure selectors.quizAnswer?)', { details }));
    else out.push(check('QUIZ-001', 'Quiz progression', 'QUIZ', stuck ? 'WARNING' : 'PASS', `${steps.length} answer(s)${flow.zipSubmitted ? ' + ZIP' : ''}; ${flow.quizCompleted ? 'quiz completed' : 'stopped early'}`, { details }));
  }

  // PHONE-001/002 (generic; Ringba has its own view of the same data)
  const phone = ctx.phoneAction();
  const a = phoneAnchorOutcome(phone, doms, masker, phoneRequired);
  out.push(check('PHONE-001', 'Phone anchor <a href="tel:">', 'PHONE', a.status, a.message, { details: a.details, actionId: phone?.id, expected: a.expected, actual: a.actual, classification: a.classification }));
  const c = phoneCorrelationOutcome(phone, run.events, { jitsu: ctx.trackers.jitsu, gtm: ctx.trackers.gtm }, masker);
  out.push(check('PHONE-002', 'Phone correlation DOM → Jitsu → GTM', 'PHONE', c.status, c.message, { details: c.details, actionId: phone?.id, expected: c.expected, actual: c.actual, classification: c.classification }));

  // CONSOLE-001 summary (tracker-specific console checks decide pass/fail)
  const cats = ['TRACKING', 'APPLICATION', 'NETWORK', 'WARNING'] as const;
  const counts = Object.fromEntries(cats.map((k) => [k, run.console.filter((r) => r.category === k).length]));
  const unattributed = run.console.filter((r) => r.category === 'TRACKING' && r.blocking && !r.tracker);
  out.push(
    check('CONSOLE-001', 'Console summary', 'CONSOLE', unattributed.length ? 'FAIL' : counts.APPLICATION ? 'WARNING' : 'INFO', `tracking ${counts.TRACKING}, application ${counts.APPLICATION}, network ${counts.NETWORK}, warnings ${counts.WARNING}`, {
      details: run.console.filter((r) => r.category !== 'INFO').slice(0, 25).map((r) => `[${r.category}${r.tracker ? `/${r.tracker}` : ''}] ${r.type}: ${masker.text(r.text).slice(0, 200)}`),
    }),
  );

  // NETWORK-001 summary
  const byCat = new Map<string, { n: number; failed: number }>();
  for (const r of run.network) {
    const e = byCat.get(r.category) ?? { n: 0, failed: 0 };
    e.n++;
    if (r.failure || (r.status ?? 0) >= 400) e.failed++;
    byCat.set(r.category, e);
  }
  out.push(check('NETWORK-001', 'Network capture summary', 'NETWORK', 'INFO', `${run.network.length} requests captured, ${run.network.filter((r) => r.category !== 'OTHER').length} tracking-related`, { details: [...byCat.entries()].map(([k, v]) => `${k}: ${v.n} request(s)${v.failed ? `, ${v.failed} failed/4xx+` : ''}`) }));

  // PROVIDER-000: configured vs detected (strong evidence only: script loaded / activity / flag true)
  const configured = cfg.expected.callTracking.provider;
  const det = detectedProviders.join(' + ') || 'none';
  const title = 'Call-tracking provider';
  if (configured === 'auto') {
    out.push(check('PROVIDER-000', title, 'PROVIDER', detectedProviders.length > 1 ? 'WARNING' : 'INFO', `detected provider: ${det}`));
  } else if (configured === 'none') {
    out.push(check('PROVIDER-000', title, 'PROVIDER', detectedProviders.length ? 'WARNING' : 'PASS', detectedProviders.length ? `no provider configured but ${det} detected` : 'no call-tracking provider (as configured)'));
  } else {
    const others = detectedProviders.filter((p) => p !== configured);
    if (others.length) {
      out.push(check('PROVIDER-000', title, 'PROVIDER', 'FAIL', `configured provider is ${configured} but ${others.join(' + ')} is active on the page`, { expected: configured, actual: det, classification: 'PROVIDER MISMATCH' }));
    } else {
      out.push(check('PROVIDER-000', title, 'PROVIDER', 'PASS', `configured provider: ${configured}${detectedProviders.includes(configured) ? ' (confirmed on page)' : ''}`));
    }
  }
  return out;
}
