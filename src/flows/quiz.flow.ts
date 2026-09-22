import type { Locator } from '@playwright/test';
import { quizStateScript } from '../browser/dom-scripts';
import type { ElementInfo, FlowSummary } from '../core/types';
import { sleep, truncate } from '../core/utils';
import { runPhoneFlow } from './phone.flow';
import type { FlowSession } from './session';

interface QuizState {
  url: string;
  question: string;
  candidates: ElementInfo[];
  zipInputs: ElementInfo[];
  inputs: Array<ElementInfo & { placeholder?: string; label?: string }>;
  nextButtons: ElementInfo[];
  telVisible: boolean;
  fingerprint: string;
}

const PERSONAL = /name|e-?mail|phone|tel\b|mobile|address|street|city|dob|birth|ssn|card/i;
/** URLs that mean the quiz is over even without configuration. */
const DONE_URL = /congrat|thank-?you|success|confirmation/i;
const START = /^(start|begin|get started|let'?s (go|start|begin)|start (now|quiz|here)|take the quiz|continue)\b/i;

async function readState(s: FlowSession, markSeen = false): Promise<QuizState | undefined> {
  const sel = s.cfg.selectors;
  try {
    return (await s.page.evaluate(
      quizStateScript({
        container: sel.quizContainer,
        answer: sel.quizAnswer,
        question: sel.quizQuestion,
        next: sel.quizNext,
        exclude: sel.exclude,
        zipSelector: sel.zipInput,
        markSeen,
      }),
    )) as QuizState;
  } catch {
    return undefined; // navigation in progress
  }
}

function interactive(st: QuizState | undefined, zipDone = false): boolean {
  return !!st && (st.candidates.some((c) => c.isNew) || (!zipDone && st.zipInputs.length > 0) || st.inputs.length > 0);
}

/** Wait until the quiz shows something to interact with and the DOM has settled (chat typing animations). */
async function waitForStableState(s: FlowSession, timeoutMs: number, zipDone: boolean): Promise<QuizState | undefined> {
  const deadline = Date.now() + timeoutMs;
  let prev: QuizState | undefined;
  let last: QuizState | undefined;
  while (Date.now() < deadline) {
    last = await readState(s);
    if (interactive(last, zipDone) && prev && prev.fingerprint === last!.fingerprint) return last;
    prev = last;
    await sleep(prev && interactive(prev, zipDone) ? 250 : 150);
  }
  return last;
}

/** After an answer: resolve as soon as the question changes, the page navigates or quiz_data arrives. */
async function waitForTransition(s: FlowSession, before: string, sinceTs: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const url = s.page.url();
  while (Date.now() < deadline) {
    if (s.page.url() !== url) return true;
    if (s.run.events.some((e) => e.ts >= sinceTs && e.tracker === 'jitsu' && e.name === 'quiz_data')) {
      // tracking fired; give the UI a moment to render the next step
      const st = await readState(s);
      if (!st || st.fingerprint !== before) return true;
    }
    const st = await readState(s);
    if (st && st.fingerprint !== before) return true;
    await sleep(150);
  }
  return false;
}

function choose(s: FlowSession, st: QuizState): ElementInfo | undefined {
  const pool = st.candidates.filter((c) => c.isNew);
  for (const rule of s.cfg.expected.quiz.answers) {
    if (rule.question && !new RegExp(rule.question, 'i').test(st.question)) continue;
    const re = new RegExp(rule.answer, 'i');
    const hit = pool.find((c) => re.test(c.text) || (c.value !== undefined && re.test(c.value)));
    if (hit) return hit;
  }
  return s.cfg.expected.quiz.strategy === 'last' ? pool[pool.length - 1] : pool[0];
}

function testValueFor(s: FlowSession, input: ElementInfo & { placeholder?: string; label?: string }): string | undefined {
  const hay = `${input.name ?? ''} ${input.id ?? ''} ${input.placeholder ?? ''} ${input.label ?? ''} ${input.type ?? ''}`.toLowerCase();
  const data = s.cfg.expected.quiz.lead.testData;
  const keys = Object.keys(data).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const words = k.toLowerCase().split(/[_\s-]+/);
    if (words.every((w) => hay.includes(w))) return data[k];
  }
  if (/e-?mail/.test(hay)) return data.email;
  if (/phone|tel/.test(hay)) return data.phone;
  if (/first/.test(hay)) return data.first_name;
  if (/last/.test(hay)) return data.last_name;
  if (/age/.test(hay)) return data.age;
  return undefined;
}

