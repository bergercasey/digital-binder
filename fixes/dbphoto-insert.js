// fixes/dbphoto-insert.js — V4: LOCKED to the Add Note block (button + local textarea)
// Adds a single "🔗 Dropbox Photo" button next to the Add Note controls.
// On click: prompt for Dropbox link, normalize it, and insert [[DBPHOTO url="..."]] into THAT textarea.
// Shows a brief ✅ toast under the textarea when inserted.

(function () {
  if (window.__dbPhotoInsertInitV4) return; window.__dbPhotoInsertInitV4 = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const txt = el => (el && (el.textContent || el.value) || '').trim().toLowerCase();

  // Find the single "Add Note" button
  function findAddNoteButton() {
    return $$('button, a').find(b => txt(b) === 'add note') || null;
  }

  // In the same block as the Add Note button, find the textarea we type into
  function findTextareaNear(addBtn) {
    if (!addBtn) return null;
    let root = addBtn.parentElement;
    for (let i = 0; i < 8 && root; i++, root = root.parentElement) {
      const ta = root.querySelector('textarea');
      if (ta) return ta;
    }
    // Last resort: first visible textarea on the page
    const any = Array.from(document.querySelectorAll('textarea')).find(el => el.offsetParent !== null);
    return any || null;
  }

  // Insert text at caret in a TEXTAREA
  function insertAtCaret(textarea, text) {
    try {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + text + after;
      const pos = (before + text).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    } catch (_) {
      textarea.value += text;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  // Normalize Dropbox share link → direct (works in <img> and as a link)
  function normalizeDropboxUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname.endsWith('dropbox.com')) {
        if (u.searchParams.has('dl')) u.searchParams.delete('dl');
        u.searchParams.set('raw', '1'); // direct image
        return u.toString();
      }
      return url;
    } catch {
      return url;
    }
  }

  function showToast(target) {
    const toast = document.createElement('div');
    toast.textContent = '✅ Photo link inserted';
    toast.style.cssText =
      'margin-top:6px;font-size:12px;color:#0a7a2f;background:#e6f7ec;border:1px solid #bfe8cc;border-radius:4px;padding:4px 6px;display:inline-block;';
    if (target.nextSibling) target.parentElement.insertBefore(toast, target.nextSibling);
    else target.parentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }

  // Place ONE button near the Add Note button/textarea (not in every toolbar)
  function ensureSingleButton(addBtn, textarea) {
    // Remove stray copies elsewhere
    document.querySelectorAll('#dbphoto-insert-btn').forEach(n => {
      const ok = n.__ownerAddBtn === addBtn;
      if (!ok) n.remove();
    });

    // Already present for this addBtn?
    const existing = Array.from(document.querySelectorAll('#dbphoto-insert-btn'))
      .find(b => b.__ownerAddBtn === addBtn);
    if (existing) return existing;

    // Create the button
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'dbphoto-insert-btn';
    b.className = 'btn btn-light';
    b.textContent = '🔗 Dropbox Photo';
    b.title = 'Insert Dropbox photo link';
    b.style.marginLeft = '6px';
    b.__ownerAddBtn = addBtn;

    // Put the button just BEFORE the Add Note button so it’s clearly tied to this box
    if (addBtn.parentElement) {
      addBtn.parentElement.insertBefore(b, addBtn);
    } else {
      // fallback: put it above the textarea
      textarea.parentElement.insertBefore(b, textarea);
    }
    return b;
  }

  function wireButton(btn, textarea) {
    if (!btn || btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', e => {
      e.preventDefault();
      const pasted = prompt('Paste Dropbox share link (from Dropbox app):');
      if (!pasted) return;
      const url = normalizeDropboxUrl(pasted.trim());
      if (!/^https?:\/\//i.test(url)) { alert('That does not look like a valid link.'); return; }
      const token = `\n[[DBPHOTO url="${url}"]]\n`;
      insertAtCaret(textarea, token);
      showToast(textarea);
    });
  }

  function attach() {
    const addBtn = findAddNoteButton();
    if (!addBtn) return;
    const ta = findTextareaNear(addBtn);
    if (!ta) {
      // Give a clear signal if we still can’t find the box
      console.warn('[dbphoto-insert] Could not find the Add Note textarea near the button.');
      return;
    }
    const btn = ensureSingleButton(addBtn, ta);
    wireButton(btn, ta);
  }

  attach();
  setInterval(attach, 1000); // re-assert if the UI re-renders
})();
