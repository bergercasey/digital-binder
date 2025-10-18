// fixes/dbphoto-insert.js — Add "🔗 Dropbox Photo" to Add Note toolbar; insert [[DBPHOTO url="..."]]
(function(){
  if (window.__dbPhotoInsertInit) return; window.__dbPhotoInsertInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const t  = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  function findAddNoteBlock(){
    const add = $$('button, a').find(b => t(b) === 'add note');
    if (!add) return null;
    let root = add.parentElement;
    for (let i=0; i<8 && root; i++, root = root.parentElement){
      const ta = $('textarea', root);
      if (!ta) continue;
      // toolbar row sits just before the textarea
      let toolbar = ta.previousElementSibling;
      for (let j=0; j<4 && toolbar; j++, toolbar = toolbar.previousElementSibling){
        const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
        if (btns && btns.length >= 2) return {root, ta, toolbar};
      }
      return {root, ta, toolbar:null};
    }
    return null;
  }

  function insertAtCaretTextarea(textarea, text){
    try{
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + text + after;
      const pos = (before + text).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    }catch(_){
      textarea.value += text;
    }
    textarea.dispatchEvent(new Event('input', {bubbles:true}));
    textarea.focus();
  }

  // Normalize Dropbox URL to a direct-viewer form that works in <img> and as a link
  function normalizeDropboxUrl(url){
    try{
      const u = new URL(url);
      // Convert ?dl=0 → ?raw=1 (works for images in <img>)
      if (u.hostname.endsWith('dropbox.com')){
        // Many shared links are /s/<id>/<file>?dl=0
        if (u.searchParams.has('dl')) u.searchParams.delete('dl');
        u.searchParams.set('raw','1');  // forces direct image response
        return u.toString();
      }
      return url; // non-dropbox: leave as-is
    }catch(_){
      return url;
    }
  }

  function ensureSingleButton(toolbar, textarea){
    // Remove any existing button copies outside our toolbar
    document.querySelectorAll('#dbphoto-insert-btn').forEach(node=>{
      if (!toolbar || !toolbar.contains(node)) node.remove();
    });

    if (toolbar && !toolbar.querySelector('#dbphoto-insert-btn')){
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'dbphoto-insert-btn';
      b.className = 'btn btn-light';
      b.title = 'Insert Dropbox photo link';
      b.textContent = '🔗 Dropbox Photo';
      b.style.marginLeft = '6px';

      b.addEventListener('click', (e)=>{
        e.preventDefault();
        const pasted = prompt('Paste Dropbox share link (from the Dropbox app):');
        if (!pasted) return;
        const url = normalizeDropboxUrl(pasted.trim());
        if (!/^https?:\/\//i.test(url)){ alert('That does not look like a valid link.'); return; }
        const token = `\n[[DBPHOTO url="${url}"]]\n`;
        insertAtCaretTextarea(textarea, token);
      });

      // Place right after "- List" if present; else append
      const items = Array.from(toolbar.querySelectorAll('button, a'));
      const listBtn = items.find(x => {
        const k = (x.textContent || '').trim().toLowerCase();
        return k === '- list' || k.includes('list');
      });
      if (listBtn && listBtn.parentElement === toolbar){
        listBtn.insertAdjacentElement('afterend', b);
      } else {
        toolbar.appendChild(b);
      }
    }
  }

  function attach(){
    const block = findAddNoteBlock();
    if (!block) return;
    const { ta, toolbar } = block;
    ensureSingleButton(toolbar, ta);
  }

  attach();
  setInterval(attach, 1000); // keep present if UI re-renders
})();
