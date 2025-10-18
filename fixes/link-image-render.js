// fixes/link-image-render.js — v2 (drop-in)
// Converts pasted image links in notes into clickable thumbnails.
// Works with direct image URLs and Dropbox share links (auto-normalizes to ?raw=1).

(function(){
  if (window.__linkImageRenderInit) return; window.__linkImageRenderInit = true;

  // Detect raw URLs in text
  const URL_RE = /\bhttps?:\/\/[^\s<>"']+/ig;

  // Extensions that can be rendered directly
  const IMG_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

  function normalizeDropbox(url){
    try {
      const u = new URL(url);
      if (u.hostname.endsWith('dropbox.com')) {
        // Convert ...?dl=0 to ...?raw=1 for direct image rendering
        if (u.searchParams.has('dl')) u.searchParams.delete('dl');
        u.searchParams.set('raw','1');
        return u.toString();
      }
    } catch(_){}
    return url;
  }

  function looksLikeImage(url){
    return IMG_EXT_RE.test(url) || /dropbox\.com/i.test(url);
  }

  function renderIn(el){
    if (!el || !el.textContent) return;
    // Skip inputs/editors
    if (el.closest && el.closest('textarea,[contenteditable="true"],input,select')) return;

    const original = el.innerHTML;
    if (!URL_RE.test(original)) return; // quick pre-check
    URL_RE.lastIndex = 0; // reset after test()

    // Split and rebuild HTML with links/images
    const parts = original.split(URL_RE);
    const urls  = original.match(URL_RE) || [];
    if (!urls.length) return;

    let html = '';
    for (let i = 0; i < parts.length; i++){
      html += parts[i];
      if (i < urls.length){
        const raw = urls[i];
        const url = normalizeDropbox(raw);
        if (looksLikeImage(url)){
          // Clickable thumbnail (underline removed; zero line-height to hide baseline)
          html += (
            `<a href="${url}" target="_blank" rel="noopener noreferrer"` +
            ` style="text-decoration:none;border-bottom:0;display:inline-block;line-height:0;">` +
              `<img src="${url}" alt="Photo"` +
              ` style="max-width:220px;height:auto;border:1px solid #ddd;border-radius:6px;margin:6px 0;display:block;">` +
            `</a>`
          );
        } else {
          html += `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }
      }
    }

    if (html !== original){
      el.innerHTML = html;
    }
  }

  function scanAll(){
    // Likely note/preview containers
    const candidates = document.querySelectorAll(
      '.notes, .note, .note-body, .notes-list, .log, .log-item, .log-items, .print-preview, #printPreview, .email-preview, #emailPreview'
    );

    // Broad sweep for elements that contain http(s) text nodes
    const broad = Array.from(document.querySelectorAll('body *')).filter(n =>
      n.firstChild && n.childElementCount === 0 && n.textContent && n.textContent.includes('http')
    );

    const set = new Set([...candidates, ...broad]);
    set.forEach(renderIn);
  }

  // Initial + observe changes (new notes appended, previews opened, etc.)
  scanAll();
  const mo = new MutationObserver(scanAll);
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();
