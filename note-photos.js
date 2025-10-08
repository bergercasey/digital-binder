
// note-photos.js (token-based, does NOT touch app.js)
(function(){
  const ed=document.getElementById('new-note-editor');
  const tb=document.getElementById('wysiwyg-toolbar')||document.getElementById('note-toolbar')||(ed&&ed.previousElementSibling);
  if(!ed||!tb) return;

  const btn=document.createElement('button'); btn.type='button'; btn.className='btn'; btn.textContent='📷 Photo'; btn.style.marginLeft='6px';
  const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.display='none';
  tb.appendChild(btn); tb.appendChild(input);
  btn.addEventListener('click',()=>input.click());

  function toDataUrl(file,maxW){
    return new Promise((res,rej)=>{
      const img=new Image(); const rd=new FileReader();
      rd.onload=()=>{img.src=rd.result;}; rd.onerror=rej;
      img.onload=()=>{
        const scale=maxW?Math.min(1,maxW/img.naturalWidth):1;
        const w=Math.max(1,Math.round(img.naturalWidth*scale));
        const h=Math.max(1,Math.round(img.naturalHeight*scale));
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        res(c.toDataURL('image/webp',0.82));
      };
      rd.readAsDataURL(file);
    });
  }
  async function upload(dataUrl){
    const r=await fetch('/.netlify/functions/upload-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl,ext:'webp'})});
    if(!r.ok) throw new Error('upload failed '+r.status);
    const j=await r.json(); return j&&j.url?{url:j.url,key:j.key}:null;
  }
  function insertAtCaret(text){
    ed.focus();
    document.execCommand && document.execCommand('insertText', false, text);
    if(!document.execCommand){ ed.textContent += text; }
  }
  input.addEventListener('change', async (e)=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    try{
      const full=await toDataUrl(f,1280); const thumb=await toDataUrl(f,280);
      const upF=await upload(full); const upT=await upload(thumb);
      const fullUrl=(upF&&upF.url)||full; const thumbUrl=(upT&&upT.url)||thumb;
      const token = `[[PHOTO full=${fullUrl}|thumb=${thumbUrl}]]`;
      insertAtCaret(token);
    }catch(err){ alert('Could not add photo: '+(err&&err.message||err)); }
    finally{ e.target.value=''; }
  });
})();
