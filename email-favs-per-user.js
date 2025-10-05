
// email-favs-per-user.js
// Persists favorites PER ACCOUNT (username) using Netlify Functions + Blobs.
// Drop this after your emailprint-preview.js. No core edits required.

(function(){
  // Heuristics to detect current username in your app
  function detectUser(){
    // 1) Global vars commonly used
    if (window.currentUser && (window.currentUser.username || window.currentUser.name)) {
      return (window.currentUser.username || window.currentUser.name).trim();
    }
    if (window.appUser && (window.appUser.username || window.appUser.name)) {
      return (window.appUser.username || window.appUser.name).trim();
    }
    // 2) DOM hints
    var idEl = document.getElementById('user-name') || document.querySelector('[data-username]');
    if (idEl && idEl.textContent) return idEl.textContent.trim();
    // Look for "(Name)" near Logout
    var nav = document.querySelector('body'); // broad scan (cheap)
    if (nav){
      var m = nav.innerText && nav.innerText.match(/\(([^)]+)\)\s*Logout/i);
      if (m) return m[1].trim();
    }
    // 3) LocalStorage fallback your app may set
    var ls = localStorage.getItem('username') || localStorage.getItem('user_name') || localStorage.getItem('user');
    if (ls) return String(ls).trim();
    return "";
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

  // Cache to keep sync fast
  var cache = { user: "", favs: [], loaded: false };

  function getLocal(user){
    try { 
      var raw = localStorage.getItem('ep_favorites::' + user);
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch(_) { return []; }
  }
  function setLocal(user, list){
    try { localStorage.setItem('ep_favorites::' + user, JSON.stringify(list||[])); } catch(_) {}
  }

  // Render favorites into the overlay
  function renderFavs(list){
    var wrap = document.getElementById('ep-mail-favs');
    if (!wrap) return;
    if (!list || !list.length){
      wrap.innerHTML = '<div class="hint">No favorites yet. Add an email below, check "Save to favorites", then click Add.</div>';
      return;
    }
    wrap.innerHTML = '<div class="hint" style="margin-bottom:4px;">Favorites</div>' + list.map(function(e){
      var esc = String(e).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      return '<label><input type="checkbox" class="ep-fav" value="'+esc+'"/> '+esc+'</label>';
    }).join('');
  }

  // Sync sequence when the Email overlay opens
  async function syncOnOpen(){
    var user = detectUser();
    if (!user) return; // can't resolve; keep localStorage behavior
    // Stage 1: show local cached quickly
    var first = getLocal(user);
    if (first.length) renderFavs(first);
    // Stage 2: load from server and merge ← authoritative
    try {
      var res = await apiGet(user);
      var remote = Array.isArray(res.favs) ? res.favs : [];
      // Merge with any local unsynced
      var merged = Array.from(new Set([].concat(remote, first))).filter(Boolean);
      cache = { user: user, favs: merged, loaded: true };
      setLocal(user, merged);
      renderFavs(merged);
    } catch (e) {
      // leave local render
      console.warn('[favorites] load failed', e);
    }
  }

  // Hook into the overlay open
  document.addEventListener('click', function(ev){
    var t = ev.target;
    if (!t) return;
    if (t.id === 'ep-email' || (t.closest && t.closest('#ep-email'))){
      setTimeout(syncOnOpen, 50);
    }
  }, true);

  // Override addFav/_epAddFav/saveFavs to persist to server as well
  function dedupe(arr){ return Array.from(new Set((arr||[]).map(function(x){ return String(x||'').trim().toLowerCase(); }))).filter(Boolean); }

  function addAndPersist(email){
    var user = cache.user || detectUser();
    if (!user) return; // fallback to original addFav already handled by core
    var current = cache.loaded ? cache.favs.slice() : getLocal(user);
    current.push(String(email||'').trim().toLowerCase());
    var merged = dedupe(current);
    cache = { user: user, favs: merged, loaded: true };
    setLocal(user, merged);
    renderFavs(merged);
    apiSet(user, merged).catch(function(e){ console.warn('[favorites] save failed', e); });
  }

  // Replace global helpers if present
  var origAddFav = window.addFav, origSaveFavs = window.saveFavs, origGetFavs = window.getFavs;
  if (typeof window.addFav === 'function'){ window.addFav = function(email){ try{ addAndPersist(email); }catch(_){} }; }
  if (typeof window._epAddFav === 'function'){ window._epAddFav = function(email){ try{ addAndPersist(email); }catch(_){} }; }
  if (typeof window.saveFavs === 'function'){ window.saveFavs = function(list){ 
    try{ var user = cache.user || detectUser(); if (!user) return; var merged = dedupe(list); cache = { user:user, favs: merged, loaded:true }; setLocal(user, merged); renderFavs(merged); apiSet(user, merged).catch(function(e){ console.warn('[favorites] save failed', e); }); }catch(_){} 
  }; }
  if (typeof window._epSaveFavs === 'function'){ window._epSaveFavs = window.saveFavs; }

  // Expose for debugging
  window.__favSync = { detectUser, syncOnOpen };
})();
