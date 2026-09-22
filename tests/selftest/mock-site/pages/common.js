/* Shared helpers for the mock pages: the same calls the Next.js templates make. */
window.cf_variable = { JITSU_EVENT_URL: 'https://tracking.adstiacms.com/p.js' };

function tqaIds() {
  var m = document.cookie.match(/(?:^|; )__eventn_id=([^;]*)/);
  return {
    session_id: sessionStorage.getItem('session_id') || '',
    user_id: localStorage.getItem('user_id') || '',
    anonymous_id: m ? decodeURIComponent(m[1]) : '',
  };
}

function jitsuTrack(event, props) {
  if (window.jitsu) window.jitsu.track(event, props);
}

function pushDL(event, data) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: event, data: data });
}

/** Same as the template: onClick={handlePhoneClick} on <a href="tel:…"> */
function handlePhoneClick(e) {
  var phone = e.currentTarget.innerText.replace(/[^\d]/g, '').slice(-10);
  var ids = tqaIds();
  jitsuTrack('phone_number_click', { phone: phone, session_id: ids.session_id, userId: ids.user_id });
  pushDL('phoneNumberClick', { phone: phone, session_id: ids.session_id, user_id: ids.user_id, anonymous_id: ids.anonymous_id });
}

function handleCtaClick(e) {
  var ids = tqaIds();
  var text = e.currentTarget.innerText.trim();
  jitsuTrack('cta_click', { cta_text: text, session_id: ids.session_id, userId: ids.user_id });
  pushDL('ctaButtonClick', { cta_text: text, session_id: ids.session_id, user_id: ids.user_id, anonymous_id: ids.anonymous_id });
}
