// lightbox-patch-addon.js
(function(){
  document.addEventListener('click', function(e){
    var t = e.target;
    if (t && t.classList && t.classList.contains('note-photo-thumb')){
      var full = t.getAttribute('data-full-url') || t.getAttribute('data-full') || t.src;
      if (window.__npLightbox && typeof window.__npLightbox.open === 'function'){
        e.preventDefault();
        window.__npLightbox.open(full);
      }
    }
  }, true);
})();
