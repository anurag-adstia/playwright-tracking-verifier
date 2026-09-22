/* Mock https://www.clarity.ms/tag/<id>: loads the (mock) Clarity library like the real tag does. */
(function () {
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://scripts.clarity.ms/0.8.9/clarity.js';
  document.head.appendChild(s);
})();
