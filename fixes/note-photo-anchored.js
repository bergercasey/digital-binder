
// fixes/note-photo-anchored.js — adds a Photo button right next to the Notes controls
(function(){
  if (window.__notePhotoAnchoredInit) return; window.__notePhotoAnchoredInit = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function findNotesField(){
    // Prefer common IDs first
    let t = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (t) return t;
    // Contenteditable fallback
    let ce = $('[contenteditable="true"]');
    if (ce) return ce;
    // Last resort: first textarea
    return document.querySelector('textarea');
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

  function handleFile(file){
    if (!file) return;
    if (!/^image\\//.test(file.type)){ alert('Please pick an image.'); return; }
    const r = new FileReader();
    r.onload = async (e)=>{
      const notes = findNotesField();
      if (!notes) { alert('Could not find the Notes box.'); return; }
      const scaled = await downscale(e.target.result, 1200);
      const html = '\\n<img src=\"'+ scaled +'\" alt=\"Photo\" style=\"max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;\" />\\n';
      if (notes.tagName && notes.tagName.toLowerCase()==='textarea'){
        insertAtCursorTextArea(notes, html);
      } else {
        // contenteditable
        notes.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount){
          const range = sel.getRangeAt(0);
          if (notes.contains(range.startContainer)){
            range.deleteContents();
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const node = temp.firstChild;
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            notes.insertAdjacentHTML('beforeend', html);
          }
        } else {
          notes.insertAdjacentHTML('beforeend', html);
        }
        notes.dispatchEvent(new Event('input', {bubbles:true}));
      }
    };
    r.readAsDataURL(file);
  }

  function ensureAnchoredUI(){
    if (document.getElementById('note-photo-anchored-btn')) return true;
    const notes = findNotesField();
    if (!notes) return false;

    // Build a small row with our button + hidden picker
    const row = document.createElement('div');
    row.className = 'note-photo-row';
    row.style.margin = '6px 0';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'note-photo-anchored-btn';
    btn.className = 'btn btn-light';
    btn.textContent = '📷 Photo';
    btn.style.marginRight = '6px';

    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*'; // NO capture attribute → iOS shows Photo Library / Camera choice
    picker.id = 'note-photo-anchored-picker';
    picker.style.display = 'none';

    btn.addEventListener('click', (e)=>{ e.preventDefault(); picker.click(); });
    picker.addEventListener('change', (e)=>{ handleFile(e.target.files && e.target.files[0]); e.target.value = ''; });

    row.appendChild(btn);
    row.appendChild(picker);

    // Place row just BEFORE the notes field so it sits with your other note controls
    notes.parentElement ? notes.parentElement.insertBefore(row, notes) : notes.before(row);
    return true;
  }

  function init(){
    if (!ensureAnchoredUI()){
      const obs = new MutationObserver(()=>{ if (ensureAnchoredUI()) obs.disconnect(); });
      obs.observe(document.documentElement, {childList:true, subtree:true});
      setTimeout(ensureAnchoredUI, 1500);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
