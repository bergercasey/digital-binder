// fixes/note-photo.js — simple, anchored "📷 Photo" button for Notes
(function () {
  if (window.__notePhotoInit) return; window.__notePhotoInit = true;

  // Helpers
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // Find the notes textarea reliably
  function findNotesTextarea() {
    // 1) Prefer obvious IDs/names
    let t = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (t) return t;

    // 2) Prefer a textarea that sits next to an "Add Note" button
    const candidates = $$('textarea');
    for (const el of candidates) {
      const container = el.parentElement || document;
      const btn = $$('button, a', container).find(b => {
        const txt = (b.textContent || '').trim().toLowerCase();
        return txt.includes('add note');
      });
      if (btn) return el;
    }

    // 3) Fallback: first textarea on the page
    return candidates[0] || null;
  }

  // Insert HTML at caret for <textarea>
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

  function buildUI(textarea) {
    // If we already made one for this textarea, skip
    if ($('#note-photo-btn') || $('#note-photo-picker')) return;

    const row = document.createElement('div');
    row.style.margin = '6px 0';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'note-photo-btn';
    btn.textContent = '📷 Photo';
    btn.className = 'btn btn-light';
    btn.style.marginRight = '6px';

    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*'; // no "capture": iOS shows Library/Camera choice
    picker.id = 'note-photo-picker';
    picker.style.display = 'none';

    btn.addEventListener('click', e => { e.preventDefault(); picker.click(); });
    picker.addEventListener('change', e => {
      onPick(e.target.files && e.target.files[0], textarea);
      e.target.value = '';
    });

    row.appendChild(btn);
    row.appendChild(picker);

    // Place it directly ABOVE the textarea so it sits with your Notes tools
    if (textarea.parentElement) textarea.parentElement.insertBefore(row, textarea);
    else textarea.before(row);
  }

  function init() {
    const t = findNotesTextarea();
    if (t) { buildUI(t); return; }

    // If your app renders late, watch the DOM briefly
    const obs = new MutationObserver(() => {
      const t2 = findNotesTextarea();
      if (t2) { buildUI(t2); obs.disconnect(); }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 3000); // don't watch forever
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
