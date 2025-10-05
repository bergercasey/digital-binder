
// note-photos.js
(function(){
  var THUMB = 120;   // px
  var FULL = 1400;   // px max dimension
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
  function insertHTMLAtCursor(html, targetEditable){
    if (document.activeElement && document.activeElement.isContentEditable){
      document.execCommand('insertHTML', false, html);
      return;
    }
    var sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount && targetEditable && targetEditable.contains(sel.anchorNode)){
      var range = sel.getRangeAt(0); range.deleteContents();
      var el = document.createElement('span'); el.innerHTML = html;
      var frag = document.createDocumentFragment(), node, lastNode;
      while ((node = el.firstChild)) { lastNode = frag.appendChild(node); }
      range.insertNode(frag);
      if (lastNode){
        range = range.cloneRange();
        range.setStartAfter(lastNode); range.collapse(true);
        sel.removeAllRanges(); sel.addRange(range);
      }
      return;
    }
    (targetEditable || document.body).insertAdjacentHTML('beforeend', html);
  }
  function makeImgHTML(thumb, full){
    var style = 'max-width:'+THUMB+'px;max-height:'+THUMB+'px;width:'+THUMB+'px;height:auto;border-radius:8px;border:1px solid #e5e7eb;margin:6px 6px 6px 0;cursor:zoom-in;';
    return '<img class="note-photo-thumb" src="'+thumb+'" data-full="'+full+'" alt="Note photo" style="'+style+'">';
  }
  async function handleFiles(files, target){
    for (var i=0;i<files.length;i++){
      var f = files[i];
      if (!f || !f.type || f.type.indexOf('image') !== 0) continue;
      try{
        var urls = await fileToWebPDataURLs(f);
        var html = makeImgHTML(urls.thumbData, urls.fullData);
        insertHTMLAtCursor(html, target);
      }catch(e){ console.warn('Photo attach failed', e); }
    }
  }
  function enhanceEditor(el){
    if (!el || el.__npEnhanced) return;
    el.__npEnhanced = true;
    el.addEventListener('paste', function(e){
      var items = (e.clipboardData && e.clipboardData.items) || [];
      var files = [];
      for (var i=0;i<items.length;i++){
        var it = items[i];
        if (it.kind === 'file'){
          var f = it.getAsFile(); if (f) files.push(f);
        }
      }
      if (files.length){
        e.preventDefault();
        handleFiles(files, el);
      }
    });
    el.addEventListener('dragover', function(e){ e.preventDefault(); });
    el.addEventListener('drop', function(e){
      e.preventDefault();
      var files = (e.dataTransfer && e.dataTransfer.files) || [];
      if (files.length) handleFiles(files, el);
    });
    try{
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'np-addphoto-btn'; btn.textContent = '📷 Photo';
      btn.addEventListener('click', function(){
        var input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
        input.onchange = function(){ if (input.files && input.files.length) handleFiles(input.files, el); };
        input.click();
      });
      var toolbar = el.parentElement && el.parentElement.querySelector('.note-toolbar, .add-note-toolbar');
      if (toolbar) toolbar.appendChild(btn); else el.insertAdjacentElement('afterend', btn);
    }catch(_){}
  }
  function scan(){
    var editors = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable=""], .note-editor [contenteditable], .add-note [contenteditable]'));
    if (editors.length === 0){
      editors = Array.from(document.querySelectorAll('.note-editor textarea, .add-note textarea'));
    }
    editors.forEach(enhanceEditor);
  }
  var mo = new MutationObserver(function(){ scan(); });
  mo.observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', scan); } else { scan(); }
})();