/** Submit the form an input belongs to (its own submit button, else Enter). */
async function submitNear(s: FlowSession, input: Locator, submitSelector?: string): Promise<void> {
  if (submitSelector) {
    await s.page.locator(submitSelector).first().click({ timeout: s.cfg.timeouts.action });
    return;
  }
  const form = input.locator('xpath=ancestor::form[1]');
  if (await form.count()) {
    const btn = form.locator('button[type=submit], input[type=submit], button:not([type])').first();
    if (await btn.count()) {
      await btn.click({ timeout: s.cfg.timeouts.action });
      return;
    }
  }
  const st = await readState(s);
  const next = st?.nextButtons.find((b) => /continue|next|submit|check|search|go|find/i.test(b.text));
  if (next) await s.click(next);
  else await input.press('Enter');
}

async function submitInputs(s: FlowSession, st: QuizState, submitSelector?: string): Promise<void> {
  if (submitSelector) {
    await s.page.locator(submitSelector).first().click({ timeout: s.cfg.timeouts.action });
    return;
  }
  const next = st.nextButtons.find((b) => b.isNew !== false) ?? st.nextButtons[0];
  if (next) {
    await s.click(next);
    return;
  }
  await s.page.keyboard.press('Enter');
}

/**
 * Quiz / ChatQuiz: answer questions until the quiz stops asking. Adapts to any length:
 * each loop reads the current question, picks an answer (config rules → newest candidates),
 * clicks it, and waits for the next step. ZIP and lead inputs are handled when they appear.
 */
