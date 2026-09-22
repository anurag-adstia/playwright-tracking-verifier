/* Mock clarity.js: replays the queue and sends a binary collect payload, like the real library. */
(function () {
  var q = (window.clarity && window.clarity.q) || [];
  window.clarity = function () {};
  window.clarity.q = q;
  setTimeout(function () {
    var bytes = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0x10]);
    fetch('https://y.clarity.ms/collect', { method: 'POST', body: bytes }).catch(function () {});
  }, 300);
})();
