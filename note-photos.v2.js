
// note-photos.v2.js
(function(){
  var THUMB = 120;
  var FULL = 1400;
  function toCanvas(img, maxSide){
    var w = img.naturalWidth, h = img.naturalHeight;
    var scale = Math.min(1, maxSide / Math.max(w,h));
    var cw = Math.max(1, Math.round(w*scale)), ch = Math.max(1, Math.round(h*scale));
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var cx = c.getContext('2d');
    cx.drawImage(img, 0, 0, cw, ch);
    return c;
  }
  function fileToImg(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ var img = new Image(); img.onload = function(){ resolve(img); }; img.onerror = reject; img.src = reader.result; };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  async function fileToWebPDataURLs(file){
    var img = await fileToImg(file);
    var fullCanvas = toCanvas(img, FULL);
    var thumbCanvas = toCanvas(img, THUMB);
    var fullData = fullCanvas.toDataURL('image/webp', 0.9);
    var thumbData = thumbCanvas.toDataURL('image/webp', 0.9);
    return { fullData: fullData, thumbData: thumbData };
  }
  function makeImgHTML(thumb, full){
    var style = 'max-width:'+THUMB+'px;max-height:'+THUMB+'px;width:'+THUMB+'px;height:auto;border-radius:8px;border:1px solid #e5e7eb;margin:6px 6px 6px 0;cursor:zoom-in;';
    return '<img class="note-photo-thumb" src="'+thumb+'" data-full="'+full+'" alt="Note photo" style="'+style+'">';
  }
  async function attachPhotosToEditor(el){
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
    input.onchange = async function(){
      if (!input.files || !input.files.length) return;
      for (var i=0;i<input.files.length;i++){
        var f = input.files[i];
        if (!f || !f.type || f.type.indexOf('image') !== 0) continue;
        try{
          var urls = await fileToWebPDataURLs(f);
          var html = makeImgHTML(urls.thumbData, urls.fullData);
          el.innerHTML = el.innerHTML + html;
        }catch(e){ console.warn('Photo attach failed', e); }
      }
      input.value = '';
    };
    input.click();
  }
  function enhanceEditor(el){
    if (!el || el.__npV2) return;
    el.__npV2 = true;
    try{
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'np-addphoto-btn'; btn.textContent = '📷 Photo';
      btn.addEventListener('click', function(){ attachPhotosToEditor(el); });
      var toolbar = el.parentElement && el.parentElement.querySelector('.note-toolbar, .add-note-toolbar');
      if (toolbar) toolbar.appendChild(btn); else el.insertAdjacentElement('afterend', btn);
    }catch(_){}
  }
  function scan(){
    var editors = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable=""], .note-editor [contenteditable], .add-note [contenteditable]'));
    editors.forEach(enhanceEditor);
  }
  var mo = new MutationObserver(function(){ scan(); });
  mo.observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', scan); } else { scan(); }
})();
