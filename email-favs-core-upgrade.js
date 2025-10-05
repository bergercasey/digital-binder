
// email-favs-core-upgrade.js
// Per-account favorites + delete, integrated by overlay hooks (no core edits required).
(function(){
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
  function favsKey(user){ return 'ep_favorites::' + user; }
  function favsDedupe(arr){ return Array.from(new Set((arr||[]).map(function(x){ return String(x||'').trim().toLowerCase(); }))).filter(Boolean); }
  function favsGetLocal(user){
    try{ var raw = localStorage.getItem(favsKey(user)); var arr = JSON.parse(raw); return Array.isArray(arr)?arr:[]; }catch(_){ return []; }
  }
  function favsSetLocal(user, list){ try{ localStorage.setItem(favsKey(user), JSON.stringify(list||[])); }catch(_){ } }
  async function favsFetch(user){
    try{
      const r = await fetch('/.netlify/functions/favs-get?user='+encodeURIComponent(user));
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      return Array.isArray(j.favs) ? j.favs : [];
    }catch(e){ console.warn('[favorites] fetch failed', e); return null; }
  }
  async function favsSave(user, list){
    try{
      await fetch('/.netlify/functions/favs-set', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ user:user, favs:list })
      });
    }catch(e){ console.warn('[favorites] save failed', e); }
  }
  function favsEnsureStyles(){
    if (document.getElementById('ep-fav-styles')) return;
    const st = document.createElement('style'); st.id='ep-fav-styles';
    st.textContent = [
      '#ep-mail-favs .fav-item{ display:inline-flex; align-items:center; gap:6px; margin:4px 10px 4px 0; padding:2px 4px; border-radius:6px; }',
      '#ep-mail-favs .fav-item button.ep-del{ border:0; background:transparent; cursor:pointer; font-size:14px; line-height:1; padding:2px 4px; color:#6b7280; }',
      '#ep-mail-favs .fav-item button.ep-del:hover{ color:#ef4444; }',
      '#ep-mail-favs label{ font-size:16px; }'
    ].join('\\n');
    document.head.appendChild(st);
  }
  function favsRender(list){
    favsEnsureStyles();
    const wrap = document.getElementById('ep-mail-favs'); if (!wrap) return;
    if (!list || !list.length){
      wrap.innerHTML = '<div class="hint">No favorites yet. Add an email below, check "Save to favorites", then click Add.</div>';
      return;
    }
    wrap.innerHTML = '<div class="hint" style="margin-bottom:4px;">Favorites</div>' + list.map(function(e){
      const esc = String(e).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      return '<label class="fav-item"><input type="checkbox" class="ep-fav" value="'+esc+'"/> '+esc+' <button class="ep-del" title="Remove" data-email="'+esc+'">🗑️</button></label>';
    }).join('');
    // Bind delete buttons
    Array.prototype.forEach.call(wrap.querySelectorAll('button.ep-del'), function(btn){
      btn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const email = (btn.getAttribute('data-email')||'').toLowerCase();
        if (!email) return;
        favsRemove(email);
      }, { capture:true });
    });
  }
  async function favsLoadAndRender(){
    const user = favsUser();
    const local = favsGetLocal(user);
    favsRender(local);
    const remote = await favsFetch(user);
    if (remote){
      const merged = favsDedupe([].concat(remote, local));
      favsSetLocal(user, merged);
      favsRender(merged);
    }
  }
  function favsAdd(email){
    const user = favsUser();
    const merged = favsDedupe([].concat(favsGetLocal(user), String(email||'').trim()));
    favsSetLocal(user, merged);
    favsRender(merged);
    favsSave(user, merged);
  }
  function favsRemove(email){
    const user = favsUser();
    const filtered = favsGetLocal(user).filter(function(x){ return String(x).toLowerCase() !== String(email).toLowerCase(); });
    favsSetLocal(user, filtered);
    favsRender(filtered);
    favsSave(user, favsDedupe(filtered));
  }

  // Hook: when overlay opens, sync and render
  document.addEventListener('click', function(ev){
    var t = ev.target;
    if (!t) return;
    if (t.id === 'ep-email' || (t.closest && t.closest('#ep-email'))){
      setTimeout(favsLoadAndRender, 50);
    }
  }, true);

  // Hook: intercept Add button to use our per-user save (if element exists)
  document.addEventListener('click', function(ev){
    var t = ev.target;
    if (!t) return;
    if (t.id === 'ep-add-btn'){
      setTimeout(function(){
        var input = document.getElementById('ep-add-email');
        var save = document.getElementById('ep-add-save');
        var val = (input && input.value || '').trim();
        if (!val) return;
        if (save && save.checked){ favsAdd(val); }
        if (input) input.value = '';
      }, 0);
    }
  }, true);
})();
