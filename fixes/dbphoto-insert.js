// fixes/dbphoto-insert.js — V6 hard-anchored to the Add Note textarea
(function () {
  if (window.__dbPhotoInsertInitV6) return; window.__dbPhotoInsertInitV6 = true;

  // --- CONFIG: if your placeholder text ever changes, update this one line
  const NOTE_SELECTOR = 'textarea[placeholder="What changed? Materials, inspections, dates..."]';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const txt = el => (el && (el.textContent || el.value) || '').trim().toLowerCase();

  function findAddNoteButton() {
    return $$('button, a').find(b => txt(b) === 'add note') || null;
  }

  function findTextarea() {
    // 1) Exact placeholder first
    let ta = $(NOTE_SELECTOR);
    if (ta) return ta;

    // 2) Fallback: the textarea in the same block as the “Add Note” button
    const add = findAddNoteButton();
    if (add) {
      let root = add.parentElement;
      for (let i = 0; i < 8 && root; i++, root = root.parentElement) {
        ta = root.querySelector('textarea');
        if (ta) return ta;
      }
    }

    // 3) Last resort: first visible textarea
    return Array.from(document.querySelectorAll('textarea')).find(el => el.offsetParent !== null) || null;
  }

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

  // Normalize Dropbox share URL → direct viewer (works in <img> and link)
  function normalizeDropboxUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname.endsWith('dropbox.com')) {
        if (u.searchParams.has('dl')) u.searchParams.delete('dl');
        u.searchParams.set('raw', '1');
        return u.toString();
      }
      return url;
    } catch { return url; }
  }

  function toast(target, msg, ok=true) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText =
      `margin-top:6px;font-size:12px;${ok?'color:#0a7a2f;background:#e6f7ec;border:1px solid #bfe8cc;':'color:#7a0a0a;background:#fdeaea;border:1px solid #f3c2c2;'}border-radius:4px;padding:4px 6px;display:inline-block;`;
    if (target && target.parentElement) {
      if (target.nextSibling) target.parentElement.insertBefore(t, target.nextSibling);
      else target.parentElement.appendChild(t);
      setTimeout(() => t.remove(), 1800);
    }
  }

  function ensureButton() {
    // Only put ONE button, right before the Add Note button (not all over the app)
    const add = findAddNoteButton();
    if (!add) return;
    const existing = $('#dbphoto-insert-btn');
    if (existing) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'dbphoto-insert-btn';
    btn.className = 'btn btn-light';
    btn.textContent = '🔗 Dropbox Photo';
    btn.title = 'Insert Dropbox photo link';
    btn.style.marginRight = '6px';

    // Insert just before “Add Note”
    add.parentElement ? add.parentElement.insertBefore(btn, add) : add.before(btn);

    btn.addEventListener('click', e => {
      e.preventDefault();
      const ta = findTextarea();
      if (!ta) { alert('Could not find the Add Note text box.'); return; }

      const pasted = prompt('Paste Dropbox share link (from Dropbox app):');
      if (!pasted) return;

      const url = normalizeDropboxUrl(pasted.trim());
      if (!/^https?:\/\//i.test(url)) { toast(ta, '❌ That link does not look valid.', false); return; }

      const token = `\n[[DBPHOTO url="${url}"]]\n`;

      // Insert into the main textarea
      insertAtCaret(ta, token);

      // Also mirror into any other sibling textareas in the same Add-Note block (just in case)
      let root = add.parentElement;
      for (let i = 0; i < 8 && root; i++, root = root.parentElement) {
        const allTAs = root ? root.querySelectorAll && root.querySelectorAll('textarea') : null;
        if (allTAs && allTAs.length) {
          allTAs.forEach(el => { if (el !== ta) { el.value += token; el.dispatchEvent(new Event('input', {bubbles:true})); }});
          break;
        }
      }

      // Confirm we can SEE the token in the main box
      if ((ta.value || '').indexOf('[[DBPHOTO') === -1) {
        toast(ta, '❌ Token did not appear. We may be targeting the wrong box.', false);
      } else {
        toast(ta, '✅ Photo link inserted');
      }
    });
  }

  ensureButton();
  setInterval(ensureButton, 1200); // if UI re-renders
})();
