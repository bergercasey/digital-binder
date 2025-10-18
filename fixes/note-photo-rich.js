// fixes/note-photo-rich.js — single visible editor + sync to original textarea on Add Note
(function () {
  if (window.__notePhotoRichInit) return; window.__notePhotoRichInit = true;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const txt = el => (el && (el.textContent || el.value) || "").trim().toLowerCase();

  // --- utils
  function downscale(dataURL, maxW=1200){
    return new Promise(res=>{
      const img = new Image();
      img.onload = function(){
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w <= maxW) return res(dataURL);
        const r = maxW / w; w = Math.round(w*r); h = Math.round(h*r);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = ()=> res(dataURL);
      img.src = dataURL;
    });
  }
  function insertAtCaretEditable(ed, html){
    ed.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ed.contains(sel.anchorNode)){
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const frag = range.createContextualFragment(html);
      const last = frag.lastChild;
      range.insertNode(frag);
      const nr = document.createRange();
      nr.setStartAfter(last); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
    } else {
      ed.insertAdjacentHTML('beforeend', html);
      const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    ed.dispatchEvent(new Event('input', {bubbles:true}));
  }

  // — find the Add Note block (toolbar + textarea + Add Note button)
  function findAddNoteBlock(){
    const addBtns = $$('button, a').filter(b => txt(b) === 'add note');
    for (const btn of addBtns){
      let p = btn.parentElement;
      for (let i=0; i<8 && p; i++, p=p.parentElement){
        const ta = $('textarea', p);
        if (!ta) continue;

        // toolbar just before textarea
        let toolbar = ta.previousElementSibling;
        for (let j=0; j<4 && toolbar; j++, toolbar=toolbar.previousElementSibling){
          const btns = toolbar && toolbar.querySelectorAll ? toolbar.querySelectorAll('button,a') : [];
          if (btns && btns.length >= 2) return {root:p, textarea:ta, toolbar, addBtn:btn};
        }
        return {root:p, textarea:ta, toolbar:null, addBtn:btn};
      }
    }
    return null;
  }

  // — styles for the rich editor
  function ensureStyles(){
    if ($('#note-p
