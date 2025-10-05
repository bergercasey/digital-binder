
// email-fav-trash-addon.js
(function(){
  function getFavs(){
    try { const arr = JSON.parse(localStorage.getItem('ep_favorites')); return Array.isArray(arr) ? arr : []; }
    catch(_) { return []; }
  }
  function saveFavs(list){
    try { localStorage.setItem('ep_favorites', JSON.stringify(list || [])); } catch(_){}
  }
  function ensureStyles(){
    if (document.getElementById('ep-fav-trash-styles')) return;
    const st = document.createElement('style'); st.id = 'ep-fav-trash-styles';
    st.textContent = [
      '#ep-mail-favs .fav-item{ display:inline-flex; align-items:center; gap:6px; margin:4px 10px 4px 0; padding:2px 4px; border-radius:6px; }',
      '#ep-mail-favs .fav-item button.ep-del{ border:0; background:transparent; cursor:pointer; font-size:14px; line-height:1; padding:2px 4px; color:#6b7280; }',
      '#ep-mail-favs .fav-item button.ep-del:hover{ color:#ef4444; }'
    ].join('\n');
    document.head.appendChild(st);
  }
  function render(){
    ensureStyles();
    const wrap = document.getElementById('ep-mail-favs');
    if (!wrap) return;
    const favs = getFavs();
    if (!favs.length){
      wrap.innerHTML = '<div class="hint">No favorites yet. Add an email below, check "Save to favorites", then click Add.</div>';
      return;
    }
    wrap.innerHTML = '<div class="hint" style="margin-bottom:4px;">Favorites</div>' + favs.map(function(e){
      const esc = String(e).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      return '<label class="fav-item"><input type="checkbox" class="ep-fav" value="'+esc+'"/> '+esc+' <button class="ep-del" data-email="'+esc+'" title="Remove">🗑️</button></label>';
    }).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('button.ep-del'), function(btn){
      btn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const email = (btn.getAttribute('data-email') || '').toLowerCase();
        const next = getFavs().filter(v => String(v).toLowerCase() !== email);
        saveFavs(next); render();
      }, { capture: true });
    });
  }
  function hook(){
    document.addEventListener('click', function(e){
      const t = e.target;
      if (!t) return;
      if (t.id === 'ep-email' || (t.closest && t.closest('#ep-email'))){
        setTimeout(render, 60);
      }
    }, true);
    document.addEventListener('click', function(e){
      const t = e.target;
      if (!t) return;
      if (t.id === 'ep-add-btn'){
        setTimeout(render, 80);
      }
    }, true);
    if (document.getElementById('ep-mail-favs')) render();
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', hook);
  } else {
    hook();
  }
})();
