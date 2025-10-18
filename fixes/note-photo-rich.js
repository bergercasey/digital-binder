// fixes/note-photo-rich.js — locked to the Add Note box with placeholder
// "What changed? Materials, inspections, dates...".
// Inserts 📷 after "- List", converts that textarea to a rich editor in place,
// syncs to the hidden textarea on input and right before "Add Note" click.

(function () {
  if (window.__notePhotoRichInit) return; window.__notePhotoRichInit = true;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // --- hard anchors ----
  function getTextarea() {
    // 1) Exact placeholder (from your screenshot)
    let ta = $('textarea[placeholder^="What changed? Materials, inspections, dates"]');
    if (ta) return ta;
    // 2) Nearby the "Add Note" button as fallback
    const add = $$('button, a').find(b => (b.textContent||'').trim().toLowerCase() === 'add note');
    if (add) {
      let p = add.parentElement;
      for (let i=0; i<6 && p; i++, p=p.parentElement) {
        ta = $('textarea', p);
        if (ta) return ta;
      }
    }
    // 3) Last resort: first textarea
    return $('textarea');
  }

  function getToolbarFor(ta) {
    // the row directly above the textarea with B / I / U / HL / - List
    let el = ta && ta.previousElementSibling;
    for (let i=0; i<3 && el; i++, el = el.previousElementSibling) {
      const buttons = el.querySelectorAll ? el.querySelectorAll('button, a') : [];
      if (buttons && buttons.length >= 2) return el;
    }
    return null;
  }

  // --- rich editor + sync ----
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
      .note-img-s { max-width: 220px; height:auto; }
      .note-img-m { max-width: 420px; height:auto; }
      .note-img-l { max-width: 100%; height:auto; }
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

    // If already upgraded
    if (ta.__richEditorEl && ta.__richEditorEl.isConnected) return ta.__richEditorEl;

    // Strongly hide textarea but keep it in DOM
    ta.hidden = true;
    ta.setAttribute('aria-hidden', 'true');
    ta.style.setProperty('display','none','important');

    // Create contenteditable in the same spot
    const ed = document.createElement('div');
    ed.className = 'note-rich-editor';
    ed.contentEditable = 'true';
    // Carry over any existing text lines
    const startHTML = (ta.value || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/\n/g,'<br>');
    ed.innerHTML = startHTML;
    ta.parentElement.insertBefore(ed, ta);

    const sync = () => { ta.value = ed.innerHTML; };
    ed.addEventListener('input', sync);
    ed.addEventListener('click', e => { if (e.target && e.target.tagName==='IMG') { toggleImgSize(e.target); e.preventDefault(); }});
    sync();

    // Ensure "Add Note" syncs before app reads textarea
    const add = $$('button, a').find(b => (b.textContent||'').trim().toLowerCase() === 'add note');
    if (add && !add.__noteSyncBound){
      add.__noteSyncBound = true;
      add.addEventListener('click', () => { ta.value = ed.innerHTML; }, true); // capture: before app handler
    }

    ta.__richEditorEl = ed;
    return ed;
  }

  // --- photo picker + insert ----
  let picker;
  function getPicker(){
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';      // no capture → lets the user choose Library or Camera
      picker.id = 'note-photo-global-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }
    return picker;
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
      const nr = document.createRange();
      nr.setStartAfter(last); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
    } else {
      ed.insertAdjacentHTML('beforeend', html);
      const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    ed.dispatchEvent(new Event('input', {bubbles:true}));
  }

  // --- ensure toolbar button right after "- List" ----
  function ensureToolbarButton(toolbar, onClick){
    if (!toolbar) return;
    if (toolbar.querySelector('#note-photo-toolbar-btn')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'note-photo-toolbar-btn';
    b.className = 'btn btn-light';
    b.textContent = '📷';
    b.title = 'Insert photo';
    b.style.marginLeft = '6px';
    b.addEventListener('click', e => { e.preventDefault(); onClick(); });

    const items = Array.from(toolbar.querySelectorAll('button, a'));
    const listBtn = items.find(x => {
      const k = (x.textContent||'').trim().toLowerCase();
      return k === '- list' || k.includes('list');
    });
    if (listBtn && listBtn.parentElement === toolbar) {
      listBtn.insertAdjacentElement('afterend', b);
    } else {
      toolbar.appendChild(b);
    }
  }

  function attach(){
    const ta = getTextarea();
    if (!ta) return;

    const toolbar = getToolbarFor(ta);
    const editor  = upgradeTextarea(ta);

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
            const html = `<img src="${scaled}" alt="Photo" class="note-img-m">`;
            insertAtCaret(editor, html);
            ta.value = editor.innerHTML; // keep sync
            p.value = '';
          };
          r.readAsDataURL(file);
        };
        p.click();
      });
    }
  }

  // Run once and keep alive (in case UI re-renders)
  attach();
  setInterval(attach, 1000);
})();
