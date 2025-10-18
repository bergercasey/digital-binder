// fixes/note-photo-rich.js
// Upgrades ONLY the "Add Note" input into a contenteditable editor (runtime),
// keeps the original <textarea> hidden & in-sync, and adds a 📷 button in the tiny toolbar.
// Features:
// - Insert image at caret
// - Tap image to cycle sizes (small/medium/full)
// - Backspace/Delete to remove image like text
// - No changes to layout or email/print flows

(function () {
  if (window.__notePhotoRichInit) return; window.__notePhotoRichInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const txt = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  // --- helpers ---------------------------------------------------------------

  // Convert textarea value (plain text) to HTML (preserve basic line breaks)
  function textToHTML(s) {
    if (!s) return "";
    const esc = s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    return esc.replace(/\n/g, "<br>");
  }

  // Convert minimal editor HTML back to text if needed (we keep HTML so images persist)
  function editorToTextareaValue(html) {
    // We’ll keep HTML so that images persist across saves.
    // If you MUST store plain text, you could strip tags here—but then you’d lose images.
    return html;
  }

  function placeAfter(refNode, newNode) {
    if (!refNode || !refNode.parentNode) return;
    if (refNode.nextSibling) refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
    else refNode.parentNode.appendChild(newNode);
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

  function insertAtCaretEditable(ed, html){
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
      const r = document.createRange();
      r.selectNodeContents(ed); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    ed.dispatchEvent(new Event('input', {bubbles:true}));
  }

  // Image size toggle: small → medium → full
  function toggleImgSize(img){
    const sizes = ["note-img-s", "note-img-m", "note-img-l"];
    const cur = sizes.find(c => img.classList.contains(c));
    const next = !cur ? "note-img-m" : cur === "note-img-s" ? "note-img-m" : cur === "note-img-m" ? "note-img-l" : "note-img-s";
    sizes.forEach(c => img.classList.remove(c));
    img.classList.add(next);
  }

  // --- core: find block, upgrade, add toolbar button ------------------------

  function findAddNoteBlock(){
    const addBtns = $$('button, a').filter(b => txt(b) === 'add note');
    for (const btn of addBtns){
      let p = btn.parentElement;
      for (let i=0; i<8 && p; i++, p = p.parentElement){
        const ta = $('textarea', p);
        if (!ta) continue;

        // Tiny toolbar is just before the input
        let toolbar = ta.previousElementSibling;
        for (let j=0; j<4 && toolbar; j++, toolbar = toolbar.previousElementSibling){
          const bt = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
          if (bt && bt.length >= 2) return {root:p, textarea:ta, toolbar};
        }
        return {root:p, textarea:ta, toolbar:null};
      }
    }
    return null;
  }

  function ensureStyles(){
    if (document.getElementById('note-photo-rich-styles')) return;
    const css = document.createElement('style');
    css.id = 'note-photo-rich-styles';
    css.textContent = `
      .note-rich-editor {
        border: 1px solid #ccc; border-radius: 4px; padding: 8px;
        min-height: 90px; line-height: 1.35; font: inherit; background: #fff;
      }
      .note-rich-editor:focus { outline: 2px solid #cfe3ff; }
      .note-rich-editor img { display:block; border:1px solid #ddd; border-radius:6px; margin:6px auto; }
      .note-img-s { max-width: 220px; height: auto; }
      .note-img-m { max-width: 420px; height: auto; }
      .note-img-l { max-width: 100%;  height: auto; }
    `;
    document.head.appendChild(css);
  }

  function upgradeTextareaToEditor(ta){
    ensureStyles();

    // If already upgraded, return current editor
    const existing = ta.__richEditorEl;
    if (existing && existing.isConnected) return existing;

    // Make a contenteditable right after the textarea, hide the textarea
    const ed = document.createElement('div');
    ed.className = 'note-rich-editor';
    ed.contentEditable = "true";
    ed.innerHTML = textToHTML(ta.value || '');
    placeAfter(ta, ed);
    ta.style.display = 'none'; // keep it in DOM for forms
    ta.__richEditorEl = ed;

    // Sync editor -> textarea on input
    const sync = () => { ta.value = editorToTextareaValue(ed.innerHTML); };
    ed.addEventListener('input', sync);
    // Also sync on form submit (best effort)
    const form = ta.closest('form');
    if (form && !form.__notePhotoSyncHook){
      form.__notePhotoSyncHook = true;
      form.addEventListener('submit', sync, true);
    }

    // Clicking an image toggles its size
    ed.addEventListener('click', (e)=>{
      const t = e.target;
      if (t && t.tagName === 'IMG'){ toggleImgSize(t); e.preventDefault(); }
    });

    // Delete key should remove selected image as normal
    // (contenteditable already handles this, but ensuring cursor stays visible)
    ed.addEventListener('keydown', (e)=>{
      // no-op placeholder in case we need custom behavior later
    });

    return ed;
  }

  // Add 📷 button to the tiny toolbar
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
    b.addEventListener('click', (e)=>{ e.preventDefault(); onClick(); });

    // try to place after "- List"
    const items = Array.from(toolbar.querySelectorAll('button, a'));
    const listBtn = items.find(x => {
      const k = txt(x);
      return k === '- list' || k.includes('list');
    });
    if (listBtn && listBtn.parentElement === toolbar){
      listBtn.insertAdjacentElement('afterend', b);
    } else {
      toolbar.appendChild(b);
    }
  }

  // Single hidden picker reused
  let picker;
  function getPicker(){
    if (!picker){
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';         // NO capture, user can choose Library or Camera
      picker.id = 'note-photo-global-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }
    return picker;
  }

  function attach(){
    const block = findAddNoteBlock();
    if (!block) return;

    const { textarea, toolbar } = block;
    const editor = upgradeTextareaToEditor(textarea);
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
          insertAtCaretEditable(editor, html);
          // ensure textarea is updated so your existing code sees the new content
          textarea.value = editorToTextareaValue(editor.innerHTML);
          p.value = '';
        };
        r.readAsDataURL(file);
      };
      p.click();
    });
  }

  // First attach now, then keep it alive in case your UI re-renders
  attach();
  setInterval(attach, 800);
})();
