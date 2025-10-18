// fixes/dbphoto-render.js — Render [[DBPHOTO url="..."]] tokens as clickable thumbnails
(function(){
  if (window.__dbPhotoRenderInit) return; window.__dbPhotoRenderInit = true;

  // Token format: [[DBPHOTO url="https://..."]]
  const RE = /\[\[DBPHOTO\s+url="([^"]+)"\s*\]\]/g;

  function renderTokens(el){
    if (!el || !el.textContent || el.textContent.indexOf('[[DBPHOTO') === -1) return;

    let html = el.innerHTML;
    html = html.replace(RE, (_m, url) => {
      const esc = url.replace(/"/g,'&quot;');
      // Thumbnail image that links to the full file on Dropbox (raw=1 already applied by inserter)
      return `<a href="${esc}" target="_blank" rel="noopener noreferrer">
                <img src="${esc}" alt="Photo" style="max-width:220px;height:auto;border:1px solid #ddd;border-radius:6px;margin:6px 0;display:inline-block;vertical-align:middle;">
              </a>`;
    });

    if (html !== el.innerHTML){
      el.innerHTML = html;
    }
  }

  // Likely note containers in your UI (tweak if needed)
  const CANDIDATES = [
    '.notes', '.note', '.note-body', '.notes-list',
    '.log', '.log-item', '.log-items',
    '.print-preview', '#printPreview',
    '.email-preview', '#emailPreview'
  ];

  function scan(){
    CANDIDATES.forEach(sel => {
      document.querySelectorAll(sel).forEach(renderTokens);
    });
  }

  // Initial + watch for new log entries/previews
  scan();
  const mo = new MutationObserver(scan);
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();
