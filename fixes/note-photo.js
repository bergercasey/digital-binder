// fixes/note-photo.js — Photo button in the tiny toolbar; inserts into the Add Note textarea
(function () {
  if (window.__notePhotoToolbarInit) return; window.__notePhotoToolbarInit = true;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const txt = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  // Find the "Add Note" section => its textarea + the little toolbar row above it
  function findAddNoteSection() {
    // 1) Find an "Add Note" button
    const addBtns = $$('button, a').filter(b => txt(b) === 'add note');
    for (const btn of addBtns) {
      // Look upward a few levels for a container that also contains a textarea
      let p = btn.parentElement;
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
        const ta = $('textarea', p);
        if (!ta) continue;

        // Find the toolbar element just BEFORE the textarea that has small buttons (B / I / etc)
        let toolbar = ta.previousElementSibling;
        for (let j = 0; j < 4 && toolbar; j++, toolbar = toolbar.previousElementSibling) {
          const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
          if (btns && btns.length >= 2) {
            return { container: p, textarea: ta, toolbar: toolbar };
          }
        }
        // If not found, allow placing before the textarea anyway
        return { container: p, textarea: ta, toolbar: null };
      }
    }

    // Fallback: first textarea on page
    const ta = $('textarea');
    if (ta) {
      let toolbar = ta.previousElementSibling;
      for (let j = 0; j < 4 && toolbar; j++, toolbar = toolbar.previousElementSibling) {
        const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button, a') : [];
        if (btns && btns.length >= 2) return { container: document, textarea: ta, toolbar };
      }
      return { container: document, textarea: ta, toolbar: null };
    }
    return null;
  }

  // Insert HTML at caret in a textarea
  function insertAtCursor(textarea, html) {
    try {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + html + after;
      const pos = (before + html).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    } catch (e) {
      textarea.value += html;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  // Downscale so notes stay fast
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

  function onPick(file, textarea) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { alert('Please pick an image.'); return; }
    const r = new FileReader();
    r.onload = async e => {
      const scaled = await downscale(e.target.result, 1200);
      const html = `\n<img src="${scaled}" alt="Photo" style="max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;">\n`;
      insertAtCursor(textarea, html);
    };
    r.readAsDataURL(file);
  }

  function addToolbarButton(section) {
    const { textarea, toolbar } = section;

    // Avoid dupes
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
      onPick(e.target.files && e.target.files[0], textarea);
      e.target.value = '';
    });

    if (toolbar) {
      // Put it directly after the List button if present; else just append
      const maybeList = Array.from(toolbar.querySelectorAll('button, a')).find(b => txt(b).includes('list') || txt(b) === '- list');
      if (maybeList && maybeList.parentElement === toolbar) {
        maybeList.insertAdjacentElement('afterend', btn);
      } else {
        toolbar.appendChild(btn);
      }
    } else {
      // If no toolbar element exists, place it right above the textarea
      textarea.parentElement ? textarea.parentElement.insertBefore(btn, textarea) : textarea.before(btn);
    }
  }

  function init() {
    const section = findAddNoteSection();
    if (section) { addToolbarButton(section); return; }

    // If UI renders late, watch briefly
    const obs = new MutationObserver(() => {
      const s = findAddNoteSection();
      if (s) { addToolbarButton(s); obs.disconnect(); }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
