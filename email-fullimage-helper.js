
// email-fullimage-helper.js
(function(){
  if (window._epMakeEmailHtml) return;
  window._epMakeEmailHtml = function(previewHtml){
    try{
      var div = document.createElement('div');
      div.innerHTML = previewHtml || '';
      var imgs = div.querySelectorAll('img.note-photo-thumb');
      imgs.forEach(function(img){
        var full = img.getAttribute('data-full');
        if (full) img.setAttribute('src', full);
        img.removeAttribute('width');
        img.removeAttribute('height');
        try{
          img.style.width = '';
          img.style.maxWidth = '';
          img.style.height = '';
          img.style.maxHeight = '';
        }catch(_){}
        img.setAttribute('style','max-width:720px;width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb;margin:8px 0;');
      });
      return div.innerHTML;
    }catch(_){ return previewHtml; }
  };
  document.addEventListener('click', function(e){
    var t = e.target;
    if (t && t.id === 'ep-mail-send'){
      if (!window.__epFetchWrapped){
        window.__epFetchWrapped = true;
        var _f = window.fetch;
        window.fetch = function(url, opts){
          try{
            if (typeof url === 'string' && url.indexOf('/.netlify/functions/send-email') !== -1 && opts && opts.body){
              var body = JSON.parse(opts.body);
              if (body && body.html && typeof window._epMakeEmailHtml === 'function'){
                body.html = window._epMakeEmailHtml(body.html);
                opts.body = JSON.stringify(body);
              }
            }
          }catch(_){}
          return _f.apply(this, arguments);
        };
      }
    }
  }, true);
})();
