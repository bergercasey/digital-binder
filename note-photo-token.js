// note-photo-token.js (Step 2 SAFE)
// Loads once, adds a 'Photo (token)' button, and autoloads the renderer/lightbox/CSS.
(function(){
  if (window.__NP_STEP2_LOADED) return; window.__NP_STEP2_LOADED = true;
  function ensure(tag, attr, val){
    if (document.querySelector(tag+'['+attr+'="'+val+'"]')) return;
    var el=document.createElement(tag); el.setAttribute(attr,val);
    if(tag==='link'){ el.rel='stylesheet'; document.head.appendChild(el); }
    else{ document.body.appendChild(el); }
  }
  function boot(){
    ensure('link','href','note-photos.css');
    ensure('script','src','lightbox.js');
    ensure('script','src','token-renderer.safe.js');
  }
  function addBtn(){
    var ed=document.getElementById('new-note-editor');
    var tb=document.getElementById('wysiwyg-toolbar')||document.getElementById('note-toolbar')||(ed&&ed.previousElementSibling);
    if(!ed||!tb) return;
    var b=document.createElement('button'); b.type='button'; b.className='btn'; b.textContent='📷 Photo (token)'; b.style.marginLeft='6px';
    tb.appendChild(b);
    b.addEventListener('click', function(){
      var tok=' [[PHOTO full=PASTE_FULL_URL|thumb=PASTE_THUMB_URL]] ';
      ed.focus();
      try{
        if(document.queryCommandSupported&&document.queryCommandSupported('insertText')){
          document.execCommand('insertText',false,tok); return;
        }
      }catch(_){}
      ed.textContent += tok;
    });
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', function(){ boot(); addBtn(); }); }
  else { boot(); addBtn(); }
})();