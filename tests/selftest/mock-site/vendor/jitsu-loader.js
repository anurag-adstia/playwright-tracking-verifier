(function () {
  var JITSU_SCRIPT_SRC =
    (window.cf_variable && window.cf_variable.JITSU_EVENT_URL) || "";
  if (!JITSU_SCRIPT_SRC) {
    console.error("❌ Jitsu script URL is missing");
    return;
  }

  function getQueryStringValue(key) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  }

  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  function getCookie(name) {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      while (cookie.charAt(0) === " ") {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(name + "=") === 0) {
        return cookie.substring(name.length + 1);
      }
    }
    return null;
  }

  function setCookie(name, value) {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
      value || ""
    )}; path=/`;
  }

  function sessionStorageIdSetter() {
    let vlClickId =
      getQueryStringValue("vl_click_id") ||
      getQueryStringValue("click_id") ||
      getCookie("vl-cid") ||
      sessionStorage.getItem("session_id");

    if (
      !vlClickId ||
      vlClickId === "{clickid}" ||
      vlClickId.includes("{") ||
      vlClickId.includes("}")
    ) {
      vlClickId = "sess_id_" + generateUUID();
    } else {
      if (
        (getQueryStringValue("vl_click_id") ||
          getQueryStringValue("click_id") ||
          getCookie("vl-cid")) &&
        !vlClickId.startsWith("sess_id_")
      ) {
        vlClickId = "sess_id_" + vlClickId;
      }
    }

    sessionStorage.setItem("session_id", vlClickId);
  }

  function loadJitsu(pathname) {
    var prevScript = document.querySelector("script[data-jitsu]");
    if (prevScript) prevScript.remove();

    var script = document.createElement("script");
    script.src = JITSU_SCRIPT_SRC;
    script.async = true;
    script.setAttribute("data-jitsu", "true");
    script.setAttribute("data-init-only", "true");

    var sessionId = sessionStorage.getItem("session_id") || null;
    var userId = localStorage.getItem("user_id") || null;
    var anonymousId = getCookie("__eventn_id");

    if (!sessionId) {
      sessionStorageIdSetter();
    }

    if (!userId) {
      userId = `user_id_${generateUUID()}`;
      localStorage.setItem("user_id", userId);
    }

    if (!anonymousId) {
      anonymousId = generateUUID();
      setCookie("__eventn_id", anonymousId);
    }

    setTimeout(() => {
      var sessionId = sessionStorage.getItem("session_id") || null;
      var userId = localStorage.getItem("user_id") || null;
      var anonymousId = getCookie("__eventn_id");

      if (!sessionId) {
        sessionStorageIdSetter();
      }

      if (!userId) {
        userId = `user_id_${generateUUID()}`;
        localStorage.setItem("user_id", userId);
      }

      if (!anonymousId) {
        anonymousId = generateUUID();
        setCookie("__eventn_id", anonymousId);
      }
    }, 1500);

    script.onload = function () {
      if (window.jitsu) {
        var payload = {
          path: pathname,
          session_id: sessionStorage.getItem("session_id") || "",
          userId: localStorage.getItem("user_id") || "",
        };
        var viewType = document.querySelector('meta[name="view-type"]');
        if (viewType && viewType.content) {
          payload.view_type = viewType.content;
        }
        window.jitsu.track("page_view", payload);
      }
    };

    // Append to head if body isn't ready
    (document.body || document.head).appendChild(script);
  }

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    loadJitsu(window.location.pathname);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      loadJitsu(window.location.pathname);
    });
  }

  window.addEventListener("jitsu:route-change", function (e) {
    loadJitsu(e.detail.pathname || window.location.pathname);
  });
})();
