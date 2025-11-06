// save-manager.js — build5 (patient boot)
(function(){
  const CSS = `#saveHud{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);padding:8px 12px;border-radius:10px;background:rgba(20,24,38,.95);color:#fff;font:14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);z-index:9999}
  #saveHud.ok{background:#124c20}#saveHud.saving{background:#141826}#saveHud.offline{background:#593100}#saveHud.stale{background:#5a102a}#saveHud.error{background:#5a1010}#saveHud.wait{background:#2b2f45}`;

  function injectHUD(){
    if(document.getElementById('saveHud')) return;
    const style=document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const hud=document.createElement('div'); hud.id='saveHud'; hud.hidden=false; hud.className='wait';
    const span=document.createElement('span'); span.id='saveHudText'; span.textContent='Waiting for app…';
    hud.appendChild(span); document.body.appendChild(hud);
  }
  const $hud=()=>document.getElementById('saveHud');
  const $txt=()=>document.getElementById('saveHudText');
  function hud(state, text){
    const el=$hud(); if(!el) return;
    el.className = state; if($txt()) $txt().textContent = text||'';
    el.hidden = false; if(state==='ok') setTimeout(()=>{ el.hidden = true; }, 1200);
  }

  const SaveManager=(function(){
    let serverVersion=0, inFlight=false, pending=null;
    async function init(){
      try{
        const r = await fetch('/.netlify/functions/load', { cache:'no-store' });
        if(r.ok){
          const data = await r.json();
          serverVersion = (data && data.serverVersion) || 0;
          window._serverVersion = serverVersion;
        }
      }catch(_){}
    }
    function queueSave(snapshot){ pending = snapshot; tick(); }
    async function tick(){
      if(inFlight || !pending) return;
      const snapshot = pending; pending = null;
      const payload = { ...snapshot, serverVersion: (window._serverVersion ?? serverVersion) };
      inFlight = true; hud('saving','Saving to cloud…');
      try{
        const r = await fetch('/.netlify/functions/save', {
          method:'POST',
          headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
          body: JSON.stringify(payload),
          keepalive: true
        });
        const raw = await r.text(); let body=null; try{ body = JSON.parse(raw) }catch{}
        if(r.status===200 && body && body.ok){
          serverVersion = body.serverVersion || (serverVersion+1);
          window._serverVersion = serverVersion;
          hud('ok','Saved to cloud');
        }else if(r.status===409){
          hud('stale','Newer copy on server — tap to reload'); 
          $hud().onclick = ()=>location.reload();
        }else if(r.status===400){
          hud('error','Save rejected');
          console.warn('Save 400', raw);
        }else{
          hud('error',`Save error ${r.status}`);
          console.warn('Save error', r.status, raw);
        }
      }catch(e){
        hud('offline','Offline — will retry…');
        pending = snapshot; setTimeout(tick, 1500);
      }finally{
        inFlight=false; if(pending) setTimeout(tick, 75);
      }
    }
    return { init, queueSave };
  })();

  function hasSerializer(){ return (typeof window.serializeAppState === 'function'); }

  function startWithSerializer(){
    const serializer = window.serializeAppState;
    if(!serializer){ hud('error','Configure serializeAppState()'); return; }
    SaveManager.init();
    const debounced=(function(fn,ms){ let t; return ()=>{ clearTimeout(t); t=setTimeout(fn,ms); }; })(()=>{
      try{
        const snap = serializer();
        if(!snap || typeof snap!=='object'){ hud('error','serializeAppState() returned nothing'); return; }
        SaveManager.queueSave(snap);
      }catch(err){ hud('error','serializeAppState() failed'); console.error(err); }
    }, 250);
    ['input','change'].forEach(evt=> document.addEventListener(evt, debounced, true));
    hud('ok','Ready');
  }

  function waitForSerializer(maxMs){
    const started = Date.now();
    function check(){
      if(hasSerializer()){ startWithSerializer(); return; }
      if(Date.now() - started >= maxMs){ hud('error','Configure serializeAppState()'); return; }
      setTimeout(check, 250);
    }
    check();
  }

  function boot(){
    injectHUD();
    if(hasSerializer()){ startWithSerializer(); }
    else {
      hud('wait','Waiting for app…');
      window.addEventListener('serializer-ready', ()=>{
        if(hasSerializer()) startWithSerializer();
      }, { once:true });
      waitForSerializer(15000);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();