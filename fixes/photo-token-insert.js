// fixes/photo-token-insert.js — toolbar-anchored PHOTO token insert
(function(){
  if (window.__photoTokenInsertInitV2) return; window.__photoTokenInsertInitV2 = true;

  // Tiny helpers
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // Insert text at caret in a TEXTAREA
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

  // Scale dataURL to a given width
  function scale(dataURL, maxW){
    return new Promise(resolve=>{
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

  // One hidden file picker reused
  let picker;
  function getPicker(){
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';     // library/camera chooser
      picker.id = 'photo-token-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }
    return picker;
  }

  // Find the editable that belongs to the SAME block as the toolbar button
  function findEditableForToolbar(btn){
    // 1) find the toolbar element (the button’s parent or a close ancestor with multiple small buttons)
    let toolbar = btn.closest('div,section,header,footer,nav,form') || btn.parentElement;
    // 2) find the nearest textarea or contenteditable in the same block, preferring elements AFTER the toolbar
    const block = toolbar.closest('div,section,form,li,article') || toolbar.parentElement || document;
    // prefer “forward” siblings first
    let el = toolbar.nextElementSibling;
    for (let i=0; i<6 && el; i++, el = el.nextElementSibling){
      if (el.matches && (el.matches('textarea') || el.matches('[contenteditable="true"]'))) return el;
      const inside = el.querySelector && (el.querySelector('textarea,[contenteditable="true"]'));
      if (inside) return inside;
    }
    // fallback: search within the block
    const ta = block.querySelector('textarea');
    if (ta) return ta;
    const ce = block.querySelector('[contenteditable="true"]');
    if (ce) return ce;
    // last resort: first textarea on page
    return document.querySelector('textarea');
  }

  // Ensure a 📷 button exists in a toolbar element
  function ensureButtonInToolbar(toolbar){
    if (!toolbar) return;
    if (toolbar.querySelector('#photo-token-btn')) return;

    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'photo-token-btn';
    b.className = 'btn btn-light';
    b.textContent = '📷';
    b.title = 'Attach photo';
    b.style.marginLeft = '6px';

    b.addEventListener('click', (e)=>{
      e.preventDefault();
      const editable = findEditableForToolbar(b);
      if (!editable){ alert('Could not find the note box near this toolbar.'); return; }

      const p = getPicker();
      p.onchange = (ev)=>{
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)){ alert('Please pick an image.'); p.value=''; return; }
        const r = new FileReader();
        r.onload = async e2 => {
          const full  = await scale(e2.target.result, 1200);
          const thumb = await scale(e2.target.result, 320);
          const token = `\n[[PHOTO full="${full}" thumb="${thumb}"]]\n`;

          if (editable.tagName && editable.tagName.toLowerCase()==='textarea'){
            insertAtCaretTextarea(editable, token);
          } else {
            // contenteditable fallback (insert token text)
            editable.focus();
            const sel = window.getSelection();
            if (sel && sel.rangeCount){
              const range = sel.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(token));
              range.collapse(false);
              sel.removeAllRanges(); sel.addRange(range);
            } else {
              editable.insertAdjacentText('beforeend', token);
            }
            editable.dispatchEvent(new Event('input', {bubbles:true}));
          }

          p.value='';
        };
        r.readAsDataURL(file);
      };
      p.click();
    });

    // place after “- List” if present; else append to toolbar
    const items = Array.from(toolbar.querySelectorAll('button, a'));
    const listBtn = items.find(x => ((x.textContent||'').trim().toLowerCase() === '- list') ||
                                    ((x.textContent||'').toLowerCase().includes('list')));
    if (listBtn && listBtn.parentElement === toolbar){
      listBtn.insertAdjacentElement('afterend', b);
    } else {
      toolbar.appendChild(b);
    }
  }

  // Find all candidate toolbars (B / I / U / HL / List cluster) and ensure button
  function attach(){
    document.querySelectorAll('div,section,form,header,footer,nav').forEach(el=>{
      const buttons = el.querySelectorAll && el.querySelectorAll('button, a');
      if (!buttons || buttons.length < 2) return;
      // heuristically detect the tiny formatting row by presence of "- List" or B/I
      const labels = Array.from(buttons).map(b => (b.textContent||'').trim().toLowerCase());
      const looksLikeToolbar = labels.some(t => t === '- list' || t.includes('list') || t === 'b' || t === 'i' || t === 'u' || t.includes('hl'));
      if (!looksLikeToolbar) return;
      // also make sure a textarea/contenteditable exists nearby in same block
      const block = el.closest('div,section,form,article,li') || el.parentElement;
      if (!block) return;
      if (!block.querySelector('textarea,[contenteditable="true"]')) return;

      ensureButtonInToolbar(el);
    });
  }

  attach();
  setInterval(attach, 800); // keep present if UI re-renders
})();
