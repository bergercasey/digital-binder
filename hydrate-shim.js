/* hydrate-shim.js v4 (diagnostic + smart mapping) */
(function () {
  function hud(msg){
    var el=document.getElementById('dbg-log');
    if(!el) return;
    var t=new Date().toLocaleTimeString();
    el.textContent += "\n["+t+"] " + msg;
    el.scrollTop = el.scrollHeight;
  }

  // Try to adapt different shapes: {contractors,...}, {data:{...}}, {binder:{...}}
  function pickPayload(obj){
    if (!obj || typeof obj !== 'object') return obj;
    if (obj.contractors || obj.jobs || obj.settings) return obj;
    if (obj.data && (obj.data.contractors || obj.data.jobs || obj.data.settings)) return obj.data;
    if (obj.binder && (obj.binder.contractors || obj.binder.jobs || obj.binder.settings)) return obj.binder;
    return obj;
  }

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

  function install(){
    // install once
    window.deserializeAppState = function(raw){
      try{
        var incoming = (typeof raw === 'string') ? JSON.parse(raw) : raw;
        hud('Incoming keys: ' + Object.keys(incoming || {}).join(', '));
        var payload = pickPayload(incoming);
        hud('Payload keys: ' + Object.keys(payload || {}).join(', '));
        // Log sizes to confirm data presence
        try{
          hud('Sizes: contractors=' + ((payload&&payload.contractors&&payload.contractors.length)||0) +
              ', jobs=' + ((payload&&payload.jobs&&payload.jobs.length)||0) +
              ', settings=' + (payload&&payload.settings ? 'yes':'no'));
        }catch(_){}

        // Prefer REPLACE to keep exact shape then merge UI back if needed
        var prev = (window.state && window.state.ui) ? { ui: window.state.ui } : {};
        window.state = payload || {};
        // ensure ui object exists
        window.state.ui = window.state.ui || prev.ui || { view:'main' };
        window.__APP_STATE__ = window.state;

        // Broadcast
        try { document.dispatchEvent(new CustomEvent('data:available', { detail: window.state })); } catch(_){}
        try { document.dispatchEvent(new Event('state:updated')); } catch(_){}

        // If app exposes a render hook, call it
        if (typeof window.render === 'function') { window.render(); hud('Called window.render()'); }
        else if (typeof window.renderAll === 'function') { window.renderAll(); hud('Called window.renderAll()'); }
        else if (typeof window.renderMain === 'function') { window.renderMain(); hud('Called window.renderMain()'); }
        else {
          // As a fallback, force a one-time reload so app boots reading LS
          try { localStorage.setItem('binder-data', JSON.stringify(incoming)); } catch(_){}
          if (!sessionStorage.getItem('v4_reloaded')){
            sessionStorage.setItem('v4_reloaded','1');
            hud('No render hook. Forcing a one-time reload to boot from LS…');
            location.reload();
            return;
          }
        }

        try { document.dispatchEvent(new Event('app:ready')); } catch(_){}
      }catch(e){
        console.error('deserializeAppState error:', e);
        hud('deserialize error: ' + e.message);
      }
    };
  }

  // install immediately
  install();
})();