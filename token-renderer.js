
// token-renderer.js
// Converts [[PHOTO full=URL|thumb=URL]] tokens inside rendered notes into <img> elements.
(function(){
  function renderTokens(root){
    const bodies=(root||document).querySelectorAll('.note-body');
    bodies.forEach(el=>{
      // Replace tokens with <img>
      el.innerHTML = el.innerHTML.replace(/\[\[PHOTO\s+full=([^\]|]+)\|thumb=([^\]]+)\]\]/g, function(_,full,thumb){
        const f=full.replace(/&amp;/g,'&'); const t=thumb.replace(/&amp;/g,'&');
        return '<img class="note-photo-thumb" src="'+t+'" data-full-url="'+f+'" alt="Photo" loading="lazy">';
      });
    });
  }
  // Initial + on DOM changes
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{renderTokens();});
  }else{ renderTokens(); }
  const mo=new MutationObserver(muts=>{
    for(const m of muts){
      if(m.addedNodes) m.addedNodes.forEach(n=>{
        if(n.nodeType===1 && (n.classList && n.classList.contains('note-body'))) renderTokens(n.parentNode||n);
      });
    }
  });
  mo.observe(document.body,{childList:true,subtree:true});
})();
