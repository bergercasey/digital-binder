
// fixes/image-note-fix.js  (v2 - robust)
(function(){
  if (window.__imageNoteFixInitV2) return;
  window.__imageNoteFixInitV2 = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function findNotesField(){
    // Prefer ids with "note"
    let t = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (t) return t;
    // Try contenteditable
    let ce = $('[contenteditable="true"]');
    if (ce) return ce;
    // Fallback
    return $('textarea');
  }

  function isImageFile(file){ return !!file && /^image\//.test(file.type); }

  function insertAtCursorTextArea(textarea, text){
    try{
      const start = textarea.selectionStart ?? textarea.value.length;
      const end   = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);
      textarea.value = before + text + after;
      const pos = (before + text).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    } catch(e){
      textarea.value += text;
    }
    textarea.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function insertHtmlIntoContentEditable(el, html){
    el.focus();
    const range = (function(){
      const sel = window.getSelection();
      if (sel && sel.rangeCount) return sel.getRangeAt(0);
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      return r;
    })();
    const frag = range.createContextualFragment(html);
    range.deleteContents();
    range.insertNode(frag);
    range.collapse(false);
    el.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function insertImageIntoNotes(dataURL){
    const notes = findNotesField();
    if (!notes) return;

    const snippet = `\n<img src="${dataURL}" alt="Photo" style="max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;" />\n`;

    if (notes && notes.tagName && notes.tagName.toLowerCase() === 'textarea'){
      insertAtCursorTextArea(notes, snippet);
    } else if (notes && (notes.isContentEditable || notes.getAttribute('contenteditable') === 'true')){
      insertHtmlIntoContentEditable(notes, snippet);
    }
  }

  function replaceBareUrlsInTextarea(){
    const notes = findNotesField();
    if (!notes || !(notes.tagName && notes.tagName.toLowerCase() === 'textarea')) return;

    const urlRegex = /(blob:|filesystem:|file:|cdvfile:|content:|https?:\/\/\S+\.(?:jpg|jpeg|png|heic|webp|gif))\S*/ig;
    const matches = notes.value.match(urlRegex);
    if (!matches) return;

    // We can't load remote URLs cross-origin here, but if it's a blob: from this session it's already broken on reload.
    // At minimum, wrap any found URL in an <img> tag so renderers that support HTML in notes will show the image.
    // (Your app already renders notes as HTML for preview; this keeps behavior consistent.)
    notes.value = notes.value.replace(urlRegex, (m)=> `\n<img src="${m}" alt="Photo" style="max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;" />\n`);
    notes.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function handleFiles(files){
    if (!files || !files.length) { return; }
    const file = files[0];
    if (!isImageFile(file)){
      alert("Please choose an image file (JPG, PNG, HEIC, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e)=> insertImageIntoNotes(e.target.result);
    reader.onerror = ()=> alert("Could not read that image. Try again.");
    reader.readAsDataURL(file);
  }

  function init(){
    // 1) Document-level listener so it also catches dynamically-created file inputs (your uploader script makes one)
    document.addEventListener('change', function onChange(ev){
      const t = ev.target;
      if (t && t.tagName && t.tagName.toLowerCase() === 'input' && t.type === 'file' && t.files){
        handleFiles(t.files);
        // Give our handler priority if another script runs too (we don't stopPropagation because 'change' isn't cancelable)
        // We'll also sanitize the notes content shortly after.
        setTimeout(replaceBareUrlsInTextarea, 50);
      }
    }, true); // capture=true to run before other listeners

    // 2) As an additional safety net, if something inserted a plain URL into the textarea,
    //    observe mutations and convert them to <img> elements
    const notes = findNotesField();
    if (notes && (notes.tagName && notes.tagName.toLowerCase() === 'textarea')){
      notes.addEventListener('input', ()=> {
        // If user pasted a direct image URL line, auto-wrap
        if (/(https?:\/\/\S+\.(?:jpg|jpeg|png|heic|webp|gif))/i.test(notes.value)){
          replaceBareUrlsInTextarea();
        }
      });
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
