// fixes/note-photo-toolbar.js — LOCK the 📷 button into the tiny toolbar and insert into Add Note
(function(){
  if (window.__notePhotoToolbarLockInit) return; window.__notePhotoToolbarLockInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const text = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  function findAddNoteBlocks(){
    // Buttons/links whose label is exactly "Add Note"
    const adds = $$('button, a').filter(b => text(b) === 'add note');
    const blocks = [];
    for (const btn of adds){
      let p = btn.parentElement;
      for (let i = 0; i < 8 && p; i++, p = p.parentElement){
        const ta = $('textarea', p);
        const ce = $('[contenteditable="true"]', p);
        const editable = ta || ce;
        if (!editable) continue;

        // The tiny toolbar just BEFORE the editor (has >= 2 buttons e.g. B / I / ...)
        let toolbar = editable.previousElementSibling;
        for (let j = 0; j < 4 && toolbar; j++, toolbar = toolbar.previousElementSibling){
          const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
          if (btns && btns.length >= 2){ blocks.push({root:p, editable, toolbar}); break; }
        }
        if (!blocks.length) blocks.push({root:p, editable, toolbar:null});
        break;
      }
    }
    // Fallback if no explicit "Add Note" found
    if (!blocks.length){
      const ta = $('textarea');
      const ce = $('[contenteditable="true"]');
      const editable = ta || ce;
      if (editable){
        let toolbar = editable.previousElementSibling;
        for (let j = 0; j < 4 && toolbar; j++, toolbar = toolbar.previousElementSibling){
          const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
          if (btns && btns.length >= 2){ blocks.push({root:document, editable, toolbar}); break; }
        }
        if (!blocks.length) blocks.push({root:document, editable, toolbar:null});
      }
    }
    return blocks;
  }

  function ensureButton(toolbar, onClick){
    // Remove duplicates
    $$('#note-photo-toolbar-btn', toolbar).forEach(n => n.remove());

    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'note-photo-toolbar-btn';
    b.textContent = '📷';
    b.title = 'Insert photo';
    b.className = 'btn btn-light';
    b.style.marginLeft = '6px';
    b.addEventListener('click', (e)=>{ e.preventDefault(); onClick(); });

    // Place right after "- List" if present, else append
    const items = Array.from(toolbar.querySelectorAll('button, a'));
    const listBtn = items.find(x => {
      const k = text(x);
      return k === '- list' || k.includes('list');
    });
    if (listBtn && listBtn.parentElement === toolbar){
      listBtn.insertAdjacentElement('afterend', b);
    } else {
      toolbar.appendChild(b);
    }
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

  function insertAtCursorTextArea(textarea, html){
    try{
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + html + after;
      const pos = (before + html).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    }catch(_){
      textarea.value += html;
    }
    textarea.dispatchEvent(new Event('input', {bubbles:true}));
    textarea.focus();
  }

  function insertAtCaretContentEditable(el, html){
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el.contains(sel.anchorNode)){
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const frag = range.createContextualFragment(html);
      const lastNode = frag.lastChild;
      range.insertNode(frag);
      const nr = document.createRange();
      nr.setStartAfter(lastNode);
      nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
    } else {
      el.insertAdjacentHTML('beforeend', html);
      const r = document.createRange();
      r.selectNodeContents(el); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    el.dispatchEvent(new Event('input', {bubbles:true}));
  }

  // One hidden picker reused
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

  function attach(){
    const blocks = findAddNoteBlocks();
    blocks.forEach(({editable, toolbar})=>{
      const onPick = ()=>{
        const p = getPicker();
        p.onchange = (e)=>{
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!/^image\//.test(file.type)){ alert('Please pick an image.'); p.value=''; return; }
          const r = new FileReader();
          r.onload = async ev => {
            const scaled = await downscale(ev.target.result, 1200);
            const html = `\n<img src="${scaled}" alt="Photo" style="max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;">\n`;
            if (editable.tagName && editable.tagName.toLowerCase()==='textarea'){
              insertAtCursorTextArea(editable, html);
            } else {
              insertAtCaretContentEditable(editable, html);
            }
            p.value='';
          };
          r.readAsDataURL(file);
        };
        p.click();
      };

      if (toolbar){
        ensureButton(toolbar, onPick);
      } else {
        // If no toolbar exists, place a button directly above the editor
        if (!document.getElementById('note-photo-toolbar-btn')){
          const b = document.createElement('button');
          b.type = 'button'; b.id='note-photo-toolbar-btn';
          b.textContent='📷'; b.className='btn btn-light';
          b.style.margin='6px 0';
          b.addEventListener('click', (e)=>{ e.preventDefault(); onPick(); });
          editable.parentElement ? editable.parentElement.insertBefore(b, editable) : editable.before(b);
        }
      }
    });
  }

  // Keep it present even if the UI re-renders
  attach();
  setInterval(attach, 600);
})();