export async function runQuizFlow(s: FlowSession, flow: FlowSummary): Promise<void> {
  const { cfg } = s;
  const q = cfg.expected.quiz;
  const completeRe = q.completeUrlPattern ? new RegExp(q.completeUrlPattern, 'i') : undefined;
  let stuck = false;
  let zipDone = false;

  for (let step = 1; step <= q.maxSteps; step++) {
    if (completeRe?.test(s.page.url()) || (flow.quizSteps > 0 && DONE_URL.test(new URL(s.page.url()).pathname))) {
      flow.quizCompleted = true;
      break;
    }
    const st = await waitForStableState(s, zipDone ? cfg.timeouts.quizEnd : cfg.timeouts.quizStep, zipDone);
    if (!interactive(st, zipDone)) {
      if (flow.quizSteps > 0) flow.quizCompleted = true;
      s.note(flow.quizSteps ? `Quiz: no further questions after ${flow.quizSteps} answer(s)` : 'Quiz: no answer options found');
      break;
    }
    const state = st!;

    // ZIP step
    if (state.zipInputs.length && !zipDone) {
      const input = state.zipInputs[0];
      const zip = q.zip.value;
      await readState(s, true);
      const before = state.fingerprint;
      await s.perform('zip_submit', `Enter ZIP ${zip}`, { zip, questionText: state.question, step }, async (action) => {
        const loc = s.page.locator(`[data-tqa-ref="${input.ref}"]`).first();
        await loc.click({ timeout: cfg.timeouts.action });
        await loc.fill('');
        await loc.pressSequentially(zip, { delay: 25 });
        await submitNear(s, loc, cfg.selectors.zipSubmit);
        if (!(await waitForTransition(s, before, action.startTs, cfg.timeouts.quizStep))) action.notes.push('quiz did not advance after ZIP submit');
      });
      zipDone = true;
      flow.zipSubmitted = true;
      continue;
    }

    // Free-text inputs (lead form / numeric questions)
    if (state.inputs.length && !state.candidates.some((c) => c.isNew)) {
      const personal = state.inputs.some((i) => PERSONAL.test(`${i.name ?? ''} ${i.id ?? ''} ${i.placeholder ?? ''} ${i.label ?? ''} ${i.type ?? ''}`));
      if (personal && !q.lead.fillForm) {
        s.note('Lead form reached — not submitted (expected.quiz.lead.fillForm = false)');
        flow.quizCompleted = true;
        break;
      }
      const fills = state.inputs.map((i) => ({ i, v: testValueFor(s, i) }));
      if (fills.some((f) => f.v === undefined)) {
        s.note(`Quiz: input(s) without test data (${fills.filter((f) => f.v === undefined).map((f) => f.i.name ?? f.i.placeholder ?? f.i.id).join(', ')}) — stopping`);
        stuck = true;
        break;
      }
      await readState(s, true);
      const before = state.fingerprint;
      const kind = personal ? 'lead_submit' : 'quiz_answer';
      await s.perform(kind, personal ? 'Submit lead form (test data)' : `Q${step}: "${truncate(state.question, 60)}" → input`, { questionText: state.question, answerText: fills.map((f) => f.v).join(' '), step }, async (action) => {
        for (const { i, v } of fills) await s.page.locator(`[data-tqa-ref="${i.ref}"]`).first().fill(v!);
        await submitInputs(s, state);
        if (!(await waitForTransition(s, before, action.startTs, cfg.timeouts.quizStep))) action.notes.push('quiz did not advance after submitting inputs');
      });
      if (personal) {
        flow.leadStageReached = true;
      } else flow.quizSteps++;
      continue;
    }

    const choice = choose(s, state);
    if (!choice) {
      if (flow.quizSteps > 0) flow.quizCompleted = true;
      break;
    }
    const isStart = !state.question && START.test(choice.text) && flow.quizSteps === 0;
    await readState(s, true);
    const before = state.fingerprint;

    if (isStart) {
      await s.perform('cta_click', `Click quiz start "${choice.text}"`, { ctaText: choice.text, pageUrl: s.page.url() }, async (action) => {
        await s.click(choice, action);
        await waitForTransition(s, before, action.startTs, cfg.timeouts.quizStep);
      }, { element: choice });
      flow.ctaClicked = true;
      continue;
    }

    const action = await s.perform(
      'quiz_answer',
      `Q${flow.quizSteps + 1}: "${truncate(state.question || '(question not detected)', 60)}" → "${truncate(choice.text, 40)}"`,
      { questionText: state.question, answerText: choice.text, answerValue: choice.value, step: flow.quizSteps + 1, pageUrl: s.page.url() },
      async (a) => {
        await s.click(choice, a);
        let moved = await waitForTransition(s, before, a.startTs, cfg.timeouts.quizStep);
        if (!moved) {
          // Radio-style question: select, then press Next/Continue.
          const after = await readState(s);
          const next = after?.nextButtons.find((b) => b.ref !== choice.ref);
          if (next) {
            a.notes.push(`pressed "${next.text}" after selecting the answer`);
            await s.click(next, a);
            moved = await waitForTransition(s, after!.fingerprint, a.startTs, cfg.timeouts.quizStep);
          }
        }
        if (!moved) a.notes.push('quiz did not advance after selecting the answer');
      },
      { element: choice },
    );
    flow.quizSteps++;
    if (action.notes.some((n) => n.startsWith('quiz did not advance'))) {
      stuck = true;
      s.note(`Quiz: stuck at step ${flow.quizSteps} ("${truncate(state.question, 60)}")`);
      break;
    }
  }

  if (!stuck && flow.quizSteps > 0) flow.quizCompleted = true;
  if (flow.quizCompleted) flow.leadStageReached = true;
  if (stuck) flow.notes.push('quiz flow stopped before completion');
  // Congrats page: let late page-load tracking settle on the new page before the phone click.
  if (s.page.url() !== s.run.actions[0]?.pageUrlBefore) await s.inspect();

  const phone = await runPhoneFlow(s);
  flow.phoneClicked = !!phone;
}
