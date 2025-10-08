// note-photos-hydrate.js
(function(){
  async function uploadDataUrl(dataUrl){
    try{
      const res = await fetch('/.netlify/functions/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, ext: 'webp' }),
      });
      if (!res.ok) return null;
      const j = await res.json().catch(()=>null);
      return j && j.url ? j.url : null;
    }catch(_){ return null; }
  }
  async function ensureFullUrl(img){
    if (!img || img.getAttribute('data-full-url')) return;
    let source = img.getAttribute('data-full') || img.getAttribute('src') || '';
    if (!/^data:image\//i.test(source)) return;
    if (img.__npUploading) return;
    img.__npUploading = true;
    const url = await uploadDataUrl(source);
    img.__npUploading = false;
    if (url){
      img.setAttribute('data-full-url', url);
      img.removeAttribute('data-full');
    }
  }
  async function scanOnce(root){
    const imgs = (root || document).querySelectorAll('img.note-photo-thumb');
    for (const img of imgs){
      await ensureFullUrl(img);
    }
  }
  const observer = new MutationObserver((muts)=>{
    for (const m of muts){
      if (m.addedNodes){
        m.addedNodes.forEach(n => {
          if (n && n.nodeType === 1){
            if (n.matches && n.matches('img.note-photo-thumb')){
              ensureFullUrl(n);
            } else {
              const imgs = n.querySelectorAll ? n.querySelectorAll('img.note-photo-thumb') : [];
              imgs.forEach(el => ensureFullUrl(el));
            }
          }
        });
      }
    }
  });
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{
      scanOnce();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    scanOnce();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
