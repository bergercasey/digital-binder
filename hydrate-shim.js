/* hydrate-shim.js v2 (strong refresh after merge) */
(function () {
  function deepMerge(target, src) {
    if (!src || typeof src !== 'object') return target;
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) {
          target[k] = {};
        }
        deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }
    return target;
  }

  function callNamed(names) {
    for (const n of names) {
      try {
        if (typeof window[n] === 'function') { window[n](); return n; }
      } catch (_) {}
    }
    return null;
  }

  function install() {
    if (typeof window.deserializeAppState === 'function') return;
    window.deserializeAppState = function (raw) {
      try {
        var incoming = (typeof raw === 'string') ? JSON.parse(raw) : raw;
        if (!incoming || typeof incoming !== 'object') return;

        if (!window.state || typeof window.state !== 'object') window.state = {};
        deepMerge(window.state, incoming);
        window.__APP_STATE__ = window.state;

        try { document.dispatchEvent(new CustomEvent('data:available', { detail: window.state })); } catch (_){}
        try { document.dispatchEvent(new Event('state:updated')); } catch (_){}

        const hit = callNamed(['render','refresh','update','mount','init','boot','start','rebuild','redraw','showMain','initUI','repaint','rebuildUI']);

        if (!hit) {
          var homeBtn = document.querySelector('#homeBtn, .btn-home, button[title="Home"], [data-action="home"], button:contains("Home")');
          if (homeBtn) { try { homeBtn.click(); } catch(_){ } }
        }

        try { document.dispatchEvent(new Event('app:ready')); } catch (_){}
      } catch (e) {
        console.error('deserializeAppState error:', e);
      }
    };
  }

  install();
  window.addEventListener('serializer-ready', install, { once: true });
})();