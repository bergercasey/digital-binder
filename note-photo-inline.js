
// fixes/note-photo-inline.js  — adds one "📷 Photo" button next to the existing notes tools
(function(){
  if (window.__notePhotoInlineInit) return;
  window.__notePhotoInlineInit = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  // Find the notes textarea (prefer ids containing "note")
  function findNotesField(){
    let t = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (t) return t;
    // fallbacks
    const textareas = $all('textarea');
    return textareas[0] || null;
  }

  // Find the small toolbar above the notes (buttons B / I / U / HL / List)
  // We'll look for the container immediately preceding the notes textarea that contains those buttons.
  function findNotesToolbar(notes){
    if (!notes) return null;
    // Try previousElementSibling
    let el = notes.previousElementSibling;
    // walk up a little if needed
    for (let i=0;i<4 && el;i++, el=el.previousElementSibling){
      const txt = (el.textContent||'').toLowerCase();
      if (txt.includes('list') || txt.includes('hl') || txt.includes('bold') || txt.includes(' b ')){
        return el;
      }
      // if it contains multiple small buttons, that's likely it
      const btns = el.querySelectorAll('button');
      if (btns && btns.length >= 2) return el;
    }
    // fallback: try parent
    const parent = notes.parentElement;
    if (parent){
      const btns = parent.querySelectorAll('button');
      if (btns && btns.length >= 2) return parent;
    }
    return null;
  }

  // Insert text at cursor for <textarea>
  function insertAtCursorTextArea(textarea, text){
    try{
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + text + after;
      const pos = (before + text).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    }catch(e){
      textarea.value += text;
    }
    textarea.dispatchEvent(new Event('input', {bubbles:true}));
  }

  // Resize the image client-side for speed (max width 1200px)
  function downscaleImage(dataURL, maxW=1200){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = function(){
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w <= maxW){ return resolve(dataURL); }
        const ratio = maxW / w;
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function(){ resolve(dataURL); };
      img.src = dataURL;
    });
  }

  function handleFile(file){
    if (!file) return;
    if (!/^image\//.test(file.type)){
      alert('Please pick an image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async function(e){
      const notes = findNotesField();
      if (!notes) return;
      const dataURL = e.target.result;
      const scaled = await downscaleImage(dataURL, 1200);
      const html = '\\n<img src=\"'+ scaled +'\" alt=\"Photo\" style=\"max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;\" />\\n';
      if (notes.tagName.toLowerCase() === 'textarea'){
        insertAtCursorTextArea(notes, html);
      } else {
        notes.insertAdjacentHTML('beforeend', html);
        notes.dispatchEvent(new Event('input', {bubbles:true}));
      }
    };
    reader.readAsDataURL(file);
  }

  function init(){
    const notes = findNotesField();
    if (!notes) return;

    // Create hidden file input
    let picker = document.getElementById('note-photo-inline-picker');
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.id = 'note-photo-inline-picker';
      picker.style.display = 'none';
      picker.setAttribute('capture', 'environment');
      document.body.appendChild(picker);
    }
    picker.addEventListener('change', (e)=>{
      const f = e.target.files && e.target.files[0];
      handleFile(f);
      e.target.value = '';
    });

    // Make a 📷 button and append it to the toolbar (or right above notes)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'note-photo-inline-btn';
    btn.textContent = '📷 Photo';
    btn.style.marginLeft = '6px';
    btn.className = 'btn btn-light';

    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      picker.click();
    });

    const toolbar = findNotesToolbar(notes);
    if (toolbar){
      toolbar.appendChild(btn);
    } else {
      // fallback: insert before notes
      notes.parentElement && notes.parentElement.insertBefore(btn, notes);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
