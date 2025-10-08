// lightbox (full-url aware)
(function(){
  function openLightbox(src){
    var wrap = document.createElement('div');
    wrap.className = 'np-lightbox';
    wrap.innerHTML = '<span class="np-lightbox-close">Close ✕</span><img alt="photo" />';
    wrap.querySelector('img').src = src;
    function close(){ document.body.removeChild(wrap); document.removeEventListener('keydown', onKey); }
    function onKey(e){ if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', function(e){ if (e.target === wrap || e.target.classList.contains('np-lightbox-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
  }
  document.addEventListener('click', function(e){
    var t = e.target;
    if (t && t.classList && t.classList.contains('note-photo-thumb')){
      e.preventDefault();
      var full = t.getAttribute('data-full-url') || t.getAttribute('data-full') || t.src;
      openLightbox(full);
    }
  }, true);
  window.__npLightbox = { open: openLightbox };
})();
