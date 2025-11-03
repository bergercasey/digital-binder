const $ = sel => document.querySelector(sel);
function log(el, obj) {
  el.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

$('#ls-list').addEventListener('click', () => {
  const keys = [];
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    keys.push({ key: k, length: (localStorage.getItem(k)||'').length });
  }
  log($('#ls-keys code'), keys);
});

$('#ls-backup').addEventListener('click', () => {
  const dump = {};
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    dump[k] = localStorage.getItem(k);
  }
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dump, null, 2));
  a.download = 'localStorage-backup.json';
  a.click();
});

$('#srv-fetch').addEventListener('click', async () => {
  try {
    const res = await fetch('/.netlify/functions/load', { cache: 'no-store' });
    const data = await res.json();
    log($('#srv-json code'), data ?? null);
  } catch (e) {
    log($('#srv-json code'), String(e));
  }
});

$('#restore').addEventListener('click', async () => {
  const file = $('#file').files[0];
  if (!file) return log($('#restore-log code'), 'Pick a JSON file first.');
  try {
    const text = await file.text();
    let json = JSON.parse(text);
    if (json['binder-data']) { try { json = JSON.parse(json['binder-data']); } catch (_) {} }
    else if (json['digital-binder']) { try { json = JSON.parse(json['digital-binder']); } catch (_) {} }
    json.serverVersion = 9999999;
    if ($('#allowEmpty').checked) json.__allowEmpty = true;

    const res = await fetch('/.netlify/functions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(json)
    });
    const out = await res.json().catch(()=>({}));
    log($('#restore-log code'), { status: res.status, ...out });
  } catch (e) {
    log($('#restore-log code'), String(e));
  }
});
