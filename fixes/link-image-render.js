// fixes/link-image-render.js — Convert pasted image links in notes to thumbnails that link to full image.
(function(){
  if (window.__linkImageRenderInit) return; window.__linkImageRenderInit = true;

  // Detect raw URLs in text (http/https)
  // We avoid matching inside existing HTML tags by working on innerHTML carefully.
  const URL_RE = /\bhttps?:\/\/[^\s<>"']+/ig;

  // Extensions that are safe to render directly as <img>
  const IMG_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

  function normalizeDropbox(url){
    try {
      const u = new URL(url);
      if (u.hostname.endsWith('dropbox.com')) {
        // Share links often have ?dl=0 — convert to ?raw=1 so <img> works
        if (u.searchParams.has('dl')) u.searchParams.delete('dl');
        u.searchParams.set('raw','1');
        return u.toString();
      }
    } catch(_){}
    return url;
  }

  function looksLikeImage(url){
    // If it ends with an image extension OR is a Dropbox link (we'll force raw=1)
    return IMG_EXT_RE.test(url) || /dropbox\.com/i.test(url);
  }

  function renderIn(el){
    // Skip elements that are already links/images or contenteditable/inputs
    if (!el || !el.textContent) return;
    if (el.closest && (el.closest('textarea,[contenteditable="true"],input,select'))) return;
    const original = el.innerHTML;
    if (!URL_RE.test(original)) return; // quick check

    // Replace URLs in a safe-ish way:
    // 1) Split by URL regex, rebuild HTML with <a>… and optional <img>
    const parts = original.split(URL_RE);
    const urls  = original.match(URL_RE) || [];
    if (!urls.length) return;

    let html = '';
    for (let i = 0; i < parts.length; i++){
      // text chunk
      html += parts[i];

      // url chunk (if exists)
      if (i < urls.length){
        const raw = urls[i];
        const url = normalizeDropbox(raw);
        if (looksLikeImage(url)){
          // Clickable thumbnail (small) that links to full image
          html +=
            `<a href="${url}" target="_blank" rel="noopener noreferrer">
               <img src="${url}" alt="Photo"
                    style="max-width:220px;height:auto;border:1px solid #ddd;border-radius:6px;margin:6px 0;display:inline-block;vertical-align:middle;">
             </a>`;
        } else {
          // Non-image URL → keep as plain link
          html += `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }
      }
    }

    // Only write back if changed (and avoid double-rendering)
    if (html !== original){
      el.innerHTML = html;
    }
  }

  function scanAll(){
    // Heuristic: any element that likely contains note text / log text / previews
    const CANDIDATES = document.querySelectorAll(
      '.notes, .note, .note-body, .notes-list, .log, .log-item, .log-items, .print-preview, #printPreview, .email-preview, #emailPreview'
    );

    // If your app doesn't use those classes, also do a broad sweep for elements that contain http(s)
    const broad = Array.from(document.querySelectorAll('body *')).filter(n =>
      n.firstChild && n.childElementCount === 0 && n.textContent && n.textContent.includes('http')
    );

    const unique = new Set([...CANDIDATES, ...broad]);
    unique.forEach(renderIn);
  }

  // Initial run + keep watching for added notes/previews
  scanAll();
  const mo = new MutationObserver(scanAll);
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();
