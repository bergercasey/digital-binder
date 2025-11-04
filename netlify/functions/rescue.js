// /.netlify/functions/rescue
export async function handler(){
  const html = `<!doctype html><html><head>
  <meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>Rescue & Restore</title>
  <style>
    body { font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; margin:2rem; max-width:900px; }
    .row { display:flex; gap:.5rem; align-items:center; margin:.5rem 0; flex-wrap:wrap; }
    button { padding:.5rem .75rem; border:1px solid #ddd; border-radius:8px; background:#fff; cursor:pointer; }
    pre { background:#0b1020; color:#e9eefb; padding:1rem; border-radius:8px; overflow:auto; max-height:300px; }
    code { font-family: ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
    .box { border:1px solid #e5e7eb; padding:1rem; border-radius:8px; margin:1rem 0; }
    label { font-weight:600; }
    input[type='file'] { display:block; }
  </style></head><body>
  <h1>Rescue & Restore</h1>
  <p>Back up localStorage, view the server JSON, and restore a backup to the server.</p>
  <div class='box'><h2>LocalStorage</h2>
    <div class='row'><button id='ls-list'>List keys</button><button id='ls-backup'>Backup localStorage → JSON file</button></div>
    <pre id='ls-keys'><code>—</code></pre>
  </div>
  <div class='box'><h2>Server JSON</h2>
    <div class='row'><button id='srv-fetch'>Fetch server JSON</button></div>
    <pre id='srv-json'><code>—</code></pre>
  </div>
  <div class='box'><h2>Restore to Server</h2>
    <p>Pick a JSON backup. Uses a high <code>serverVersion</code> so it wins.</p>
    <div class='row'><input type='file' id='file' accept='application/json'>
      <label><input type='checkbox' id='allowEmpty'> Allow empty (override safety)</label>
      <button id='restore'>Restore to server</button></div>
    <pre id='restore-log'><code>—</code></pre>
  </div>
  <script type='module'>
  const $ = s => document.querySelector(s);
  function log(el, obj){ el.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); }
  $('#ls-list').addEventListener('click', ()=>{
    const keys=[]; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); keys.push({key:k,length:(localStorage.getItem(k)||'').length});}
    log($('#ls-keys code'), keys);
  });
  $('#ls-backup').addEventListener('click', ()=>{
    const dump={}; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); dump[k]=localStorage.getItem(k);}
    const a=document.createElement('a'); a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(dump,null,2)); a.download='localStorage-backup.json'; a.click();
  });
  $('#srv-fetch').addEventListener('click', async ()=>{
    try{ const res=await fetch('/.netlify/functions/load',{cache:'no-store'}); const data=await res.json(); log($('#srv-json code'), data??null); }
    catch(e){ log($('#srv-json code'), String(e)); }
  });
  $('#restore').addEventListener('click', async ()=>{
    const file=$('#file').files[0]; if(!file) return log($('#restore-log code'),'Pick a JSON file first.');
    try{
      const text=await file.text(); let json=JSON.parse(text);
      if(json['binder-data']){ try{ json=JSON.parse(json['binder-data']); }catch(_){} }
      else if(json['digital-binder']){ try{ json=JSON.parse(json['digital-binder']); }catch(_){} }
      json.serverVersion=9999999; if($('#allowEmpty').checked) json.__allowEmpty=true;
      const res=await fetch('/.netlify/functions/save',{method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(json)});
      const out=await res.json().catch(()=>({})); log($('#restore-log code'), {status:res.status, ...out});
    }catch(e){ log($('#restore-log code'), String(e)); }
  });
  </script>
  </body></html>`;
  return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}, body: html };
}
