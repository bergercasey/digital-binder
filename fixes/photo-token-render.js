// fixes/photo-token-render.js — Render [[PHOTO full="..." thumb="..."]] tokens as images
(function(){
  if (window.__photoTokenRenderInit) return; window.__photoTokenRenderInit = true;

  // Pattern: [[PHOTO full="..." thumb="..."]]
  const TOKEN_RE = /\[\[PHOTO\s+full="([^"]+)"\s+thumb="([^"]+)"\s*\]\]/g;

  function renderIn(el){
    if (!el) return;
    // Only work on elements that actually contain the token text
    if (!el.textContent || el.textContent.indexOf('[[PHOTO') === -1) return;

    // Replace tokens safely by working with HTML
    // 1) Work from existing HTML (if it's purely text, that's fine too)
    let html = el.innerHTML;

    // 2) Replace tokens with <img> (use thumb as src, stash full on data-full)
    html = html.replace(TOKEN_RE, (m, full, thumb) => {
      const escFull  = full.replace(/"/g, '&quot;');
      const escThumb = thumb.replace(/"/g, '&quot;');
      return `<img class="note-photo-token" src="${escThumb}" data-full="${escFull}" style="max-width:100%;height:auto;border:1px solid #ddd;border-radius:6px;margin:6px auto;display:block;">`;
    });

    // 3) Only write back if something changed
    if (html !== el.innerHTML){
      el.innerHTML = html;
    }
  }

  // Simple click-to-zoom: swap thumb with full on tap
  function onClick(e){
    const img = e.target && e.target.closest && e.target.closest('img.note-photo-token');
    if (!img) return;
    const cur = img.getAttribute('src');
    const full = img.getAttribute('data-full');
    if (full && cur !== full){
      img.setAttribute('src', full);
    } else {
      const thumb = img.getAttribute('data-thumb') || null; // (not stored; we only keep full)
      // if no stored thumb, keep full shown
    }
  }

  // Where to render:
  // - any element that likely holds note content in your UI
  const CANDIDATES = [
    '.note-body', '.note', '.notes', '.notes-list', '.log', '.log-item', '.log-items',
    '.print-preview', '#printPreview', '.email-preview', '#emailPreview'
  ];

  function scanAll(){
    CANDIDATES.forEach(sel => document.querySelectorAll(sel).forEach(renderIn));
  }

  // Initial + keep watching (for newly added log items or preview panes)
  document.addEventListener('click', onClick);
  scanAll();

  const mo = new MutationObserver(() => scanAll());
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();
