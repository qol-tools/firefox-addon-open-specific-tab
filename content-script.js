(() => {
  const DEFAULTS = {
    blockPatterns: [],
    allowInEditable: true,
    blockWhenMeta: true,
  };

  let state = {
    blockPatterns: [],
    allowInEditable: true,
    blockWhenMeta: true,
    matchesCurrentUrl: false,
  };

  function stripScheme(url) {
    return url.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function wildcardToRegExp(pattern) {
    const escaped = escapeRegExp(pattern).replace(/\\\*/g, ".*");
    return new RegExp("^" + escaped + "$");
  }

  function matchWildcard(pattern, url) {
    if (!pattern) return false;
    const re = wildcardToRegExp(pattern);
    return re.test(url);
  }

  function matchesAnyPattern(url, patterns) {
    for (const raw of patterns) {
      const pattern = String(raw || "").trim();
      if (!pattern) continue;
      if (pattern.startsWith("#")) continue;
      if (matchWildcard(pattern, url)) return true;
      if (!pattern.includes("://")) {
        if (matchWildcard(pattern, stripScheme(url))) return true;
      }
    }
    return false;
  }

  function isEditableTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName ? target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    return false;
  }

  function updateUrlMatch() {
    state.matchesCurrentUrl = matchesAnyPattern(window.location.href, state.blockPatterns);
  }

  function shouldBlockEvent(e) {
    if (!state.matchesCurrentUrl) return false;
    if (state.blockWhenMeta && !e.metaKey) return false;
    if (state.allowInEditable && isEditableTarget(e.target)) return false;
    return true;
  }

  function onKeydown(e) {
    if (!shouldBlockEvent(e)) return;
    e.stopImmediatePropagation();
  }

  function installLocationHooks() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const ret = originalPushState.apply(this, args);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    history.replaceState = function (...args) {
      const ret = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("locationchange"));
    });
  }

  async function loadState() {
    try {
      const data = await browser.storage.sync.get(DEFAULTS);
      state.blockPatterns = Array.isArray(data.blockPatterns) ? data.blockPatterns : [];
      state.allowInEditable = Boolean(data.allowInEditable);
      state.blockWhenMeta = Boolean(data.blockWhenMeta);
      updateUrlMatch();
    } catch (err) {
      // Fail open: don't block if storage is unavailable
      state = { ...state, ...DEFAULTS, matchesCurrentUrl: false };
    }
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.blockPatterns) state.blockPatterns = changes.blockPatterns.newValue || [];
    if (changes.allowInEditable) state.allowInEditable = Boolean(changes.allowInEditable.newValue);
    if (changes.blockWhenMeta) state.blockWhenMeta = Boolean(changes.blockWhenMeta.newValue);
    updateUrlMatch();
  });

  installLocationHooks();
  window.addEventListener("locationchange", updateUrlMatch);

  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("keydown", onKeydown, true);

  loadState();
})();
