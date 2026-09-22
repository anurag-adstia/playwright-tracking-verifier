/**
 * Init script injected before any page script runs (context.addInitScript).
 *
 * - Instruments array globals (dataLayer, _rgba_tags): every push is streamed to Node through
 *   the `__tqaEmit` binding the moment it happens, so nothing is lost on navigation.
 *   GTM replaces `dataLayer.push` with its own function that chains to the previous one; the
 *   accessor below keeps our recorder in front of whatever push is installed, and suppresses the
 *   chained re-entry so each push is recorded once.
 * - Reports SPA navigations (pushState/replaceState/popstate).
 * - Reports tel: clicks and, optionally, prevents the OS dialer navigation. The listener sits on
 *   `window` in the bubble phase, so the page's own click handlers (React root listeners) run first.
 *
 * Kept as a string so the TS toolchain cannot inject helpers into browser code.
 */
export function buildInstrumentationScript(opts: { arrayGlobals: string[]; preventTel: boolean }): string {
  return `(() => {
  if (window.__tqaInstalled) return;
  window.__tqaInstalled = true;
  var OPTS = ${JSON.stringify(opts)};
  var queue = [];
  function send(kind, data) {
    try {
      data.t = Date.now();
      data.url = location.href;
      data.top = window.top === window;
      var fn = window.__tqaEmit;
      var msg = JSON.stringify(data);
      if (typeof fn === 'function') {
        while (queue.length) { var q = queue.shift(); fn(q[0], q[1]); }
        fn(kind, msg);
      } else {
        queue.push([kind, msg]);
      }
    } catch (e) {}
  }
  var flushTimer = setInterval(function () {
    if (!queue.length) return;
    if (typeof window.__tqaEmit === 'function') {
      while (queue.length) { var q = queue.shift(); try { window.__tqaEmit(q[0], q[1]); } catch (e) {} }
    }
  }, 50);
  setTimeout(function () { clearInterval(flushTimer); }, 30000);

  function ser(v, depth, seen) {
    depth = depth || 0;
    seen = seen || [];
    if (v === null || v === undefined) return v === undefined ? null : v;
    var t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return v;
    if (t === 'function') return '[Function]';
    if (t === 'symbol' || t === 'bigint') return String(v);
    if (depth > 6) return '[MaxDepth]';
    try {
      if (typeof Node !== 'undefined' && v instanceof Node) {
        var el = v;
        return '[Element ' + (el.tagName || el.nodeName) + (el.id ? '#' + el.id : '') + ']';
      }
      if (v === window) return '[Window]';
      if (v instanceof Date) return v.toISOString();
    } catch (e) {}
    if (seen.indexOf(v) >= 0) return '[Circular]';
    seen.push(v);
    var isArgs = Object.prototype.toString.call(v) === '[object Arguments]';
    if (Array.isArray(v) || isArgs) {
      var arr = [];
      for (var i = 0; i < v.length && i < 200; i++) arr.push(ser(v[i], depth + 1, seen));
      seen.pop();
      return isArgs ? { __arguments: arr } : arr;
    }
    var out = {};
    var keys = [];
    try { keys = Object.keys(v); } catch (e) {}
    for (var k = 0; k < keys.length && k < 300; k++) {
      try { out[keys[k]] = ser(v[keys[k]], depth + 1, seen); } catch (e) { out[keys[k]] = '[Unreadable]'; }
    }
    seen.pop();
    return out;
  }

  function instrumentArray(name, arr) {
    if (!arr || typeof arr !== 'object' || !('length' in arr)) return;
    try {
      if (arr.__tqa) return;
      Object.defineProperty(arr, '__tqa', { value: true, enumerable: false });
    } catch (e) { return; }
    var initial = [];
    for (var i = 0; i < arr.length; i++) initial.push(ser(arr[i]));
    send('array:init', { global: name, items: initial });
    var inner = arr.push;
    var inFlight = [];
    var depth = 0;
    var wrapper = function () {
      var args = Array.prototype.slice.call(arguments);
      var fresh = args.filter(function (a) { return !(a && typeof a === 'object' && inFlight.indexOf(a) >= 0); });
      if (depth > 0 && fresh.length === 0) {
        // Re-entry from a push implementation that chains to the previous push (e.g. GTM).
        return Array.prototype.push.apply(this, args);
      }
      for (var j = 0; j < args.length; j++) {
        if (args[j] && typeof args[j] === 'object') inFlight.push(args[j]);
        send('array:push', { global: name, data: ser(args[j]) });
      }
      depth++;
      try {
        var impl = inner === wrapper ? Array.prototype.push : inner;
        return impl.apply(this, arguments);
      } finally {
        depth--;
        for (var m = 0; m < args.length; m++) {
          var idx = inFlight.indexOf(args[m]);
          if (idx >= 0) inFlight.splice(idx, 1);
        }
      }
    };
    try {
      Object.defineProperty(arr, 'push', {
        configurable: true,
        enumerable: false,
        get: function () { return wrapper; },
        set: function (fn) { if (fn !== wrapper && typeof fn === 'function') inner = fn; }
      });
    } catch (e) {}
  }

  OPTS.arrayGlobals.forEach(function (name) {
    var current = window[name];
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: function () { return current; },
        set: function (v) { current = v; instrumentArray(name, v); }
      });
    } catch (e) {}
    if (current) instrumentArray(name, current);
  });

  try {
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m];
      history[m] = function () {
        var before = location.href;
        var r = orig.apply(this, arguments);
        if (location.href !== before) send('nav', { method: m, from: before });
        return r;
      };
    });
    window.addEventListener('popstate', function () { send('nav', { method: 'popstate' }); });
  } catch (e) {}

  window.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
      if (!a) return;
      send('tel:click', { href: a.getAttribute('href'), text: (a.innerText || '').trim(), prevented: e.defaultPrevented });
      if (OPTS.preventTel) e.preventDefault();
    } catch (err) {}
  }, false);
})();`;
}
