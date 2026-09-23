/* Static frontend: posts the URL, polls the run, renders the result. */
const $ = (id) => document.getElementById(id);
const ICON = { ok: '✅', warn: '⚠️', fail: '❌', skip: '➖' };
const SHORT = { ok: 'Pass', warn: 'Warning', fail: 'Fail', skip: 'Not used' };
const VERDICT = { ok: 'integrated correctly', warn: 'integrated, with warnings', fail: 'not integrated correctly', skip: 'not used on this page' };
const STATUS = { queued: 'Waiting for a free browser', running: 'Checking the page', done: 'Finished', error: 'Failed' };

let timer;

/* Theme: light by default, remembered per browser. */
const setTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  $('theme').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  try {
    localStorage.setItem('theme', theme);
  } catch {
    /* private mode */
  }
};
try {
  setTheme(localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
} catch {
  setTheme('light');
}
$('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearTimeout(timer);
  $('error').hidden = true;
  $('result').hidden = true;
  $('path').textContent = '';
  $('status').hidden = false;
  $('statusText').textContent = `${STATUS.queued}…`;
  $('run').disabled = true;

  try {
    const res = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: $('url').value.trim() }),
    });
    const job = await res.json();
    if (!res.ok) throw new Error(job.error || 'Could not start the run');
    poll(job.id);
  } catch (err) {
    fail(err.message);
  }
});

$('again').addEventListener('click', () => {
  $('result').hidden = true;
  $('url').focus();
  $('url').select();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function fail(message) {
  clearTimeout(timer);
  $('status').hidden = true;
  $('error').textContent = message;
  $('error').hidden = false;
  $('run').disabled = false;
}

async function poll(id) {
  let job;
  try {
    job = await (await fetch(`/api/runs/${id}`)).json();
  } catch {
    return fail('Lost connection to the server. Is it still running?');
  }

  $('statusText').textContent = `${STATUS[job.status]}… ${job.seconds}s`;
  renderPath(job.notes);

  if (job.status === 'error') return fail(job.error || 'The run failed');
  if (job.status !== 'done') {
    timer = setTimeout(() => poll(id), 1500);
    return;
  }

  $('status').hidden = true;
  $('run').disabled = false;
  render(job);
}

function renderPath(notes) {
  const list = $('path');
  if (list.childElementCount === notes.length) return;
  list.textContent = '';
  for (const note of notes) {
    const li = document.createElement('li');
    li.textContent = note;
    list.append(li);
  }
}

function render(job) {
  const worst = job.checks.some((c) => c.mark === 'fail') ? 'fail' : job.checks.some((c) => c.mark === 'warn') ? 'warn' : 'ok';
  const counts = { ok: 0, warn: 0, fail: 0, skip: 0 };
  for (const c of job.checks) counts[c.mark]++;

  $('overall').className = `pill ${worst}`;
  $('overall').textContent = `${ICON[worst]} ${SHORT[worst]}`;
  $('resultSite').textContent = job.site || 'Result';
  $('resultUrl').textContent = job.url;
  $('cOk').textContent = counts.ok;
  $('cWarn').textContent = counts.warn;
  $('cFail').textContent = counts.fail;
  $('cTime').textContent = `${job.seconds}s`;
  // colour a tile only when it has something to report
  $('cOk').parentElement.className = `stat${counts.ok ? ' is-ok' : ''}`;
  $('cWarn').parentElement.className = `stat${counts.warn ? ' is-warn' : ''}`;
  $('cFail').parentElement.className = `stat${counts.fail ? ' is-fail' : ''}`;

  const body = $('checks');
  body.textContent = '';
  job.checks.forEach((check, i) => {
    const row = body.insertRow();
    row.className = check.mark;

    const name = document.createElement('th');
    name.textContent = `${i + 1}. ${check.title}`;
    if (check.title === 'Call tracking') name.append(sub('Ringba or CallGrid'));
    row.append(name);

    const result = row.insertCell();
    result.textContent = VERDICT[check.mark];
    if (check.detail) result.append(sub(check.detail));

    const status = row.insertCell();
    status.className = 'st';
    const pill = document.createElement('span');
    pill.className = `pill ${check.mark}`;
    pill.textContent = `${ICON[check.mark]} ${SHORT[check.mark]}`;
    status.append(pill);
  });

  $('openReport').href = `/api/runs/${job.id}/report.html`;
  $('result').hidden = false;
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  loadDetails(job.id);
}

/** The report's check details, rendered inline: one page, one scrollbar, one stylesheet. */
async function loadDetails(id) {
  const box = $('details');
  box.textContent = 'Loading details…';
  try {
    const html = await (await fetch(`/api/runs/${id}/report.html?embed=1`)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    box.replaceChildren(...doc.querySelector('main').childNodes);
  } catch {
    box.textContent = 'Could not load the details — use “Open full report”.';
  }
}

function sub(text) {
  const el = document.createElement('span');
  el.className = 'sub';
  el.textContent = text;
  return el;
}
