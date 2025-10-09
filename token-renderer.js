\
// token-renderer.js
// Renders [[PHOTO full=...|thumb=...]] tokens inside rendered notes.
(function(){
  function decode(s){ return (s||'').replace(/&amp;/g,'&'); }
  function tokenToImgHTML(token){
    // Supported forms:
    // [[PHOTO full=FULL|thumb=THUMB]]
    // [[PHOTO URL]]  -> uses same URL for full and thumb
    let m = token.match(/^\[\[PHOTO\s+full=([^\]|]+)\|thumb=([^\]]+)\]\]$/i);
    let full='', thumb='';
    if (m){
      full = decode(m[1].trim()); thumb = decode(m[2].trim());
    } else {
      m = token.match(/^\[\[PHOTO\s+([^\]]+)\]\]$/i);
      if (m){ full = thumb = decode(m[1].trim()); }
    }
    if (!full) return token; // leave unchanged
    const esc = (s)=>s.replace(/"/g,'&quot;');
    return '<img class="note-photo-thumb" src="'+esc(thumb)+'" data-full-url="'+esc(full)+'" alt="Photo" loading="lazy">';
  }

  function renderIn(el){
    if (!el) return;
    const html = el.innerHTML;
    // Replace PHOTO tokens only
    const out = html.replace(/\[\[PHOTO[^\]]*\]\]/gi, tokenToImgHTML);
    if (out !== html) el.innerHTML = out;
  }

  function scan(){
    // Target the body of notes; your app uses 'note-item' with a child body (seen as 'note-text')
    document.querySelectorAll('#notes-list .note-item .note-text, .note-text').forEach(renderIn);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', scan);
  } else { scan(); }

  // In case notes are re-rendered dynamically:
  const mo = new MutationObserver(()=>scan());
  mo.observe(document.body, { childList:true, subtree:true });
})();
