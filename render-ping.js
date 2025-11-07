/* render-ping.js v1 */
(function(){
  function hud(msg){
    var el=document.getElementById('dbg-log');
    if(!el) return;
    var t=new Date().toLocaleTimeString();
    el.textContent += "\n["+t+"] " + msg;
    el.scrollTop = el.scrollHeight;
  }
  function status(txt){
    var s=document.getElementById('dbg-status');
    if(s) s.textContent=txt;
  }
  function tryCall(fn){
    try { fn(); return true; } catch(e){ hud('Call threw: '+(e && e.message)); return false; }
  }
  function candidates(){
    const names = ['render','refresh','update','mount','init','boot','start','renderMain','showMain','showHome','viewMain','rebuild','redraw','repaint','initUI','rebuildUI','main','home','openHome','openMain'];
    const found = [];
    names.forEach(n => { if (typeof window[n] === 'function') found.push(n); });
    Object.keys(window).forEach(k => {
      if (typeof window[k] === 'function') {
        const low = k.toLowerCase();
        if (/render|refresh|update|mount|init|rebuild|redraw|home|main/.test(low)) {
          if (!found.includes(k)) found.push(k);
        }
      }
    });
    return found;
  }
  function clickers(){
    return ['#homeBtn','.btn-home','button[title="Home"]','[data-action="home"]','nav a[href="#/home"]','button#home','a#home','button.primary','button.ghost'];
  }
  function runOnce(){
    try {
      window.state = window.state || {};
      window.state.ui = window.state.ui || {};
      if (!window.state.ui.view) window.state.ui.view = 'main';
    } catch(_){}
    const c = candidates();
    hud('Render ping: candidates [' + c.join(', ') + ']');
    for (let i=0;i<c.length;i++){
      const name = c[i];
      if (typeof window[name] === 'function'){
        hud('Trying ' + name + '()');
        if (tryCall(window[name])){ status('Ready'); hud('Success via ' + name + '()'); return; }
      }
    }
    const sels = clickers();
    for (let i=0;i<sels.length;i++){
      try {
        const el = document.querySelector(sels[i]);
        if (el){ el.click(); status('Ready'); hud('Triggered click on ' + sels[i]); return; }
      } catch(_){}
    }
    hud('Render ping did not find a callable entry yet. Will retry…');
  }
  function start(){
    runOnce();
    let attempts = 0;
    const t = setInterval(() => {
      attempts++;
      if (attempts > 6) return clearInterval(t);
      runOnce();
    }, 500);
  }
  window.addEventListener('app:ready', start);
  window.addEventListener('serializer-ready', start);
  setTimeout(start, 300);
})();