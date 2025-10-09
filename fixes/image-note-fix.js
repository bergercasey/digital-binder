
(function(){
  // Defensive, don't double-init
  if (window.__imageNoteFixInit) return;
  window.__imageNoteFixInit = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  // Try to find a notes input: prefer a textarea with id containing "note"
  function findNotesField(){
    let t = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (t) return t;
    // Try contenteditable
    let ce = $('[contenteditable="true"]');
    if (ce) return ce;
    // Fallback: first textarea
    return $('textarea');
  }

  // Try to find a primary file input for photo upload
  function findPhotoInput(){
    // Preference order: ids
    let ids = ['photoPicker','photo-picker','imagePicker','image-picker','upload-photo','uploadPicture','upload-picture'];
    for (let id of ids){
      let el = document.getElementById(id);
      if (el && el.type === 'file') return el;
    }
    // Fallbacks: first input[type=file]
    let any = $('input[type="file"]');
    return any || null;
  }

  function isImageFile(file){
    return !!file && /^image\//.test(file.type);
  }

  function insertAtCursorTextArea(textarea, text){
    // Insert into textarea at cursor position (fallback: append)
    try{
      let start = textarea.selectionStart ?? textarea.value.length;
      let end = textarea.selectionEnd ?? textarea.value.length;
      let before = textarea.value.substring(0, start);
      let after = textarea.value.substring(end);
      textarea.value = before + text + after;
      // Move cursor
      let pos = (before + text).length;
      textarea.selectionStart = textarea.selectionEnd = pos;
      textarea.dispatchEvent(new Event('input', {bubbles:true})); // trigger any listeners (for saving)
    } catch(e){
      // Fallback append
      textarea.value += text;
      textarea.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }

  function insertImageIntoNotes(dataURL){
    let notes = findNotesField();
    if (!notes) return;

    const snippet = `\n<img src="${dataURL}" alt="Photo" style="max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;" />\n`;

    if (notes.tagName && notes.tagName.toLowerCase() === 'textarea'){
      insertAtCursorTextArea(notes, snippet);
    } else if (notes.isContentEditable || notes.getAttribute('contenteditable') === 'true'){
      notes.focus();
      let div = document.createElement('div');
      div.innerHTML = snippet;
      // Insert at caret for contenteditable
      const sel = window.getSelection();
      if (sel && sel.getRangeAt && sel.rangeCount){
        let range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(div);
        // place caret after inserted node
        range.setStartAfter(div);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        notes.appendChild(div);
      }
      notes.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }

  function handleFiles(files){
    if (!files || !files.length) return;
    const file = files[0];
    if (!isImageFile(file)){
      alert("Please choose an image file (JPG, PNG, HEIC, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e){
      const dataURL = e.target.result; // base64 data URL
      insertImageIntoNotes(dataURL);
    };
    reader.onerror = function(){
      alert("Could not read that image. Try again.");
    };
    reader.readAsDataURL(file);
  }

  function init(){
    const input = findPhotoInput();
    if (!input) return;

    // If there are multiple file inputs, make all of them use the same behavior
    $all('input[type="file"]').forEach(el => {
      el.addEventListener('change', (ev) => {
        if (ev.target && ev.target.files) handleFiles(ev.target.files);
      }, {passive:true});
    });

    // Optional: remove duplicate "Upload Picture" buttons if they look repeated
    // (We won't remove elements; instead we ensure consistent behavior.)
  }

  if (document.readyState === "complete" || document.readyState === "interactive"){
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }
})();
