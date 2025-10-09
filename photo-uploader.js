// photo-uploader.js (Step 3)
(function(){
  function byId(id){ return document.getElementById(id); }
  function getToolbar(ed){
    return document.getElementById('wysiwyg-toolbar') || document.getElementById('note-toolbar') || (ed && ed.previousElementSibling);
  }
  function toDataUrl(file, maxW){
    return new Promise(function(resolve, reject){
      var img=new Image(), rd=new FileReader();
      rd.onload=function(){ img.src=rd.result; };
      rd.onerror=reject;
      img.onload=function(){
        var scale=maxW?Math.min(1,maxW/img.naturalWidth):1;
        var w=Math.max(1,Math.round(img.naturalWidth*scale));
        var h=Math.max(1,Math.round(img.naturalHeight*scale));
        var c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        resolve(c.toDataURL('image/webp',0.82));
      };
      rd.readAsDataURL(file);
    });
  }
  function insertText(ed, text){
    ed.focus();
    try{ if(document.queryCommandSupported&&document.queryCommandSupported('insertText')){ document.execCommand('insertText', false, text); return; } }catch(_){}
    ed.textContent += text;
  }
  async function upload(dataUrl){
    var r = await fetch('/.netlify/functions/upload-image', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dataUrl: dataUrl, ext: 'webp' }) });
    if (!r.ok) throw new Error('Upload failed: '+r.status);
    var j = await r.json(); if (!j || !j.url) throw new Error('Bad response'); return j.url;
  }
  function ensureButton(){
    var ed = byId('new-note-editor'); var tb = getToolbar(ed); if (!ed || !tb) return;
    if (tb.querySelector('.btn-add-photo-real')) return;
    var btn=document.createElement('button'); btn.type='button'; btn.className='btn btn-add-photo-real'; btn.style.marginLeft='6px'; btn.textContent='📷 Add photo';
    var input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.display='none';
    tb.appendChild(btn); tb.appendChild(input);
    btn.addEventListener('click', function(){ input.click(); });
    input.addEventListener('change', async function(e){
      var f=e.target.files&&e.target.files[0]; if(!f) return;
      try{
        var full=await toDataUrl(f,1280); var thumb=await toDataUrl(f,280);
        var fullUrl=await upload(full); var thumbUrl=await upload(thumb);
        var token=' [[PHOTO full='+fullUrl+'|thumb='+thumbUrl+']] '; insertText(ed, token);
      }catch(err){ alert('Photo upload failed: '+(err&&err.message||err)); }
      finally{ e.target.value=''; }
    });
  }
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ensureButton); } else { ensureButton(); }
})();