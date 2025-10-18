
// fixes/note-photo-force.js — always-visible floating 📷 button that inserts image into Notes at cursor
(function(){
  if (window.__notePhotoForceInit) return; window.__notePhotoForceInit = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function findNotesField(){
    // Priority: focused element if it's a textarea or contenteditable
    const ae = document.activeElement;
    if (ae){
      const tag = (ae.tagName||'').toLowerCase();
      if (tag==='textarea' || ae.isContentEditable) return ae;
    }
    // Common IDs
    let t = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (t) return t;
    // Any contenteditable
    let ce = $('[contenteditable="true"]');
    if (ce) return ce;
    // Fallback: first textarea on the page
    return $('textarea');
  }

  function insertAtCursorTextArea(textarea, html){
    try{
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + html + after;
      const pos = (before + html).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    }catch(e){
      textarea.value += html;
    }
    textarea.dispatchEvent(new Event('input', {bubbles:true}));
    textarea.focus();
  }

  function downscale(dataURL, maxW){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = function(){
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w <= maxW) return resolve(dataURL);
        const r = maxW / w; w = Math.round(w*r); h = Math.round(h*r);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = ()=> resolve(dataURL);
      img.src = dataURL;
    });
  }

  function insertImage(dataURL){
    const notes = findNotesField();
    if (!notes){ alert('Tap into your Notes box first, then tap 📷.'); return; }
    const snippet = `\n<img src="${dataURL}" alt="Photo" style="max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;">\n`;
    if (notes.tagName && notes.tagName.toLowerCase()==='textarea'){
      insertAtCursorTextArea(notes, snippet);
    } else {
      // contenteditable
      // Insert at caret if selection is inside this element
      notes.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount){
        const range = sel.getRangeAt(0);
        if (notes.contains(range.startContainer)){
          range.deleteContents();
          const temp = document.createElement('div');
          temp.innerHTML = snippet;
          const node = temp.firstChild;
          range.insertNode(node);
          range.setStartAfter(node);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          notes.insertAdjacentHTML('beforeend', snippet);
        }
      } else {
        notes.insertAdjacentHTML('beforeend', snippet);
      }
      notes.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }

  function handleFile(file){
    if (!file) return;
    if (!/^image\//.test(file.type)){ alert('Please pick an image.'); return; }
    const r = new FileReader();
    r.onload = async (e)=>{
      const scaled = await downscale(e.target.result, 1200);
      insertImage(scaled);
    };
    r.readAsDataURL(file);
  }

  function ensurePicker(){
    let picker = document.getElementById('note-photo-force-picker');
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.id = 'note-photo-force-picker';
      picker.style.display = 'none';
      picker.setAttribute('capture', 'environment');
      document.body.appendChild(picker);
      picker.addEventListener('change', (e)=>{
        handleFile(e.target.files && e.target.files[0]);
        e.target.value = '';
      });
    }
    return picker;
  }

  function ensureFAB(){
    if (document.getElementById('note-photo-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'note-photo-fab';
    btn.type = 'button';
    btn.title = 'Add Photo to Notes';
    btn.textContent = '📷';
    btn.className = 'note-photo-fab';
    btn.addEventListener('click', (e)=>{ e.preventDefault(); ensurePicker().click(); });
    document.body.appendChild(btn);
  }

  function init(){
    ensurePicker();
    ensureFAB();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
