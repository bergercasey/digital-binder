// fixes/note-photo-toolbar.js — 📷 in toolbar; inserts "[Photo attached]" into textarea
// and shows a live thumbnail preview just below the note editor.
(function(){
  if (window.__notePhotoToolbarLockInit) return; window.__notePhotoToolbarLockInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const text = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  function findAddNoteBlocks(){
    const adds = $$('button, a').filter(b => text(b) === 'add note');
    const blocks = [];
    for (const btn of adds){
      let p = btn.parentElement;
      for (let i=0; i<8 && p; i++, p=p.parentElement){
        const ta = $('textarea', p);
        const ce = $('[contenteditable="true"]', p);
        const editable = ta || ce;
        if (!editable){ continue; }

        // toolbar right before editable
        let toolbar = editable.previousElementSibling;
        for (let j=0; j<4 && toolbar; j++, toolbar = toolbar.previousElementSibling){
          const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
          if (btns && btns.length >= 2){ blocks.push({root:p, editable, toolbar}); break; }
        }
        if (!blocks.length) blocks.push({root:p, editable, toolbar:null});
        break;
      }
    }
    // fallback
    if (!blocks.length){
      const ta = $('textarea'); const ce = $('[contenteditable="true"]');
      const editable = ta || ce;
      if (editable){
        let toolbar = editable.previousElementSibling;
        for (let j=0; j<4 && toolbar; j++, toolbar = toolbar.previousElementSibling){
          const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
          if (btns && btns.length >= 2){ blocks.push({root:document, editable, toolbar}); break; }
        }
        if (!blocks.length) blocks.push({root:document, editable, toolbar:null});
      }
    }
    return blocks;
  }

  function ensurePreviewBox(root, editable){
    let box = $('#note-photo-preview-box', root);
    if (box) return box;
    box = document.createElement('div');
    box.id = 'note-photo-preview-box';
    box.style.cssText = 'margin:6px 0 0; display:flex; gap:8px; flex-wrap:wrap;';
    // place right under the editor
    if (editable.nextSibling){ editable.parentElement.insertBefore(box, editable.nextSibling); }
    else { editable.parentElement.appendChild(box); }
    return box;
  }

  function addThumb(previewBox, dataURL){
    const wrap = document.createElement('div');
    wrap.style.cssText = 'border:1px solid #ddd;border-radius:6px;padding:4px;';
    const img = document.createElement('img');
    img.src = dataURL;
    img.alt = 'Photo';
    img.style.cssText = 'display:block;max-width:140px;max-height:140px;height:auto;';
    wrap.appendChild(img);
    previewBox.appendChild(wrap);
  }

  function downscale(dataURL, maxW=1200){
    return new Promise(res=>{
      const img = new Image();
      img.onload = function(){
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w <= maxW) return res(dataURL);
        const r = maxW / w; w = Math.round(w*r); h = Math.round(h*r);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = ()=> res(dataURL);
      img.src = dataURL;
    });
  }

  function insertMarker(editable){
    const marker = '\n[Photo attached]\n';
    if (editable.tagName && editable.tagName.toLowerCase() === 'textarea'){
      try{
        const start = editable.selectionStart ?? editable.value.length;
        const end   = editable.selectionEnd ?? editable.value.length;
        const before = editable.value.slice(0, start);
        const after  = editable.value.slice(end);
        editable.value = before + marker + after;
        const pos = (before + marker).length;
        editable.selectionStart = editable.selectionEnd = pos;
      }catch(_){
        editable.value += marker;
      }
      editable.dispatchEvent(new Event('input', {bubbles:true}));
      editable.focus();
    } else {
      editable.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editable.contains(sel.anchorNode)){
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(marker));
      } else {
        editable.insertAdjacentText('beforeend', marker);
      }
      editable.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }

  // one hidden picker reused
  let picker;
  function getPicker(){
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*'; // no capture → Library/Camera choice
      picker.id = 'note-photo-global-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }
    return picker;
  }

  function ensureButton(toolbar, onClick){
    // remove dupes within this toolbar
    const existing = toolbar.querySelector('#note-photo-toolbar-btn');
    if (existing) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'note-photo-toolbar-btn';
    b.textContent = '📷';
    b.title = 'Attach photo';
    b.className = 'btn btn-light';
    b.style.marginLeft = '6px';
    b.addEventListener('click', (e)=>{ e.preventDefault(); onClick(); });

    // place after "- List" if present
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

  function attach(){
    const blocks = findAddNoteBlocks();
    blocks.forEach(({editable, toolbar, root})=>{
      const onPick = ()=>{
        const p = getPicker();
        p.onchange = async (e)=>{
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!/^image\//.test(file.type)){ alert('Please pick an image.'); p.value=''; return; }
          const r = new FileReader();
          r.onload = async ev => {
            const scaled = await downscale(ev.target.result, 1200);
            const box = ensurePreviewBox(root, editable);
            addThumb(box, scaled);
            insertMarker(editable);   // so you see something inside the note
            p.value='';
          };
          r.readAsDataURL(file);
        };
        p.click();
      };

      if (toolbar){ ensureButton(toolbar, onPick); }
      else {
        // if no toolbar, put a small button above editable
        if (!root.querySelector('#note-photo-toolbar-btn')){
          const b = document.createElement('button');
          b.type='button'; b.id='note-photo-toolbar-btn'; b.textContent='📷'; b.className='btn btn-light';
          b.style.margin='6px 0'; b.addEventListener('click', (e)=>{ e.preventDefault(); onPick(); });
          editable.parentElement ? editable.parentElement.insertBefore(b, editable) : editable.before(b);
        }
      }
    });
  }

  attach();
  setInterval(attach, 700); // keep it present if UI re-renders
})();

