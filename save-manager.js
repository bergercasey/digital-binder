/* save-manager.js v6 (tablet-safe, never wipes data) */
(function () {
  const LS_KEY = 'binder-data';
  const STATUS = {
    set(t){ const el = document.getElementById('dbg-status'); if (el) el.textContent = t; },
    log(m){ if (window.__log) window.__log(m); }
  };

  async function netlifyLoad() {
    try {
      const res = await fetch('/.netlify/functions/load', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      STATUS.log('Cloud load OK ('+ text.length +' bytes)');
      return text;
    } catch (e) {
      STATUS.log('Cloud load failed: ' + e.message);
      return null;
    }
  }

  async function netlifySave(raw) {
    try {
      const res = await fetch('/.netlify/functions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: raw
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      STATUS.log('Cloud save OK');
      return true;
    } catch (e) {
      STATUS.log('Cloud save failed: ' + e.message);
      return false;
    }
  }

  function lsGet() {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) STATUS.log('Loaded from localStorage ('+ s.length +' bytes)');
      return s;
    } catch { return null; }
  }
  function lsSet(raw) {
    try { localStorage.setItem(LS_KEY, raw); STATUS.log('Saved to localStorage'); } catch {}
  }

  async function loadData() {
    STATUS.set('Loading…');
    // 1) Try cloud
    let raw = await netlifyLoad();
    // 2) Fallback to localStorage
    if (!raw) raw = lsGet();
    // 3) Final fallback to empty default (but do NOT overwrite existing storage yet)
    if (!raw) {
      STATUS.log('No existing data found. Using defaults.');
      raw = JSON.stringify({ contractors: [], jobs: [], settings: {} });
    }
    // publish to app once ready
    function publish() {
      try {
        if (typeof window.deserializeAppState === 'function') {
          window.deserializeAppState(raw);
        } else {
          // Minimal compatibility: place on a global
          window.__APP_STATE__ = JSON.parse(raw);
          if (typeof window.render === 'function') window.render();
        }
        STATUS.set('Ready');
      } catch (e) {
        STATUS.set('Ready (with warnings)');
        STATUS.log('Deserialize error: ' + e.message);
      }
    }
    if (window.__APP_READY__) publish();
    else document.addEventListener('app:ready', publish, { once: true });
  }

  async function saveNow() {
    try {
      const raw = (typeof window.serializeAppState === 'function') ? window.serializeAppState() : JSON.stringify(window.__APP_STATE__ || {});
      if (!raw) return;
      lsSet(raw);               // always save locally
      await netlifySave(raw);   // try cloud (ignore failure)
    } catch (e) {
      STATUS.log('Save error: ' + e.message);
    }
  }

  // Expose a throttled autosave
  let t=null;
  window.requestAutosave = function () {
    if (t) cancelAnimationFrame(t);
    t = requestAnimationFrame(saveNow);
  };

  // Start
  loadData();

  // Debug helpers (for tablet without console)
  window.__dump = function () {
    const raw = lsGet();
    STATUS.log('Dump len=' + (raw ? raw.length : 0));
    return raw;
  };
})();
