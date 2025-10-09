// photo-uploader.js (fixed) — opens gallery and inserts real image into Notes as data URL
(function(){
  // Avoid double init
  if (window.__photoUploaderFixed) return;
  window.__photoUploaderFixed = true;

  function $(sel, root){ return (root||document).querySelector(sel); }

  // Find or create the hidden file input used to open the gallery
  function ensurePicker(){
    let input = document.getElementById('photo-picker-fixed');
    if (!input){
      input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.id = 'photo-picker-fixed';
      input.style.display = 'none';
      // iOS hint: allow camera or photo library
      input.setAttribute('capture', 'environment');
      document.body.appendChild(input);
    }
    return input;
  }

  // Locate the Notes field
  function findNotesField(){
    let t = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (t) return t;
    let ce = $('[contenteditable="true"]');
    if (ce) return ce;
    return $('textarea');
  }

  function insertImageDataURLIntoNotes(dataURL){
    const notes = findNotesField();
    if (!notes) return;
    const snippet = `\n<img src="${dataURL}" alt="Photo" style="max-width:100%;height:auto;display:block;margin:6px auto;border:1px solid #ddd;border-radius:6px;" />\n`;

    if (notes.tagName && notes.tagName.toLowerCase() === 'textarea'){
      // Insert at end; change to selection if desired
      notes.value += snippet;
      notes.dispatchEvent(new Event('input', {bubbles:true}));
    } else {
      // contenteditable
      notes.insertAdjacentHTML('beforeend', snippet);
      notes.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }

  function handleFileSelect(file){
    if (!file) return;
    if (!/^image\//.test(file.type)){
      alert('Please pick an image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e)=> insertImageDataURLIntoNotes(e.target.result);
    reader.onerror = ()=> alert('Could not read that image. Try again.');
    reader.readAsDataURL(file);
  }

  function init(){
    const picker = ensurePicker();
    picker.addEventListener('change', (ev)=> {
      const file = ev.target.files && ev.target.files[0];
      handleFileSelect(file);
      // Clear the value so picking the same image twice still triggers change
      ev.target.value = '';
    });

    // Wire up any existing "Upload Picture" buttons to click our picker
    // Look for a button with text like "Upload Picture" or having an id
    const candidates = [
      '#uploadPicture', '#upload-picture', '#photoUpload', '#photo-upload',
      'button[id*="upload" i]', 'a[id*="upload" i]', 'button', 'a'
    ];
    let wired = false;
    for (const sel of candidates){
      document.querySelectorAll(sel).forEach(el => {
        if (wired) return;
        if (!el) return;
        const label = (el.textContent || '').trim().toLowerCase();
        if (/#uploadpicture|#upload-picture|#photoUpload|#photo-upload/.test(sel) || label.includes('upload picture') || label.includes('add picture') || label.includes('upload photo')){
          el.addEventListener('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            picker.click();
          });
          wired = true;
        }
      });
      if (wired) break;
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();