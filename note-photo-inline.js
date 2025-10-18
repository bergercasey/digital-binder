
// fixes/note-photo-inline.js — adds a 📷 Photo button that inserts an image at the caret in Notes
(function(){
  if (window.__notePhotoInlineInit) return; window.__notePhotoInlineInit = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function findNotesField(){
    let t = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (t) return t;
    const areas = $all('textarea');
    if (areas.length) return areas[0];
    return null;
  }

  function tryFindToolbar(notes){
    if (!notes) return null;
    let el = notes.previousElementSibling;
    for (let i=0; i<5 && el; i++, el = el.previousElementSibling){
      const btns = el.querySelectorAll ? el.querySelectorAll('button') : [];
      if (btns && btns.length >= 2) return el;
    }
    const parent = notes.parentElement;
    if (parent){
      const btns = parent.querySelectorAll('button');
      if (btns && btns.length >= 2) return parent;
    }
    return null;
  }

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
      if (!notes) return;
      const scaled = await downscale(e.target.result, 1200);
      const html = '\\n<img src=\"'+ scaled +'\" alt=\"Photo\" style=\"max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;\" />\\n';
      if (notes.tagName && notes.tagName.toLowerCase() === 'textarea'){
        insertAtCursorTextArea(notes, html);
      } else {
        notes.insertAdjacentHTML('beforeend', html);
        notes.dispatchEvent(new Event('input', {bubbles:true}));
      }
    };
    r.readAsDataURL(file);
  }

  function ensurePicker(){
    let picker = document.getElementById('note-photo-inline-picker');
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.id = 'note-photo-inline-picker';
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

  function createButton(){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'note-photo-inline-btn';
    btn.textContent = '📷 Photo';
    btn.className = 'btn btn-light';
    btn.style.marginLeft = '6px';
    btn.addEventListener('click', (e)=>{ e.preventDefault(); ensurePicker().click(); });
    return btn;
  }

  function placeButton(){
    if ($('#note-photo-inline-btn')) return true;
    const notes = findNotesField();
    if (!notes) return false;
    const toolbar = tryFindToolbar(notes);
    const btn = createButton();
    if (toolbar){ toolbar.appendChild(btn); return true; }
    if (notes.parentElement){ notes.parentElement.insertBefore(btn, notes); return true; }
    return false;
  }

  function init(){
    if (!placeButton()){
      const obs = new MutationObserver(()=>{ if (placeButton()) obs.disconnect(); });
      obs.observe(document.documentElement, {childList:true, subtree:true});
      setTimeout(placeButton, 1200);
    }
  }

  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init, {once:true}); }
  else { init(); }
})();
