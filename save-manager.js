/* save-manager.js v10 (hybrid loader: cloud -> localStorage, hydrate on 'serializer-ready') */
(function () {
  const LS_KEY = 'binder-data';

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

  function lsGet() { try { return localStorage.getItem(LS_KEY); } catch { return null; } }
  function lsSet(raw) { try { localStorage.setItem(LS_KEY, raw); HUD.log('Saved to localStorage'); } catch {} }

  function hydrateWith(raw) {
    try {
      if (typeof window.deserializeAppState === 'function') {
        window.deserializeAppState(raw);
        HUD.log('Deserialized via app hook.');
      } else {
        window.__APP_STATE__ = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof window.render === 'function') {
          window.render();
          HUD.log('Rendered via global render().');
        } else {
          HUD.log('No deserialize/render found; state placed at window.__APP_STATE__.');
        }
      }
      HUD.set('Ready');
    } catch (e) {
      HUD.set('Ready (with warnings)');
      HUD.log('Hydrate error: ' + e.message);
    }
  }

  async function loadAndHydrate() {
    HUD.set('Loading…');
    let raw = await netlifyLoad();
    if (!raw) raw = lsGet();
    if (!raw) {
      HUD.log('No existing data found. Using defaults.');
      raw = JSON.stringify({ contractors: [], jobs: [], settings: {} });
    }
    lsSet(raw);

    const tryHydrate = () => hydrateWith(raw);
    document.addEventListener('serializer-ready', tryHydrate, { once: true });
    setTimeout(tryHydrate, 200);
    setTimeout(tryHydrate, 1000);
  }

  loadAndHydrate();

  let t=null;
  window.requestAutosave = function () {
    if (t) cancelAnimationFrame(t);
    t = requestAnimationFrame(() => {
      try {
        const raw = (typeof window.serializeAppState === 'function')
          ? JSON.stringify(window.serializeAppState())
          : JSON.stringify(window.__APP_STATE__ || {});
        if (!raw) return;
        lsSet(raw);
        try { navigator.sendBeacon('/.netlify/functions/save', new Blob([raw], { type:'application/json' })); } catch {}
      } catch (e) {
        HUD.log('Autosave error: ' + e.message);
      }
    });
  };
})();