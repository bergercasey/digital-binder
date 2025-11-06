/* save-manager.js v8 (self-HUD, aggressive hydration, never wipes) */
(function () {
  // --- Lightweight HUD injected dynamically so index.html doesn't need edits ---
  const HUD = (() => {
    const wrap = document.createElement('div');
    wrap.id = 'dbg';
    wrap.style.cssText = [
      'position:fixed','left:8px','right:8px','bottom:8px','z-index:99999',
      'background:rgba(0,0,0,.85)','color:#fff','padding:8px 10px','border-radius:10px',
      'font:12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'box-shadow:0 4px 16px rgba(0,0,0,.35)'
    ].join(';');
    wrap.innerHTML = '<b style="color:#9cf">Status:</b> <span id="dbg-status">Booting…</span> <small>(tap to hide)</small><pre id="dbg-log" style="margin:6px 0 0; max-height:30vh; overflow:auto; white-space:pre-wrap"></pre>';
    wrap.addEventListener('click', () => wrap.remove());
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(wrap));
    const logEl = () => document.getElementById('dbg-log');
    const statusEl = () => document.getElementById('dbg-status');
    return {
      set(t){ const el = statusEl(); if (el) el.textContent = t; },
      log(m){ const el = logEl(); if (!el) return; const time = new Date().toLocaleTimeString(); el.textContent += `\n[${time}] ${m}`; el.scrollTop = el.scrollHeight; }
    };
  })();

  const LS_KEY = 'binder-data';

  async function netlifyLoad() {
    try {
      const res = await fetch('/.netlify/functions/load', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      HUD.log('Cloud load OK ('+ text.length +' bytes)');
      return text;
    } catch (e) {
      HUD.log('Cloud load failed: ' + e.message);
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
      HUD.log('Cloud save OK');
      return true;
    } catch (e) {
      HUD.log('Cloud save failed: ' + e.message);
      return false;
    }
  }

  function lsGet() {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) HUD.log('Loaded from localStorage ('+ s.length +' bytes)');
      return s;
    } catch { return null; }
  }
  function lsSet(raw) {
    try { localStorage.setItem(LS_KEY, raw); HUD.log('Saved to localStorage'); } catch {}
  }

  let hydrated = false;
  function hydrate(raw) {
    if (hydrated) return;
    try {
      // Preferred: app-defined hook
      if (typeof window.deserializeAppState === 'function') {
        window.deserializeAppState(raw);
        HUD.log('Deserialized via app hook.');
      } else {
        // Fallbacks: populate a common global and dispatch an event many apps listen for
        window.__APP_STATE__ = JSON.parse(raw);
        try { document.dispatchEvent(new CustomEvent('data:available', { detail: window.__APP_STATE__ })); } catch {}
        if (typeof window.render === 'function') {
          window.render();
          HUD.log('Rendered via global render().');
        } else {
          HUD.log('No deserialize/render found; state placed at window.__APP_STATE__.');
        }
      }
      hydrated = true;
      HUD.set('Ready');
      try { document.dispatchEvent(new Event('data:hydrated')); } catch(_) {}
    } catch (e) {
      HUD.set('Ready (with warnings)');
      HUD.log('Hydrate error: ' + e.message);
    }
  }

  async function loadData() {
    HUD.set('Loading…');
    let raw = await netlifyLoad();
    if (!raw) raw = lsGet();
    if (!raw) {
      HUD.log('No existing data found. Using defaults.');
      raw = JSON.stringify({ contractors: [], jobs: [], settings: {} });
    }
    window.__PENDING_DATA__ = raw;
    // Hydrate soon regardless of app ready signal
    setTimeout(() => hydrate(raw), 400);
    document.addEventListener('app:ready', () => hydrate(raw), { once: true });
  }

  async function saveNow() {
    try {
      const raw = (typeof window.serializeAppState === 'function') ? window.serializeAppState() : JSON.stringify(window.__APP_STATE__ || {});
      if (!raw) return;
      lsSet(raw);
      await netlifySave(raw);
    } catch (e) {
      HUD.log('Save error: ' + e.message);
    }
  }

  // Expose a throttled autosave for your handlers
  let t=null;
  window.requestAutosave = function () {
    if (t) cancelAnimationFrame(t);
    t = requestAnimationFrame(saveNow);
  };

  // Boot
  loadData();
})();