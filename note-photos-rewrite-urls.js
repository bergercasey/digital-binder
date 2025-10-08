// note-photos-rewrite-urls.js
(function(){
  function fixOne(img){
    if (!img) return;
    const url = img.getAttribute('data-full-url');
    if (url && /\.netlify\/functions\/get-image\?key=/.test(url)) return;
    const key = img.getAttribute('data-full-key');
    if (key){
      img.setAttribute('data-full-url', '/.netlify/functions/get-image?key='+encodeURIComponent(key));
    }
  }
  function scan(root){
    (root||document).querySelectorAll('img.note-photo-thumb').forEach(fixOne);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=> scan());
  } else {
    scan();
  }
})();
