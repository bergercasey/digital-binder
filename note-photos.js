// note-photos.js
(function(){
  const ed = document.getElementById('new-note-editor');
  const toolbar = document.getElementById('wysiwyg-toolbar') || document.getElementById('note-toolbar') || (ed && ed.previousElementSibling);
  if (!ed || !toolbar) return;

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'btn'; btn.textContent = '📷 Photo';
  btn.style.marginLeft = '6px';
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';

  toolbar.appendChild(btn);
  toolbar.appendChild(input);
  btn.addEventListener('click', () => input.click());

  function dataUrlFromFile(file, maxW){
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.onerror = reject;
      img.onload = () => {
        const scale = maxW ? Math.min(1, maxW / img.naturalWidth) : 1;
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
        const q = 0.82;
        const url = c.toDataURL('image/webp', q);
        resolve(url);
      };
      reader.readAsDataURL(file);
    });
  }

  async function upload(dataUrl){
    const res = await fetch('/.netlify/functions/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, ext: 'webp' })
    });
    if (!res.ok) throw new Error('upload failed ' + res.status);
    const j = await res.json();
    return j && j.url ? { url: j.url, key: j.key } : null;
  }

  function insertHtmlAtCaret(html){
    ed.focus();
    if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')){
      document.execCommand('insertHTML', false, html);
      return;
    }
    ed.insertAdjacentHTML('beforeend', html);
  }

  input.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try{
      const full = await dataUrlFromFile(f, 1280);
      const thumb = await dataUrlFromFile(f, 280);
      const fullUp = await upload(full);
      const thUp = await upload(thumb);
      const fullUrl = fullUp && fullUp.url || full;
      const thumbUrl = thUp && thUp.url || thumb;
      const html = '<img class="note-photo-thumb" src="'+thumbUrl+'" data-full-url="'+fullUrl+'" alt="Photo" loading="lazy">';
      insertHtmlAtCaret(html);
    }catch(err){
      alert('Could not add photo: ' + (err && err.message || err));
    }finally{
      e.target.value = '';
    }
  });
})();