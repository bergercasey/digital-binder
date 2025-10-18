// fixes/note-photo.js — toolbar 📷 that inserts into Add Note (textarea or contenteditable)
(function () {
  if (window.__notePhotoToolbarInit) return; window.__notePhotoToolbarInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const txt = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  // Find the "Add Note" area: its toolbar row + the real editable field
  function findAddNoteSection() {
    const addBtns = $$('button, a').filter(b => txt(b) === 'add note');
    for (const btn of addBtns) {
      let p = btn.parentElement;
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
        // Accept textarea OR contenteditable inside the same block
        let ta = $('textarea', p);
        let ce = $('[contenteditable="true"]', p);
        const editable = ta || ce;
        if (!editable) continue;

        // Toolbar just BEFORE the editable with multiple small buttons (B / I / HL / List)
        let toolbar = editable.previousElementSibling;
        for (let j = 0; j < 4 && toolbar; j++, toolbar = toolbar.previousElementSibling) {
          const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
          if (btns && btns.length >= 2) return { container: p, editable, toolbar };
        }
        // If no toolbar detected, still return
        return { container: p, editable, toolbar: null };
      }
    }

    // Fallback: first textarea or contenteditable on the page
    const ta = $('textarea');
    const ce = $('[contenteditable="true"]');
    const editable = ta || ce;
    if (editable) {
      let toolbar = editable.previousElementSibling;
      for (let j = 0; j < 4 && toolbar; j++, toolbar = toolbar.previousElementSibling) {
        const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
        if (btns && btns.length >= 2) return { container: document, editable, toolbar };
      }
      return { container: document, editable, toolbar: null };
    }
    return null;
  }

  // Insert HTML at caret for TEXTAREA
  function insertAtCursorTextArea(textarea, html) {
    try {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + html + after;
      const pos = (before + html).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    } catch (_) {
      textarea.value += html;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  // Insert HTML at caret for CONTENTEDITABLE
  function insertAtCaretContentEditable(el, html) {
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const frag = range.createContextualFragment(html);
      const lastNode = frag.lastChild;
      range.insertNode(frag);
      // move caret after inserted content
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      el.insertAdjacentHTML('beforeend', html);
      // move caret to end
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      const s = window.getSelection();
      s.removeAllRanges(); s.addRange(r);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Downscale images so notes stay snappy
  function downscale(dataURL, maxW = 1200) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w <= maxW) return res(dataURL);
        const r = maxW / w; w = Math.round(w * r); h = Math.round(h * r);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => res(dataURL);
      img.src = dataURL;
    });
  }

  function onPick(file, editable) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { alert('Please pick an image.'); return; }
    const r = new FileReader();
    r.onload = async e => {
      const scaled = await downscale(e.target.result, 1200);
      const html = `\n<img src="${scaled}" alt="Photo" style="max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;">\n`;
      if (editable.tagName && editable.tagName.toLowerCase() === 'textarea') {
        insertAtCursorTextArea(editable, html);
      } else {
        insertAtCaretContentEditable(editable, html);
      }
    };
    r.readAsDataURL(file);
  }

  function addToolbarButton(section) {
    const { editable, toolbar } = section;
    if ($('#note-photo-toolbar-btn', toolbar || document)) return;

    // Hidden picker (no capture so iOS shows Library/Camera choice)
    let picker = $('#note-photo-toolbar-picker');
    if (!picker) {
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.id = 'note-photo-toolbar-picker';
      picker.style.display = 'none';
      document.body.appendChild(picker);
    }

    // Visible 📷 button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'note-photo-toolbar-btn';
    btn.textContent = '📷';
    btn.title = 'Insert photo';
    btn.className = 'btn btn-light';
    btn.style.marginLeft = '6px';

    btn.addEventListener('click', (e) => { e.preventDefault(); picker.click(); });
    picker.addEventListener('change', (e) => {
      onPick(e.target.files && e.target.files[0], editable);
      e.target.value = '';
    });

    if (toolbar) {
      // Put it right after "- List" if present
      const maybeList = Array.from(toolba
