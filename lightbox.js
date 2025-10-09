// lightbox.js
(function(){
  function open(src){
    var wrap=document.createElement('div'); wrap.className='np-lightbox';
    wrap.innerHTML='<div class="np-close">×</div><img alt="photo">';
    wrap.querySelector('img').src=src;
    function close(){ document.body.removeChild(wrap); document.removeEventListener('keydown',onKey); }
    function onKey(e){ if(e.key==='Escape') close(); }
    wrap.addEventListener('click', function(e){ if(e.target===wrap||e.target.classList.contains('np-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
  }
  document.addEventListener('click', function(e){
    var t=e.target;
    if(t && t.classList && t.classList.contains('note-photo-thumb')){
      e.preventDefault();
      open(t.getAttribute('data-full-url') || t.src);
    }
  }, true);
  window.NP_LIGHTBOX={open:open};
})();