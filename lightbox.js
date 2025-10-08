// lightbox.js
(function(){
  function open(src){
    const wrap = document.createElement('div');
    wrap.className = 'np-lightbox';
    wrap.innerHTML = '<div class="np-close">×</div><img alt="photo">';
    const img = wrap.querySelector('img');
    img.src = src;
    function close(){ document.body.removeChild(wrap); document.removeEventListener('keydown', onKey); }
    function onKey(e){ if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('np-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
  }
  document.addEventListener('click', function(e){
    const t = e.target;
    if (t && t.classList && t.classList.contains('note-photo-thumb')){
      e.preventDefault();
      const full = t.getAttribute('data-full-url') || t.src;
      open(full);
    }
  }, true);
  window.NP_LIGHTBOX = { open };
})();