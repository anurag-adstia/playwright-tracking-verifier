/* Minimal ChatQuiz: typing indicator → bot bubble → answer buttons → user bubble → quiz_data. */
(function () {
  var Q = window.QUIZ;
  var chat = document.getElementById('chat');
  var answers = {};

  function bubble(cls, text) {
    var d = document.createElement('div');
    d.className = 'bubble ' + cls;
    d.textContent = text;
    chat.appendChild(d);
    return d;
  }
  function typing(cb) {
    var t = bubble('bot typing', '…');
    setTimeout(function () { t.remove(); cb(); }, Q.typingMs || 400);
  }
  function track(i, value, key, type) {
    var ids = tqaIds();
    var p = {
      question_key: key,
      question_type: type,
      answer_value: value,
      current_step: i + 1,
      previous_step: i === 0 ? null : i,
      next_step: i + 2,
      session_id: ids.session_id,
      user_id: ids.user_id,
    };
    if (Q.mutateQuizData) Q.mutateQuizData(p, i);
    jitsuTrack('quiz_data', p);
    pushDL('quizAnswer', { question_key: key, answer_value: value });
  }
  function ask(i) {
    if (i >= Q.questions.length) return askZip(i);
    typing(function () {
      var q = Q.questions[i];
      bubble('bot', q.q);
      var box = document.createElement('div');
      box.className = 'answers';
      q.answers.forEach(function (a) {
        var b = document.createElement('button');
        b.className = 'answer';
        b.textContent = a;
        b.onclick = function () {
          bubble('user', a);
          answers[q.key] = a;
          track(i, a, q.key, q.type || 'single');
          ask(i + 1);
        };
        box.appendChild(b);
      });
      chat.appendChild(box);
    });
  }
  function askZip(i) {
    typing(function () {
      bubble('bot', "What's your ZIP code?");
      var f = document.createElement('form');
      f.className = 'zipform';
      f.innerHTML = '<input name="zip" placeholder="ZIP code" inputmode="numeric" maxlength="5"><button type="submit">Continue</button>';
      f.onsubmit = function (ev) {
        ev.preventDefault();
        var zip = f.querySelector('input').value;
        f.remove();
        bubble('user', zip);
        track(i, zip, 'zip', 'input');
        Q.onZip(zip, answers);
      };
      chat.appendChild(f);
    });
  }
  ask(0);
})();
