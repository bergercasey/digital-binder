// fixes/note-photo-overlay.js
// Visually ONE editor (overlay) in the exact textarea spot.
// The real <textarea> stays underneath (same size), is hidden (opacity:0),
// and is kept perfectly in sync so Add Note reads the right value.
// 📷 button sits after "- List", inserts image at caret; tap image to cycle size.

(function () {
  if (window.__notePhotoOverlayInit) return; window.__notePhotoOverlayInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const toText = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  // --- find the exact Add Note textarea (by your placeholder) ---
  function getTextarea() {
    let ta = $('textarea[placeholder^="What changed? Materials, inspections, dates"]');
    if (ta) return ta;
    // fallback near "Add Note"
    const add = $$('button, a').find(b => toText(b) === 'add note');
    if (add) {
      let p = add.parentElement;
      for (let i=0; i<6 && p; i++, p=p.parentElement) {
        ta = $('textarea', p);
        if (ta) return ta;
      }
    }
    return $('textarea');
  }

  function getToolbarFor(ta) {
    let el = ta && ta.previousElementSibling;
    for (let i=0; i<3 && el; i++, el = el.previousElementSibling) {
      const btns = el && el.querySelectorAll ? el.querySelectorAll('button, a') : [];
      if (btns && btns.length >= 2) return el;
    }
    return null;
  }

  // --- styles and helpers ---
  function ensureStyles() {
    if ($('#note-photo-overlay-styles')) return;
    const css = document.createElement('style');
    css.id = 'note-photo-overlay-styles';
    css.textContent = `
      /* wrapper to stack overlay editor on top of the textarea */
      .np-wrap { position: relative; }
      .np-under { opacity: 0; pointer-events: none; } /* textarea stays in flow but invisible */
      .np-editor {
        position: absolute; inset: 0;
        overflow: auto; box-sizing: border-box;
        border: 1px solid #ccc; border-radius: 4px; padding: 8px;
        min-height: 90px; line-height: 1.35; font: inherit; background: #fff;
      }
      .np-editor:focus { outline: 2px solid #cfe3ff; }
      .np-editor img { display:block; border:1px solid #ddd; border-radius:6px; margin:6px auto; }
      .np-img-s { max-width:220px; height:auto; }
      .np-img-m { max-width:420px; height:auto; }
      .np-img-l { max-width:100%; height:auto; }
    `;
    document.head.appendChild(css);
  }

  function toggleImgSize(img){
    const sizes = ['np-img-s','np-img-m','np-img-l'];
    const next = img.classList.contains('np-img-s') ? 'np-img-m'
               : img.classList.contains('np-img-m') ? 'np-img-l'
               : 'np-img-s';
    sizes.forEach(c => img.classList.remove(c));
    img.classList.add(next);
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

  // --- build overlay editor exactly on top of textarea ---
  function buildOverlay(ta){
    ensureStyles();

    if (ta.__npEditor && ta.__npEditor.isConnected) return ta.__npEditor;

    // Wrap the textarea so overlay can sit on top but keep textarea layout/height
    const wrap = document.createElement('div');
    wrap.className = 'np-wrap';
    ta.parentElement.insertBefore(wrap, ta);
    wrap.appendChild(ta);

    // textarea stays in flow but invisible
    ta.classList.add('np-under');

    // Create overlay editor that fills wrapper
    const ed = document.createElement('div');
    ed.className = 'np-editor';
    ed.contentEditable = 'true';

    // carry over any existing text (convert newlines to <br>)
    const startHTML = (ta.value || '')
      .replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))
      .replace(/\n/g,'<br>');
    ed.innerHTML = startHTML;

    wrap.appendChild(ed);

    // bi-directional sync
    const syncEdToTa = ()=> { ta.value = ed.innerHTML; };
    ed.addEventListener('input', syncEdToTa);

    // keep heights aligned (so wrapper matches typical textarea height)
    const keepSize = ()=>{
      // set editor min-height to textarea's clientHeight so it fills the box
      ed.style.minHeight = ta.clientHeight + 'px';
    };
    keepSize();
    const ro = new ResizeObserver(keepSize);
    ro.observe(ta);

    // image size toggle on tap
    ed.addEventListener('click', e => { if (e.target && e.target.tagName==='IMG'){ toggleImgSize(e.target); e.preventDefault(); } });

    // ensure Add Note click syncs BEFORE app reads textarea
    const add = $$('button, a').find(b => toText(b) === 'add note');
    if (add && !add.__npSyncBound){
      add.__npSyncBound = true;
      add.addEventListener('click', ()=> { ta.value = ed.innerHTML; }, true); // capture
    }

    ta.__npEditor = ed;
    ta.__npSync = syncEdToTa;
    return ed;
  }

  // --- toolbar button ---
  let picker;
  function getPicker(){
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*'; // Library/Camera chooser (no capture)
      picker.id = 'note-photo-global-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }
    return picker;
  }

  function ensureToolbarButton(toolbar, onClick){
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
    const ta = getTextarea();
    if (!ta) return;

    const toolbar = getToolbarFor(ta);
    const ed = buildOverlay(ta);

    if (toolbar){
      ensureToolbarButton(toolbar, ()=>{
        const p = getPicker();
        p.onchange = (e)=>{
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!/^image\//.test(file.type)){ alert('Please pick an image.'); p.value=''; return; }
          const r = new FileReader();
          r.onload = async ev => {
            const scaled = await downscale(ev.target.result, 1200);
            insertAtCaret(ed, `<img src="${scaled}" alt="Photo" class="np-img-m">`);
            ta.value = ed.innerHTML; // keep textarea synced for Add Note
            p.value = '';
          };
          r.readAsDataURL(file);
        };
        p.click();
      });
    }
  }

  // run now + keep it alive if UI re-renders
  attach();
  setInterval(attach, 800);
})();
