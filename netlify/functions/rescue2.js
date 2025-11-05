// /.netlify/functions/rescue2
export async function handler() {
  const html = `<!doctype html><html><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rescue & Restore (verbose)</title>
  <style>
    body { font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; margin:2rem; max-width:900px;}
    .row { display:flex; gap:.5rem; align-items:center; margin:.5rem 0; flex-wrap:wrap;}
    button{ padding:.5rem .75rem; border:1px solid #ddd; border-radius:8px; background:#fff; }
    pre{ background:#0b1020; color:#e9eefb; padding:1rem; border-radius:8px; overflow:auto; max-height:320px;}
    code{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;}
    label{ font-weight:600;}
  </style></head><body>
  <h1>Rescue & Restore (verbose)</h1>

  <div>
    <h2>Server JSON</h2>
    <div class="row">
      <button id="srv-fetch">Fetch server JSON</button>
    </div>
    <pre id="srv-json"><code>—</code></pre>
  </div>

  <div>
    <h2>Restore to Server</h2>
    <p>Select your JSON and click restore. This shows the exact HTTP status and raw body even on errors.</p>
    <div class="row">
      <input type="file" id="file" accept="application/json">
      <label><input type="checkbox" id="allowEmpty"> Allow empty (override safety)</label>
      <button id="restore">Restore to server</button>
    </div>
    <pre id="restore-log"><code>—</code></pre>
  </div>

  <script type="module">
  const $ = s => document.querySelector(s);
  const log = (el, msg) => el.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);

  $('#srv-fetch').addEventListener('click', async ()=>{
    try{
      const r = await fetch('/.netlify/functions/load',{cache:'no-store'});
      const t = await r.text();
      log($('#srv-json code'), { status:r.status, body:t });
    }catch(e){ log($('#srv-json code'), String(e)); }
  });

  $('#restore').addEventListener('click', async ()=>{
    const file = $('#file').files[0];
    if(!file){ return log($('#restore-log code'), 'Pick a JSON file first.'); }
    try{
      let txt = await file.text();
      let json = JSON.parse(txt);

      // If export is a raw localStorage dump, pick a common key and parse its JSON
      if(json['binder-data']){ try{ json = JSON.parse(json['binder-data']); }catch(_){} }
      else if(json['digital-binder']){ try{ json = JSON.parse(json['digital-binder']); }catch(_){} }

      // Force very high version so it wins
      json.serverVersion = 9999999;
      if($('#allowEmpty').checked) json.__allowEmpty = true;

      const r = await fetch('/.netlify/functions/save', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Cache-Control':'no-store' },
        body: JSON.stringify(json)
      });
      const body = await r.text();
      log($('#restore-log code'), { status:r.status, body });
    }catch(e){
      log($('#restore-log code'), String(e));
    }
  });
  </script>
  </body></html>`;
  return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}, body: html };
}
