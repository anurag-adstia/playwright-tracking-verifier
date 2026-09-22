"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a5, b5) => {
    for (var prop in b5 || (b5 = {}))
      if (__hasOwnProp.call(b5, prop))
        __defNormalProp(a5, prop, b5[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b5)) {
        if (__propIsEnum.call(b5, prop))
          __defNormalProp(a5, prop, b5[prop]);
      }
    return a5;
  };
  var __spreadProps = (a5, b5) => __defProps(a5, __getOwnPropDescs(b5));
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e2) {
      throw mod = 0, e2;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e2) {
          reject(e2);
        }
      };
      var step = (x3) => x3.done ? resolve(x3.value) : Promise.resolve(x3.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // ../../node_modules/.pnpm/dlv@1.1.3/node_modules/dlv/dist/dlv.umd.js
  var require_dlv_umd = __commonJS({
    "../../node_modules/.pnpm/dlv@1.1.3/node_modules/dlv/dist/dlv.umd.js"(exports, module) {
      !(function(t2, n4) {
        "object" == typeof exports && "undefined" != typeof module ? module.exports = function(t3, n5, e2, i4, o4) {
          for (n5 = n5.split ? n5.split(".") : n5, i4 = 0; i4 < n5.length; i4++) t3 = t3 ? t3[n5[i4]] : o4;
          return t3 === o4 ? e2 : t3;
        } : "function" == typeof define && define.amd ? define(function() {
          return function(t3, n5, e2, i4, o4) {
            for (n5 = n5.split ? n5.split(".") : n5, i4 = 0; i4 < n5.length; i4++) t3 = t3 ? t3[n5[i4]] : o4;
            return t3 === o4 ? e2 : t3;
          };
        }) : t2.dlv = function(t3, n5, e2, i4, o4) {
          for (n5 = n5.split ? n5.split(".") : n5, i4 = 0; i4 < n5.length; i4++) t3 = t3 ? t3[n5[i4]] : o4;
          return t3 === o4 ? e2 : t3;
        };
      })(exports);
    }
  });

  // ../../node_modules/.pnpm/analytics-utils@1.0.12_@types+dlv@1.1.4/node_modules/analytics-utils/dist/analytics-utils.module.js
  var import_dlv = __toESM(require_dlv_umd());

  // ../../node_modules/.pnpm/@analytics+type-utils@0.6.2/node_modules/@analytics/type-utils/dist/analytics-util-types.module.js
  var e = "undefined";
  var o = "object";
  var b = "any";
  var m = "*";
  var j = "__";
  var F = "undefined" != typeof process ? process : {};
  var P = F.env && F.env.NODE_ENV || "";
  var $ = "undefined" != typeof document;
  var T = $ && "localhost" === window.location.hostname;
  var _ = null != F.versions && null != F.versions.node;
  var k = "undefined" != typeof Deno && void 0 !== Deno.core;
  var B = "object" == typeof self && self.constructor && "DedicatedWorkerGlobalScope" === self.constructor.name;
  var G = $ && "nodejs" === window.name || "undefined" != typeof navigator && void 0 !== navigator.userAgent && (navigator.userAgent.includes("Node.js") || navigator.userAgent.includes("jsdom"));
  function M(n4, t2) {
    return t2.charAt(0)[n4]() + t2.slice(1);
  }
  var U = M.bind(null, "toUpperCase");
  var H = M.bind(null, "toLowerCase");
  function J(n4) {
    return Y(n4) ? U("null") : "object" == typeof n4 ? yn(n4) : Object.prototype.toString.call(n4).slice(8, -1);
  }
  function R(n4, t2) {
    void 0 === t2 && (t2 = true);
    var e2 = J(n4);
    return t2 ? H(e2) : e2;
  }
  function V(n4, t2) {
    return typeof t2 === n4;
  }
  var W = V.bind(null, "function");
  var q = V.bind(null, "string");
  var I = V.bind(null, "undefined");
  var Q = V.bind(null, "boolean");
  var X = V.bind(null, "symbol");
  function Y(n4) {
    return null === n4;
  }
  function nn(n4) {
    return "number" === R(n4) && !isNaN(n4);
  }
  function rn(n4) {
    return "array" === R(n4);
  }
  function on(n4) {
    if (!un(n4)) return false;
    for (var t2 = n4; null !== Object.getPrototypeOf(t2); ) t2 = Object.getPrototypeOf(t2);
    return Object.getPrototypeOf(n4) === t2;
  }
  function un(n4) {
    return n4 && ("object" == typeof n4 || null !== n4);
  }
  function yn(n4) {
    return W(n4.constructor) ? n4.constructor.name : null;
  }
  function hn(n4) {
    return n4 instanceof Error || q(n4.message) && n4.constructor && nn(n4.constructor.stackTraceLimit);
  }
  function On(n4, t2) {
    if ("object" != typeof t2 || Y(t2)) return false;
    if (t2 instanceof n4) return true;
    var e2 = R(new n4(""));
    if (hn(t2)) for (; t2; ) {
      if (R(t2) === e2) return true;
      t2 = Object.getPrototypeOf(t2);
    }
    return false;
  }
  var Sn = On.bind(null, TypeError);
  var An = On.bind(null, SyntaxError);
  function $n(n4, t2) {
    var e2 = n4 instanceof Element || n4 instanceof HTMLDocument;
    return e2 && t2 ? Tn(n4, t2) : e2;
  }
  function Tn(n4, t2) {
    return void 0 === t2 && (t2 = ""), n4 && n4.nodeName === t2.toUpperCase();
  }
  function _n(n4) {
    var t2 = [].slice.call(arguments, 1);
    return function() {
      return n4.apply(void 0, [].slice.call(arguments).concat(t2));
    };
  }
  var kn = _n($n, "form");
  var Bn = _n($n, "button");
  var Gn = _n($n, "input");
  var Mn = _n($n, "select");

  // ../../node_modules/.pnpm/analytics-utils@1.0.12_@types+dlv@1.1.4/node_modules/analytics-utils/dist/analytics-utils.module.js
  function n(e2) {
    try {
      return decodeURIComponent(e2.replace(/\+/g, " "));
    } catch (e3) {
      return null;
    }
  }
  function o2() {
    if ($) {
      var r3 = navigator, t2 = r3.languages;
      return r3.userLanguage || (t2 && t2.length ? t2[0] : r3.language);
    }
  }
  function a() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e2) {
    }
  }
  function s(r3) {
    return (function(e2) {
      for (var r4, t2 = /* @__PURE__ */ Object.create(null), o4 = /([^&=]+)=?([^&]*)/g; r4 = o4.exec(e2); ) {
        var a5 = n(r4[1]), i4 = n(r4[2]);
        "[]" === a5.substring(a5.length - 2) ? (t2[a5 = a5.substring(0, a5.length - 2)] || (t2[a5] = [])).push(i4) : t2[a5] = "" === i4 || i4;
      }
      for (var u3 in t2) {
        var c4 = u3.split("[");
        c4.length > 1 && (m2(t2, c4.map(function(e3) {
          return e3.replace(/[?[\]\\ ]/g, "");
        }), t2[u3]), delete t2[u3]);
      }
      return t2;
    })((function(r4) {
      if (r4) {
        var t2 = r4.match(/\?(.*)/);
        return t2 && t2[1] ? t2[1].split("#")[0] : "";
      }
      return $ && window.location.search.substring(1);
    })(r3));
  }
  function m2(e2, r3, t2) {
    for (var n4 = r3.length - 1, o4 = 0; o4 < n4; ++o4) {
      var a5 = r3[o4];
      if ("__proto__" === a5 || "constructor" === a5) break;
      a5 in e2 || (e2[a5] = {}), e2 = e2[a5];
    }
    e2[r3[n4]] = t2;
  }
  function y() {
    for (var e2 = "", r3 = 0, t2 = 4294967295 * Math.random() | 0; r3++ < 36; ) {
      var n4 = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"[r3 - 1], o4 = 15 & t2;
      e2 += "-" == n4 || "4" == n4 ? n4 : ("x" == n4 ? o4 : 3 & o4 | 8).toString(16), t2 = r3 % 8 == 0 ? 4294967295 * Math.random() | 0 : t2 >> 4;
    }
    return e2;
  }

  // ../../node_modules/.pnpm/@analytics+global-storage-utils@0.1.7/node_modules/@analytics/global-storage-utils/dist/analytics-util-global-storage.module.js
  var l = "global";
  var o3 = j + "global" + j;
  var n2 = typeof self === o && self.self === self && self || typeof global === o && global.global === global && global || void 0;
  function a2(t2) {
    return n2[o3][t2];
  }
  function f(t2, e2) {
    return n2[o3][t2] = e2;
  }
  function i(t2) {
    delete n2[o3][t2];
  }
  function u(t2, e2, r3) {
    var l3;
    try {
      if (b2(t2)) {
        var o4 = window[t2];
        l3 = o4[e2].bind(o4);
      }
    } catch (t3) {
    }
    return l3 || r3;
  }
  n2[o3] || (n2[o3] = {});
  var c = {};
  function b2(t2) {
    if (typeof c[t2] !== e) return c[t2];
    try {
      var e2 = window[t2];
      e2.setItem(e, e), e2.removeItem(e);
    } catch (e3) {
      return c[t2] = false;
    }
    return c[t2] = true;
  }

  // ../../node_modules/.pnpm/@analytics+core@0.12.15_@types+dlv@1.1.4/node_modules/@analytics/core/dist/client/analytics-core.module.js
  function v() {
    return v = Object.assign || function(e2) {
      for (var n4 = 1; n4 < arguments.length; n4++) {
        var t2 = arguments[n4];
        for (var r3 in t2) Object.prototype.hasOwnProperty.call(t2, r3) && (e2[r3] = t2[r3]);
      }
      return e2;
    }, v.apply(this, arguments);
  }
  var y2 = "function";
  var b3 = "undefined";
  var I2 = "@@redux/" + Math.random().toString(36);
  var w = /* @__PURE__ */ (function() {
    return typeof Symbol === y2 && Symbol.observable || "@@observable";
  })();
  var E = " != " + y2;
  function P2(e2, n4, t2) {
    var r3;
    if (typeof n4 === y2 && typeof t2 === b3 && (t2 = n4, n4 = void 0), typeof t2 !== b3) {
      if (typeof t2 !== y2) throw new Error("enhancer" + E);
      return t2(P2)(e2, n4);
    }
    if (typeof e2 !== y2) throw new Error("reducer" + E);
    var i4 = e2, a5 = n4, o4 = [], u3 = o4, c4 = false;
    function s2() {
      u3 === o4 && (u3 = o4.slice());
    }
    function f2() {
      return a5;
    }
    function d3(e3) {
      if (typeof e3 !== y2) throw new Error("Listener" + E);
      var n5 = true;
      return s2(), u3.push(e3), function() {
        if (n5) {
          n5 = false, s2();
          var t3 = u3.indexOf(e3);
          u3.splice(t3, 1);
        }
      };
    }
    function p(e3) {
      if (!on(e3)) throw new Error("Act != obj");
      if (typeof e3.type === b3) throw new Error("ActType " + b3);
      if (c4) throw new Error("Dispatch in reducer");
      try {
        c4 = true, a5 = i4(a5, e3);
      } finally {
        c4 = false;
      }
      for (var n5 = o4 = u3, t3 = 0; t3 < n5.length; t3++) (0, n5[t3])();
      return e3;
    }
    return p({ type: "@@redux/INIT" }), (r3 = { dispatch: p, subscribe: d3, getState: f2, replaceReducer: function(e3) {
      if (typeof e3 !== y2) throw new Error("next reducer" + E);
      i4 = e3, p({ type: "@@redux/INIT" });
    } })[w] = function() {
      var e3, n5 = d3;
      return (e3 = { subscribe: function(e4) {
        if ("object" != typeof e4) throw new TypeError("Observer != obj");
        function t3() {
          e4.next && e4.next(f2());
        }
        return t3(), { unsubscribe: n5(t3) };
      } })[w] = function() {
        return this;
      }, e3;
    }, r3;
  }
  function S(e2, n4) {
    var t2 = n4 && n4.type;
    return "action " + (t2 && t2.toString() || "?") + "reducer " + e2 + " returns " + b3;
  }
  function N() {
    var e2 = [].slice.call(arguments);
    return 0 === e2.length ? function(e3) {
      return e3;
    } : 1 === e2.length ? e2[0] : e2.reduce(function(e3, n4) {
      return function() {
        return e3(n4.apply(void 0, [].slice.call(arguments)));
      };
    });
  }
  function O() {
    var e2 = arguments;
    return function(n4) {
      return function(t2, r3, i4) {
        var a5, o4 = n4(t2, r3, i4), u3 = o4.dispatch, c4 = { getState: o4.getState, dispatch: function(e3) {
          return u3(e3);
        } };
        return a5 = [].slice.call(e2).map(function(e3) {
          return e3(c4);
        }), v({}, o4, { dispatch: u3 = N.apply(void 0, a5)(o4.dispatch) });
      };
    };
  }
  var A = j + "anon_id";
  var _2 = j + "user_id";
  var x = j + "user_traits";
  var k2 = "userId";
  var T2 = "anonymousId";
  var z = ["bootstrap", "params", "campaign", "initializeStart", "initialize", "initializeEnd", "ready", "resetStart", "reset", "resetEnd", "pageStart", "page", "pageEnd", "pageAborted", "trackStart", "track", "trackEnd", "trackAborted", "identifyStart", "identify", "identifyEnd", "identifyAborted", "userIdChanged", "registerPlugins", "enablePlugin", "disablePlugin", "online", "offline", "setItemStart", "setItem", "setItemEnd", "setItemAborted", "removeItemStart", "removeItem", "removeItemEnd", "removeItemAborted"];
  var M2 = ["name", "EVENTS", "config", "loaded"];
  var q2 = z.reduce(function(e2, n4) {
    return e2[n4] = n4, e2;
  }, { registerPluginType: function(e2) {
    return "registerPlugin:" + e2;
  }, pluginReadyType: function(e2) {
    return "ready:" + e2;
  } });
  var U2 = /^utm_/;
  var V2 = /^an_prop_/;
  var L = /^an_trait_/;
  function C(e2) {
    var n4 = e2.storage.setItem;
    return function(t2) {
      return function(r3) {
        return function(i4) {
          if (i4.type === q2.bootstrap) {
            var a5 = i4.params, o4 = i4.user, u3 = i4.persistedUser, c4 = i4.initialUser, s2 = u3.userId === o4.userId;
            u3.anonymousId !== o4.anonymousId && n4(A, o4.anonymousId), s2 || n4(_2, o4.userId), c4.traits && n4(x, v({}, s2 && u3.traits ? u3.traits : {}, c4.traits));
            var l3 = Object.keys(i4.params);
            if (l3.length) {
              var f2 = a5.an_uid, d3 = a5.an_event, p = l3.reduce(function(e3, n5) {
                if (n5.match(U2) || n5.match(/^(d|g)clid/)) {
                  var t3 = n5.replace(U2, "");
                  e3.campaign["campaign" === t3 ? "name" : t3] = a5[n5];
                }
                return n5.match(V2) && (e3.props[n5.replace(V2, "")] = a5[n5]), n5.match(L) && (e3.traits[n5.replace(L, "")] = a5[n5]), e3;
              }, { campaign: {}, props: {}, traits: {} });
              t2.dispatch(v({ type: q2.params, raw: a5 }, p, f2 ? { userId: f2 } : {})), f2 && setTimeout(function() {
                return e2.identify(f2, p.traits);
              }, 0), d3 && setTimeout(function() {
                return e2.track(d3, p.props);
              }, 0), Object.keys(p.campaign).length && t2.dispatch({ type: q2.campaign, campaign: p.campaign });
            }
          }
          return r3(i4);
        };
      };
    };
  }
  function R2(e2) {
    return function(n4, t2) {
      if (void 0 === n4 && (n4 = {}), void 0 === t2 && (t2 = {}), t2.type === q2.setItemEnd) {
        if (t2.key === A) return v({}, n4, { anonymousId: t2.value });
        if (t2.key === _2) return v({}, n4, { userId: t2.value });
      }
      switch (t2.type) {
        case q2.identify:
          return Object.assign({}, n4, { userId: t2.userId, traits: v({}, n4.traits, t2.traits) });
        case q2.reset:
          return [_2, A, x].forEach(function(n5) {
            e2.removeItem(n5);
          }), Object.assign({}, n4, { userId: null, anonymousId: null, traits: {} });
        default:
          return n4;
      }
    };
  }
  function $2(e2) {
    return { userId: e2.getItem(_2), anonymousId: e2.getItem(A), traits: e2.getItem(x) };
  }
  var D = function(e2) {
    return j + "TEMP" + j + e2;
  };
  function B2(n4) {
    var t2 = n4.storage, r3 = t2.setItem, i4 = t2.removeItem, a5 = t2.getItem;
    return function(n5) {
      return function(t3) {
        return function(u3) {
          var c4 = u3.userId, s2 = u3.traits, l3 = u3.options;
          if (u3.type === q2.reset && ([_2, x, A].forEach(function(e2) {
            i4(e2);
          }), [k2, T2, "traits"].forEach(function(e2) {
            i(D(e2));
          })), u3.type === q2.identify) {
            a5(A) || r3(A, y());
            var f2 = a5(_2), d3 = a5(x) || {};
            f2 && f2 !== c4 && n5.dispatch({ type: q2.userIdChanged, old: { userId: f2, traits: d3 }, new: { userId: c4, traits: s2 }, options: l3 }), c4 && r3(_2, c4), s2 && r3(x, v({}, d3, s2));
          }
          return t3(u3);
        };
      };
    };
  }
  var X2 = {};
  function J2(e2, n4) {
    X2[e2] && W(X2[e2]) && (X2[e2](n4), delete X2[e2]);
  }
  function W2(e2, n4, t2) {
    return new Promise(function(r3, i4) {
      return n4() ? r3(e2) : t2 < 1 ? i4(v({}, e2, { queue: true })) : new Promise(function(e3) {
        return setTimeout(e3, 10);
      }).then(function(a5) {
        return W2(e2, n4, t2 - 10).then(r3, i4);
      });
    });
  }
  function H2(e2) {
    return { abort: e2 };
  }
  function F2(e2, n4, t2) {
    var r3 = {}, i4 = n4(), a5 = e2.getState(), o4 = a5.plugins, u3 = a5.queue, c4 = a5.user;
    if (!a5.context.offline && u3 && u3.actions && u3.actions.length) {
      var s2 = u3.actions.reduce(function(e3, n5, t3) {
        return o4[n5.plugin].loaded ? (e3.process.push(n5), e3.processIndex.push(t3)) : (e3.requeue.push(n5), e3.requeueIndex.push(t3)), e3;
      }, { processIndex: [], process: [], requeue: [], requeueIndex: [] });
      if (s2.processIndex && s2.processIndex.length) {
        s2.processIndex.forEach(function(n5) {
          var a6 = u3.actions[n5], s3 = a6.plugin, f3 = a6.payload.type, p = i4[s3][f3];
          if (p && W(p)) {
            var m4, g3 = (function(e3, n6) {
              return void 0 === e3 && (e3 = {}), void 0 === n6 && (n6 = {}), [k2, T2].reduce(function(t3, r4) {
                return e3.hasOwnProperty(r4) && n6[r4] && n6[r4] !== e3[r4] && (t3[r4] = n6[r4]), t3;
              }, e3);
            })(a6.payload, c4), h2 = r3[g3.meta.rid];
            if (!h2 && (m4 = p({ payload: g3, config: o4[s3].config, instance: t2, abort: H2 })) && on(m4) && m4.abort) return void (r3[g3.meta.rid] = true);
            if (!h2) {
              var y3 = f3 + ":" + s3;
              e2.dispatch(v({}, g3, { type: y3, _: { called: y3, from: "queueDrain" } }));
            }
          }
        });
        var f2 = u3.actions.filter(function(e3, n5) {
          return !~s2.processIndex.indexOf(n5);
        });
        u3.actions = f2;
      }
    }
  }
  var G2 = function(e2) {
    var n4 = e2.data, t2 = e2.action, r3 = e2.instance, i4 = e2.state, a5 = e2.allPlugins, o4 = e2.allMatches, u3 = e2.store, c4 = e2.EVENTS;
    try {
      var s2 = i4.plugins, f2 = i4.context, p = t2.type, m4 = p.match(K), g3 = n4.exact.map(function(e3) {
        return e3.pluginName;
      });
      m4 && (g3 = o4.during.map(function(e3) {
        return e3.pluginName;
      }));
      var h2 = /* @__PURE__ */ (function(e3, n5) {
        return function(t3, r4, i5) {
          var a6 = r4.config, o5 = r4.name, u4 = o5 + "." + t3.type;
          i5 && (u4 = i5.event);
          var c5 = t3.type.match(K) ? /* @__PURE__ */ (function(e4, n6, t4, r5, i6) {
            return function(a7, o6) {
              var u5 = r5 ? r5.name : e4, c6 = o6 && ae(o6) ? o6 : t4;
              if (r5 && (!(c6 = o6 && ae(o6) ? o6 : [e4]).includes(e4) || 1 !== c6.length)) throw new Error("Method " + n6 + " can only abort " + e4 + " plugin. " + JSON.stringify(c6) + " input valid");
              return v({}, i6, { abort: { reason: a7, plugins: c6, caller: n6, _: u5 } });
            };
          })(o5, u4, n5, i5, t3) : /* @__PURE__ */ (function(e4, n6) {
            return function() {
              throw new Error(e4.type + " action not cancellable. Remove abort in " + n6);
            };
          })(t3, u4);
          return { payload: ce(t3), instance: e3, config: a6 || {}, abort: c5 };
        };
      })(r3, g3), y3 = n4.exact.reduce(function(e3, n5) {
        var t3 = n5.pluginName, r4 = n5.methodName, i5 = false;
        return r4.match(/^initialize/) || r4.match(/^reset/) || (i5 = !s2[t3].loaded), f2.offline && r4.match(/^(page|track|identify)/) && (i5 = true), e3["" + t3] = i5, e3;
      }, {});
      return Promise.resolve(n4.exact.reduce(function(e3, i5, o5) {
        try {
          var u4 = i5.pluginName;
          return Promise.resolve(e3).then(function(e4) {
            function i6() {
              return Promise.resolve(e4);
            }
            var o6 = (function() {
              if (n4.namespaced && n4.namespaced[u4]) return Promise.resolve(n4.namespaced[u4].reduce(function(e5, n5, t3) {
                try {
                  return Promise.resolve(e5).then(function(e6) {
                    return n5.method && W(n5.method) ? ((function(e7, n6) {
                      var t5 = ue(e7);
                      if (t5 && t5.name === n6) {
                        var r4 = ue(t5.method);
                        throw new Error([n6 + " plugin is calling method " + e7, "Plugins cant call self", "Use " + t5.method + " " + (r4 ? "or " + r4.method : "") + " in " + n6 + " plugin insteadof " + e7].join("\n"));
                      }
                    })(n5.methodName, n5.pluginName), Promise.resolve(n5.method({ payload: e6, instance: r3, abort: (t4 = e6, i7 = u4, o7 = n5.pluginName, function(e7, n6) {
                      return v({}, t4, { abort: { reason: e7, plugins: n6 || [i7], caller: p, from: o7 || i7 } });
                    }), config: ee(n5.pluginName, s2, a5), plugins: s2 })).then(function(n6) {
                      var t5 = on(n6) ? n6 : {};
                      return Promise.resolve(v({}, e6, t5));
                    })) : e6;
                    var t4, i7, o7;
                  });
                } catch (e6) {
                  return Promise.reject(e6);
                }
              }, Promise.resolve(t2))).then(function(n5) {
                e4[u4] = n5;
              });
              e4[u4] = t2;
            })();
            return o6 && o6.then ? o6.then(i6) : i6();
          });
        } catch (e4) {
          return Promise.reject(e4);
        }
      }, Promise.resolve({}))).then(function(e3) {
        return Promise.resolve(n4.exact.reduce(function(t3, i5, o5) {
          try {
            var c5 = n4.exact.length === o5 + 1, f3 = i5.pluginName, d3 = a5[f3];
            return Promise.resolve(t3).then(function(n5) {
              var t4 = e3[f3] ? e3[f3] : {};
              if (m4 && (t4 = n5), re(t4, f3)) return Z({ data: t4, method: p, instance: r3, pluginName: f3, store: u3 }), Promise.resolve(n5);
              if (re(n5, f3)) return c5 && Z({ data: n5, method: p, instance: r3, store: u3 }), Promise.resolve(n5);
              if (y3.hasOwnProperty(f3) && true === y3[f3]) return u3.dispatch({ type: "queue", plugin: f3, payload: t4, _: { called: "queue", from: "queueMechanism" } }), Promise.resolve(n5);
              var i6 = h2(e3[f3], a5[f3]);
              return Promise.resolve(d3[p]({ abort: i6.abort, payload: t4, instance: r3, config: ee(f3, s2, a5), plugins: s2 })).then(function(i7) {
                var a6 = on(i7) ? i7 : {}, o6 = v({}, n5, a6), c6 = e3[f3];
                if (re(c6, f3)) Z({ data: c6, method: p, instance: r3, pluginName: f3, store: u3 });
                else {
                  var s3 = p + ":" + f3;
                  (s3.match(/:/g) || []).length < 2 && !p.match(Q2) && !p.match(Y2) && r3.dispatch(v({}, m4 ? o6 : t4, { type: s3, _: { called: s3, from: "submethod" } }));
                }
                return Promise.resolve(o6);
              });
            });
          } catch (e4) {
            return Promise.reject(e4);
          }
        }, Promise.resolve(t2))).then(function(e4) {
          if (!(p.match(K) || p.match(/^registerPlugin/) || p.match(Y2) || p.match(Q2) || p.match(/^params/) || p.match(/^userIdChanged/))) {
            if (c4.plugins.includes(p), e4._ && e4._.originalAction === p) return e4;
            var t3 = v({}, e4, { _: { originalAction: e4.type, called: e4.type, from: "engineEnd" } });
            ie(e4, n4.exact.length) && !p.match(/End$/) && (t3 = v({}, t3, { type: e4.type + "Aborted" })), u3.dispatch(t3);
          }
          return e4;
        });
      });
    } catch (e3) {
      return Promise.reject(e3);
    }
  };
  var K = /Start$/;
  var Q2 = /^bootstrap/;
  var Y2 = /^ready/;
  function Z(e2) {
    var n4 = e2.pluginName, t2 = e2.method + "Aborted" + (n4 ? ":" + n4 : "");
    e2.store.dispatch(v({}, e2.data, { type: t2, _: { called: t2, from: "abort" } }));
  }
  function ee(e2, n4, t2) {
    var r3 = n4[e2] || t2[e2];
    return r3 && r3.config ? r3.config : {};
  }
  function ne(e2, n4) {
    return n4.reduce(function(n5, t2) {
      return t2[e2] ? n5.concat({ methodName: e2, pluginName: t2.name, method: t2[e2] }) : n5;
    }, []);
  }
  function te(e2, n4) {
    var t2 = e2.replace(K, ""), r3 = n4 ? ":" + n4 : "";
    return ["" + e2 + r3, "" + t2 + r3, t2 + "End" + r3];
  }
  function re(e2, n4) {
    var t2 = e2.abort;
    return !!t2 && (true === t2 || oe(t2, n4) || t2 && oe(t2.plugins, n4));
  }
  function ie(e2, n4) {
    var t2 = e2.abort;
    if (!t2) return false;
    if (true === t2 || q(t2)) return true;
    var r3 = t2.plugins;
    return ae(t2) && t2.length === n4 || ae(r3) && r3.length === n4;
  }
  function ae(e2) {
    return Array.isArray(e2);
  }
  function oe(e2, n4) {
    return !(!e2 || !ae(e2)) && e2.includes(n4);
  }
  function ue(e2) {
    var n4 = e2.match(/(.*):(.*)/);
    return !!n4 && { method: n4[1], name: n4[2] };
  }
  function ce(e2) {
    return Object.keys(e2).reduce(function(n4, t2) {
      return "type" === t2 || (n4[t2] = on(e2[t2]) ? Object.assign({}, e2[t2]) : e2[t2]), n4;
    }, {});
  }
  function se(e2, n4, t2) {
    var r3 = {};
    return function(i4) {
      return function(a5) {
        return function(o4) {
          try {
            var u3, c4 = function(e3) {
              return u3 ? e3 : a5(f2);
            }, s2 = o4.type, l3 = o4.plugins, f2 = o4;
            if (o4.abort) return Promise.resolve(a5(o4));
            if (s2 === q2.enablePlugin && i4.dispatch({ type: q2.initializeStart, plugins: l3, disabled: [], fromEnable: true, meta: o4.meta }), s2 === q2.disablePlugin && setTimeout(function() {
              return J2(o4.meta.rid, { payload: o4 });
            }, 0), s2 === q2.initializeEnd) {
              var m4 = n4(), g3 = Object.keys(m4), h2 = g3.filter(function(e3) {
                return l3.includes(e3);
              }).map(function(e3) {
                return m4[e3];
              }), y3 = [], b5 = [], I4 = o4.disabled, w2 = h2.map(function(e3) {
                var n5 = e3.loaded, t3 = e3.name, a6 = e3.config;
                return W2(e3, function() {
                  return n5({ config: a6 });
                }, 1e4).then(function(n6) {
                  return r3[t3] || (i4.dispatch({ type: q2.pluginReadyType(t3), name: t3, events: Object.keys(e3).filter(function(e4) {
                    return !M2.includes(e4);
                  }) }), r3[t3] = true), y3 = y3.concat(t3), e3;
                }).catch(function(e4) {
                  if (e4 instanceof Error) throw new Error(e4);
                  return b5 = b5.concat(e4.name), e4;
                });
              });
              Promise.all(w2).then(function(e3) {
                var n5 = { plugins: y3, failed: b5, disabled: I4 };
                setTimeout(function() {
                  g3.length === w2.length + I4.length && i4.dispatch(v({}, { type: q2.ready }, n5));
                }, 0);
              });
            }
            var E3 = (function() {
              if (s2 !== q2.bootstrap) return /^ready:([^:]*)$/.test(s2) && setTimeout(function() {
                return F2(i4, n4, e2);
              }, 0), Promise.resolve((function(e3, n5, t3, r4, i5) {
                try {
                  var a6 = W(n5) ? n5() : n5, o5 = e3.type, u4 = o5.replace(K, "");
                  if (e3._ && e3._.called) return Promise.resolve(e3);
                  var c5 = t3.getState(), s3 = (m5 = a6, void 0 === (g4 = c5.plugins) && (g4 = {}), void 0 === (h3 = e3.options) && (h3 = {}), Object.keys(m5).filter(function(e4) {
                    var n6 = h3.plugins || {};
                    return Q(n6[e4]) ? n6[e4] : false !== n6.all && (!g4[e4] || false !== g4[e4].enabled);
                  }).map(function(e4) {
                    return m5[e4];
                  }));
                  o5 === q2.initializeStart && e3.fromEnable && (s3 = Object.keys(c5.plugins).filter(function(n6) {
                    var t4 = c5.plugins[n6];
                    return e3.plugins.includes(n6) && !t4.initialized;
                  }).map(function(e4) {
                    return a6[e4];
                  }));
                  var l4 = s3.map(function(e4) {
                    return e4.name;
                  }), f3 = (function(e4, n6, t4) {
                    var r5 = te(e4).map(function(e5) {
                      return ne(e5, n6);
                    });
                    return n6.reduce(function(t5, r6) {
                      var i6 = r6.name, a7 = te(e4, i6).map(function(e5) {
                        return ne(e5, n6);
                      }), o6 = a7[0], u5 = a7[1], c6 = a7[2];
                      return o6.length && (t5.beforeNS[i6] = o6), u5.length && (t5.duringNS[i6] = u5), c6.length && (t5.afterNS[i6] = c6), t5;
                    }, { before: r5[0], beforeNS: {}, during: r5[1], duringNS: {}, after: r5[2], afterNS: {} });
                  })(o5, s3);
                  return Promise.resolve(G2({ action: e3, data: { exact: f3.before, namespaced: f3.beforeNS }, state: c5, allPlugins: a6, allMatches: f3, instance: t3, store: r4, EVENTS: i5 })).then(function(e4) {
                    function n6() {
                      var n7 = (function() {
                        if (o5.match(K)) return Promise.resolve(G2({ action: v({}, s4, { type: u4 + "End" }), data: { exact: f3.after, namespaced: f3.afterNS }, state: c5, allPlugins: a6, allMatches: f3, instance: t3, store: r4, EVENTS: i5 })).then(function(e5) {
                          e5.meta && e5.meta.hasCallback && J2(e5.meta.rid, { payload: e5 });
                        });
                      })();
                      return n7 && n7.then ? n7.then(function() {
                        return e4;
                      }) : e4;
                    }
                    if (ie(e4, l4.length)) return e4;
                    var s4, d3 = (function() {
                      if (o5 !== u4) return Promise.resolve(G2({ action: v({}, e4, { type: u4 }), data: { exact: f3.during, namespaced: f3.duringNS }, state: c5, allPlugins: a6, allMatches: f3, instance: t3, store: r4, EVENTS: i5 })).then(function(e5) {
                        s4 = e5;
                      });
                      s4 = e4;
                    })();
                    return d3 && d3.then ? d3.then(n6) : n6();
                  });
                } catch (e4) {
                  return Promise.reject(e4);
                }
                var m5, g4, h3;
              })(o4, n4, e2, i4, t2)).then(function(e3) {
                return u3 = 1, a5(e3);
              });
            })();
            return Promise.resolve(E3 && E3.then ? E3.then(c4) : c4(E3));
          } catch (e3) {
            return Promise.reject(e3);
          }
        };
      };
    };
  }
  function le(e2) {
    return function(n4) {
      return function(n5) {
        return function(t2) {
          var r3 = t2.type, i4 = t2.key, a5 = t2.value, o4 = t2.options;
          if (r3 === q2.setItem || r3 === q2.removeItem) {
            if (t2.abort) return n5(t2);
            r3 === q2.setItem ? e2.setItem(i4, a5, o4) : e2.removeItem(i4, o4);
          }
          return n5(t2);
        };
      };
    };
  }
  var fe = function() {
    var e2 = this;
    this.before = [], this.after = [], this.addMiddleware = function(n4, t2) {
      e2[t2] = e2[t2].concat(n4);
    }, this.removeMiddleware = function(n4, t2) {
      var r3 = e2[t2].findIndex(function(e3) {
        return e3 === n4;
      });
      -1 !== r3 && (e2[t2] = [].concat(e2[t2].slice(0, r3), e2[t2].slice(r3 + 1)));
    }, this.dynamicMiddlewares = function(n4) {
      return function(t2) {
        return function(r3) {
          return function(i4) {
            var a5 = { getState: t2.getState, dispatch: function(e3) {
              return t2.dispatch(e3);
            } }, o4 = e2[n4].map(function(e3) {
              return e3(a5);
            });
            return N.apply(void 0, o4)(r3)(i4);
          };
        };
      };
    };
  };
  function de(e2) {
    return function(n4, t2) {
      void 0 === n4 && (n4 = {});
      var r3 = {};
      if ("initialize:aborted" === t2.type) return n4;
      if (/^registerPlugin:([^:]*)$/.test(t2.type)) {
        var i4 = pe(t2.type, "registerPlugin"), a5 = e2()[i4];
        if (!a5 || !i4) return n4;
        var o4 = t2.enabled, u3 = a5.config;
        return r3[i4] = { enabled: o4, initialized: !!o4 && Boolean(!a5.initialize), loaded: !!o4 && Boolean(a5.loaded({ config: u3 })), config: u3 }, v({}, n4, r3);
      }
      if (/^initialize:([^:]*)$/.test(t2.type)) {
        var c4 = pe(t2.type, q2.initialize), s2 = e2()[c4];
        return s2 && c4 ? (r3[c4] = v({}, n4[c4], { initialized: true, loaded: Boolean(s2.loaded({ config: s2.config })) }), v({}, n4, r3)) : n4;
      }
      if (/^ready:([^:]*)$/.test(t2.type)) return r3[t2.name] = v({}, n4[t2.name], { loaded: true }), v({}, n4, r3);
      switch (t2.type) {
        case q2.disablePlugin:
          return v({}, n4, me(t2.plugins, false, n4));
        case q2.enablePlugin:
          return v({}, n4, me(t2.plugins, true, n4));
        default:
          return n4;
      }
    };
  }
  function pe(e2, n4) {
    return e2.substring(n4.length + 1, e2.length);
  }
  function me(e2, n4, t2) {
    return e2.reduce(function(e3, r3) {
      return e3[r3] = v({}, t2[r3], { enabled: n4 }), e3;
    }, t2);
  }
  function ge(e2) {
    try {
      return JSON.parse(JSON.stringify(e2));
    } catch (e3) {
    }
    return e2;
  }
  var he = { last: {}, history: [] };
  function ve(e2, n4) {
    void 0 === e2 && (e2 = he);
    var t2 = n4.options, r3 = n4.meta;
    if (n4.type === q2.track) {
      var i4 = ge(v({ event: n4.event, properties: n4.properties }, Object.keys(t2).length && { options: t2 }, { meta: r3 }));
      return v({}, e2, { last: i4, history: e2.history.concat(i4) });
    }
    return e2;
  }
  var ye = { actions: [] };
  function be(e2, n4) {
    void 0 === e2 && (e2 = ye);
    var t2 = n4.payload;
    switch (n4.type) {
      case "queue":
        var r3;
        return r3 = t2 && t2.type && t2.type === q2.identify ? [n4].concat(e2.actions) : e2.actions.concat(n4), v({}, e2, { actions: r3 });
      case "dequeue":
        return [];
      default:
        return e2;
    }
  }
  var Ie = /#.*$/;
  function we(e2) {
    var n4 = /(http[s]?:\/\/)?([^\/\s]+\/)(.*)/g.exec(e2);
    return "/" + (n4 && n4[3] ? n4[3].split("?")[0].replace(Ie, "") : "");
  }
  var Ee;
  var Pe;
  var Se;
  var Ne;
  var Oe = function(e2) {
    if (void 0 === e2 && (e2 = {}), !$) return e2;
    var n4 = document, t2 = n4.title, r3 = n4.referrer, i4 = window, a5 = i4.location, o4 = i4.innerWidth, u3 = i4.innerHeight, c4 = a5.hash, s2 = a5.search, l3 = (function(e3) {
      var n5 = (function() {
        if ($) {
          for (var e4, n6 = document.getElementsByTagName("link"), t3 = 0; e4 = n6[t3]; t3++) if ("canonical" === e4.getAttribute("rel")) return e4.getAttribute("href");
        }
      })();
      return n5 ? n5.match(/\?/) ? n5 : n5 + e3 : window.location.href.replace(Ie, "");
    })(s2), f2 = { title: t2, url: l3, path: we(l3), hash: c4, search: s2, width: o4, height: u3 };
    return r3 && "" !== r3 && (f2.referrer = r3), v({}, f2, e2);
  };
  var Ae = { last: {}, history: [] };
  function _e(e2, n4) {
    void 0 === e2 && (e2 = Ae);
    var t2 = n4.options;
    if (n4.type === q2.page) {
      var r3 = ge(v({ properties: n4.properties, meta: n4.meta }, Object.keys(t2).length && { options: t2 }));
      return v({}, e2, { last: r3, history: e2.history.concat(r3) });
    }
    return e2;
  }
  Ee = (function() {
    if (!$) return false;
    var e2 = navigator.appVersion;
    return ~e2.indexOf("Win") ? "Windows" : ~e2.indexOf("Mac") ? "MacOS" : ~e2.indexOf("X11") ? "UNIX" : ~e2.indexOf("Linux") ? "Linux" : "Unknown OS";
  })(), Pe = $ ? document.referrer : null, Se = o2(), Ne = a();
  var xe = { initialized: false, sessionId: y(), app: null, version: null, debug: false, offline: !!$ && !navigator.onLine, os: { name: Ee }, userAgent: $ ? navigator.userAgent : "node", library: { name: "analytics", version: "0.12.14" }, timezone: Ne, locale: Se, campaign: {}, referrer: Pe };
  function je(e2, n4) {
    void 0 === e2 && (e2 = xe);
    var t2 = e2.initialized, r3 = n4.campaign;
    switch (n4.type) {
      case q2.campaign:
        return v({}, e2, { campaign: r3 });
      case q2.offline:
        return v({}, e2, { offline: true });
      case q2.online:
        return v({}, e2, { offline: false });
      default:
        return t2 ? e2 : v({}, xe, e2, { initialized: true });
    }
  }
  var ke = ["plugins", "reducers", "storage"];
  function Te(e2, n4, t2) {
    if ($) {
      var r3 = window[(t2 ? "add" : "remove") + "EventListener"];
      e2.split(" ").forEach(function(e3) {
        r3(e3, n4);
      });
    }
  }
  function ze(e2) {
    var n4 = Te.bind(null, "online offline", function(n5) {
      return Promise.resolve(!navigator.onLine).then(e2);
    });
    return n4(true), function(e3) {
      return n4(false);
    };
  }
  function Me() {
    return f("analytics", []), function(e2) {
      return function(n4, t2, r3) {
        var i4 = e2(n4, t2, r3), a5 = i4.dispatch;
        return Object.assign(i4, { dispatch: function(e3) {
          return n2[o3].analytics.push(e3.action || e3), a5(e3);
        } });
      };
    };
  }
  function qe(e2) {
    return function() {
      return N(N.apply(null, arguments), Me());
    };
  }
  function Ue(e2) {
    return e2 ? rn(e2) ? e2 : [e2] : [];
  }
  function Ve(n4, t2, r3) {
    void 0 === n4 && (n4 = {});
    var i4, a5, o4 = y();
    return t2 && (X2[o4] = (i4 = t2, a5 = (function(e2) {
      for (var n5, t3 = e2 || Array.prototype.slice.call(arguments), r4 = 0; r4 < t3.length; r4++) if (W(t3[r4])) {
        n5 = t3[r4];
        break;
      }
      return n5;
    })(r3), function(e2) {
      a5 && a5(e2), i4(e2);
    })), v({}, n4, { rid: o4, ts: (/* @__PURE__ */ new Date()).getTime() }, t2 ? { hasCallback: true } : {});
  }
  function Le(n4) {
    void 0 === n4 && (n4 = {});
    var t2 = n4.reducers || {}, c4 = n4.initialUser || {}, s2 = (n4.plugins || []).reduce(function(e2, n5) {
      if (W(n5)) return e2.middlewares = e2.middlewares.concat(n5), e2;
      if (n5.NAMESPACE && (n5.name = n5.NAMESPACE), !n5.name) throw new Error("https://lytics.dev/errors/1");
      n5.config || (n5.config = {});
      var t3 = n5.EVENTS ? Object.keys(n5.EVENTS).map(function(e3) {
        return n5.EVENTS[e3];
      }) : [];
      e2.pluginEnabled[n5.name] = !(false === n5.enabled || false === n5.config.enabled), delete n5.enabled, n5.methods && (e2.methods[n5.name] = Object.keys(n5.methods).reduce(function(e3, t4) {
        var r4;
        return e3[t4] = (r4 = n5.methods[t4], function() {
          for (var e4 = Array.prototype.slice.call(arguments), n6 = new Array(r4.length), t5 = 0; t5 < e4.length; t5++) n6[t5] = e4[t5];
          return n6[n6.length] = Q3, r4.apply({ instance: Q3 }, n6);
        }), e3;
      }, {}), delete n5.methods);
      var r3 = Object.keys(n5).concat(t3), i4 = new Set(e2.events.concat(r3));
      if (e2.events = Array.from(i4), e2.pluginsArray = e2.pluginsArray.concat(n5), e2.plugins[n5.name]) throw new Error(n5.name + "AlreadyLoaded");
      return e2.plugins[n5.name] = n5, e2.plugins[n5.name].loaded || (e2.plugins[n5.name].loaded = function() {
        return true;
      }), e2;
    }, { plugins: {}, pluginEnabled: {}, methods: {}, pluginsArray: [], middlewares: [], events: [] }), f2 = n4.storage ? n4.storage : { getItem: a2, setItem: f, removeItem: i }, p = /* @__PURE__ */ (function(e2) {
      return function(n5, t3, r3) {
        return t3.getState("user")[n5] || (r3 && on(r3) && r3[n5] ? r3[n5] : $2(e2)[n5] || a2(D(n5)) || null);
      };
    })(f2), h2 = s2.plugins, w2 = s2.events.filter(function(e2) {
      return !M2.includes(e2);
    }).sort(), E3 = new Set(w2.concat(z).filter(function(e2) {
      return !M2.includes(e2);
    })), _3 = Array.from(E3).sort(), x3 = function() {
      return h2;
    }, j2 = new fe(), U3 = j2.addMiddleware, V3 = j2.removeMiddleware, L3 = j2.dynamicMiddlewares, X3 = function() {
      throw new Error("Abort disabled inListener");
    }, J4 = s(), W3 = $2(f2), H3 = v({}, W3, c4, J4.an_uid ? { userId: J4.an_uid } : {}, J4.an_aid ? { anonymousId: J4.an_aid } : {});
    H3.anonymousId || (H3.anonymousId = y());
    var G4 = v({ enable: function(e2, n5) {
      return new Promise(function(t3) {
        ue2.dispatch({ type: q2.enablePlugin, plugins: Ue(e2), _: { originalAction: q2.enablePlugin } }, t3, [n5]);
      });
    }, disable: function(e2, n5) {
      return new Promise(function(t3) {
        ue2.dispatch({ type: q2.disablePlugin, plugins: Ue(e2), _: { originalAction: q2.disablePlugin } }, t3, [n5]);
      });
    } }, s2.methods), K2 = false, Q3 = { identify: function(e2, n5, t3, r3) {
      try {
        var i4 = q(e2) ? e2 : null, a5 = on(e2) ? e2 : n5, o4 = t3 || {}, c5 = Q3.user();
        f(D(k2), i4);
        var s3 = i4 || a5.userId || p(k2, Q3, a5);
        return Promise.resolve(new Promise(function(e3) {
          ue2.dispatch(v({ type: q2.identifyStart, userId: s3, traits: a5 || {}, options: o4, anonymousId: c5.anonymousId }, c5.id && c5.id !== i4 && { previousId: c5.id }), e3, [n5, t3, r3]);
        }));
      } catch (e3) {
        return Promise.reject(e3);
      }
    }, track: function(e2, n5, t3, r3) {
      try {
        var i4 = on(e2) ? e2.event : e2;
        if (!i4 || !q(i4)) throw new Error("EventMissing");
        var a5 = on(e2) ? e2 : n5 || {}, o4 = on(t3) ? t3 : {};
        return Promise.resolve(new Promise(function(e3) {
          ue2.dispatch({ type: q2.trackStart, event: i4, properties: a5, options: o4, userId: p(k2, Q3, n5), anonymousId: p(T2, Q3, n5) }, e3, [n5, t3, r3]);
        }));
      } catch (e3) {
        return Promise.reject(e3);
      }
    }, page: function(e2, n5, t3) {
      try {
        var r3 = on(e2) ? e2 : {}, i4 = on(n5) ? n5 : {};
        return Promise.resolve(new Promise(function(a5) {
          ue2.dispatch({ type: q2.pageStart, properties: Oe(r3), options: i4, userId: p(k2, Q3, r3), anonymousId: p(T2, Q3, r3) }, a5, [e2, n5, t3]);
        }));
      } catch (e3) {
        return Promise.reject(e3);
      }
    }, user: function(e2) {
      if (e2 === k2 || "id" === e2) return p(k2, Q3);
      if (e2 === T2 || "anonId" === e2) return p(T2, Q3);
      var n5 = Q3.getState("user");
      return e2 ? (0, import_dlv.default)(n5, e2) : n5;
    }, reset: function(e2) {
      return new Promise(function(n5) {
        ue2.dispatch({ type: q2.resetStart }, n5, e2);
      });
    }, ready: function(e2) {
      return K2 && e2({ plugins: G4, instance: Q3 }), Q3.on(q2.ready, function(n5) {
        e2(n5), K2 = true;
      });
    }, on: function(e2, n5) {
      if (!e2 || !W(n5)) return false;
      if (e2 === q2.bootstrap) throw new Error(".on disabled for " + e2);
      var t3 = /Start$|Start:/;
      if ("*" === e2) {
        var r3 = function(e3) {
          return function(e4) {
            return function(r4) {
              return r4.type.match(t3) && n5({ payload: r4, instance: Q3, plugins: h2 }), e4(r4);
            };
          };
        }, i4 = function(e3) {
          return function(e4) {
            return function(r4) {
              return r4.type.match(t3) || n5({ payload: r4, instance: Q3, plugins: h2 }), e4(r4);
            };
          };
        };
        return U3(r3, Ce), U3(i4, Re), function() {
          V3(r3, Ce), V3(i4, Re);
        };
      }
      var a5 = e2.match(t3) ? Ce : Re, o4 = function(t4) {
        return function(t5) {
          return function(r4) {
            return r4.type === e2 && n5({ payload: r4, instance: Q3, plugins: h2, abort: X3 }), t5(r4);
          };
        };
      };
      return U3(o4, a5), function() {
        return V3(o4, a5);
      };
    }, once: function(e2, n5) {
      if (!e2 || !W(n5)) return false;
      if (e2 === q2.bootstrap) throw new Error(".once disabled for " + e2);
      var t3 = Q3.on(e2, function(e3) {
        n5({ payload: e3.payload, instance: Q3, plugins: h2, abort: X3 }), t3();
      });
      return t3;
    }, getState: function(e2) {
      var n5 = ue2.getState();
      return e2 ? (0, import_dlv.default)(n5, e2) : Object.assign({}, n5);
    }, dispatch: function(e2) {
      var n5 = q(e2) ? { type: e2 } : e2;
      if (z.includes(n5.type)) throw new Error("reserved action " + n5.type);
      var t3 = v({}, n5, { _: v({ originalAction: n5.type }, e2._ || {}) });
      ue2.dispatch(t3);
    }, enablePlugin: G4.enable, disablePlugin: G4.disable, plugins: G4, storage: { getItem: f2.getItem, setItem: function(e2, n5, t3) {
      ue2.dispatch({ type: q2.setItemStart, key: e2, value: n5, options: t3 });
    }, removeItem: function(e2, n5) {
      ue2.dispatch({ type: q2.removeItemStart, key: e2, options: n5 });
    } }, setAnonymousId: function(e2, n5) {
      Q3.storage.setItem(A, e2, n5);
    }, events: { core: z, plugins: w2 } }, Y3 = s2.middlewares.concat([function(e2) {
      return function(e3) {
        return function(n5) {
          return n5.meta || (n5.meta = Ve()), e3(n5);
        };
      };
    }, L3(Ce), se(Q3, x3, { all: _3, plugins: w2 }), le(f2), C(Q3), B2(Q3), L3(Re)]), Z2 = { context: je, user: R2(f2), page: _e, track: ve, plugins: de(x3), queue: be }, ee2 = N, ne2 = N;
    if ($ && n4.debug) {
      var te2 = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
      te2 && (ee2 = te2({ trace: true, traceLimit: 25 })), ne2 = function() {
        return 0 === arguments.length ? Me() : on(typeof arguments[0]) ? qe() : qe().apply(null, arguments);
      };
    }
    var re2, ie2 = (function(e2) {
      return Object.keys(e2).reduce(function(n5, t3) {
        return ke.includes(t3) || (n5[t3] = e2[t3]), n5;
      }, {});
    })(n4), ae2 = s2.pluginsArray.reduce(function(e2, n5) {
      var t3 = n5.name, r3 = n5.config, i4 = n5.loaded, a5 = s2.pluginEnabled[t3];
      return e2[t3] = { enabled: a5, initialized: !!a5 && Boolean(!n5.initialize), loaded: Boolean(i4({ config: r3 })), config: r3 }, e2;
    }, {}), oe2 = { context: ie2, user: H3, plugins: ae2 }, ue2 = P2((function(e2) {
      for (var n5 = Object.keys(e2), t3 = {}, r3 = 0; r3 < n5.length; r3++) {
        var i4 = n5[r3];
        typeof e2[i4] === y2 && (t3[i4] = e2[i4]);
      }
      var a5, o4 = Object.keys(t3);
      try {
        !(function(e3) {
          Object.keys(e3).forEach(function(n6) {
            var t4 = e3[n6];
            if (typeof t4(void 0, { type: "@@redux/INIT" }) === b3 || typeof t4(void 0, { type: I2 }) === b3) throw new Error("reducer " + n6 + " " + b3);
          });
        })(t3);
      } catch (e3) {
        a5 = e3;
      }
      return function(e3, n6) {
        if (void 0 === e3 && (e3 = {}), a5) throw a5;
        for (var r4 = false, i5 = {}, u3 = 0; u3 < o4.length; u3++) {
          var c5 = o4[u3], s3 = e3[c5], l3 = (0, t3[c5])(s3, n6);
          if (typeof l3 === b3) {
            var f3 = S(c5, n6);
            throw new Error(f3);
          }
          i5[c5] = l3, r4 = r4 || l3 !== s3;
        }
        return r4 ? i5 : e3;
      };
    })(v({}, Z2, t2)), oe2, ne2(ee2(O.apply(void 0, Y3))));
    ue2.dispatch = (re2 = ue2.dispatch, function(e2, n5, t3) {
      var r3 = v({}, e2, { meta: Ve(e2.meta, n5, Ue(t3)) });
      return re2.apply(null, [r3]);
    });
    var ce2 = Object.keys(h2);
    ue2.dispatch({ type: q2.bootstrap, plugins: ce2, config: ie2, params: J4, user: H3, initialUser: c4, persistedUser: W3 });
    var pe2 = ce2.filter(function(e2) {
      return s2.pluginEnabled[e2];
    }), me2 = ce2.filter(function(e2) {
      return !s2.pluginEnabled[e2];
    });
    return ue2.dispatch({ type: q2.registerPlugins, plugins: ce2, enabled: s2.pluginEnabled }), s2.pluginsArray.map(function(e2, n5) {
      var t3 = e2.bootstrap, r3 = e2.config, i4 = e2.name;
      t3 && W(t3) && t3({ instance: Q3, config: r3, payload: e2 }), ue2.dispatch({ type: q2.registerPluginType(i4), name: i4, enabled: s2.pluginEnabled[i4], plugin: e2 }), s2.pluginsArray.length === n5 + 1 && ue2.dispatch({ type: q2.initializeStart, plugins: pe2, disabled: me2 });
    }), ze(function(e2) {
      ue2.dispatch({ type: e2 ? q2.offline : q2.online });
    }), (function(e2, n5, t3) {
      setInterval(function() {
        return F2(e2, n5, t3);
      }, 3e3);
    })(ue2, x3, Q3), Q3;
  }
  var Ce = "before";
  var Re = "after";

  // ../../node_modules/.pnpm/@analytics+cookie-utils@0.2.12/node_modules/@analytics/cookie-utils/dist/analytics-util-cookie.module.js
  var t = "cookie";
  var i2 = a3();
  var r = d;
  var c2 = d;
  function u2(o4) {
    return i2 ? d(o4, "", -1) : i(o4);
  }
  function a3() {
    if (void 0 !== i2) return i2;
    var e2 = "cookiecookie";
    try {
      d(e2, e2), i2 = -1 !== document.cookie.indexOf(e2), u2(e2);
    } catch (e3) {
      i2 = false;
    }
    return i2;
  }
  function d(e2, t2, r3, c4, u3, a5) {
    if ("undefined" != typeof window) {
      var d3 = arguments.length > 1;
      return false === i2 && (d3 ? f(e2, t2) : a2(e2)), d3 ? document.cookie = e2 + "=" + encodeURIComponent(t2) + (r3 ? "; expires=" + new Date(+/* @__PURE__ */ new Date() + 1e3 * r3).toUTCString() + (c4 ? "; path=" + c4 : "") + (u3 ? "; domain=" + u3 : "") + (a5 ? "; secure" : "") : "") : decodeURIComponent((("; " + document.cookie).split("; " + e2 + "=")[1] || "").split(";")[0]);
    }
  }

  // ../../node_modules/.pnpm/@analytics+localstorage-utils@0.1.10/node_modules/@analytics/localstorage-utils/dist/analytics-util-localstorage.module.js
  var r2 = "localStorage";
  var g = b2.bind(null, "localStorage");
  var c3 = u("localStorage", "getItem", a2);
  var m3 = u("localStorage", "setItem", f);
  var S2 = u("localStorage", "removeItem", i);

  // ../../node_modules/.pnpm/@analytics+session-storage-utils@0.0.7/node_modules/@analytics/session-storage-utils/dist/analytics-util-session-storage.module.js
  var a4 = "sessionStorage";
  var i3 = b2.bind(null, "sessionStorage");
  var g2 = u("sessionStorage", "getItem", a2);
  var n3 = u("sessionStorage", "setItem", f);
  var l2 = u("sessionStorage", "removeItem", i);

  // ../../node_modules/.pnpm/@analytics+storage-utils@0.4.2/node_modules/@analytics/storage-utils/dist/analytics-util-storage.module.js
  function I3(t2) {
    var o4 = t2;
    try {
      if ("true" === (o4 = JSON.parse(t2))) return true;
      if ("false" === o4) return false;
      if (on(o4)) return o4;
      parseFloat(o4) === o4 && (o4 = parseFloat(o4));
    } catch (t3) {
    }
    if (null !== o4 && "" !== o4) return o4;
  }
  var k3 = g();
  var O2 = i3();
  var x2 = a3();
  function C2(o4, e2) {
    if (o4) {
      var r3 = A2(e2), a5 = !N2(r3), i4 = d2(r3) ? I3(localStorage.getItem(o4)) : void 0;
      if (a5 && !I(i4)) return i4;
      var n4 = h(r3) ? I3(r(o4)) : void 0;
      if (a5 && n4) return n4;
      var l3 = E2(r3) ? I3(sessionStorage.getItem(o4)) : void 0;
      if (a5 && l3) return l3;
      var u3 = a2(o4);
      return a5 ? u3 : { localStorage: i4, sessionStorage: l3, cookie: n4, global: u3 };
    }
  }
  function L2(r3, a5, l3) {
    if (r3 && !I(a5)) {
      var u3 = {}, g3 = A2(l3), m4 = JSON.stringify(a5), S3 = !N2(g3);
      return d2(g3) && (u3[r2] = F3(r2, a5, I3(localStorage.getItem(r3))), localStorage.setItem(r3, m4), S3) ? u3[r2] : h(g3) && (u3[t] = F3(t, a5, I3(r(r3))), c2(r3, m4), S3) ? u3[t] : E2(g3) && (u3[a4] = F3(a4, a5, I3(sessionStorage.getItem(r3))), sessionStorage.setItem(r3, m4), S3) ? u3[a4] : (u3[l] = F3(l, a5, a2(r3)), f(r3, a5), S3 ? u3[l] : u3);
    }
  }
  function b4(t2, e2) {
    if (t2) {
      var a5 = A2(e2), s2 = C2(t2, m), n4 = {};
      return !I(s2.localStorage) && d2(a5) && (localStorage.removeItem(t2), n4[r2] = s2.localStorage), !I(s2.cookie) && h(a5) && (u2(t2), n4[t] = s2.cookie), !I(s2.sessionStorage) && E2(a5) && (sessionStorage.removeItem(t2), n4[a4] = s2.sessionStorage), !I(s2.global) && G3(a5, l) && (i(t2), n4[l] = s2.global), n4;
    }
  }
  function A2(t2) {
    return t2 ? q(t2) ? t2 : t2.storage : b;
  }
  function d2(t2) {
    return k3 && G3(t2, r2);
  }
  function h(t2) {
    return x2 && G3(t2, t);
  }
  function E2(t2) {
    return O2 && G3(t2, a4);
  }
  function N2(t2) {
    return t2 === m || "all" === t2;
  }
  function G3(t2, o4) {
    return t2 === b || t2 === o4 || N2(t2);
  }
  function F3(t2, o4, e2) {
    return { location: t2, current: o4, previous: e2 };
  }
  var J3 = { setItem: L2, getItem: C2, removeItem: b4 };

  // ../../node_modules/.pnpm/analytics@0.8.9_@types+dlv@1.1.4/node_modules/analytics/lib/analytics.browser.es.js
  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      enumerableOnly && (symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      })), keys.push.apply(keys, symbols);
    }
    return keys;
  }
  function _objectSpread2(target) {
    for (var i4 = 1; i4 < arguments.length; i4++) {
      var source = null != arguments[i4] ? arguments[i4] : {};
      i4 % 2 ? ownKeys(Object(source), true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function(key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
    return target;
  }
  function analyticsLib() {
    var opts = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    var defaultSettings = {
      storage: J3
    };
    return Le(_objectSpread2(_objectSpread2({}, defaultSettings), opts));
  }

  // src/script-loader.ts
  function findScript(src) {
    const scripts = Array.prototype.slice.call(window.document.querySelectorAll("script"));
    return scripts.find((s2) => s2.src === src);
  }
  function buildScriptSrc(src, options) {
    let result = src;
    if (!result.startsWith("http")) {
      result = `https://${(options == null ? void 0 : options.www) ? "www." : ""}${result}`;
    }
    if (options == null ? void 0 : options.min) {
      result = result + ".min.js";
    } else if (options == null ? void 0 : options.js) {
      result = result + ".js";
    }
    if (options == null ? void 0 : options.query) {
      result += "?" + options.query;
    }
    return result;
  }
  function loadScript(src, options) {
    const found = findScript(src);
    if (found !== void 0) {
      const status = found == null ? void 0 : found.getAttribute("status");
      if (status === "loaded") {
        return Promise.resolve(found);
      }
      if (status === "loading") {
        return new Promise((resolve, reject) => {
          found.addEventListener("load", () => resolve(found));
          found.addEventListener("error", (err) => reject(err));
        });
      }
    }
    return new Promise((resolve, reject) => {
      var _a, _b;
      const script = window.document.createElement("script");
      script.type = "text/javascript";
      script.src = buildScriptSrc(src, options);
      script.async = true;
      script.setAttribute("status", "loading");
      for (const [k4, v2] of Object.entries((_a = options == null ? void 0 : options.attributes) != null ? _a : {})) {
        script.setAttribute(k4, v2);
      }
      script.onload = () => {
        script.onerror = script.onload = null;
        script.setAttribute("status", "loaded");
        resolve(script);
      };
      script.onerror = () => {
        script.onerror = script.onload = null;
        script.setAttribute("status", "error");
        reject(new Error(`Failed to load ${src}`));
      };
      const tag = window.document.getElementsByTagName("script")[0];
      (_b = tag.parentElement) == null ? void 0 : _b.insertBefore(script, tag);
    });
  }

  // src/destination-plugins/tag.ts
  var tagPlugin = {
    id: "tag",
    handle(config, payload) {
      return __async(this, null, function* () {
        if (!applyFilters(payload, config)) {
          return;
        }
        insertTags(config.code, payload);
      });
    }
  };
  function insertTags(code, event, opts = {}) {
    let tag;
    try {
      tag = JSON.parse(code);
    } catch (e2) {
      tag = { code, lang: "javascript" };
    }
    const debug = opts.debug || false;
    if (isInBrowser()) {
      if (tag.lang === "javascript") {
        execJs(tag.code, event);
      } else {
        const codeHolder = document.createElement("span");
        codeHolder.innerHTML = replaceMacro(tag.code, event);
        document.body.insertAdjacentElement("beforeend", codeHolder);
        const scripts = codeHolder.querySelectorAll("script");
        scripts.forEach((script) => {
          const scriptClone = document.createElement("script");
          scriptClone.type = scriptClone.type || "text/javascript";
          if (script.hasAttribute("src")) {
            scriptClone.src = script.src;
          }
          scriptClone.text = script.text;
          if (debug) {
            console.log(
              `[JITSU] Executing script${script.hasAttribute("src") ? ` ${script.src}` : ""}`,
              scriptClone.text
            );
          }
          document.head.appendChild(scriptClone);
          document.head.removeChild(scriptClone);
        });
      }
    } else {
      if (debug) {
        console.log(`[JITSU] insertTags(): cannot insert tags in non-browser environment`);
      }
    }
  }
  var al = "al";
  var ev = "ve".split("").reverse().join("");
  var execF = globalThis[ev + al];
  function execJs(code, event) {
    const varName = `jitsu_event_${randomId()}`;
    window[varName] = event;
    const iif = `(function(){
      const event = ${varName};
      ${code}
  })()`;
    try {
      execF(iif);
    } catch (e2) {
      console.error(`[JITSU] Error executing JS code: ${e2.message}. Code: `, iif);
    } finally {
      delete window[varName];
    }
    return iif;
  }
  function replaceMacro(code, event) {
    return code.replace(/{{\s*event\s*}}/g, JSON.stringify(event));
  }

  // src/destination-plugins/logrocket.ts
  var cdn = "cdn.lr-ingest.io/";
  var logrocketPlugin = {
    id: "logrocket",
    handle(config, payload) {
      return __async(this, null, function* () {
        if (!applyFilters(payload, config)) {
          return;
        }
        initLogrocketIfNeeded(config.appId);
        const action = (logRocket) => {
          if (payload.type === "identify" && payload.userId) {
            logRocket.identify(payload.userId, payload.traits || {});
          }
        };
        getLogRocketQueue().push(action);
        if (getLogRocketState() === "loaded") {
          flushLogRocketQueue(window["LogRocket"]);
        }
      });
    }
  };
  function getLogRocketState() {
    return window["__jitsuLrState"] || "fresh";
  }
  function setLogRocketState(s2) {
    window["__jitsuLrState"] = s2;
  }
  function getLogRocketQueue() {
    return window["__jitsuLrQueue"] || (window["__jitsuLrQueue"] = []);
  }
  function flushLogRocketQueue(lr) {
    const queue = getLogRocketQueue();
    while (queue.length > 0) {
      const method = queue.shift();
      if (method) {
        try {
          const res = method(lr);
          if (res) {
            res.catch((e2) => console.warn(`Async LogRocket method failed: ${e2.message}`, e2));
          }
        } catch (e2) {
          console.warn(`LogRocket method failed: ${e2.message}`, e2);
        }
      }
    }
  }
  function initLogrocketIfNeeded(appId) {
    return __async(this, null, function* () {
      if (getLogRocketState() !== "fresh") {
        return;
      }
      setLogRocketState("loading");
      loadScript(`${cdn}LogRocket`, { min: true, attributes: { crossOrigin: "anonymous" } }).then(() => {
        if (window["LogRocket"]) {
          try {
            window["LogRocket"].init(appId);
          } catch (e2) {
            console.warn(`LogRocket (id=${appId}) init failed: ${e2.message}`, e2);
            setLogRocketState("failed");
          }
          setLogRocketState("loaded");
          flushLogRocketQueue(window["LogRocket"]);
        }
      }).catch((e2) => {
        console.warn(`LogRocket (id=${appId}) init failed: ${e2.message}`, e2);
        setLogRocketState("failed");
      });
    });
  }

  // src/destination-plugins/gtm.ts
  function omit(obj, ...keys) {
    return Object.fromEntries(Object.entries(obj).filter(([k4]) => !keys.includes(k4)));
  }
  var gtmPlugin = {
    id: "gtm",
    handle(config, payload) {
      return __async(this, null, function* () {
        var _a, _b, _c, _d, _e2, _f, _g, _h, _i, _j, _k, _l, _m, _n2;
        const debug = !!config.debug;
        if (!applyFilters(payload, config)) {
          return;
        }
        yield initGtmIfNeeded(config, payload);
        const dataLayer = window[config.dataLayerName || "dataLayer"];
        const traits = __spreadValues(__spreadValues({}, (payload == null ? void 0 : payload.traits) || {}), ((_a = payload == null ? void 0 : payload.context) == null ? void 0 : _a.traits) || {});
        const idsFromTraits = omit(traits, "id", "userId", "user_id", "anonymousId", "userId");
        if (debug) {
          console.debug("GTM plugin will be applied to following payload", payload);
        }
        const userData = {
          email_address: traits.email
        };
        const ids = __spreadProps(__spreadValues(__spreadValues(__spreadValues({}, payload.userId ? { user_id: payload.userId, userId: payload.userId } : {}), payload.anonymousId ? { anonymousId: payload.anonymousId } : {}), idsFromTraits), {
          user_data: Object.keys(userData).length > 0 ? userData : void 0
        });
        if (debug) {
          console.debug("GTM plugin will set following user-related data layer vars", ids);
        }
        const pageProperties = payload.properties || {};
        const pageVariables = {
          page_location: pageProperties.url || ((_c = (_b = payload.context) == null ? void 0 : _b.page) == null ? void 0 : _c.url),
          page_title: pageProperties.title || ((_e2 = (_d = payload.context) == null ? void 0 : _d.page) == null ? void 0 : _e2.title),
          page_path: pageProperties.path || ((_g = (_f = payload.context) == null ? void 0 : _f.page) == null ? void 0 : _g.path),
          page_hash: pageProperties.hash || ((_i = (_h = payload.context) == null ? void 0 : _h.page) == null ? void 0 : _i.hash),
          page_search: pageProperties.search || ((_k = (_j = payload.context) == null ? void 0 : _j.page) == null ? void 0 : _k.search),
          page_referrer: (_n2 = (_m = (_l = payload == null ? void 0 : payload.context) == null ? void 0 : _l.page) == null ? void 0 : _m.referrer) != null ? _n2 : ""
        };
        if (debug) {
          console.debug("GTM plugin will set following context (page) related data layer vars", ids);
        }
        const pushedKeys = /* @__PURE__ */ new Set();
        const pushToDataLayer = (data) => {
          Object.keys(data).forEach((k4) => pushedKeys.add(k4));
          dataLayer.push(data);
          if (debug) {
            console.debug("GTM plugin will push following data to dataLayer", data);
          }
        };
        switch (payload.type) {
          case "page":
            const { properties: pageProperties2, context } = payload;
            const pageEvent = __spreadValues(__spreadValues({
              event: "page_view"
            }, pageVariables), ids);
            pushToDataLayer(pageEvent);
            break;
          case "track":
            const { properties: trackProperties } = payload;
            const trackEvent = __spreadValues(__spreadValues(__spreadValues({
              event: payload.event
            }, pageVariables), trackProperties), ids);
            pushToDataLayer(trackEvent);
            break;
          case "identify":
            const { traits: traits2 } = payload;
            const identifyEvent = __spreadValues(__spreadValues(__spreadValues({
              event: "identify"
            }, pageVariables), traits2), ids);
            pushToDataLayer(identifyEvent);
            break;
        }
        if (config.resetDataLayer !== false) {
          if (config.loadGtm === false) {
            const cleared = {};
            pushedKeys.forEach((k4) => {
              cleared[k4] = void 0;
            });
            if (Object.keys(cleared).length > 0) {
              dataLayer.push(cleared);
            }
          } else {
            dataLayer.push(function() {
              this.reset();
            });
          }
        }
      });
    }
  };
  function getGtmState() {
    return window["__jitsuGtmState"] || "fresh";
  }
  function setGtmState(s2) {
    window["__jitsuGtmState"] = s2;
  }
  function initGtmIfNeeded(config, payload) {
    return __async(this, null, function* () {
      const dlName = config.dataLayerName || "dataLayer";
      if (config.loadGtm === false) {
        window[dlName] = window[dlName] || [];
        return;
      }
      if (getGtmState() !== "fresh") {
        return;
      }
      setGtmState("loading");
      const tagId = config.containerId;
      (function(w2, l3, i4) {
        w2[l3] = w2[l3] || [];
        w2[l3].push({
          user_id: payload.userId
        });
        w2[l3].push({
          "gtm.start": (/* @__PURE__ */ new Date()).getTime(),
          event: "gtm.js"
        });
        const dl = l3 != "dataLayer" ? "&l=" + l3 : "";
        const scriptSrc = "googletagmanager.com/gtm";
        loadScript(scriptSrc, { www: true, js: true, query: "id=" + i4 + dl }).then(() => {
          setGtmState("loaded");
        }).catch((e2) => {
          console.warn(`GTM (containerId=${tagId}) init failed: ${e2.message}`, e2);
          setGtmState("failed");
        });
      })(window, dlName, tagId);
    });
  }

  // src/destination-plugins/ga4.ts
  var urlData = [
    new Uint8Array([109, 111, 99, 46, 114, 101, 103, 97, 110, 97, 109, 103, 97, 116, 101, 108, 103, 111, 111, 103]),
    new Uint8Array([103, 97, 116, 103]),
    new Uint8Array([115, 106])
  ];
  function byteArrayToString(byteArray) {
    const decoder = new TextDecoder();
    return decoder.decode(byteArray);
  }
  function buildTagUrl() {
    return urlData.map((d3) => d3.reverse()).map(byteArrayToString).join("/");
  }
  var ga4Plugin = {
    id: "ga4-tag",
    handle(config, payload) {
      return __async(this, null, function* () {
        var _a, _b;
        if (!applyFilters(payload, config)) {
          return;
        }
        yield initGa4IfNeeded(config, payload);
        const dataLayer = window[config.dataLayerName || "dataLayer"];
        const gtag = function() {
          dataLayer.push(arguments);
        };
        const ids = __spreadValues(__spreadValues({}, payload.userId ? { user_id: payload.userId, userId: payload.userId } : {}), payload.anonymousId ? { anonymousId: payload.anonymousId } : {});
        if (payload.userId) {
          gtag("set", { user_id: payload.userId });
        }
        switch (payload.type) {
          case "page":
            if (config.autoPageView) {
              console.log("autoPageView");
              break;
            }
            const { properties: pageProperties, context } = payload;
            if (pageProperties) {
              const pageEvent = __spreadValues({
                page_location: pageProperties.url,
                page_title: pageProperties.title,
                page_path: pageProperties.path,
                page_hash: pageProperties.hash,
                page_search: pageProperties.search,
                page_referrer: (_b = (_a = context == null ? void 0 : context.page) == null ? void 0 : _a.referrer) != null ? _b : ""
              }, ids);
              gtag("event", "page_view", pageEvent);
            }
            break;
          case "track":
            const { properties: trackProperties } = payload;
            const trackEvent = __spreadValues(__spreadValues({}, trackProperties), ids);
            gtag("event", payload.event, trackEvent);
            break;
          case "identify":
            const { traits } = payload;
            const identifyEvent = __spreadValues(__spreadValues({}, traits), ids);
            gtag("event", "identify", identifyEvent);
            break;
        }
      });
    }
  };
  function getGa4State() {
    return window["__jitsuGa4State"] || "fresh";
  }
  function setGa4State(s2) {
    window["__jitsuGa4State"] = s2;
  }
  function initGa4IfNeeded(config, payload) {
    return __async(this, null, function* () {
      if (getGa4State() !== "fresh") {
        return;
      }
      setGa4State("loading");
      const dlName = config.dataLayerName || "dataLayer";
      const dlParam = dlName !== "dataLayer" ? "&l=" + dlName : "";
      const tagId = config.measurementIds;
      window[dlName] = window[dlName] || [];
      const gtag = function() {
        window[dlName].push(arguments);
      };
      gtag("js", /* @__PURE__ */ new Date());
      gtag(
        // @ts-ignore
        "config",
        tagId,
        __spreadValues(__spreadValues({}, payload.userId ? { user_id: payload.userId } : {}), !config.autoPageView ? { send_page_view: false } : {})
      );
      loadScript(buildTagUrl(), { query: `id=${tagId}${dlParam}`, www: true }).then(() => {
        setGa4State("loaded");
      }).catch((e2) => {
        console.warn(`GA4 (containerId=${config.measurementIds}) init failed: ${e2.message}`, e2);
        setGa4State("failed");
      });
    });
  }

  // src/destination-plugins/clarity.ts
  var STUB_QUEUE_CAP = 1e3;
  function getClarityState() {
    return window["__jitsuClarityState"] || "fresh";
  }
  function setClarityState(s2) {
    window["__jitsuClarityState"] = s2;
  }
  function getClarityProjectId() {
    return window["__jitsuClarityProjectId"];
  }
  function setClarityProjectId(id) {
    window["__jitsuClarityProjectId"] = id;
  }
  function coerceTagValue(value) {
    if (value === null || value === void 0) {
      return void 0;
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      const arr = value.filter((v2) => v2 !== null && v2 !== void 0).map((v2) => String(v2));
      return arr.length > 0 ? arr : void 0;
    }
    return void 0;
  }
  function setTags(clarity, obj) {
    if (!obj) {
      return;
    }
    for (const [key, rawValue] of Object.entries(obj)) {
      const value = coerceTagValue(rawValue);
      if (value !== void 0) {
        clarity("set", key, value);
      }
    }
  }
  var clarityPlugin = {
    id: "clarity",
    handle(config, payload) {
      return __async(this, null, function* () {
        var _a, _b;
        if (!applyFilters(payload, config)) {
          return;
        }
        initClarityIfNeeded(config);
        if (getClarityState() === "failed") {
          return;
        }
        const clarity = window["clarity"];
        if (typeof clarity !== "function") {
          return;
        }
        const traits = __spreadValues(__spreadValues({}, payload.traits || {}), ((_a = payload.context) == null ? void 0 : _a.traits) || {});
        switch (payload.type) {
          case "identify": {
            if (payload.userId) {
              const friendlyName = traits.name || traits.email;
              clarity("identify", payload.userId, void 0, void 0, friendlyName);
            }
            setTags(clarity, traits);
            break;
          }
          case "track": {
            if (payload.event) {
              clarity("event", payload.event);
            }
            if (((_b = config.trackProperties) != null ? _b : "tags") === "tags") {
              setTags(clarity, payload.properties);
            }
            break;
          }
        }
      });
    }
  };
  function initClarityIfNeeded(config) {
    const state = getClarityState();
    if (state === "loading" || state === "loaded" || state === "failed") {
      const activeProjectId = getClarityProjectId();
      if (config.loadClarity !== false && activeProjectId && activeProjectId !== config.projectId) {
        console.warn(
          `Clarity: a destination for projectId=${activeProjectId} is already active on this page; ignoring projectId=${config.projectId}. Multiple Clarity destinations on one page are not supported.`
        );
      }
      return;
    }
    window["clarity"] = window["clarity"] || function() {
      const q3 = window["clarity"].q = window["clarity"].q || [];
      if (q3.length < STUB_QUEUE_CAP) {
        q3.push(arguments);
      }
    };
    if (config.loadClarity !== false) {
      setClarityState("loading");
      setClarityProjectId(config.projectId);
      loadScript(`clarity.ms/tag/${config.projectId}`, { www: true }).then(() => {
        setClarityState("loaded");
      }).catch((e2) => {
        console.warn(`Clarity (projectId=${config.projectId}) init failed: ${e2.message}`, e2);
        setClarityState("failed");
        window["clarity"] = function() {
        };
      });
      if (config.cookieConsent) {
        window["clarity"]("consent");
      }
    } else if (state === "fresh") {
      setClarityState("passive");
      if (config.cookieConsent) {
        window["clarity"]("consent");
      }
    }
  }

  // src/destination-plugins/hotjar.ts
  var HOTJAR_VERSION = 6;
  var STUB_QUEUE_CAP2 = 1e3;
  function getHotjarState() {
    return window["__jitsuHotjarState"] || "fresh";
  }
  function setHotjarState(s2) {
    window["__jitsuHotjarState"] = s2;
  }
  function getHotjarSiteId() {
    return window["__jitsuHotjarSiteId"];
  }
  function setHotjarSiteId(id) {
    window["__jitsuHotjarSiteId"] = id;
  }
  function sanitizeEventName(event) {
    return event.substring(0, 250).replace(/ /g, "_");
  }
  var hotjarPlugin = {
    id: "hotjar",
    handle(config, payload) {
      return __async(this, null, function* () {
        var _a, _b, _c, _d, _e2, _f;
        if (!applyFilters(payload, config)) {
          return;
        }
        initHotjarIfNeeded(config);
        if (getHotjarState() === "failed") {
          return;
        }
        const hj = window["hj"];
        if (typeof hj !== "function") {
          return;
        }
        const traits = __spreadValues(__spreadValues({}, payload.traits || {}), ((_a = payload.context) == null ? void 0 : _a.traits) || {});
        switch (payload.type) {
          case "identify": {
            hj("identify", (_b = payload.userId) != null ? _b : null, traits);
            break;
          }
          case "track": {
            if (payload.event) {
              hj("event", sanitizeEventName(payload.event));
            }
            if (config.trackProperties === "attributes" && payload.userId && payload.properties) {
              hj("identify", payload.userId, payload.properties);
            }
            break;
          }
          case "page": {
            if (config.spaPageViews) {
              const path = ((_c = payload.properties) == null ? void 0 : _c.path) || ((_d = payload.properties) == null ? void 0 : _d.url) || ((_f = (_e2 = payload.context) == null ? void 0 : _e2.page) == null ? void 0 : _f.path);
              if (path) {
                hj("stateChange", path);
              }
            }
            break;
          }
        }
      });
    }
  };
  function initHotjarIfNeeded(config) {
    const state = getHotjarState();
    if (state === "loading" || state === "loaded" || state === "failed") {
      const activeSiteId = getHotjarSiteId();
      if (config.loadHotjar !== false && activeSiteId && activeSiteId !== config.siteId) {
        console.warn(
          `Hotjar: a destination for siteId=${activeSiteId} is already active on this page; ignoring siteId=${config.siteId}. Multiple Hotjar destinations on one page are not supported.`
        );
      }
      return;
    }
    window["hj"] = window["hj"] || function() {
      const q3 = window["hj"].q = window["hj"].q || [];
      if (q3.length < STUB_QUEUE_CAP2) {
        q3.push(arguments);
      }
    };
    if (config.loadHotjar !== false) {
      setHotjarState("loading");
      setHotjarSiteId(config.siteId);
      window["_hjSettings"] = { hjid: config.siteId, hjsv: HOTJAR_VERSION };
      loadScript(`static.hotjar.com/c/hotjar-${config.siteId}.js`, { query: `sv=${HOTJAR_VERSION}` }).then(() => {
        setHotjarState("loaded");
      }).catch((e2) => {
        console.warn(`Hotjar (siteId=${config.siteId}) init failed: ${e2.message}`, e2);
        setHotjarState("failed");
        window["hj"] = function() {
        };
      });
    } else if (state === "fresh") {
      setHotjarState("passive");
    }
  }

  // src/destination-plugins/index.ts
  function satisfyFilter(filter, subject) {
    return filter === "*" || filter.toLowerCase().trim() === (subject || "").trim().toLowerCase();
  }
  function satisfyDomainFilter(filter, subject) {
    if (filter === "*") {
      return true;
    }
    subject = subject || "";
    if (filter.startsWith("*.")) {
      return subject.endsWith(filter.substring(1));
    } else {
      return filter === subject;
    }
  }
  function applyFilters(event, creds) {
    const { hosts = "*", events = "*" } = creds;
    try {
      const eventsArray = Array.isArray(events) ? events : events.split("\n");
      const hostsArray = Array.isArray(hosts) ? hosts : hosts.split("\n");
      return !!hostsArray.find((hostFilter) => {
        var _a, _b;
        return satisfyDomainFilter(hostFilter, (_b = (_a = event.context) == null ? void 0 : _a.page) == null ? void 0 : _b.host);
      }) && (!!eventsArray.find((eventFilter) => satisfyFilter(eventFilter, event.type)) || !!eventsArray.find((eventFilter) => satisfyFilter(eventFilter, event.event)));
    } catch (e2) {
      console.warn(
        `Failed to apply filters: ${e2.message}. Typeof events: ${typeof events}, typeof hosts: ${typeof hosts}. Values`,
        events,
        hosts
      );
      throw new Error(
        `Failed to apply filters: ${e2.message}. Typeof events: ${typeof events}, typeof hosts: ${typeof hosts}`
      );
    }
  }
  var internalDestinationPlugins = {
    [tagPlugin.id]: tagPlugin,
    [gtmPlugin.id]: gtmPlugin,
    [ga4Plugin.id]: ga4Plugin,
    [logrocketPlugin.id]: logrocketPlugin,
    [clarityPlugin.id]: clarityPlugin,
    [hotjarPlugin.id]: hotjarPlugin
  };

  // package.json
  var package_default = {
    name: "@jitsu/js",
    version: "2.15.0-beta.62",
    repository: {
      type: "git",
      url: "https://github.com/jitsucom/jitsu",
      directory: "libs/jitsu-js"
    },
    description: "",
    author: "Jitsu Dev Team <dev@jitsu.com>",
    main: "src/index.ts",
    types: "src/index.ts",
    files: [
      "dist",
      "compiled"
    ],
    publishConfig: {
      main: "dist/jitsu.cjs.js",
      module: "dist/jitsu.es.js",
      types: "dist/index.d.ts",
      access: "public"
    },
    license: "MIT",
    private: false,
    scripts: {
      clean: "rm -rf ./dist ./compiled",
      "test:node": "vitest run",
      "test:playwright": "playwright test ./__tests__/playwright",
      test: "pnpm run test:node",
      typecheck: "tsc --noEmit",
      build: "tsc && tsx bundle.mts",
      prepublishOnly: "pnpm run build",
      "//build-deps": "Required by turbo ^build-deps - builds dist/ for workspace packages that import this",
      "build-deps": "pnpm run build"
    },
    devDependencies: {
      "@jitsu/common-config": "workspace:*",
      tslib: "catalog:",
      "@playwright/test": "1.58.2",
      esbuild: "catalog:",
      tsx: "catalog:",
      "@segment/analytics-next": "^1.75.0",
      "@types/chalk": "^2.2.0",
      "@types/node": "catalog:",
      "@vitest/ui": "catalog:",
      chalk: "^4.1.2",
      "cookie-parser": "^1.4.7",
      ejs: "^3.1.8",
      express: "^4.21.2",
      "node-forge": "^1.3.2",
      "raw-loader": "^4.0.2",
      typescript: "catalog:",
      vitest: "catalog:",
      vite: "^6.4.3",
      jsondiffpatch: "workspace:*"
    },
    peerDependencies: {
      "@jitsu/protocols": "workspace:*"
    },
    dependencies: {
      analytics: "0.8.9"
    }
  };

  // src/version.ts
  var jitsuVersion = package_default.version !== "0.0.0" ? package_default.version : "2.0.0";
  var jitsuLibraryName = "@jitsu/js";

  // src/tlds.ts
  var publicSuffixes = "webflow.io,vercel.app,myshopify.com,ac,com.ac,edu.ac,gov.ac,net.ac,mil.ac,org.ac,ad,nom.ad,ae,co.ae,net.ae,org.ae,sch.ae,ac.ae,gov.ae,mil.ae,aero,af,gov.af,com.af,org.af,net.af,edu.af,ag,com.ag,org.ag,net.ag,co.ag,nom.ag,ai,off.ai,com.ai,net.ai,org.ai,al,com.al,edu.al,gov.al,mil.al,net.al,org.al,am,co.am,com.am,commune.am,net.am,org.am,ao,ed.ao,gv.ao,og.ao,co.ao,pb.ao,it.ao,aq,ar,bet.ar,com.ar,coop.ar,edu.ar,gob.ar,gov.ar,int.ar,mil.ar,musica.ar,mutual.ar,net.ar,org.ar,senasa.ar,tur.ar,arpa,e164.arpa,in-addr.arpa,ip6.arpa,iris.arpa,uri.arpa,urn.arpa,as,gov.as,asia,at,ac.at,co.at,gv.at,or.at,sth.ac.at,au,com.au,net.au,org.au,edu.au,gov.au,asn.au,id.au,act.au,nsw.au,nt.au,qld.au,sa.au,tas.au,vic.au,wa.au,aw,com.aw,ax,az,com.az,net.az,int.az,gov.az,org.az,edu.az,info.az,pp.az,mil.az,name.az,pro.az,biz.az,ba,com.ba,edu.ba,gov.ba,mil.ba,net.ba,org.ba,bb,biz.bb,co.bb,com.bb,edu.bb,gov.bb,info.bb,net.bb,org.bb,store.bb,tv.bb,bd,be,ac.be,bf,gov.bf,bg,a.bg,b.bg,c.bg,d.bg,e.bg,f.bg,g.bg,h.bg,i.bg,j.bg,k.bg,l.bg,m.bg,n.bg,o.bg,p.bg,q.bg,r.bg,s.bg,t.bg,u.bg,v.bg,w.bg,x.bg,y.bg,z.bg,0.bg,1.bg,2.bg,3.bg,4.bg,5.bg,6.bg,7.bg,8.bg,9.bg,bh,com.bh,edu.bh,net.bh,org.bh,gov.bh,bi,co.bi,com.bi,edu.bi,or.bi,org.bi,biz,bj,africa.bj,agro.bj,architectes.bj,assur.bj,avocats.bj,co.bj,com.bj,eco.bj,econo.bj,edu.bj,info.bj,loisirs.bj,money.bj,net.bj,org.bj,ote.bj,resto.bj,restaurant.bj,tourism.bj,univ.bj,bm,com.bm,edu.bm,gov.bm,net.bm,org.bm,bn,com.bn,edu.bn,gov.bn,net.bn,org.bn,bo,com.bo,edu.bo,gob.bo,int.bo,org.bo,net.bo,mil.bo,tv.bo,web.bo,br,9guacu.br,abc.br,adm.br,adv.br,agr.br,aju.br,am.br,anani.br,aparecida.br,app.br,arq.br,art.br,ato.br,b.br,barueri.br,belem.br,bhz.br,bib.br,bio.br,blog.br,bmd.br,boavista.br,bsb.br,campinagrande.br,campinas.br,caxias.br,cim.br,cng.br,cnt.br,com.br,contagem.br,coop.br,coz.br,cri.br,cuiaba.br,curitiba.br,def.br,des.br,det.br,dev.br,ecn.br,eco.br,edu.br,emp.br,enf.br,eng.br,esp.br,etc.br,eti.br,far.br,feira.br,flog.br,floripa.br,fm.br,fnd.br,fortal.br,fot.br,foz.br,fst.br,g12.br,geo.br,ggf.br,goiania.br,gov.br,gru.br,imb.br,ind.br,inf.br,jab.br,jampa.br,jdf.br,joinville.br,jor.br,jus.br,leg.br,lel.br,log.br,londrina.br,macapa.br,maceio.br,manaus.br,maringa.br,mat.br,med.br,mil.br,morena.br,mp.br,mus.br,natal.br,net.br,niteroi.br,nom.br,not.br,ntr.br,odo.br,ong.br,org.br,osasco.br,palmas.br,poa.br,ppg.br,pro.br,psc.br,psi.br,pvh.br,qsl.br,radio.br,rec.br,recife.br,rep.br,ribeirao.br,rio.br,riobranco.br,riopreto.br,salvador.br,sampa.br,santamaria.br,santoandre.br,saobernardo.br,saogonca.br,seg.br,sjc.br,slg.br,slz.br,sorocaba.br,srv.br,taxi.br,tc.br,tec.br,teo.br,the.br,tmp.br,trd.br,tur.br,tv.br,udi.br,vet.br,vix.br,vlog.br,wiki.br,zlg.br,bs,com.bs,net.bs,org.bs,edu.bs,gov.bs,bt,com.bt,edu.bt,gov.bt,net.bt,org.bt,bv,bw,co.bw,org.bw,by,gov.by,mil.by,com.by,of.by,bz,com.bz,net.bz,org.bz,edu.bz,gov.bz,ca,ab.ca,bc.ca,mb.ca,nb.ca,nf.ca,nl.ca,ns.ca,nt.ca,nu.ca,on.ca,pe.ca,qc.ca,sk.ca,yk.ca,gc.ca,cat,cc,cd,gov.cd,cf,cg,ch,ci,org.ci,or.ci,com.ci,co.ci,edu.ci,ed.ci,ac.ci,net.ci,go.ci,asso.ci,a\xE9roport.ci,int.ci,presse.ci,md.ci,gouv.ci,ck,cl,co.cl,gob.cl,gov.cl,mil.cl,cm,co.cm,com.cm,gov.cm,net.cm,cn,ac.cn,com.cn,edu.cn,gov.cn,net.cn,org.cn,mil.cn,co,arts.co,com.co,edu.co,firm.co,gov.co,info.co,int.co,mil.co,net.co,nom.co,org.co,rec.co,web.co,com,coop,cr,ac.cr,co.cr,ed.cr,fi.cr,go.cr,or.cr,sa.cr,cu,com.cu,edu.cu,org.cu,net.cu,gov.cu,inf.cu,cv,com.cv,edu.cv,int.cv,nome.cv,org.cv,cw,com.cw,edu.cw,net.cw,org.cw,cx,gov.cx,cy,ac.cy,biz.cy,com.cy,ekloges.cy,gov.cy,ltd.cy,mil.cy,net.cy,org.cy,press.cy,pro.cy,tm.cy,cz,de,dj,dk,dm,com.dm,net.dm,org.dm,edu.dm,gov.dm,do,art.do,com.do,edu.do,gob.do,gov.do,mil.do,net.do,org.do,sld.do,web.do,dz,art.dz,asso.dz,com.dz,edu.dz,gov.dz,org.dz,net.dz,pol.dz,soc.dz,tm.dz,ec,com.ec,info.ec,net.ec,fin.ec,k12.ec,med.ec,pro.ec,org.ec,edu.ec,gov.ec,gob.ec,mil.ec,edu,ee,edu.ee,gov.ee,riik.ee,lib.ee,med.ee,com.ee,pri.ee,aip.ee,org.ee,fie.ee,eg,com.eg,edu.eg,eun.eg,gov.eg,mil.eg,name.eg,net.eg,org.eg,sci.eg,er,es,com.es,nom.es,org.es,gob.es,edu.es,et,com.et,gov.et,org.et,edu.et,biz.et,name.et,info.et,net.et,eu,fi,aland.fi,fj,ac.fj,biz.fj,com.fj,gov.fj,info.fj,mil.fj,name.fj,net.fj,org.fj,pro.fj,fk,com.fm,edu.fm,net.fm,org.fm,fm,fo,fr,asso.fr,com.fr,gouv.fr,nom.fr,prd.fr,tm.fr,aeroport.fr,avocat.fr,avoues.fr,cci.fr,chambagri.fr,chirurgiens-dentistes.fr,experts-comptables.fr,geometre-expert.fr,greta.fr,huissier-justice.fr,medecin.fr,notaires.fr,pharmacien.fr,port.fr,veterinaire.fr,ga,gb,edu.gd,gov.gd,gd,ge,com.ge,edu.ge,gov.ge,org.ge,mil.ge,net.ge,pvt.ge,gf,gg,co.gg,net.gg,org.gg,gh,com.gh,edu.gh,gov.gh,org.gh,mil.gh,gi,com.gi,ltd.gi,gov.gi,mod.gi,edu.gi,org.gi,gl,co.gl,com.gl,edu.gl,net.gl,org.gl,gm,gn,ac.gn,com.gn,edu.gn,gov.gn,org.gn,net.gn,gov,gp,com.gp,net.gp,mobi.gp,edu.gp,org.gp,asso.gp,gq,gr,com.gr,edu.gr,net.gr,org.gr,gov.gr,gs,gt,com.gt,edu.gt,gob.gt,ind.gt,mil.gt,net.gt,org.gt,gu,com.gu,edu.gu,gov.gu,guam.gu,info.gu,net.gu,org.gu,web.gu,gw,gy,co.gy,com.gy,edu.gy,gov.gy,net.gy,org.gy,hk,com.hk,edu.hk,gov.hk,idv.hk,net.hk,org.hk,hm,hn,com.hn,edu.hn,org.hn,net.hn,mil.hn,gob.hn,hr,iz.hr,from.hr,name.hr,com.hr,ht,com.ht,shop.ht,firm.ht,info.ht,adult.ht,net.ht,pro.ht,org.ht,med.ht,art.ht,coop.ht,pol.ht,asso.ht,edu.ht,rel.ht,gouv.ht,perso.ht,hu,co.hu,info.hu,org.hu,priv.hu,sport.hu,tm.hu,2000.hu,agrar.hu,bolt.hu,casino.hu,city.hu,erotica.hu,erotika.hu,film.hu,forum.hu,games.hu,hotel.hu,ingatlan.hu,jogasz.hu,konyvelo.hu,lakas.hu,media.hu,news.hu,reklam.hu,sex.hu,shop.hu,suli.hu,szex.hu,tozsde.hu,utazas.hu,video.hu,id,ac.id,biz.id,co.id,desa.id,go.id,mil.id,my.id,net.id,or.id,ponpes.id,sch.id,web.id,ie,gov.ie,il,ac.il,co.il,gov.il,idf.il,k12.il,muni.il,net.il,org.il,im,ac.im,co.im,com.im,ltd.co.im,net.im,org.im,plc.co.im,tt.im,tv.im,in,5g.in,6g.in,ac.in,ai.in,am.in,bihar.in,biz.in,business.in,ca.in,cn.in,co.in,com.in,coop.in,cs.in,delhi.in,dr.in,edu.in,er.in,firm.in,gen.in,gov.in,gujarat.in,ind.in,info.in,int.in,internet.in,io.in,me.in,mil.in,net.in,nic.in,org.in,pg.in,post.in,pro.in,res.in,travel.in,tv.in,uk.in,up.in,us.in,info,int,eu.int,io,com.io,iq,gov.iq,edu.iq,mil.iq,com.iq,org.iq,net.iq,ir,ac.ir,co.ir,gov.ir,id.ir,net.ir,org.ir,sch.ir,is,net.is,com.is,edu.is,gov.is,org.is,int.is,it,gov.it,edu.it,je,co.je,net.je,org.je,jm,jo,com.jo,org.jo,net.jo,edu.jo,sch.jo,gov.jo,mil.jo,name.jo,jobs,jp,ac.jp,ad.jp,co.jp,ed.jp,go.jp,gr.jp,lg.jp,ne.jp,or.jp,ke,ac.ke,co.ke,go.ke,info.ke,me.ke,mobi.ke,ne.ke,or.ke,sc.ke,kg,org.kg,net.kg,com.kg,edu.kg,gov.kg,mil.kg,kh,ki,edu.ki,biz.ki,net.ki,org.ki,gov.ki,info.ki,com.ki,km,org.km,nom.km,gov.km,prd.km,tm.km,edu.km,mil.km,ass.km,com.km,kn,net.kn,org.kn,edu.kn,gov.kn,kp,com.kp,edu.kp,gov.kp,org.kp,rep.kp,tra.kp,kr,ac.kr,co.kr,es.kr,go.kr,hs.kr,kg.kr,mil.kr,ms.kr,ne.kr,or.kr,pe.kr,re.kr,sc.kr,kw,com.kw,edu.kw,emb.kw,gov.kw,ind.kw,net.kw,org.kw,ky,com.ky,edu.ky,net.ky,org.ky,kz,org.kz,edu.kz,net.kz,gov.kz,mil.kz,com.kz,la,int.la,net.la,info.la,edu.la,gov.la,per.la,com.la,org.la,lb,com.lb,edu.lb,gov.lb,net.lb,org.lb,lc,com.lc,net.lc,co.lc,org.lc,edu.lc,gov.lc,li,lk,gov.lk,sch.lk,net.lk,int.lk,com.lk,org.lk,edu.lk,ngo.lk,soc.lk,web.lk,ltd.lk,assn.lk,grp.lk,hotel.lk,ac.lk,lr,com.lr,edu.lr,gov.lr,org.lr,net.lr,ls,ac.ls,biz.ls,co.ls,edu.ls,gov.ls,info.ls,net.ls,org.ls,sc.ls,lt,gov.lt,lu,lv,com.lv,edu.lv,gov.lv,org.lv,mil.lv,id.lv,net.lv,asn.lv,conf.lv,ly,com.ly,net.ly,gov.ly,plc.ly,edu.ly,sch.ly,med.ly,org.ly,id.ly,ma,co.ma,net.ma,gov.ma,org.ma,ac.ma,press.ma,mc,tm.mc,asso.mc,md,me,co.me,net.me,org.me,edu.me,ac.me,gov.me,its.me,priv.me,mg,org.mg,nom.mg,gov.mg,prd.mg,tm.mg,edu.mg,mil.mg,com.mg,co.mg,mh,mil,mk,com.mk,org.mk,net.mk,edu.mk,gov.mk,inf.mk,name.mk,ml,com.ml,edu.ml,gouv.ml,gov.ml,net.ml,org.ml,presse.ml,mm,mn,gov.mn,edu.mn,org.mn,mo,com.mo,net.mo,org.mo,edu.mo,gov.mo,mobi,mp,mq,mr,gov.mr,ms,com.ms,edu.ms,gov.ms,net.ms,org.ms,mt,com.mt,edu.mt,net.mt,org.mt,mu,com.mu,net.mu,org.mu,gov.mu,ac.mu,co.mu,or.mu,museum,mv,aero.mv,biz.mv,com.mv,coop.mv,edu.mv,gov.mv,info.mv,int.mv,mil.mv,museum.mv,name.mv,net.mv,org.mv,pro.mv,mw,ac.mw,biz.mw,co.mw,com.mw,coop.mw,edu.mw,gov.mw,int.mw,museum.mw,net.mw,org.mw,mx,com.mx,org.mx,gob.mx,edu.mx,net.mx,my,biz.my,com.my,edu.my,gov.my,mil.my,name.my,net.my,org.my,mz,ac.mz,adv.mz,co.mz,edu.mz,gov.mz,mil.mz,net.mz,org.mz,na,info.na,pro.na,name.na,school.na,or.na,dr.na,us.na,mx.na,ca.na,in.na,cc.na,tv.na,ws.na,mobi.na,co.na,com.na,org.na,name,nc,asso.nc,nom.nc,ne,net,nf,com.nf,net.nf,per.nf,rec.nf,web.nf,arts.nf,firm.nf,info.nf,other.nf,store.nf,ng,com.ng,edu.ng,gov.ng,i.ng,mil.ng,mobi.ng,name.ng,net.ng,org.ng,sch.ng,ni,ac.ni,biz.ni,co.ni,com.ni,edu.ni,gob.ni,in.ni,info.ni,int.ni,mil.ni,net.ni,nom.ni,org.ni,web.ni,nl,no,fhs.no,vgs.no,fylkesbibl.no,folkebibl.no,museum.no,idrett.no,priv.no,mil.no,stat.no,dep.no,kommune.no,herad.no,np,nr,biz.nr,info.nr,gov.nr,edu.nr,org.nr,net.nr,com.nr,nu,nz,ac.nz,co.nz,cri.nz,geek.nz,gen.nz,govt.nz,health.nz,iwi.nz,kiwi.nz,maori.nz,mil.nz,m\u0101ori.nz,net.nz,org.nz,parliament.nz,school.nz,om,co.om,com.om,edu.om,gov.om,med.om,museum.om,net.om,org.om,pro.om,onion,org,pa,ac.pa,gob.pa,com.pa,org.pa,sld.pa,edu.pa,net.pa,ing.pa,abo.pa,med.pa,nom.pa,pe,edu.pe,gob.pe,nom.pe,mil.pe,org.pe,com.pe,net.pe,pf,com.pf,org.pf,edu.pf,pg,ph,com.ph,net.ph,org.ph,gov.ph,edu.ph,ngo.ph,mil.ph,i.ph,pk,com.pk,net.pk,edu.pk,org.pk,fam.pk,biz.pk,web.pk,gov.pk,gob.pk,gok.pk,gon.pk,gop.pk,gos.pk,info.pk,pl,com.pl,net.pl,org.pl,aid.pl,agro.pl,atm.pl,auto.pl,biz.pl,edu.pl,gmina.pl,gsm.pl,info.pl,mail.pl,miasta.pl,media.pl,mil.pl,nieruchomosci.pl,nom.pl,pc.pl,powiat.pl,priv.pl,realestate.pl,rel.pl,sex.pl,shop.pl,sklep.pl,sos.pl,szkola.pl,targi.pl,tm.pl,tourism.pl,travel.pl,turystyka.pl,pm,pn,gov.pn,co.pn,org.pn,edu.pn,net.pn,post,pr,com.pr,net.pr,org.pr,gov.pr,edu.pr,isla.pr,pro.pr,biz.pr,info.pr,name.pr,est.pr,prof.pr,ac.pr,pro,aaa.pro,aca.pro,acct.pro,avocat.pro,bar.pro,cpa.pro,eng.pro,jur.pro,law.pro,med.pro,recht.pro,ps,edu.ps,gov.ps,sec.ps,plo.ps,com.ps,org.ps,net.ps,pt,net.pt,gov.pt,org.pt,edu.pt,int.pt,publ.pt,com.pt,nome.pt,pw,co.pw,ne.pw,or.pw,ed.pw,go.pw,belau.pw,py,com.py,coop.py,edu.py,gov.py,mil.py,net.py,org.py,qa,com.qa,edu.qa,gov.qa,mil.qa,name.qa,net.qa,org.qa,sch.qa,re,asso.re,com.re,nom.re,ro,arts.ro,com.ro,firm.ro,info.ro,nom.ro,nt.ro,org.ro,rec.ro,store.ro,tm.ro,www.ro,rs,ac.rs,co.rs,edu.rs,gov.rs,in.rs,org.rs,ru,rw,ac.rw,co.rw,coop.rw,gov.rw,mil.rw,net.rw,org.rw,sa,com.sa,net.sa,org.sa,gov.sa,med.sa,pub.sa,edu.sa,sch.sa,sb,com.sb,edu.sb,gov.sb,net.sb,org.sb,sc,com.sc,gov.sc,net.sc,org.sc,edu.sc,sd,com.sd,net.sd,org.sd,edu.sd,med.sd,tv.sd,gov.sd,info.sd,se,a.se,ac.se,b.se,bd.se,brand.se,c.se,d.se,e.se,f.se,fh.se,fhsk.se,fhv.se,g.se,h.se,i.se,k.se,komforb.se,kommunalforbund.se,komvux.se,l.se,lanbib.se,m.se,n.se,naturbruksgymn.se,o.se,org.se,p.se,parti.se,pp.se,press.se,r.se,s.se,t.se,tm.se,u.se,w.se,x.se,y.se,z.se,sg,com.sg,net.sg,org.sg,gov.sg,edu.sg,per.sg,sh,com.sh,net.sh,gov.sh,org.sh,mil.sh,si,sj,sk,sl,com.sl,net.sl,edu.sl,gov.sl,org.sl,sm,sn,art.sn,com.sn,edu.sn,gouv.sn,org.sn,perso.sn,univ.sn,so,com.so,edu.so,gov.so,me.so,net.so,org.so,sr,ss,biz.ss,com.ss,edu.ss,gov.ss,me.ss,net.ss,org.ss,sch.ss,st,co.st,com.st,consulado.st,edu.st,embaixada.st,mil.st,net.st,org.st,principe.st,saotome.st,store.st,su,sv,com.sv,edu.sv,gob.sv,org.sv,red.sv,sx,gov.sx,sy,edu.sy,gov.sy,net.sy,mil.sy,com.sy,org.sy,sz,co.sz,ac.sz,org.sz,tc,td,tel,tf,tg,th,ac.th,co.th,go.th,in.th,mi.th,net.th,or.th,tj,ac.tj,biz.tj,co.tj,com.tj,edu.tj,go.tj,gov.tj,int.tj,mil.tj,name.tj,net.tj,nic.tj,org.tj,test.tj,web.tj,tk,tl,gov.tl,tm,com.tm,co.tm,org.tm,net.tm,nom.tm,gov.tm,mil.tm,edu.tm,tn,com.tn,ens.tn,fin.tn,gov.tn,ind.tn,info.tn,intl.tn,mincom.tn,nat.tn,net.tn,org.tn,perso.tn,tourism.tn,to,com.to,gov.to,net.to,org.to,edu.to,mil.to,tr,av.tr,bbs.tr,bel.tr,biz.tr,com.tr,dr.tr,edu.tr,gen.tr,gov.tr,info.tr,mil.tr,k12.tr,kep.tr,name.tr,net.tr,org.tr,pol.tr,tel.tr,tsk.tr,tv.tr,web.tr,nc.tr,tt,co.tt,com.tt,org.tt,net.tt,biz.tt,info.tt,pro.tt,int.tt,coop.tt,jobs.tt,mobi.tt,travel.tt,museum.tt,aero.tt,name.tt,gov.tt,edu.tt,tv,tw,edu.tw,gov.tw,mil.tw,com.tw,net.tw,org.tw,idv.tw,game.tw,ebiz.tw,club.tw,tz,ac.tz,co.tz,go.tz,hotel.tz,info.tz,me.tz,mil.tz,mobi.tz,ne.tz,or.tz,sc.tz,tv.tz,ua,com.ua,edu.ua,gov.ua,in.ua,net.ua,org.ua,ug,co.ug,or.ug,ac.ug,sc.ug,go.ug,ne.ug,com.ug,org.ug,uk,ac.uk,co.uk,gov.uk,ltd.uk,me.uk,net.uk,nhs.uk,org.uk,plc.uk,police.uk,us,dni.us,fed.us,isa.us,kids.us,nsn.us,ak.us,al.us,ar.us,as.us,az.us,ca.us,co.us,ct.us,dc.us,de.us,fl.us,ga.us,gu.us,hi.us,ia.us,id.us,il.us,in.us,ks.us,ky.us,la.us,ma.us,md.us,me.us,mi.us,mn.us,mo.us,ms.us,mt.us,nc.us,nd.us,ne.us,nh.us,nj.us,nm.us,nv.us,ny.us,oh.us,ok.us,or.us,pa.us,pr.us,ri.us,sc.us,sd.us,tn.us,tx.us,ut.us,vi.us,vt.us,va.us,wa.us,wi.us,wv.us,wy.us,uy,com.uy,edu.uy,gub.uy,mil.uy,net.uy,org.uy,uz,co.uz,com.uz,net.uz,org.uz,va,vc,com.vc,net.vc,org.vc,gov.vc,mil.vc,edu.vc,ve,arts.ve,bib.ve,co.ve,com.ve,e12.ve,edu.ve,firm.ve,gob.ve,gov.ve,info.ve,int.ve,mil.ve,net.ve,nom.ve,org.ve,rar.ve,rec.ve,store.ve,tec.ve,web.ve,vg,vi,co.vi,com.vi,k12.vi,net.vi,org.vi,vn,ac.vn,ai.vn,biz.vn,com.vn,edu.vn,gov.vn,health.vn,id.vn,info.vn,int.vn,io.vn,name.vn,net.vn,org.vn,pro.vn,vu,com.vu,edu.vu,net.vu,org.vu,wf,ws,com.ws,net.ws,org.ws,gov.ws,edu.ws,yt,ye,com.ye,edu.ye,gov.ye,net.ye,mil.ye,org.ye,ac.za,agric.za,alt.za,co.za,edu.za,gov.za,grondar.za,law.za,mil.za,net.za,ngo.za,nic.za,nis.za,nom.za,org.za,school.za,tm.za,web.za,zm,ac.zm,biz.zm,co.zm,com.zm,edu.zm,gov.zm,info.zm,mil.zm,net.zm,org.zm,sch.zm,zw,ac.zw,co.zw,gov.zw,mil.zw,org.zw".split(
    ","
  );
  var _publicSuffixesMap = {};
  publicSuffixes.forEach((tld) => {
    _publicSuffixesMap[tld] = true;
  });
  var publicSuffixesMap = _publicSuffixesMap;
  function getTopLevelDomain(hostname) {
    const [domain] = hostname.split(":");
    const parts = domain.split(".");
    if (parts[parts.length - 1] === "localhost" || parts.length < 2) {
      return parts[parts.length - 1];
    } else {
      const d3 = parts[parts.length - 2] + "." + parts[parts.length - 1];
      if (parts.length > 2 && publicSuffixesMap[d3]) {
        return parts[parts.length - 3] + "." + d3;
      } else {
        return d3;
      }
    }
  }

  // ../jsondiffpatch/dist/processor.js
  var Processor = class {
    constructor(options) {
      this.selfOptions = options || {};
      this.pipes = {};
    }
    options(options) {
      if (options) {
        this.selfOptions = options;
      }
      return this.selfOptions;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipe(name, pipeArg) {
      let pipe = pipeArg;
      if (typeof name === "string") {
        if (typeof pipe === "undefined") {
          return this.pipes[name];
        } else {
          this.pipes[name] = pipe;
        }
      }
      if (name && name.name) {
        pipe = name;
        if (pipe.processor === this) {
          return pipe;
        }
        this.pipes[pipe.name] = pipe;
      }
      pipe.processor = this;
      return pipe;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process(input, pipe) {
      let context = input;
      context.options = this.options();
      let nextPipe = pipe || input.pipe || "default";
      let lastPipe;
      while (nextPipe) {
        if (typeof context.nextAfterChildren !== "undefined") {
          context.next = context.nextAfterChildren;
          context.nextAfterChildren = null;
        }
        if (typeof nextPipe === "string") {
          nextPipe = this.pipe(nextPipe);
        }
        nextPipe.process(context);
        lastPipe = nextPipe;
        nextPipe = null;
        if (context) {
          if (context.next) {
            context = context.next;
            nextPipe = context.pipe || lastPipe;
          }
        }
      }
      return context.hasResult ? context.result : void 0;
    }
  };
  var processor_default = Processor;

  // ../jsondiffpatch/dist/pipe.js
  var Pipe = class {
    constructor(name) {
      this.name = name;
      this.filters = [];
    }
    process(input) {
      if (!this.processor) {
        throw new Error("add this pipe to a processor before using it");
      }
      const debug = this.debug;
      const length = this.filters.length;
      const context = input;
      for (let index = 0; index < length; index++) {
        const filter = this.filters[index];
        if (debug) {
          this.log(`filter: ${filter.filterName}`);
        }
        filter(context);
        if (typeof context === "object" && context.exiting) {
          context.exiting = false;
          break;
        }
      }
      if (!context.next && this.resultCheck) {
        this.resultCheck(context);
      }
    }
    log(msg) {
      console.log(`[jsondiffpatch] ${this.name} pipe, ${msg}`);
    }
    append(...args) {
      this.filters.push(...args);
      return this;
    }
    prepend(...args) {
      this.filters.unshift(...args);
      return this;
    }
    indexOf(filterName) {
      if (!filterName) {
        throw new Error("a filter name is required");
      }
      for (let index = 0; index < this.filters.length; index++) {
        const filter = this.filters[index];
        if (filter.filterName === filterName) {
          return index;
        }
      }
      throw new Error(`filter not found: ${filterName}`);
    }
    list() {
      return this.filters.map((f2) => f2.filterName);
    }
    after(filterName, ...params) {
      const index = this.indexOf(filterName);
      this.filters.splice(index + 1, 0, ...params);
      return this;
    }
    before(filterName, ...params) {
      const index = this.indexOf(filterName);
      this.filters.splice(index, 0, ...params);
      return this;
    }
    replace(filterName, ...params) {
      const index = this.indexOf(filterName);
      this.filters.splice(index, 1, ...params);
      return this;
    }
    remove(filterName) {
      const index = this.indexOf(filterName);
      this.filters.splice(index, 1);
      return this;
    }
    clear() {
      this.filters.length = 0;
      return this;
    }
    shouldHaveResult(should) {
      if (should === false) {
        this.resultCheck = null;
        return;
      }
      if (this.resultCheck) {
        return;
      }
      this.resultCheck = (context) => {
        if (!context.hasResult) {
          console.log(context);
          const error = new Error(`${this.name} failed`);
          error.noResult = true;
          throw error;
        }
      };
      return this;
    }
  };
  var pipe_default = Pipe;

  // ../jsondiffpatch/dist/contexts/context.js
  var Context = class {
    setResult(result) {
      this.result = result;
      this.hasResult = true;
      return this;
    }
    exit() {
      this.exiting = true;
      return this;
    }
    push(child, name) {
      child.parent = this;
      if (typeof name !== "undefined") {
        child.childName = name;
      }
      child.root = this.root || this;
      child.options = child.options || this.options;
      if (!this.children) {
        this.children = [child];
        this.nextAfterChildren = this.next || null;
        this.next = child;
      } else {
        this.children[this.children.length - 1].next = child;
        this.children.push(child);
      }
      child.next = this;
      return this;
    }
  };

  // ../jsondiffpatch/dist/contexts/diff.js
  var DiffContext = class extends Context {
    constructor(left, right) {
      super();
      this.left = left;
      this.right = right;
      this.pipe = "diff";
    }
    setResult(result) {
      return super.setResult(result);
    }
  };
  var diff_default = DiffContext;

  // ../jsondiffpatch/dist/contexts/patch.js
  var PatchContext = class extends Context {
    constructor(left, delta) {
      super();
      this.left = left;
      this.delta = delta;
      this.pipe = "patch";
    }
  };
  var patch_default = PatchContext;

  // ../jsondiffpatch/dist/filters/trivial.js
  function arrayEquals(a5, b5) {
    if (a5.length !== b5.length) {
      return false;
    }
    for (let i4 = 0; i4 < a5.length; i4++) {
      if (a5[i4] !== b5[i4]) {
        return false;
      }
    }
    return true;
  }
  var diffFilter = function trivialMatchesDiffFilter(context) {
    if (context.left === context.right) {
      context.setResult(void 0).exit();
      return;
    }
    if (typeof context.left === "undefined") {
      if (typeof context.right === "function") {
        throw new Error("functions are not supported");
      }
      context.setResult([context.right]).exit();
      return;
    }
    if (typeof context.right === "undefined") {
      context.setResult([context.left, 0, 0]).exit();
      return;
    }
    if (typeof context.left === "function" || typeof context.right === "function") {
      throw new Error("functions are not supported");
    }
    context.leftType = context.left === null ? "null" : typeof context.left;
    context.rightType = context.right === null ? "null" : typeof context.right;
    if (context.leftType !== context.rightType) {
      context.setResult([context.left, context.right]).exit();
      return;
    }
    if (context.leftType === "boolean" || context.leftType === "number" || context.leftType === "string") {
      context.setResult([context.left, context.right]).exit();
      return;
    }
    if (context.leftType === "object") {
      context.leftIsArray = Array.isArray(context.left);
    }
    if (context.rightType === "object") {
      context.rightIsArray = Array.isArray(context.right);
    }
    if (context.leftIsArray !== context.rightIsArray) {
      context.setResult([context.left, context.right]).exit();
      return;
    }
    if (context.leftIsArray && context.rightIsArray) {
      if (arrayEquals(context.left, context.right)) {
        context.setResult(void 0).exit();
        return;
      } else {
        context.setResult([context.left, context.right]).exit();
        return;
      }
    }
    if (context.left instanceof RegExp) {
      if (context.right instanceof RegExp) {
        context.setResult([context.left.toString(), context.right.toString()]).exit();
      } else {
        context.setResult([context.left, context.right]).exit();
      }
    }
  };
  diffFilter.filterName = "trivial";
  var patchFilter = function trivialMatchesPatchFilter(context) {
    if (typeof context.delta === "undefined") {
      context.setResult(context.left).exit();
      return;
    }
    context.nested = !Array.isArray(context.delta);
    if (context.nested) {
      return;
    }
    const nonNestedDelta = context.delta;
    if (nonNestedDelta.length === 1) {
      context.setResult(nonNestedDelta[0]).exit();
      return;
    }
    if (nonNestedDelta.length === 2) {
      if (context.left instanceof RegExp) {
        const regexArgs = /^\/(.*)\/([gimyu]+)$/.exec(nonNestedDelta[1]);
        if (regexArgs) {
          context.setResult(new RegExp(regexArgs[1], regexArgs[2])).exit();
          return;
        }
      }
      context.setResult(nonNestedDelta[1]).exit();
      return;
    }
    if (nonNestedDelta.length === 3 && nonNestedDelta[2] === 0) {
      context.setResult(void 0).exit();
    }
  };
  patchFilter.filterName = "trivial";

  // ../jsondiffpatch/dist/filters/nested.js
  var collectChildrenDiffFilter = (context) => {
    if (!context || !context.children) {
      return;
    }
    const length = context.children.length;
    let child;
    let result = context.result;
    for (let index = 0; index < length; index++) {
      child = context.children[index];
      if (typeof child.result === "undefined") {
        continue;
      }
      result = result || {};
      result[child.childName] = child.result;
    }
    if (result && context.leftIsArray) {
      result._t = "a";
    }
    context.setResult(result).exit();
  };
  collectChildrenDiffFilter.filterName = "collectChildren";
  var objectsDiffFilter = (context) => {
    if (context.leftIsArray || context.leftType !== "object") {
      return;
    }
    const left = context.left;
    const right = context.right;
    let name;
    let child;
    const propertyFilter = context.options.propertyFilter;
    for (name in left) {
      if (!Object.prototype.hasOwnProperty.call(left, name)) {
        continue;
      }
      if (propertyFilter && !propertyFilter(name, context)) {
        continue;
      }
      child = new diff_default(left[name], right[name]);
      context.push(child, name);
    }
    for (name in right) {
      if (!Object.prototype.hasOwnProperty.call(right, name)) {
        continue;
      }
      if (propertyFilter && !propertyFilter(name, context)) {
        continue;
      }
      if (typeof left[name] === "undefined") {
        child = new diff_default(void 0, right[name]);
        context.push(child, name);
      }
    }
    if (!context.children || context.children.length === 0) {
      context.setResult(void 0).exit();
      return;
    }
    context.exit();
  };
  objectsDiffFilter.filterName = "objects";
  var patchFilter2 = function nestedPatchFilter(context) {
    if (!context.nested) {
      return;
    }
    const nestedDelta = context.delta;
    if (nestedDelta._t) {
      return;
    }
    const objectDelta = nestedDelta;
    let name;
    let child;
    for (name in objectDelta) {
      child = new patch_default(context.left[name], objectDelta[name]);
      context.push(child, name);
    }
    context.exit();
  };
  patchFilter2.filterName = "objects";
  var collectChildrenPatchFilter = function collectChildrenPatchFilter2(context) {
    if (!context || !context.children) {
      return;
    }
    const deltaWithChildren = context.delta;
    if (deltaWithChildren._t) {
      return;
    }
    const object = context.left;
    const length = context.children.length;
    let child;
    for (let index = 0; index < length; index++) {
      child = context.children[index];
      const property = child.childName;
      if (Object.prototype.hasOwnProperty.call(context.left, property) && child.result === void 0) {
        delete object[property];
      } else if (object[property] !== child.result) {
        object[property] = child.result;
      }
    }
    context.setResult(object).exit();
  };
  collectChildrenPatchFilter.filterName = "collectChildren";

  // ../jsondiffpatch/dist/filters/dates.js
  var diffFilter2 = function datesDiffFilter(context) {
    if (context.left instanceof Date) {
      if (context.right instanceof Date) {
        if (context.left.getTime() !== context.right.getTime()) {
          context.setResult([context.left, context.right]);
        } else {
          context.setResult(void 0);
        }
      } else {
        context.setResult([context.left, context.right]);
      }
      context.exit();
    } else if (context.right instanceof Date) {
      context.setResult([context.left, context.right]).exit();
    }
  };
  diffFilter2.filterName = "dates";

  // ../jsondiffpatch/dist/diffpatcher.js
  var DiffPatcher = class {
    constructor(options) {
      this.processor = new processor_default(options);
      this.processor.pipe(new pipe_default("diff").append(collectChildrenDiffFilter, diffFilter, diffFilter2, objectsDiffFilter).shouldHaveResult());
      this.processor.pipe(new pipe_default("patch").append(collectChildrenPatchFilter, patchFilter, patchFilter2).shouldHaveResult());
    }
    options(options) {
      return this.processor.options(options);
    }
    diff(left, right) {
      return this.processor.process(new diff_default(left, right));
    }
    patch(left, delta) {
      return this.processor.process(new patch_default(left, delta));
    }
  };
  var diffpatcher_default = DiffPatcher;

  // ../jsondiffpatch/dist/index.js
  function create(options) {
    return new diffpatcher_default(options);
  }

  // src/analytics-plugin.ts
  var diff = create();
  var defaultConfig = {
    /* Your segment writeKey */
    writeKey: void 0,
    /* Disable anonymous MTU */
    host: void 0,
    debug: false,
    fetch: void 0,
    echoEvents: false,
    cookieDomain: void 0,
    cookieNames: {},
    cookieCapture: {},
    runtime: void 0,
    fetchTimeoutMs: void 0,
    s2s: void 0,
    idEndpoint: void 0,
    errorPolicy: "log",
    defaultPayloadContext: {},
    privacy: {
      dontSend: false,
      disableUserIds: false,
      ipPolicy: "keep",
      consentCategories: {}
    }
  };
  var mergeConfig = (current, newConfig) => {
    for (const key of Object.keys(defaultConfig)) {
      const value = newConfig[key];
      if (key === "privacy") {
        if (typeof value === "object") {
          current.privacy = __spreadValues(__spreadValues(__spreadProps(__spreadValues({}, defaultConfig.privacy), {
            consentCategories: __spreadValues({}, defaultConfig.privacy.consentCategories)
          }), current.privacy), value);
        } else if (typeof value === "undefined") {
          if (newConfig.hasOwnProperty("privacy") || !current.hasOwnProperty("privacy")) {
            current.privacy = __spreadProps(__spreadValues({}, defaultConfig.privacy), {
              consentCategories: __spreadValues({}, defaultConfig.privacy.consentCategories)
            });
          }
        }
      } else if (typeof value === "undefined") {
        if (newConfig.hasOwnProperty(key) || !current.hasOwnProperty(key)) {
          current[key] = defaultConfig[key];
        }
      } else {
        current[key] = value;
      }
    }
  };
  var parseQuery = (qs) => {
    if (!qs) {
      return {};
    }
    let queryString = qs.length > 0 && qs.charAt(0) === "?" ? qs.substring(1) : qs;
    let query = {};
    let pairs = (queryString[0] === "?" ? queryString.substr(1) : queryString).split("&");
    for (let i4 = 0; i4 < pairs.length; i4++) {
      let pair = pairs[i4].split("=");
      query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
    }
    return query;
  };
  function utmToKey(key) {
    const name = key.substring("utm_".length);
    return name === "campaign" ? "name" : name;
  }
  function parseUtms(query) {
    return Object.entries(query).filter(([key]) => key.indexOf("utm_") === 0).reduce(
      (acc, [key, value]) => __spreadProps(__spreadValues({}, acc), {
        [utmToKey(key)]: value
      }),
      {}
    );
  }
  function safeCall(f2, defaultVal) {
    try {
      return f2();
    } catch (e2) {
      return defaultVal;
    }
  }
  function restoreTraits(storage) {
    let val = storage.getItem("__user_traits");
    if (typeof val === "string") {
      val = safeCall(() => JSON.parse(val), {});
    }
    if (typeof val !== "object" || val === null || Array.isArray(val)) {
      val = {};
    }
    let groupVal = storage.getItem("__group_traits");
    if (typeof groupVal === "string") {
      groupVal = safeCall(() => JSON.parse(groupVal), {});
    }
    if (typeof groupVal !== "object" || groupVal === null || Array.isArray(groupVal)) {
      groupVal = {};
    }
    return __spreadValues(__spreadValues({}, groupVal || {}), val || {});
  }
  function getCookie(name) {
    var _a;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? (_a = parts.pop()) == null ? void 0 : _a.split(";").shift() : void 0;
  }
  var googleClickIdCookies = {
    gclid: "_gcl_aw",
    dclid: "_gcl_dc"
  };
  function parseGclCookie(cookieValue) {
    if (typeof cookieValue !== "string" || !cookieValue) {
      return void 0;
    }
    const parts = cookieValue.split(".");
    return parts.length >= 3 ? parts.slice(2).join(".") : void 0;
  }
  function getGoogleClickIds(runtime, query) {
    const clickIds = {};
    for (const name of ["gclid", "gbraid", "wbraid", "dclid"]) {
      if (query[name]) {
        clickIds[name] = query[name];
      }
    }
    for (const [key, cookieName] of Object.entries(googleClickIdCookies)) {
      if (!clickIds[key]) {
        const fromCookie = parseGclCookie(runtime.getCookie(cookieName));
        if (fromCookie) {
          clickIds[key] = fromCookie;
        }
      }
    }
    return clickIds;
  }
  function getClientIds(runtime, customCookieCapture, query) {
    const cookieCapture = __spreadValues({
      fbc: "_fbc",
      fbp: "_fbp"
    }, customCookieCapture);
    const clientIds = Object.entries(cookieCapture).reduce((acc, [key, cookieName]) => {
      acc[key] = runtime.getCookie(cookieName);
      return acc;
    }, {});
    return __spreadValues(__spreadValues(__spreadValues({}, clientIds), getGoogleClickIds(runtime, query)), getGa4Ids(runtime));
  }
  function parseGa4SessionId(cookieValue) {
    if (typeof cookieValue !== "string") {
      return void 0;
    }
    if (cookieValue.startsWith("GA1") || cookieValue.startsWith("GS1")) {
      return cookieValue.split(".")[2];
    } else {
      const match = cookieValue.match(/^GS\d+\.\d+\.(?:[\w_-]+[$])*s(\d+)(?:$|[$])/);
      return match ? match[1] : void 0;
    }
  }
  function getGa4Ids(runtime) {
    var _a;
    const allCookies = runtime.getCookies();
    const clientId = (_a = allCookies["_ga"]) == null ? void 0 : _a.split(".").slice(-2).join(".");
    const gaSessionCookies = Object.entries(allCookies).filter(([key]) => key.startsWith("_ga_"));
    const sessionIds = gaSessionCookies.length > 0 ? Object.fromEntries(
      gaSessionCookies.map(([key, value]) => {
        const sessionId = parseGa4SessionId(value);
        if (!sessionId) {
          return null;
        }
        return [key.substring("_ga_".length), sessionId];
      }).filter((v2) => v2 !== null)
    ) : void 0;
    if (clientId || sessionIds) {
      return { ga4: { clientId, sessionIds } };
    } else {
      return void 0;
    }
  }
  function removeCookie(name, { domain, secure }) {
    document.cookie = name + "=;domain=" + domain + ";path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;SameSite=" + (secure ? "None" : "Lax") + (secure ? ";secure" : "");
  }
  function setCookie(name, val, { domain, secure }) {
    document.cookie = name + "=" + val + ";domain=" + domain + ";path=/;expires=" + new Date((/* @__PURE__ */ new Date()).getTime() + 1e3 * 60 * 60 * 24 * 365 * 5).toUTCString() + ";SameSite=" + (secure ? "None" : "Lax") + (secure ? ";secure" : "");
  }
  var defaultCookie2Key = {
    __anon_id: "__eventn_id",
    __user_id: "__eventn_uid",
    __user_traits: "__eventn_id_usr",
    __group_id: "__group_id",
    __group_traits: "__group_traits"
  };
  var cookieStorage = (cookieDomain, key2cookie) => {
    return {
      setItem(key, val) {
        const cookieName = key2cookie(key) || key;
        if (typeof val === "undefined") {
          removeCookie(cookieName, {
            domain: cookieDomain,
            secure: window.location.protocol === "https:"
          });
          return;
        }
        const strVal = typeof val === "object" && val !== null ? encodeURIComponent(JSON.stringify(val)) : val;
        setCookie(cookieName, strVal, {
          domain: cookieDomain,
          secure: window.location.protocol === "https:"
        });
      },
      getItem(key) {
        const cookieName = key2cookie(key) || key;
        const result = getCookie(cookieName);
        if (key === "__anon_id") {
          return result;
        }
        if (typeof result === "undefined" && key === "__user_id") {
          const traits = parse(getCookie(key2cookie("__user_traits") || "__eventn_id_usr")) || {};
          return traits.internal_id || traits.user_id || traits.id || traits.userId;
        }
        return parse(result);
      },
      removeItem(key) {
        removeCookie(key2cookie(key) || key, {
          domain: cookieDomain,
          secure: window.location.protocol === "https:"
        });
      },
      reset() {
        for (const key of Object.keys(defaultCookie2Key)) {
          removeCookie(key2cookie(key) || key, {
            domain: cookieDomain,
            secure: window.location.protocol === "https:"
          });
        }
      }
    };
  };
  function windowRuntime(opts) {
    const key2Cookie = (key) => {
      var _a, _b, _c, _d, _e2;
      switch (key) {
        case "__anon_id":
          return ((_a = opts.cookieNames) == null ? void 0 : _a.anonymousId) || defaultCookie2Key.__anon_id;
        case "__user_id":
          return ((_b = opts.cookieNames) == null ? void 0 : _b.userId) || defaultCookie2Key.__user_id;
        case "__user_traits":
          return ((_c = opts.cookieNames) == null ? void 0 : _c.userTraits) || defaultCookie2Key.__user_traits;
        case "__group_id":
          return ((_d = opts.cookieNames) == null ? void 0 : _d.groupId) || defaultCookie2Key.__group_id;
        case "__group_traits":
          return ((_e2 = opts.cookieNames) == null ? void 0 : _e2.groupTraits) || defaultCookie2Key.__group_traits;
        default:
          return key;
      }
    };
    return {
      getCookie(name) {
        var _a;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        return parts.length === 2 ? (_a = parts.pop()) == null ? void 0 : _a.split(";").shift() : void 0;
      },
      getCookies() {
        const value = `; ${document.cookie}`;
        const cookies = {};
        const matches = value.matchAll(/(\w+)=([^;]+)/g);
        for (const match of matches) {
          cookies[match[1]] = match[2];
        }
        return cookies;
      },
      documentEncoding() {
        return window.document.characterSet;
      },
      timezoneOffset() {
        return (/* @__PURE__ */ new Date()).getTimezoneOffset();
      },
      store() {
        return cookieStorage(opts.cookieDomain || getTopLevelDomain(window.location.hostname), key2Cookie);
      },
      language() {
        return window.navigator.language;
      },
      pageTitle() {
        return window.document.title;
      },
      pageUrl() {
        return window.location.href;
      },
      referrer() {
        return window.document.referrer;
      },
      screen() {
        return {
          width: window.screen.width,
          height: window.screen.height,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          density: Math.floor(window.devicePixelRatio)
        };
      },
      userAgent() {
        return window.navigator.userAgent;
      }
    };
  }
  function createInMemoryStorage(debug) {
    const storage = {};
    return {
      reset() {
        Object.keys(storage).forEach((key) => delete storage[key]);
      },
      setItem(key, val) {
        if (debug) {
          console.log(`[JITSU EMPTY RUNTIME] Set storage item ${key}=${JSON.stringify(val)}`);
        }
        if (typeof val === "undefined") {
          delete storage[key];
        } else {
          storage[key] = val;
        }
      },
      getItem(key) {
        const val = storage[key];
        if (debug) {
          console.log(`[JITSU EMPTY RUNTIME] Get storage item ${key}=${JSON.stringify(val)}`);
        }
        return val;
      },
      removeItem(key) {
        if (debug) {
          console.log(`[JITSU EMPTY RUNTIME] Get storage item ${key}=${storage[key]}`);
        }
        delete storage[key];
      }
    };
  }
  var emptyRuntime = (config) => ({
    documentEncoding() {
      return void 0;
    },
    timezoneOffset() {
      return void 0;
    },
    getCookie(name) {
      return void 0;
    },
    getCookies() {
      return {};
    },
    store() {
      return createInMemoryStorage(config.debug);
    },
    language() {
      return void 0;
    },
    pageTitle() {
      return void 0;
    },
    pageUrl() {
      return void 0;
    },
    referrer() {
      return void 0;
    },
    screen() {
      return void 0;
    },
    userAgent() {
      return void 0;
    }
  });
  function deepCopy(o4) {
    if (typeof o4 !== "object") {
      return o4;
    }
    if (!o4) {
      return o4;
    }
    return JSON.parse(JSON.stringify(o4));
  }
  function deepMerge(target, source) {
    if (typeof source !== "object" || source === null || Array.isArray(source) || source instanceof Date) {
      return source;
    }
    if (typeof target !== "object" || target === null || Array.isArray(target) || target instanceof Date) {
      return source;
    }
    return Object.entries(source).reduce((acc, [key, value]) => {
      acc[key] = deepMerge(target[key], value);
      return acc;
    }, target);
  }
  function isInBrowser() {
    return typeof document !== "undefined" && typeof window !== "undefined";
  }
  function ensureAnonymousId(opts) {
    var _a;
    if (!isInBrowser()) {
      return void 0;
    }
    const cookieName = ((_a = opts.cookieNames) == null ? void 0 : _a.anonymousId) || defaultCookie2Key.__anon_id;
    const existing = getCookie(cookieName);
    if (existing) {
      return existing;
    }
    const id = uuid();
    const domain = opts.cookieDomain || getTopLevelDomain(window.location.hostname);
    setCookie(cookieName, id, {
      domain,
      secure: window.location.protocol === "https:"
    });
    if (opts.debug) {
      console.log(
        `[JITSU DEBUG] preInitAnonymousId: created anonymous ID cookie '${cookieName}'=${id} on domain '${domain}'`
      );
    }
    return id;
  }
  function fixPath(path) {
    if (path.indexOf("//") === 0 && path.lastIndexOf("/") === 1) {
      return "/";
    }
    return path;
  }
  var hashRegex = /#.*$/;
  function urlPath(url) {
    const regex = /(http[s]?:\/\/)?([^\/\s]+\/)(.*)/g;
    const matches = regex.exec(url);
    const pathMatch = matches && matches[3] ? matches[3].split("?")[0].replace(hashRegex, "") : "";
    return "/" + pathMatch;
  }
  function canonicalUrl() {
    if (!isInBrowser()) return;
    const tags = document.getElementsByTagName("link");
    for (var i4 = 0, tag; tag = tags[i4]; i4++) {
      if (tag.getAttribute("rel") === "canonical") {
        return tag.getAttribute("href");
      }
    }
  }
  function analyticsJsUrl() {
    if (!isInBrowser()) return;
    const canonical = canonicalUrl();
    if (!canonical) return window.location.href.replace(hashRegex, "");
    return canonical.match(/\?/) ? canonical : canonical + window.location.search;
  }
  function adjustPayload(payload, config, storage, s2s) {
    var _a, _b, _c, _d, _e2, _f, _g, _h, _i, _j, _k, _l, _m, _n2, _o, _p;
    const runtime = config.runtime || (isInBrowser() ? windowRuntime(config) : emptyRuntime(config));
    const url = runtime.pageUrl();
    const parsedUrl = url ? safeCall(() => new URL(url), void 0) : void 0;
    const query = parsedUrl ? parseQuery(parsedUrl.search) : {};
    const properties = payload.properties || {};
    if (payload.type === "page" && (properties.url || url)) {
      let targetUrl = url || properties.url;
      if (properties.url && properties.url !== analyticsJsUrl()) {
        targetUrl = properties.url;
      }
      properties.url = targetUrl.replace(hashRegex, "");
      properties.path = fixPath(urlPath(targetUrl));
    }
    const customContext = deepMerge(
      config.defaultPayloadContext,
      ((_a = payload.properties) == null ? void 0 : _a.context) || ((_b = payload.options) == null ? void 0 : _b.context) || {}
    );
    (_c = payload.properties) == null ? true : delete _c.context;
    const referrer = runtime.referrer();
    const context = {
      library: {
        name: jitsuLibraryName,
        version: jitsuVersion,
        env: isInBrowser() ? "browser" : "node"
      },
      consent: typeof ((_d = config.privacy) == null ? void 0 : _d.consentCategories) === "object" && Object.keys((_e2 = config.privacy) == null ? void 0 : _e2.consentCategories).length ? {
        categoryPreferences: config.privacy.consentCategories
      } : void 0,
      userAgent: (_f = runtime.userAgent) == null ? void 0 : _f.call(runtime),
      headers: (_g = runtime.headers) == null ? void 0 : _g.call(runtime),
      locale: (_h = runtime.language) == null ? void 0 : _h.call(runtime),
      screen: (_i = runtime.screen) == null ? void 0 : _i.call(runtime),
      ip: (_j = runtime == null ? void 0 : runtime.ip) == null ? void 0 : _j.call(runtime),
      traits: payload.type != "identify" && payload.type != "group" ? __spreadValues(__spreadValues({}, restoreTraits(storage) || {}), ((_k = payload == null ? void 0 : payload.options) == null ? void 0 : _k.traits) || {}) : void 0,
      page: {
        path: properties.path || parsedUrl && parsedUrl.pathname,
        referrer,
        referring_domain: safeCall(() => referrer && new URL(referrer).hostname),
        host: parsedUrl && parsedUrl.host,
        search: properties.search || parsedUrl && parsedUrl.search,
        title: properties.title || runtime.pageTitle(),
        url: properties.url || url,
        encoding: properties.encoding || runtime.documentEncoding()
      },
      clientIds: !((_l = config.privacy) == null ? void 0 : _l.disableUserIds) ? getClientIds(runtime, config.cookieCapture || {}, query) : void 0,
      campaign: parseUtms(query)
    };
    const withContext = __spreadProps(__spreadValues({}, payload), {
      userId: ((_m = payload == null ? void 0 : payload.options) == null ? void 0 : _m.userId) || (payload == null ? void 0 : payload.userId),
      anonymousId: ((_n2 = payload == null ? void 0 : payload.options) == null ? void 0 : _n2.anonymousId) || (payload == null ? void 0 : payload.anonymousId),
      groupId: ((_o = payload == null ? void 0 : payload.options) == null ? void 0 : _o.groupId) || storage.getItem("__group_id"),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      messageId: randomId(properties.path || parsedUrl && parsedUrl.pathname),
      writeKey: maskWriteKey(config.writeKey),
      context: deepMerge(context, customContext)
    });
    delete withContext.meta;
    delete withContext.options;
    if ((_p = config.privacy) == null ? void 0 : _p.disableUserIds) {
      delete withContext.userId;
      delete withContext.anonymousId;
      delete withContext.context.traits;
      delete withContext.groupId;
    }
    return withContext;
  }
  function isDiff(obj) {
    const keys = Object.keys(obj);
    return keys.length === 1 && keys[0] === "__diff";
  }
  function processDestinations(destinations, method, originalEvent, debug, analyticsInstance) {
    return __async(this, null, function* () {
      const promises = [];
      for (const destination of destinations) {
        let newEvents = [];
        if (destination.newEvents) {
          try {
            newEvents = destination.newEvents.map(
              (e2) => e2 === "same" ? deepCopy(originalEvent) : isDiff(e2) ? diff.patch(deepCopy(originalEvent), e2.__diff) : e2
            );
          } catch (e2) {
            console.error(`[JITSU] Error applying '${destination.id}' changes to event: ${e2 == null ? void 0 : e2.message}`, e2);
          }
        } else {
          newEvents = [deepCopy(originalEvent)];
        }
        const credentials = __spreadValues(__spreadValues({}, destination.credentials), destination.options);
        if (destination.deviceOptions.type === "internal-plugin") {
          const plugin = internalDestinationPlugins[destination.deviceOptions.name];
          if (plugin) {
            for (const event of newEvents) {
              try {
                promises.push(plugin.handle(__spreadProps(__spreadValues({}, credentials), { debug }), event));
              } catch (e2) {
                console.warn(
                  `[JITSU] Error processing event with internal plugin '${destination.deviceOptions.name}': ${e2 == null ? void 0 : e2.message}`,
                  e2
                );
              }
            }
          } else {
            console.warn(
              `[JITSU] Unknown internal plugin '${destination.deviceOptions.name}' for destination '${destination.id}'`
            );
          }
        } else if (destination.deviceOptions.type === "analytics-plugin") {
          yield loadScript(destination.deviceOptions.packageCdn);
          const plugin = window[destination.deviceOptions.moduleVarName];
          if (!plugin) {
            console.warn(
              `[JITSU] Broken plugin '${destination.deviceOptions.packageCdn}' for destination '${destination.id}' - it doesn't export '${destination.deviceOptions.moduleVarName}' variable`
            );
          } else {
            let pluginInstance;
            try {
              pluginInstance = (typeof plugin === "function" ? plugin : plugin.init)(credentials);
            } catch (e2) {
              console.warn(
                `[JITSU] Error creating plugin '${destination.deviceOptions.moduleVarName}@${destination.deviceOptions.packageCdn}' for destination '${destination.id}': ${e2 == null ? void 0 : e2.message}`,
                e2
              );
            }
            try {
              if (debug) {
                console.log(
                  `[JITSU] Plugin '${destination.deviceOptions.moduleVarName}@${destination.deviceOptions.packageCdn}' for destination '${destination.id}' initialized with config:`,
                  pluginInstance.config
                );
              }
              pluginInstance.initialize({ config: pluginInstance.config, instance: analyticsInstance });
            } catch (e2) {
              console.warn(
                `[JITSU] Error initializing plugin '${destination.deviceOptions.moduleVarName}@${destination.deviceOptions.packageCdn}' for destination '${destination.id}': ${e2 == null ? void 0 : e2.message}. Config: ${JSON.stringify(pluginInstance.config)}`,
                e2
              );
              continue;
            }
            if (pluginInstance[method]) {
              for (const event of newEvents) {
                try {
                  pluginInstance[method]({
                    payload: event,
                    config: pluginInstance.config,
                    instance: analyticsInstance
                  });
                } catch (e2) {
                  console.warn(
                    `[JITSU] Error processing ${method}() with plugin '${destination.deviceOptions.moduleVarName}@${destination.deviceOptions.packageCdn}' for destination '${destination.id}': ${e2 == null ? void 0 : e2.message}`,
                    e2
                  );
                }
              }
            }
          }
        }
      }
    });
  }
  function looksLikeCuid(id) {
    return id.length === 25 && id.charAt(0) === "c";
  }
  function validateWriteKey(writeKey) {
    if (writeKey) {
      const [, secret] = writeKey.split(":", 2);
      if (!secret && !looksLikeCuid(writeKey)) {
        throw new Error(
          `Legacy write key detected - ${writeKey}! This format doesn't work anymore, it should be 'key:secret'. Please download a new key from Jitsu UI`
        );
      }
    }
    return writeKey;
  }
  function maskWriteKey(writeKey) {
    if (writeKey) {
      const [id, secret] = writeKey.split(":", 2);
      if (secret) {
        return `${id}:***`;
      } else {
        return "***";
      }
    }
    return writeKey;
  }
  function getErrorHandler(opts) {
    const configuredHandler = opts.errorPolicy || "log";
    if (typeof configuredHandler === "function") {
      return configuredHandler;
    } else if (configuredHandler === "rethrow") {
      return (msg, ...args) => {
        throw new Error(msg);
      };
    } else {
      return (msg, ...args) => {
        console.error(msg, ...args);
      };
    }
  }
  function send(method, payload, jitsuConfig, instance, store, isAutoIdentify) {
    return __async(this, null, function* () {
      var _a, _b;
      const s2s = !!jitsuConfig.s2s;
      const debugHeader = jitsuConfig.debug ? { "X-Enable-Debug": "true" } : {};
      const adjustedPayload = adjustPayload(payload, jitsuConfig, store, s2s);
      if (jitsuConfig.echoEvents) {
        console.log(`[JITSU DEBUG] sending '${method}' event:`, adjustedPayload);
        return;
      }
      const url = s2s ? `${jitsuConfig.host}/api/s/s2s/${method}` : `${jitsuConfig.host}/api/s/${method}`;
      const fetch = jitsuConfig.fetch || globalThis.fetch;
      if (!fetch) {
        throw new Error(
          "Please specify fetch function in jitsu plugin initialization, fetch isn't available in global scope"
        );
      }
      const abortController = jitsuConfig.fetchTimeoutMs ? new AbortController() : void 0;
      const abortTimeout = jitsuConfig.fetchTimeoutMs ? setTimeout(() => {
        abortController == null ? void 0 : abortController.abort();
      }, jitsuConfig.fetchTimeoutMs) : void 0;
      const authHeader = jitsuConfig.writeKey ? { "X-Write-Key": jitsuConfig.writeKey } : {};
      const ipHeader = typeof ((_a = jitsuConfig.privacy) == null ? void 0 : _a.ipPolicy) === "undefined" || ((_b = jitsuConfig.privacy) == null ? void 0 : _b.ipPolicy) === "keep" ? {} : { "X-IP-Policy": jitsuConfig.privacy.ipPolicy };
      let fetchResult;
      try {
        fetchResult = yield fetch(url, {
          method: "POST",
          headers: __spreadValues(__spreadValues(__spreadValues({
            "Content-Type": "application/json"
          }, authHeader), debugHeader), ipHeader),
          body: JSON.stringify(adjustedPayload),
          signal: abortController == null ? void 0 : abortController.signal
        });
        if (abortTimeout) {
          clearTimeout(abortTimeout);
        }
      } catch (e2) {
        const errorHandler = isAutoIdentify ? (msg) => console.warn(msg) : getErrorHandler(jitsuConfig);
        errorHandler(`Call to ${url} failed with error ${e2.message}`);
        return Promise.resolve();
      }
      let responseText;
      try {
        responseText = yield fetchResult.text();
      } catch (e2) {
        console.warn(
          `Can't read response text from ${url} (status - ${fetchResult.status}  ${fetchResult.statusText}): ${e2 == null ? void 0 : e2.message}`
        );
      }
      if (jitsuConfig.debug) {
        console.log(
          `[JITSU DEBUG] ${url} replied ${fetchResult.status}: ${responseText}. Original payload:
${JSON.stringify(
            adjustedPayload,
            null,
            2
          )}`
        );
      }
      if (!fetchResult.ok) {
        const errorHandler = isAutoIdentify ? (msg) => console.warn(msg) : getErrorHandler(jitsuConfig);
        errorHandler(
          `Call to ${url} failed with error: ${fetchResult.status} - ${fetchResult.statusText}: ${responseText}`
        );
        return Promise.resolve();
      }
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e2) {
        const errorHandler = isAutoIdentify ? (msg) => console.warn(msg) : getErrorHandler(jitsuConfig);
        errorHandler(`Can't parse JSON: ${responseText}: ${e2 == null ? void 0 : e2.message}`);
        return Promise.resolve();
      }
      if (responseJson.destinations && responseJson.destinations.length > 0) {
        if (jitsuConfig.s2s) {
          console.warn(
            `[JITSU] ${payload.type} responded with list of ${responseJson.destinations.length} destinations. However, this code is running in server-to-server mode, so destinations will be ignored`,
            jitsuConfig.debug ? JSON.stringify(responseJson.destinations, null, 2) : void 0
          );
        } else {
          if (isInBrowser()) {
            if (jitsuConfig.debug) {
              console.log(`[JITSU] Processing device destinations: `, JSON.stringify(responseJson.destinations, null, 2));
            }
            return processDestinations(responseJson.destinations, method, adjustedPayload, !!jitsuConfig.debug, instance);
          }
        }
      }
      return adjustedPayload;
    });
  }
  var controllingTraits = ["$doNotSend"];
  function stripControllingTraits(traits) {
    const res = __spreadValues({}, traits);
    for (const key of controllingTraits) {
      delete res[key];
    }
    return res;
  }
  var jitsuAnalyticsPlugin = (jitsuOptions = {}, storage) => {
    mergeConfig(jitsuOptions, jitsuOptions);
    return {
      name: "jitsu",
      config: jitsuOptions,
      initialize: (args) => __async(null, null, function* () {
        const { config } = args;
        if (config.debug) {
          console.debug("[JITSU DEBUG] Initializing Jitsu plugin with config: ", JSON.stringify(config, null, 2));
        }
        if (!config.host && !config.echoEvents) {
          throw new Error("Please specify host variable in jitsu plugin initialization, or set echoEvents to true");
        }
        validateWriteKey(config.writeKey);
        if (config.idEndpoint) {
          if (!isInBrowser()) {
            console.error(`[JITSU] 'idEndpoint' option can be used only in browser environment`);
            return;
          }
          try {
            const fetch = config.fetch || globalThis.fetch;
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 1e3);
            const domain = config.cookieDomain || getTopLevelDomain(window.location.hostname);
            const res = yield fetch(config.idEndpoint + "?domain=" + encodeURIComponent(domain), {
              credentials: "include",
              signal: controller.signal
            });
            if (!res.ok) {
              console.error(`[JITSU] Can't fetch idEndpoint: ${res.status} - ${res.statusText}`);
            } else if (config.debug) {
              console.log(`[JITSU DEBUG] Fetch idEndpoint: ${res.status}`);
            }
          } catch (e2) {
            console.error(`[JITSU] Can't fetch idEndpoint: ${e2.message}`);
          }
        }
      }),
      page: (args) => {
        var _a;
        const { payload, config, instance } = args;
        if ((_a = config.privacy) == null ? void 0 : _a.dontSend) {
          return;
        }
        const promise = send("page", payload, config, instance, storage);
        if (promise && typeof promise.catch === "function") {
          promise.catch(() => {
          });
        }
        return promise;
      },
      track: (args) => {
        var _a;
        const { payload, config, instance } = args;
        if ((_a = config.privacy) == null ? void 0 : _a.dontSend) {
          return;
        }
        const promise = send("track", payload, config, instance, storage);
        if (promise && typeof promise.catch === "function") {
          promise.catch(() => {
          });
        }
        return promise;
      },
      identify: (args) => {
        var _a, _b, _c, _d;
        const { payload, config, instance } = args;
        if (((_a = config.privacy) == null ? void 0 : _a.dontSend) || ((_b = config.privacy) == null ? void 0 : _b.disableUserIds)) {
          return;
        }
        storage.setItem("__user_id", payload.userId);
        const doNotSend = (_c = payload.traits) == null ? void 0 : _c.$doNotSend;
        if (payload.traits && typeof payload.traits === "object") {
          payload.traits = stripControllingTraits(payload.traits);
          storage.setItem("__user_traits", payload.traits);
        }
        if (doNotSend) {
          return Promise.resolve();
        }
        const isAutoIdentify = ((_d = payload.options) == null ? void 0 : _d.autoIdentify) === true;
        const promise = send("identify", payload, config, instance, storage, isAutoIdentify);
        if (promise && typeof promise.catch === "function") {
          promise.catch(() => {
          });
        }
        return promise;
      },
      reset: (args) => {
        const { config, instance } = args;
        storage.reset();
        if (config.debug) {
          console.log("[JITSU DEBUG] Resetting Jitsu plugin storage");
        }
      },
      methods: {
        //analytics doesn't support group as a base method, so we need to add it manually
        configure(newOptions) {
          var _a, _b, _c, _d;
          const idsWasDisabled = ((_a = jitsuOptions.privacy) == null ? void 0 : _a.disableUserIds) || ((_b = jitsuOptions.privacy) == null ? void 0 : _b.dontSend);
          mergeConfig(jitsuOptions, newOptions);
          const idsDisabledNow = ((_c = jitsuOptions.privacy) == null ? void 0 : _c.disableUserIds) || ((_d = jitsuOptions.privacy) == null ? void 0 : _d.dontSend);
          if (!idsDisabledNow && idsWasDisabled) {
            if (jitsuOptions.debug) {
              console.log("[JITSU] Enabling Anonymous ID. Generating new Id.");
            }
            const instance = this.instance;
            const newAnonymousId = uuid();
            const userState = instance.user();
            if (userState) {
              userState.anonymousId = newAnonymousId;
            }
            storage.setItem("__anon_id", newAnonymousId);
            instance.setAnonymousId(newAnonymousId);
          }
        },
        group(groupId, traits, options, callback) {
          var _a, _b;
          if (((_a = jitsuOptions.privacy) == null ? void 0 : _a.dontSend) || ((_b = jitsuOptions.privacy) == null ? void 0 : _b.disableUserIds)) {
            return;
          }
          if (typeof groupId === "number") {
            groupId = groupId + "";
          }
          const instance = this.instance;
          const user = instance.user();
          const userId = (options == null ? void 0 : options.userId) || (user == null ? void 0 : user.userId);
          const anonymousId = (options == null ? void 0 : options.anonymousId) || (user == null ? void 0 : user.anonymousId) || storage.getItem("__anon_id");
          storage.setItem("__group_id", groupId);
          const doNotSend = traits == null ? void 0 : traits.$doNotSend;
          if (traits && typeof traits === "object") {
            traits = stripControllingTraits(traits);
            storage.setItem("__group_traits", traits);
          }
          if (doNotSend) {
            return Promise.resolve();
          }
          return send(
            "group",
            __spreadValues(__spreadValues({ type: "group", groupId, traits }, anonymousId ? { anonymousId } : {}), userId ? { userId } : {}),
            jitsuOptions,
            instance,
            storage
          );
        }
      }
    };
  };
  var seedCounter = 0;
  function getSeed() {
    var _a;
    seedCounter = (seedCounter + 1) % Number.MAX_SAFE_INTEGER;
    const defaultSeed = Date.now() % 2147483647;
    const seed = isInBrowser() ? ((_a = window == null ? void 0 : window.performance) == null ? void 0 : _a.now()) || defaultSeed : defaultSeed;
    return seed + seedCounter;
  }
  function randomId(hashString = "") {
    const d3 = Date.now();
    return (Math.random() * d3 * hash(hashString != null ? hashString : "", getSeed()) % Number.MAX_SAFE_INTEGER).toString(36) + (Math.random() * d3 * hash(hashString != null ? hashString : "", getSeed()) % Number.MAX_SAFE_INTEGER).toString(36);
  }
  function uuid() {
    var u3 = "", m4 = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx", i4 = 0, rb = Math.random() * 4294967295 | 0;
    while (i4++ < 36) {
      var c4 = m4[i4 - 1], r3 = rb & 15, v2 = c4 == "x" ? r3 : r3 & 3 | 8;
      u3 += c4 == "-" || c4 == "4" ? c4 : v2.toString(16);
      rb = i4 % 8 == 0 ? Math.random() * 4294967295 | 0 : rb >> 4;
    }
    return u3;
  }
  function hash(str, seed = 0) {
    let h1 = 3735928559 ^ seed, h2 = 1103547991 ^ seed;
    for (let i4 = 0, ch; i4 < str.length; i4++) {
      ch = str.charCodeAt(i4);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  // src/index.ts
  function parse(input) {
    let value = input;
    if ((input == null ? void 0 : input.indexOf("%7B%22")) === 0) {
      value = decodeURIComponent(input);
    }
    try {
      value = JSON.parse(value);
      if (value === "true") return true;
      if (value === "false") return false;
      if (typeof value === "object") return value;
      if (parseFloat(value) === value) {
        value = parseFloat(value);
      }
    } catch (e2) {
    }
    if (value === null || value === "") {
      return;
    }
    return value;
  }
  function createUnderlyingAnalyticsInstance(opts, rt, plugins = []) {
    var _a, _b, _c, _e2, _f;
    const storageCache = {};
    let resetCalled = false;
    const cachingStorageWrapper = (persistentStorage) => ({
      setItem(key, val) {
        var _a2, _b2;
        if (((_a2 = opts.privacy) == null ? void 0 : _a2.dontSend) || ((_b2 = opts.privacy) == null ? void 0 : _b2.disableUserIds)) {
          return;
        }
        if (opts.debug) {
          console.log(`[JITSU DEBUG] [Caching storage] setItem: ${key}=${val}`);
        }
        storageCache[key] = val;
        persistentStorage.setItem(key, val);
      },
      getItem(key) {
        var _a2, _b2;
        if (((_a2 = opts.privacy) == null ? void 0 : _a2.dontSend) || ((_b2 = opts.privacy) == null ? void 0 : _b2.disableUserIds)) {
          return;
        }
        const value = storageCache[key] || persistentStorage.getItem(key);
        if (opts.debug) {
          console.log(`[JITSU DEBUG] [Caching storage] getItem: ${key}=${value}. From cache: ${!!storageCache[key]}`);
        }
        return value;
      },
      reset() {
        for (const key of [...Object.keys(storageCache)]) {
          delete storageCache[key];
        }
        persistentStorage.reset();
      },
      removeItem(key) {
        if (opts.debug) {
          console.log(`[JITSU DEBUG] Caching storage removeItem: ${key}`);
        }
        delete storageCache[key];
        persistentStorage.removeItem(key);
      }
    });
    const storage = cachingStorageWrapper(((_a = rt.store) == null ? void 0 : _a.call(rt)) || createInMemoryStorage(opts.debug));
    if (opts.userId && !((_b = opts.privacy) == null ? void 0 : _b.disableUserIds) && !((_c = opts.privacy) == null ? void 0 : _c.dontSend)) {
      storage.setItem("__user_id", opts.userId);
    }
    const analytics = analyticsLib({
      debug: !!opts.debug,
      storage,
      plugins: [jitsuAnalyticsPlugin(opts, storage), ...plugins]
    });
    const a5 = __spreadProps(__spreadValues({}, analytics), {
      page: (...args) => {
        if (args.length === 2 && typeof args[0] === "string" && typeof args[1] === "object") {
          return analytics.page(__spreadValues({
            name: args[0]
          }, args[1]));
        } else {
          return analytics.page(...args);
        }
      },
      identify: (...args) => {
        if (args[0] && typeof args[0] !== "object" && typeof args[0] !== "string") {
          args[0] = args[0] + "";
        }
        const storage2 = analytics.storage;
        const storageWrapper = cachingStorageWrapper(storage2);
        if (typeof args[0] === "string") {
          storageWrapper.setItem("__user_id", args[0]);
        } else if (typeof args[0] === "object") {
          storageWrapper.setItem("__user_traits", args[0]);
        }
        if (args.length === 2 && typeof args[1] === "object") {
          storageWrapper.setItem("__user_traits", args[1]);
        }
        return analytics.identify(...args);
      },
      setContextProperty(name, value) {
        if (opts.debug) {
          console.log(`[JITSU DEBUG] Setting context property '${name}':${JSON.stringify(value)}`);
        }
        if (!opts.defaultPayloadContext) {
          opts.defaultPayloadContext = {
            [name]: value
          };
        } else {
          opts.defaultPayloadContext[name] = value;
        }
      },
      getContextProperty(name) {
        var _a2;
        if (opts.debug) {
          console.log(`[JITSU DEBUG] Getting context property '${name}'`);
        }
        return (_a2 = opts.defaultPayloadContext) == null ? void 0 : _a2[name];
      },
      user() {
        var _a2, _b2;
        const u3 = analytics.user();
        const idsDisabled = ((_a2 = opts.privacy) == null ? void 0 : _a2.disableUserIds) || ((_b2 = opts.privacy) == null ? void 0 : _b2.dontSend);
        if (idsDisabled) {
          return __spreadProps(__spreadValues({}, u3), {
            id: void 0
          });
        }
        if (u3 && !u3.id && opts.userId && !resetCalled) {
          return __spreadProps(__spreadValues({}, u3), {
            id: opts.userId
          });
        }
        return u3;
      },
      setAnonymousId: (id) => {
        if (opts.debug) {
          console.log("[JITSU DEBUG] Setting anonymous id to " + id);
        }
        storage.setItem("__anon_id", id);
        const userState = analytics.user();
        if (userState) {
          userState.anonymousId = id;
        }
        analytics.setAnonymousId(id);
      },
      reset() {
        return __async(this, null, function* () {
          resetCalled = true;
          if (opts.debug) {
            console.log("[JITSU DEBUG] Called reset(). Storage state", JSON.stringify(analytics.user()));
          }
          storage.reset();
          yield analytics.reset();
          this.setAnonymousId(uuid());
          if (opts.debug) {
            console.log("[JITSU DEBUG] User state after reset", JSON.stringify(analytics.user()));
          }
        });
      },
      configure(options) {
        return __async(this, null, function* () {
          var _a2, _b2;
          if (opts.debug) {
            console.log("[JITSU DEBUG] Update Jitsu config with", JSON.stringify(options));
          }
          if (((_a2 = options.privacy) == null ? void 0 : _a2.disableUserIds) || ((_b2 = options.privacy) == null ? void 0 : _b2.dontSend)) {
            storage.reset();
          }
          for (const plugin of Object.values(analytics.plugins)) {
            if (typeof plugin["configure"] === "function") {
              plugin["configure"](options);
            }
          }
        });
      },
      group(groupId, traits, options, callback) {
        return __async(this, null, function* () {
          const results = [];
          for (const plugin of Object.values(analytics.plugins)) {
            if (plugin["group"]) {
              results.push(yield plugin["group"](groupId, traits, options, callback));
            }
          }
          return results[0];
        });
      },
      getConfiguration() {
        return opts;
      }
    });
    if (((_e2 = opts.privacy) == null ? void 0 : _e2.disableUserIds) || ((_f = opts.privacy) == null ? void 0 : _f.dontSend)) {
      storage.reset();
    } else if (opts.userId) {
      a5.identify(opts.userId, {}, { autoIdentify: true }).catch((err) => {
        if (opts.debug) {
          console.warn("[JITSU WARNING] Auto-identification failed on initialization:", err);
        }
      });
    }
    return a5;
  }
  function fixOptions(opts) {
    var _a, _b;
    return __spreadProps(__spreadValues({}, opts), {
      host: ((_a = opts.host) != null ? _a : "").indexOf("https://") !== 0 && ((_b = opts.host) != null ? _b : "").indexOf("http://") !== 0 ? `https://${opts.host}` : opts.host
    });
  }
  function jitsuAnalytics(_opts) {
    const opts = fixOptions(_opts);
    if (opts.preInitAnonymousId) {
      ensureAnonymousId(opts);
    }
    const inBrowser = isInBrowser();
    const rt = opts.runtime || (inBrowser ? windowRuntime(opts) : emptyRuntime(opts));
    return createUnderlyingAnalyticsInstance(opts, rt);
  }

  // src/browser.ts
  function snakeToCamel(s2) {
    return s2.replace(/([-_][a-z])/gi, ($1) => {
      return $1.toUpperCase().replace("-", "").replace("_", "");
    });
  }
  var trimPrefix = (s2, prefix) => s2.replace(new RegExp(`^${prefix}`), "");
  var defaultParser = (nestedPath = []) => ({
    path: (name) => [
      ...nestedPath,
      snakeToCamel(nestedPath.length > 0 ? trimPrefix(name, nestedPath.join("-") + "-") : name)
    ],
    parse: (arg) => arg
  });
  var booleanParser = (nestedPath = []) => __spreadProps(__spreadValues({}, defaultParser(nestedPath)), {
    parse: (arg) => arg === "true" || arg === "1" || arg === "yes"
  });
  var jsonParser = (nestedPath = []) => __spreadProps(__spreadValues({}, defaultParser(nestedPath)), {
    parse: (arg) => {
      try {
        return JSON.parse(arg);
      } catch (e2) {
        console.error(`Can't parse Jitsu Option as JSON: ${arg}`);
        return {};
      }
    }
  });
  var parsers = {
    debug: booleanParser(),
    "privacy-disable-user-ids": booleanParser(["privacy"]),
    "privacy-dont-send": booleanParser(["privacy"]),
    "privacy-ip-policy": defaultParser(["privacy"]),
    "echo-events": booleanParser(),
    "init-only": booleanParser(),
    "cookie-names": jsonParser(),
    "cookie-capture": jsonParser(),
    "default-payload-context": jsonParser()
  };
  function getParser(name) {
    return parsers[name] || defaultParser();
  }
  function setPath(obj, path, value) {
    let current = obj;
    let i4 = 0;
    for (; i4 < path.length - 1; i4++) {
      const key = path[i4];
      current[key] = current[key] || {};
      current = current[key];
    }
    current[path[i4]] = value;
  }
  function getScriptAttributes(scriptElement) {
    return scriptElement.getAttributeNames().filter((name) => name.indexOf("data-") === 0).map((name) => name.substring("data-".length)).reduce((res, name) => {
      var _a;
      const parser = getParser(name);
      const path = ((_a = parser.path) == null ? void 0 : _a.call(parser, name)) || [name];
      const attrValue = scriptElement.getAttribute(`data-${name}`);
      if (attrValue !== null) {
        setPath(res, path, parser.parse(attrValue));
      }
      return res;
    }, {});
  }
  function runCallback(callback, jitsu) {
    if (typeof callback === "function") {
      callback(jitsu);
    } else if (Array.isArray(callback) && typeof callback[0] === "string") {
      const [method, ...args] = callback;
      if (typeof jitsu[method] === "function") {
        jitsu[method](...args);
      } else {
        console.warn(`Method ${method} is not supported, ignoring callback`);
      }
    } else {
      console.warn(`Invalid jitsu queue callback`, callback);
    }
  }
  (function() {
    function readJitsuOptions() {
      const scriptElement = window.document.currentScript;
      if (!scriptElement) {
        throw new Error(`Can't find script element`);
      }
      const host = new URL(scriptElement.src).origin;
      return __spreadProps(__spreadValues(__spreadValues({}, (window == null ? void 0 : window.jitsuConfig) || {}), getScriptAttributes(scriptElement)), { host });
    }
    const options = readJitsuOptions();
    const JITSU_V2_ID = options.namespace || "jitsu";
    if (options.debug) {
      console.log(`Jitsu options: `, JSON.stringify(options));
    }
    const jitsu = jitsuAnalytics(options);
    if (options.onload) {
      const onloadFunction = window[options.onload];
      if (!onloadFunction) {
        console.warn(`onload function ${options.onload} is not found in window`);
      }
      if (typeof onloadFunction === "function") {
        onloadFunction(jitsu);
      } else {
        console.warn(`onload function ${options.onload} is not callable: ${typeof onloadFunction}`);
      }
    }
    window[JITSU_V2_ID] = jitsu;
    const callbackQueue = window[JITSU_V2_ID + "Q"] && window[JITSU_V2_ID + "Q"].length ? [...window[JITSU_V2_ID + "Q"]] : [];
    window[JITSU_V2_ID + "Q"] = {
      push: (callback) => {
        if (typeof callback === "function") {
          callback(jitsu);
        } else {
          console.warn(`${JITSU_V2_ID}Q.push() accepts only function, ${typeof callback} given`);
        }
      }
    };
    if (options.debug) {
      console.log(`[JITSU DEBUG] Jitsu callback queue size: ${callbackQueue.length}`, callbackQueue);
    }
    callbackQueue.forEach((callback) => {
      try {
        runCallback(callback, jitsu);
      } catch (e2) {
        console.warn(`Error processing callback from Jitsu queue`, e2);
      }
    });
    if (!options.initOnly) {
      jitsu.page();
    }
  })();
})();
