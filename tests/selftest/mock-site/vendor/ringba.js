/* Mock b-js.ringba.com/<id>: marks itself loaded and consumes queued _rgba_tags. */
(function () {
  window._rgba = window._rgba || { loaded: true, tags: [] };
  window._rgba_tags = window._rgba_tags || [];
})();
