// fixes/photo-token-insert.js — V3 (LOCKED to the single "Add Note" block)
(function(){
  if (window.__photoTokenInsertInitV3) return; window.__photoTokenInsertInitV3 = true;

  // Tiny helpers
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const t  = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  // 1) Find exactly ONE Add Note block: the button labeled "Add Note" and its local textarea + toolbar
  function findAddNoteBlock(){
    const add = $$('button, a').find(b => t(b) === 'add note');
    if (!add) return null;

    // Walk up a few levels to the logical container that holds the editor + toolbar
    let root = add.parentElement;
    for (let i=0; i<8 && root; i++, root = root.parentElement){
      const ta = $('textarea', root);
      if (!ta) continue;

      // toolbar is the row directly before the textarea with multiple small buttons (B/I/…/List)
      let toolbar = ta.previousElementSibling;
      for (let j=0; j<4 && toolbar; j++, toolbar = toolbar.previousElementSibling){
        const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
        if (btns && btns.length >= 2) return {root: root, textarea: ta, toolbar: toolbar};
      }
      // if no obvious toolbar, still return (we'll place the button above textarea)
      return {root: root, textarea: ta, toolbar: null};
    }
    return null;
  }

  // 2) Insert text at caret in the (plain) textarea
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

  // 3) Scale dataURL
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

  // 4) One hidden file picker
  let picker;
  function getPicker(){
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';     // library/camera chooser; NO capture attr
      picker.id = 'photo-token-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }
    return picker;
  }

  // 5) Ensure exactly ONE button in the Add Note toolbar; remove all other stray copies
  function ensureSingleButton(targetToolbar, fallbackBefore){
    // Remove any existing 📷 anywhere else
    document.querySelectorAll('#photo-token-btn').forEach(node => {
      if (!targetToolbar || !targetToolbar.contains(node)) node.remove();
    });

    if (targetToolbar){
      if (targetToolbar.querySelector('#photo-token-btn')) return targetToolbar.querySelector('#photo-token-btn');
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'photo-token-btn';
      b.className = 'btn btn-light';
      b.textContent = '📷';
      b.title = 'Attach photo';
      b.style.marginLeft = '6px';

      // Place after "- List" if present, else append
      const items = Array.from(targetToolbar.querySelectorAll('button, a'));
      const listBtn = items.find(x => {
        const k = (x.textContent || '').trim().toLowerCase();
        return k === '- list' || k.includes('list');
      });
      if (listBtn && listBtn.parentElement === targetToolbar){
        listBtn.insertAdjacentElement('afterend', b);
      } else {
        targetToolbar.appendChild(b);
      }
      return b;
    } else if (fallbackBefore) {
      // No toolbar? put button just above textarea, but ensure single
      if (fallbackBefore.parentElement && !fallbackBefore.parentElement.querySelector('#photo-token-btn')){
        const b = document.createElement('button');
        b.type='button'; b.id='photo-token-btn';
        b.className='btn btn-light'; b.textContent='📷'; b.title='Attach photo';
        b.style.margin='6px 0';
        fallbackBefore.parentElement.insertBefore(b, fallbackBefore);
        return b;
      }
    }
    return null;
  }

  // 6) Wire the button to insert a [[PHOTO …]] token into the SAME textarea
  function wireButton(btn, textarea){
    if (!btn || btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener('click', (e)=>{
      e.preventDefault();
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
          insertAtCaretTextarea(textarea, token);
          p.value = '';
        };
        r.readAsDataURL(file);
      };
      p.click();
    });
  }

  // 7) Attach once; re-assert every 1s in case UI re-renders
  function attach(){
    const block = findAddNoteBlock();
    if (!block) return;
    const { textarea, toolbar } = block;

    const btn = ensureSingleButton(toolbar, textarea);
    wireButton(btn, textarea);
  }

  attach();
  setInterval(attach, 1000);
})();
