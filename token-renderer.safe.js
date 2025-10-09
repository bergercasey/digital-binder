// token-renderer.safe.js
// Renders [[PHOTO ...]] tokens using RegExp constructors (Safari-safe).
(function(){
  function decode(s){ return (s||'').replace(/&amp;/g,'&'); }
  function esc(s){ return (s||'').replace(/"/g,'&quot;'); }

  function tokenToImgHTML(tok){
    tok = tok.trim();
    var m1 = new RegExp('^\\[\\[PHOTO\\s+full=([^\\]|]+)\\|thumb=([^\\]]+)\\]\\]$','i').exec(tok);
    var full='', thumb='';
    if(m1){ full = decode(m1[1]); thumb = decode(m1[2]); }
    else {
      var m2 = new RegExp('^\\[\\[PHOTO\\s+([^\\]]+)\\]\\]$','i').exec(tok);
      if(m2){ full = thumb = decode(m2[1]); }
    }
    if(!full) return tok;
    return '<img class="note-photo-thumb" src="'+esc(thumb)+'" data-full-url="'+esc(full)+'" alt="Photo" loading="lazy">';
  }

  function renderIn(el){
    if (!el) return;
    var html = el.innerHTML;
    var re = new RegExp('\\[\\[PHOTO[^\\]]*\\]\\]','gi');
    var out = html.replace(re, function(tok){ return tokenToImgHTML(tok); });
    if (out !== html) el.innerHTML = out;
  }

  function scan(){
    var list = document.querySelectorAll('#notes-list .note-item .note-text, .note-text');
    for (var i=0;i<list.length;i++) renderIn(list[i]);
  }

  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', scan); } else { scan(); }
  var mo = new MutationObserver(function(){ scan(); });
  mo.observe(document.body, { childList:true, subtree:true });
})();