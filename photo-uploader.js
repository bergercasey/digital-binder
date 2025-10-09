// photo-uploader.js (fixed v2) — hijacks "Photo" toolbar button & inserts image as data URL
(function(){
  if (window.__photoUploaderFixedV2) return;
  window.__photoUploaderFixedV2 = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function ensurePicker(){
    let input = document.getElementById('photo-picker-fixed');
    if (!input){
      input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.id = 'photo-picker-fixed';
      input.style.display = 'none';
      input.setAttribute('capture', 'environment');
      document.body.appendChild(input);
    }
    return input;
  }

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
      notes.value = notes.value.replace(/\[\[PHOTO[^]+?\]\]/i, '');
      notes.value += snippet;
      notes.dispatchEvent(new Event('input', {bubbles:true}));
    } else {
      const html = notes.innerHTML || '';
      notes.innerHTML = html.replace(/\[\[PHOTO[^]+?\]\]/i, '') + snippet;
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

  function isPhotoButton(el){
    if (!el) return false;
    const tag = el.tagName && el.tagName.toLowerCase();
    if (tag !== 'button' && tag !== 'a') return false;
    const txt = (el.textContent || '').trim().toLowerCase();
    return txt.startsWith('photo') || txt.includes('upload photo') || txt.includes('upload picture') || txt.includes('add picture');
  }

  function init(){
    const picker = ensurePicker();

    document.addEventListener('click', function(ev){
      const target = ev.target.closest('button, a');
      if (!target) return;
      if (!isPhotoButton(target)) return;

      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      picker.click();
    }, true);

    picker.addEventListener('change', (ev)=> {
      const file = ev.target.files && ev.target.files[0];
      handleFileSelect(file);
      ev.target.value = '';
    });

    const notes = findNotesField();
    if (notes && notes.tagName && notes.tagName.toLowerCase() === 'textarea'){
      notes.addEventListener('input', () => {
        if (/\[\[PHOTO[^]+?\]\]/i.test(notes.value)){
          notes.value = notes.value.replace(/\[\[PHOTO[^]+?\]\]/i, '');
        }
      });
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
