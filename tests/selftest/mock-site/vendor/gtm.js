/* Mock gtm.js for offline self-tests. Behaves like GTM where it matters to the verifier:
   replaces dataLayer.push with a chaining implementation, registers google_tag_manager[id],
   pushes gtm.dom / gtm.load and sends a GA4-style hit. */
(function () {
  var src = (document.currentScript && document.currentScript.src) || '';
  var id = (src.match(/id=(GTM-[A-Z0-9]+)/) || [])[1] || 'GTM-UNKNOWN';
  var dl = (window.dataLayer = window.dataLayer || []);
  window.google_tag_manager = window.google_tag_manager || {};
  window.google_tag_manager[id] = { dataLayer: { get: function () {} } };
  var uid = 0;
  var prev = dl.push;
  dl.push = function () {
    var args = Array.prototype.slice.call(arguments);
    var r = prev.apply(dl, args);
    args.forEach(function (o) {
      if (o && typeof o === 'object' && !Array.isArray(o)) o['gtm.uniqueEventId'] = ++uid;
    });
    return r;
  };
  function dom() { dl.push({ event: 'gtm.dom' }); }
  if (document.readyState !== 'loading') dom(); else document.addEventListener('DOMContentLoaded', dom);
  if (document.readyState === 'complete') dl.push({ event: 'gtm.load' });
  else window.addEventListener('load', function () { dl.push({ event: 'gtm.load' }); });
  try { fetch('https://www.google-analytics.com/g/collect?v=2&tid=G-TEST&en=page_view', { method: 'POST', mode: 'no-cors', body: 'v=2' }); } catch (e) {}
})();
