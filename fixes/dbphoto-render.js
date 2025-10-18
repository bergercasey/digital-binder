// fixes/dbphoto-render.js — V2: render [[DBPHOTO url="..."]] tokens anywhere in the DOM
(function(){
  if (window.__dbPhotoRenderInitV2) return; window.__dbPhotoRenderInitV2 = true;

  const TOKEN = '[[DBPHOTO';
  const RE = /\[\[DBPHOTO\s+url="([^"]+)"\s*\]\]/g;

  function renderTokensIn(el){
    if (!el) return;
    // Only touch nodes that actually contain the token
    if (!el.textContent || el.textContent.indexOf(TOKEN) === -1) return;

    let html = el.innerHTML;
    const newHtml = html.replace(RE, (_m, url) => {
      const esc = url.replace(/"/g,'&quot;');
      return `<a href="${esc}" target="_blank" rel="noopener noreferrer">
                <img src="${esc}" alt="Photo" style="max-width:220px;height:auto;border:1px solid #ddd;border-radius:6px;margin:6px 0;display:inline-block;vertical-align:middle;">
              </a>`;
    });

    if (newHtml !== html){
      el.innerHTML = newHtml;
    }
  }

  // Walk the DOM and render wherever the token appears
  function scanAll(){
    // Quick pass: any element whose text contains our token
    const all = document.querySelectorAll('body *');
    for (let i = 0; i < all.length; i++){
      const el = all[i];
      if (!el) continue;
      if (!el.firstChild) continue;
      if (el.childElementCount === 0 && el.textContent && el.textContent.indexOf(TOKEN) !== -1){
        renderTokensIn(el.parentElement || el);
      } else if (el.textContent && el.textContent.indexOf(TOKEN) !== -1){
        renderTokensIn(el);
      }
    }
  }

  // Initial + keep watching for new log entries/preview DOM
  scanAll();
  const mo = new MutationObserver(scanAll);
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();
