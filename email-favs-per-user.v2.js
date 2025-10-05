
// email-favs-per-user.v2.js
(function(){
  function fromCookies(){
    try{
      var c = document.cookie || "";
      var obj = {}; c.split(';').forEach(function(p){ var kv = p.split('='); if(kv.length>=2){ obj[kv[0].trim()] = decodeURIComponent(kv.slice(1).join('=')); } });
      var keys = ['username','user','user_name','email','account','uid','authuser'];
      for (var i=0;i<keys.length;i++){ if (obj[keys[i]]) return obj[keys[i]].trim(); }
    }catch(_){}
    return "";
  }
  function fromStorage(){
    try{
      var keys = ['FAVS_USER_ID','username','user_name','user','email','account','authUser','currentUser','appUser'];
      for (var i=0;i<keys.length;i++){
        var v = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
        if (!v) continue;
        try{
          var j = JSON.parse(v);
          if (j && typeof j==='object'){
            var cand = j.username || j.user || j.name || j.email || j.id;
            if (cand) return String(cand).trim();
          }
        }catch(_){
          return String(v).trim();
        }
      }
    }catch(_){}
    return "";
  }
  function fromGlobals(){
    try{
      var g = window;
      if (g.FAVS_USER_ID) return String(g.FAVS_USER_ID).trim();
      var cand = (g.currentUser && (g.currentUser.username || g.currentUser.name || g.currentUser.email)) ||
                 (g.appUser && (g.appUser.username || g.appUser.name || g.appUser.email)) ||
                 (g.user && (g.user.username || g.user.name || g.user.email));
      if (cand) return String(cand).trim();
    }catch(_){}
    return "";
  }
  function fromDOM(){
    var el = document.querySelector('[data-username]') || document.getElementById('user-name') || document.querySelector('.user-name, .username');
    if (el && el.textContent) return el.textContent.trim();
    var meta = document.querySelector('meta[name="user"], meta[name="username"], meta[name="account"]');
    if (meta && meta.getAttribute('content')) return meta.getAttribute('content').trim();
    var h = document.body && document.body.innerText || "";
    var m = h.match(/\(([^)]+)\)\s*Logout/i);
    if (m) return m[1].trim();
    return "";
  }
  function detectUser(){
    var u = fromGlobals() || fromDOM() || fromStorage() || fromCookies();
    if (!u) u = 'guest';
    return u;
  }
  function apiGet(user){
    return fetch('/.netlify/functions/favs-get?user=' + encodeURIComponent(user)).then(r => r.ok ? r.json() : r.text().then(t => { throw new Error(t); }));
  }
  function apiSet(user, list){
    return fetch('/.netlify/functions/favs-set', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ user: user, favs: list })
    }).then(r => r.ok ? r.json() : r.text().then(t => { throw new Error(t); }));
  }
  function keyFor(user){ return 'ep_favorites::' + user; }
  function getLocal(user){
    try { 
      var raw = localStorage.getItem(keyFor(user));
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch(_) { return []; }
  }
  function setLocal(user, list){
    try { localStorage.setItem(keyFor(user), JSON.stringify(list||[])); } catch(_) {}
  }
  function dedupe(arr){ return Array.from(new Set((arr||[]).map(function(x){ return String(x||'').trim().toLowerCase(); }))).filter(Boolean); }

  function ensureFavStyles(){
    if (document.getElementById('ep-fav-styles')) return;
    var st = document.createElement('style'); st.id = 'ep-fav-styles';
    st.textContent = [
      '#ep-mail-favs .fav-item{ display:inline-flex; align-items:center; gap:6px; margin:4px 10px 4px 0; padding:2px 4px; border-radius:6px; }',
      '#ep-mail-favs .fav-item button.ep-del{ border:0; background:transparent; cursor:pointer; font-size:14px; line-height:1; padding:2px 4px; color:#6b7280; }',
      '#ep-mail-favs .fav-item button.ep-del:hover{ color:#ef4444; }'
    ].join('\n');
    document.head.appendChild(st);
  }

  var cache = { user: "", favs: [], loaded: false };

  function renderFavs(list){
    ensureFavStyles();
    var wrap = document.getElementById('ep-mail-favs');
    if (!wrap) return;
    if (!list || !list.length){
      wrap.innerHTML = '<div class="hint">No favorites yet. Add an email below, check "Save to favorites", then click Add.</div>';
      return;
    }
    wrap.innerHTML = '<div class="hint" style="margin-bottom:4px;">Favorites</div>' + list.map(function(e){
      var esc = String(e).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      return '<label class="fav-item"><input type="checkbox" class="ep-fav" value="'+esc+'"/> '+esc+' <button class="ep-del" title="Remove" data-email="'+esc+'">🗑️</button></label>';
    }).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('button.ep-del'), function(btn){
      btn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        var email = (btn.getAttribute('data-email') || '').toLowerCase();
        if (!email) return;
        removeFav(email);
      }, { capture: true });
    });
  }

  function removeFav(email){
    var user = cache.user || detectUser();
    var current = cache.loaded ? cache.favs.slice() : getLocal(user);
    var filtered = current.filter(function(x){ return String(x).toLowerCase() !== String(email).toLowerCase(); });
    filtered = dedupe(filtered);
    cache = { user:user, favs: filtered, loaded:true };
    setLocal(user, filtered);
    renderFavs(filtered);
    apiSet(user, filtered).catch(function(e){ console.warn('[favorites] delete failed', e); });
  }

  function addAndPersist(email){
    var user = cache.user || detectUser();
    var current = cache.loaded ? cache.favs.slice() : getLocal(user);
    current.push(String(email||'').trim().toLowerCase());
    var merged = dedupe(current);
    cache = { user: user, favs: merged, loaded: true };
    setLocal(user, merged);
    renderFavs(merged);
    apiSet(user, merged).catch(function(e){ console.warn('[favorites] save failed', e); });
  }

  (function migrate(){
    try{
      var user = detectUser();
      var raw = localStorage.getItem('ep_favorites');
      if (raw){
        var arr = []; try{ arr = JSON.parse(raw); }catch(_){}
        if (Array.isArray(arr) && arr.length){
          var merged = dedupe((getLocal(user) || []).concat(arr));
          setLocal(user, merged);
          localStorage.removeItem('ep_favorites');
        }
      }
    }catch(_){}
  })();

  async function syncOnOpen(){
    var user = detectUser();
    cache.user = user;
    var first = getLocal(user);
    renderFavs(first);
    try{
      var res = await apiGet(user);
      var remote = Array.isArray(res.favs) ? res.favs : [];
      var merged = dedupe([].concat(remote, first));
      cache = { user: user, favs: merged, loaded: true };
      setLocal(user, merged);
      renderFavs(merged);
    }catch(e){ console.warn('[favorites] load failed', e); }
  }

  document.addEventListener('click', function(ev){
    var t = ev.target;
    if (!t) return;
    if (t.id === 'ep-email' || (t.closest && t.closest('#ep-email'))){
      setTimeout(syncOnOpen, 50);
    }
  }, true);

  if (typeof window.addFav === 'function'){ window.addFav = function(email){ try{ addAndPersist(email); }catch(_){} }; }
  if (typeof window._epAddFav === 'function'){ window._epAddFav = function(email){ try{ addAndPersist(email); }catch(_){} }; }
  window.__favSync = { detectUser, syncOnOpen, removeFav, addAndPersist };
})();
