// note-photo-token.js (Step 2)
// Adds a 'Photo (token)' button and auto-loads the renderer/lightbox/CSS.
(function(){
  function ensureAsset(tag, attr, value){
    if (document.querySelector(tag+'['+attr+'="'+value+'"]')) return;
    const el = document.createElement(tag);
    el.setAttribute(attr, value);
    if (tag === 'link'){ el.rel = 'stylesheet'; document.head.appendChild(el); }
    else { document.body.appendChild(el); }
  }

  // Auto-load assets exactly once
  function bootAssets(){
    ensureAsset('link','href','note-photos.css');
    ensureAsset('script','src','lightbox.js');
    ensureAsset('script','src','token-renderer.js');
  }

  function addButton(){
    const ed = document.getElementById('new-note-editor');
    const tb = document.getElementById('wysiwyg-toolbar') || document.getElementById('note-toolbar') || (ed && ed.previousElementSibling);
    if (!ed || !tb) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = '📷 Photo (token)';
    btn.style.marginLeft = '6px';
    tb.appendChild(btn);
    function insertToken(){
      const token = ' [[PHOTO full=PASTE_FULL_URL|thumb=PASTE_THUMB_URL]] ';
      ed.focus();
      try{
        if (document.queryCommandSupported && document.queryCommandSupported('insertText')){
          document.execCommand('insertText', false, token); return;
        }
      }catch(_){}
      ed.textContent += token;
    }
    btn.addEventListener('click', insertToken);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ bootAssets(); addButton(); });
  } else {
    bootAssets(); addButton();
  }
})();
