/* introspect.js v1 — lists globals & tries obvious entry points */
(function(){
  function log(msg){
    var el = document.getElementById('dbg-log');
    if (!el) return;
    var t=new Date().toLocaleTimeString();
    el.textContent += "\n["+t+"] " + msg;
    el.scrollTop = el.scrollHeight;
  }

  function listGlobals(){
    const funcs=[], objs=[];
    for (const k in window){
      try {
        const v = window[k];
        if (typeof v === 'function') funcs.push(k);
        else if (v && typeof v === 'object') objs.push(k);
      } catch(_){}
    }
    funcs.sort();
    objs.sort();
    log('Globals(functions): ' + funcs.slice(0,120).join(', '));
    log('Globals(objects): ' + objs.slice(0,80).join(', '));
  }

  function tryStateRender(){
    try {
      if (window.state && typeof window.state === 'object') {
        log('state keys: ' + Object.keys(window.state).join(', '));
        const cands = ['render','refresh','update','mount','init'];
        for (const n of cands){
          const maybe = window.state[n];
          if (typeof maybe === 'function') {
            log('Calling state.'+n+'()');
            try { maybe(); log('state.'+n+'() ok'); return true; } catch(e){ log('state.'+n+'() error: '+e.message); }
          }
        }
      }
    } catch(e){ log('tryStateRender error: '+e.message); }
    return false;
  }

  function run(){
    listGlobals();
    if (!tryStateRender()) {
      const names = ['render','refresh','update','mount','init','boot','start','rebuild','redraw','repaint','renderMain','showMain','showHome','viewMain'];
      for (const n of names){
        if (typeof window[n] === 'function'){
          log('Calling '+n+'()');
          try { window[n](); log(n+'() ok'); return; } catch(e){ log(n+'() error: '+e.message); }
        }
      }
      log('No obvious render found. Look for a function name in the logs above.');
    }
  }

  window.addEventListener('serializer-ready', run, { once: true });
  setTimeout(run, 400);
})();