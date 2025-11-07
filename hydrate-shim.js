/* hydrate-shim.js v3 (force-view + broad refresh triggers) */
(function () {
  function deepMerge(target, src) {
    if (!src || typeof src !== 'object') return target;
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
        deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }
    return target;
  }

  function callFirst(names) {
    for (const n of names) {
      try {
        if (typeof window[n] === 'function') { window[n](); return n; }
      } catch (_) {}
    }
    return null;
  }

  function tryClick(selList) {
    for (const sel of selList) {
      try {
        const el = document.querySelector(sel);
        if (el) { el.click(); return sel; }
      } catch(_) {}
    }
    return null;
  }

  function install() {
    if (typeof window.deserializeAppState === 'function') return;

    window.deserializeAppState = function (raw) {
      try {
        var incoming = (typeof raw === 'string') ? JSON.parse(raw) : raw;
        if (!incoming || typeof incoming !== 'object') return;

        // Ensure a global state object exists, then deeply merge
        if (!window.state || typeof window.state !== 'object') window.state = {};
        deepMerge(window.state, incoming);

        // Force a sane default view if your app uses state.ui.view
        if (!window.state.ui) window.state.ui = {};
        if (!window.state.ui.view) window.state.ui.view = 'main';
        window.__APP_STATE__ = window.state;

        // Broadcast data-available signals
        try { document.dispatchEvent(new CustomEvent('data:available', { detail: window.state })); } catch (_){}
        try { document.dispatchEvent(new Event('state:updated')); } catch (_){}

        // Try the most common render entry points
        const hit = callFirst([
          'render','refresh','update','mount','init','boot','start',
          'renderMain','showMain','showHome','viewMain','rebuild','redraw','repaint',
          'initUI','rebuildUI'
        ]);

        // Nudge SPA routers
        try { window.location.hash = '#/home'; } catch(_){}
        try { window.dispatchEvent(new Event('hashchange')); } catch(_){}
        try { window.dispatchEvent(new Event('popstate')); } catch(_){}

        // Try clicking a home/main button
        const clicked = tryClick([
          '#homeBtn', '.btn-home', 'button[title="Home"]', '[data-action="home"]',
          'nav a[href="#/home"]', 'button#home', 'a#home'
        ]);

        // Announce app ready
        try { document.dispatchEvent(new Event('app:ready')); } catch (_){}
      } catch (e) {
        console.error('deserializeAppState error:', e);
      }
    };
  }

  install();
  window.addEventListener('serializer-ready', install, { once: true });
})();