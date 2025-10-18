// fixes/note-photo-reset.js
// Single-source-of-truth editor for "Add Note":
// - Finds the Add Note textarea by placeholder ("What changed? Materials, inspections, dates...")
// - Replaces it in-place with a contenteditable editor (no second box)
// - Hides & syncs the original textarea (so Add Note reads the right value)
// - Adds 📷 after "- List" in the tiny toolbar
// - Inserts image at caret; tap image to cycle S/M/L
(function(){
  if (window.__notePhotoResetInit) return; window.__notePhotoResetInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const t  = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  // Remove any previous photo buttons/editors we may have left around
  function stripOld(){
    ['note-photo-btn','note-photo-inline-btn','note-photo-toolbar-btn','note-photo-fab'].forEach(id=>{
      const n = document.getElementById(id); if (n) n.remove();
    });
    ['note-photo-inline-picker','note-photo-force-picker','note-photo-anchored-picker','note-photo-global-picker'].forEach(id=>{
      const n = document.getElementById(id); if (n) n.remove();
    });
    // Remove any old rich editor divs we created in past tries (by class)
    $$('.note-rich-editor').forEach(n => {
      if (!n.__keep) n.remove();
    });
  }

  function getTextarea() {
    let ta = $('textarea[placeholder^="What changed? Materials, inspections, dates"]');
    if (ta) return ta;
    // Fallback: locate by Add Note button ancestry
    const add = $$('button, a').find(b => t(b) === 'add note');
    if (add){
      let p = add.parentElement;
      for (let i=0; i<6 && p; i++, p=p.parentElement){
        ta = $('textarea', p);
        if (ta) return ta;
      }
    }
    return $('textarea');
  }

  function getToolbarFor(ta){
    let el = ta && ta.previousElementSibling;
    for (let i=0; i<3 && el; i++, el = el.previousElementSibling){
      const btns = el && el.querySelectorAll ? el.querySelectorAll('button, a') : [];
      if (btns && btns.length >= 2) return el;
    }
    return null;
  }

  function ensureStyles(){
    if ($('#note-photo-rich-styles')) return;
    const css = document.createElement('style');
    css.id = 'note-photo-rich-styles';
    css.textContent = `
      .note-rich-editor {
        border: 1px solid #ccc; border-radius: 4px; padding: 8px;
        min-height: 90px; line-height: 1.35; font: inherit; background: #fff;
      }
      .note-rich-editor:focus { outline: 2px solid #cfe3ff; }
      .note-rich-editor img { display:block; border:1px solid #ddd; border-radius:6px; margin:6px auto; }
      .note-img-s { max-width:220px; height:auto; }
      .note-img-m { max-width:420px; height:auto; }
      .note-img-l { max-width:100%; height:auto; }
    `;
    document.head.appendChild(css);
  }

  function toggleImgSize(img){
    const sizes = ['note-img-s','note-img-m','note-img-l'];
    const next = img.classList.contains('note-img-s') ? 'note-img-m'
               : img.classList.contains('note-img-m') ? 'note-img-l'
               : 'note-img-s';
    sizes.forEach(c => img.classList.remove(c));
    img.classList.add(next);
  }

  function upgradeTextarea(ta){
    ensureStyles();

    // If already upgraded, return existing editor
    if (ta.__richEditorEl && ta.__richEditorEl.isConnected) return ta.__richEditorEl;

    // Strongly hide textarea (but keep it where it is)
    ta.hidden = true;
    ta.setAttribute('aria-hidden','true');
    ta.style.setProperty('display','none','important');
    ta.style.position = 'absolute'; ta.style.left = '-99999px'; ta.style.maxHeight = '0';

    // Create editor exactly in textarea's position
    const ed = document.createElement('div');
    ed.className = 'note-rich-editor';
    ed.__keep = true; // do not strip on future resets
    ed.contentEditable = 'true';
    const startHTML = (ta.value || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/\n/g,'<br>');
    ed.innerHTML = startHTML;
    ta.parentElement.insertBefore(ed, ta);

    const sync = () => { ta.value = ed.innerHTML; };
    ed.addEventListener('input', sync);
    ed.addEventListener('click', e => { if (e.target && e.target.tagName==='IMG'){ toggleImgSize(e.target); e.preventDefault(); }});
    sync(); // initial

    // Ensure Add Note forces sync BEFORE app reads textarea
    const add = $$('button, a').find(b => t(b) === 'add note');
    if (add && !add.__noteSyncBound){
      add.__noteSyncBound = true;
      add.addEventListener('click', ()=> { ta.value = ed.innerHTML; }, true); // capture
    }

    ta.__richEditorEl = ed;
    ta.__syncFromEd = sync;
    return ed;
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

  function insertAtCaret(ed, html){
    ed.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ed.contains(sel.anchorNode)){
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const frag = range.createContextualFragment(html);
      const last = frag.lastChild;
      range.insertNode(frag);
      const nr = document.createRange(); nr.setStartAfter(last); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
    } else {
      ed.insertAdjacentHTML('beforeend', html);
      const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    ed.dispatchEvent(new Event('input', {bubbles:true}));
  }

  let picker;
  function getPicker(){
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*'; // library OR camera
      picker.id = 'note-photo-global-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }
    return picker;
  }

  function ensurePhotoButton(toolbar, onClick){
    if (!toolbar) return;
    if (toolbar.querySelector('#note-photo-toolbar-btn')) return;
    const b = document.createElement('button');
    b.type='button'; b.id='note-photo-toolbar-btn';
    b.className='btn btn-light'; b.textContent='📷'; b.title='Insert photo';
    b.style.marginLeft='6px';
    b.addEventListener('click', e => { e.preventDefault(); onClick(); });

    const items = Array.from(toolbar.querySelectorAll('button, a'));
    const listBtn = items.find(x => { const k=(x.textContent||'').trim().toLowerCase(); return k==='- list' || k.includes('list'); });
    if (listBtn && listBtn.parentElement===toolbar) listBtn.insertAdjacentElement('afterend', b);
    else toolbar.appendChild(b);
  }

  function attach(){
    stripOld(); // clean any leftovers

    const ta = getTextarea();
    if (!ta) return;

    const toolbar = getToolbarFor(ta);
    const ed = upgradeTextarea(ta);

    if (toolbar){
      ensurePhotoButton(toolbar, ()=>{
        const p = getPicker();
        p.onchange = (e)=>{
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!/^image\//.test(file.type)){ alert('Please pick an image.'); p.value=''; return; }
          const r = new FileReader();
          r.onload = async ev => {
            const scaled = await downscale(ev.target.result, 1200);
            insertAtCaret(ed, `<img src="${scaled}" alt="Photo" class="note-img-m">`);
            ta.value = ed.innerHTML; // keep textarea in sync
            p.value = '';
          };
          r.readAsDataURL(file);
        };
        p.click();
      });
    }
  }

  // First pass + keep alive if the UI re-renders
  attach();
  setInterval(attach, 800);
})();
