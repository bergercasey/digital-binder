/* hydrate-shim.js (adds deserializeAppState without editing app.js) */
(function () {
  function install() {
    if (typeof window.deserializeAppState === 'function') return;
    window.deserializeAppState = function (raw) {
      try {
        var incoming = (typeof raw === 'string') ? JSON.parse(raw) : raw;
        if (!incoming || typeof incoming !== 'object') return;
        if (window.state && typeof window.state === 'object') {
          Object.assign(window.state, incoming);
        } else {
          window.state = incoming;
        }
        if (typeof window.render === 'function') window.render();
        else if (typeof window.mount === 'function') window.mount();
        else if (typeof window.update === 'function') window.update();
        try { document.dispatchEvent(new Event('app:ready')); } catch (_){}
      } catch (e) {
        console.error('deserializeAppState error:', e);
      }
    };
  }
  install();
  window.addEventListener('serializer-ready', install, { once: true });
})();