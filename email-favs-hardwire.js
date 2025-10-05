
// email-favs-hardwire.js
// Robust per-account Favorites with delete, using MutationObserver so it persists across re-renders.
// Works even if the core script re-writes the favorites block.
(function(){
  // --- Helpers: user id detection ---
  function favsUser(){
    try{ if (window.FAVS_USER_ID) return String(window.FAVS_USER_ID).trim(); }catch(_){}
    try{
      var g = window;
      var cand = (g.currentUser && (g.currentUser.username || g.currentUser.name || g.currentUser.email)) ||
                 (g.appUser && (g.appUser.username || g.appUser.name || g.appUser.email)) ||
                 (g.user && (g.user.username || g.user.name || g.user.email));
      if (cand) return String(cand).trim();
    }catch(_){}
    var el = document.body && document.body.getAttribute && document.body.getAttribute('data-username');
    if (el) return String(el).trim();
    try{
      var v = localStorage.getItem('username') || localStorage.getItem('user') || localStorage.getItem('user_name');
      if (v){ try{ var j = JSON.parse(v); if (j && (j.username||j.name||j.email)) return String(j.username||j.name||j.email).trim(); }catch(_){ return String(v).trim(); } }
    }catch(_){}
    return 'guest';
  }
  function k(){ return 'ep_favorites::' + favsUser(); }
  function dedupe(arr){ return Array.from(new Set((arr||[]).map(function(x){ return String(x||'').trim().toLowerCase(); }))).filter(Boolean); }
  function getLocal(){ try{ var raw=localStorage.getItem(k()); var a=JSON.parse(raw); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
  function setLocal(list){ try{ localStorage.setItem(k(), JSON.stringify(list||[])); }catch(_){ } }

  // --- Server API (optional; falls back to local if unavailable) ---
  function apiGet(user){
    return fetch('/.netlify/functions/favs-get?user=' + encodeURIComponent(user)).then(function(r){
      if (!r.ok) return [];
      return r.json().then(function(j){ return Array.isArray(j.favs)?j.favs:[]; }).catch(function(){ return []; });
    }).catch(function(){ return []; });
  }
  function apiSet(user, list){
    return fetch('/.netlify/functions/favs-set', {
      method: 'POST', headers: { 'content-type':'application/json' },
      body: JSON.stringify({ user:user, favs:list })
    }).catch(function(){ /* ignore */ });
  }

  // --- Rendering ---
  function ensureStyles(){
    if (document.getElementById('ep-fav-styles-hardwire')) return;
    var st = document.createElement('style'); st.id='ep-fav-styles-hardwire';
    st.textContent = [
      '#ep-mail-favs .fav-item{ display:inline-flex; align-items:center; gap:6px; margin:4px 10px 4px 0; padding:2px 4px; border-radius:6px; }',
      '#ep-mail-favs .fav-item button.ep-del{ border:0; background:transparent; cursor:pointer; font-size:14px; line-height:1; padding:2px 4px; color:#6b7280; }',
      '#ep-mail-favs .fav-item button.ep-del:hover{ color:#ef4444; }',
      '#ep-mail-favs label{ font-size:16px; }'
    ].join('\n');
    document.head.appendChild(st);
  }
  function render(list){
    ensureStyles();
    var wrap = document.getElementById('ep-mail-favs'); if (!wrap) return;
    if (!list || !list.length){
      wrap.innerHTML = '<div class="hint">No favorites yet. Add an email below, check "Save to favorites", then click Add.</div>';
      return;
    }
    wrap.innerHTML = '<div class="hint" style="margin-bottom:4px;">Favorites</div>' + list.map(function(e){
      var esc = String(e).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      return '<label class="fav-item"><input type="checkbox" class="ep-fav" value="'+esc+'"/> '+esc+' <button class="ep-del" title="Remove" data-email="'+esc+'">🗑️</button></label>';
    }).join('');
    // Bind deletes
    Array.prototype.forEach.call(wrap.querySelectorAll('button.ep-del'), function(btn){
      btn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        var email = (btn.getAttribute('data-email')||'').toLowerCase();
        if (!email) return;
        var now = getLocal().filter(function(x){ return x.toLowerCase() !== email; });
        now = dedupe(now);
        setLocal(now);
        render(now);
        apiSet(favsUser(), now);
      }, { capture:true });
    });
  }

  // --- Sync logic ---
  function syncAndRender(){
    var user = favsUser();
    var local = getLocal();
    render(local);
    // fetch remote async; merge on arrival
    apiGet(user).then(function(remote){
      if (!remote || !remote.length) return;
      var merged = dedupe([].concat(remote, getLocal()));
      setLocal(merged);
      render(merged);
    });
  }

  // --- Intercept Add button to save per-user & show immediately ---
  function interceptAdd(){
    var addBtn = document.getElementById('ep-add-btn');
    if (!addBtn || addBtn.__favHardwired) return;
    addBtn.__favHardwired = true;
    addBtn.addEventListener('click', function(){
      setTimeout(function(){
        var input = document.getElementById('ep-add-email');
        var save = document.getElementById('ep-add-save');
        var v = (input && input.value || '').trim();
        if (!v) return;
        if (save && save.checked){
          var merged = dedupe([].concat(getLocal(), v));
          setLocal(merged);
          render(merged);
          apiSet(favsUser(), merged);
        }
      }, 0);
    }, true);
  }

  // --- Observe overlay so we re-apply after any re-render ---
  var obs = new MutationObserver(function(){
    var wrap = document.getElementById('ep-mail-favs');
    if (wrap){
      // If core code just re-rendered, re-sync ours
      syncAndRender();
      interceptAdd();
    }
  });

  function start(){
    try{
      var overlay = document.getElementById('ep-mail-wrap') || document.getElementById('ep-overlay') || document.body;
      obs.observe(overlay, { childList:true, subtree:true });
    }catch(_){}
  }

  // Kick off when Email overlay opens, and also on DOM ready
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t) return;
    if (t.id === 'ep-email' || (t.closest && t.closest('#ep-email'))){
      setTimeout(function(){ syncAndRender(); interceptAdd(); start(); }, 60);
    }
  }, true);

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ start(); });
  } else {
    start();
  }
})();
