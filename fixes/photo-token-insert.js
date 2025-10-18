// fixes/photo-token-insert.js — Add 📷 to toolbar, insert PHOTO token into the textarea
(function(){
  if (window.__photoTokenInsertInit) return; window.__photoTokenInsertInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const t  = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  // Find the Add Note textarea (locked to your placeholder; with fallbacks)
  function getTextarea(){
    let ta = $('textarea[placeholder^="What changed? Materials, inspections, dates"]');
    if (ta) return ta;
    const add = $$('button, a').find(b => t(b) === 'add note');
    if (add){
      let p = add.parentElement;
      for (let i=0;i<6 && p;i++,p=p.parentElement){
        ta = $('textarea', p);
        if (ta) return ta;
      }
    }
    return $('textarea');
  }

  // The mini toolbar is the sibling above the textarea with the B/I/U/HL/List buttons
  function getToolbarFor(ta){
    let el = ta && ta.previousElementSibling;
    for (let i=0;i<3 && el;i++,el=el.previousElementSibling){
      const btns = el && el.querySelectorAll ? el.querySelectorAll('button, a') : [];
      if (btns && btns.length >= 2) return el;
    }
    return null;
  }

  // Insert text at caret in a textarea
  function insertAtCursorTextArea(textarea, text){
    try {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + text + after;
      const pos = (before + text).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    } catch(_){
      textarea.value += text;
    }
    textarea.dispatchEvent(new Event('input', {bubbles:true}));
    textarea.focus();
  }

  // Scale an image dataURL to a given width (keeps aspect)
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

  // Build (or reuse) a hidden input type=file
  let picker;
  function getPicker(){
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*'; // Library/Camera chooser
      picker.id = 'photo-token-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }
    return picker;
  }

  // Ensure the 📷 button is present after "- List"
  function ensureButton(toolbar, onClick){
    if (!toolbar) return;
    if (toolbar.querySelector('#photo-token-btn')) return;

    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'photo-token-btn';
    b.className = 'btn btn-light';
    b.textContent = '📷';
    b.title = 'Attach photo';
    b.style.marginLeft = '6px';
    b.addEventListener('click', e => { e.preventDefault(); onClick(); });

    const items = Array.from(toolbar.querySelectorAll('button, a'));
    const listBtn = items.find(x => {
      const k = (x.textContent||'').trim().toLowerCase();
      return k === '- list' || k.includes('list');
    });
    if (listBtn && listBtn.parentElement === toolbar) listBtn.insertAdjacentElement('afterend', b);
    else toolbar.appendChild(b);
  }

  function attach(){
    const ta = getTextarea();
    if (!ta) return;
    const tb = getToolbarFor(ta);
    if (!tb) return;

    ensureButton(tb, ()=>{
      const p = getPicker();
      p.onchange = (e)=>{
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)){ alert('Please pick an image.'); p.value=''; return; }

        const r = new FileReader();
        r.onload = async ev => {
          const full  = await scale(ev.target.result, 1200); // full-ish
          const thumb = await scale(ev.target.result, 320);  // small preview
          // Token uses quotes so data URLs are safe
          const token = `\n[[PHOTO full="${full}" thumb="${thumb}"]]\n`;
          insertAtCursorTextArea(ta, token);
          p.value = '';
        };
        r.readAsDataURL(file);
      };
      p.click();
    });
  }

  attach();
  setInterval(attach, 1000); // keep present if UI re-renders
})();
