(function(){
  function cssOnce(id, css){
    if (document.getElementById(id)) return;
    const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s);
  }
  function el(tag, attrs={}, children=[]){
    const x = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if (k==='style' && typeof v==='object') Object.assign(x.style, v);
      else if (k==='class') x.className = v;
      else x.setAttribute(k, v);
    });
    (Array.isArray(children)?children:[children]).forEach(c=>{ if(typeof c==='string') x.appendChild(document.createTextNode(c)); else if(c) x.appendChild(c); });
    return x;
  }
  function fmt(d){ try{ return new Date(d).toLocaleString(); }catch{ return d+''; } }
  function htmlFromEntry(it){
    return '<div class="entry"><div class="date">'+fmt(it.date||it.timestamp||it.time||'')+
           '</div><div>'+(it.text||it.note||it.message||it.desc||'').replace(/\n/g,'<br>')+'</div></div>';
  }
  function ensureHeaderRight(){
    const header = document.querySelector('header');
    if (!header) return null;
    let right = header.querySelector('.header-right');
    if (!right){
      right = el('div', {class:'header-right'});
      header.appendChild(right);
      cssOnce('selectModalHeaderCSS', `
        header { position: relative; }
        .header-right { position: absolute; right: 12px; top: 8px; display: inline-flex; gap: 8px; align-items: center; z-index: 50; }
      `);
    }
    return right;
  }
  function injectModal(){
    cssOnce('selectModalCSS', `
      .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);display:none;align-items:center;justify-content:center;z-index:1000}
      .modal{width:min(92vw,780px);max-height:82vh;overflow:auto;background:#fff;border:1px solid #d0d7de;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:14px;font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111}
      .modal header{display:flex;align-items:center;gap:8px;border-bottom:1px solid #d0d7de;padding:6px 0 10px;margin:-4px 0 10px 0}
      .modal h2{margin:0;font-size:16px}
      .muted{color:#6b7280;font-size:12px}
      .list{list-style:none;margin:0;padding:0;border:1px solid #d0d7de;border-radius:8px;overflow:auto;max-height:48vh}
      .list li{display:flex;gap:10px;align-items:flex-start;border-bottom:1px solid #d0d7de;padding:10px}
      .list li:last-child{border-bottom:none}
      .date{font-size:12px;color:#6b7280;min-width:120px}
      .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
      .btn{padding:8px 12px;border:1px solid #d0d7de;background:#fff;border-radius:8px;cursor:pointer}
      .btn.primary{font-weight:700}
      .badge{padding:2px 6px;border:1px solid #d0d7de;border-radius:999px;font-size:12px}
      input[type=text],textarea{width:100%;padding:8px 10px;border:1px solid #d0d7de;border-radius:8px}
    `);
    const overlay = el('div', {class:'modal-overlay', id:'selectModal'}, [
      el('div', {class:'modal'}, [
        el('header', {}, [
          el('h2', {}, 'Select logs'),
          el('span', {id:'selJob', class:'badge'}),
          el('span', {id:'selStatus', class:'muted', style:{marginLeft:'auto'}}),
        ]),
        el('div', {style:'display:grid;grid-template-columns: 1fr 1fr;gap:12px;'}, [
          el('div', {}, [
            el('div', {class:'muted', style:{margin:'2px 0 6px'}}, 'Check the entries to include'),
            el('ul', {id:'selList', class:'list'}),
            el('div', {id:'selEmpty', class:'muted', style:{display:'none', marginTop:'8px'}}, 'No logs found on this job.')
          ]),
          el('div', {}, [
            el('div', {style:'display:flex;align-items:center;gap:8px;margin-bottom:8px;'}, [
              el('strong', {}, 'Email'),
              el('span', {id:'whoSel', class:'badge'})
            ]),
            el('label', {class:'muted', style:'display:block;margin-bottom:6px;'}, 'Subject'),
            el('input', {id:'selSubject', type:'text', placeholder:'HVAC Binder – Log updates'}),
            el('label', {class:'muted', style:'display:block;margin:10px 0 6px;'}, 'Recipients (comma separated)'),
            el('textarea', {id:'selTo', rows:'3', placeholder:'boss@co.com, team@co.com'}),
            el('div', {class:'actions', style:'margin-top:12px;'}, [
              el('button', {id:'selPrint', class:'btn'}, 'Print'),
              el('button', {id:'selCancel', class:'btn'}, 'Cancel'),
              el('button', {id:'selEmail', class:'btn primary'}, 'Send email')
            ])
          ])
        ])
      ])
    ]);
    document.body.appendChild(overlay);
  }

  function findJobId(){
    const url = new URL(location.href);
    if (url.searchParams.get('job')) return url.searchParams.get('job');
    const b = document.body; if (b && b.dataset && b.dataset.job) return b.dataset.job;
    const el = document.querySelector('[data-job-id]') || document.getElementById('jobId') || document.querySelector('.job-id');
    if (el) return el.dataset?.jobId || el.textContent.trim();
    const h1 = document.querySelector('h1,h2'); return h1 ? h1.textContent.trim() : '';
  }

  async function loadEmailSettings(){
    let user=''; try { const who = await fetch('/.netlify/functions/auth-check').then(r=>r.json()).catch(()=>({})); if (who && who.user) user = who.user; } catch {}
    try {
      const j = await fetch('/.netlify/functions/email-settings-load').then(r=>r.json()).catch(()=>null);
      if (j){
        const to = (j.to||[]).join(', ');
        const whoTag = document.getElementById('whoSel'); if (whoTag) whoTag.textContent = '('+(j.user || user || '')+')';
        const toBox = document.getElementById('selTo'); if (toBox && !toBox.value) toBox.value = to;
      }
    } catch {}
  }

  function entriesForJob(binder, jobId){
    if (!binder) return [];
    const all = [];
    for (const [k,v] of Object.entries(binder)){
      if (Array.isArray(v) && v.length && typeof v[0]==='object'){
        const looksLog = ('date' in v[0] || 'timestamp' in v[0] || 'time' in v[0]) && ('text' in v[0] || 'note' in v[0] || 'message' in v[0] || 'desc' in v[0]);
        if (looksLog){
          const filtered = jobId ? v.filter(it => (it.job||it.jobId||it.project||it.site||'').toString() === jobId.toString()) : v;
          if (filtered.length) all.push(...filtered.map((it)=>({...it,__key:k})));
        }
      } else if (v && typeof v==='object'){
        const arr = v.logs || v.entries || v.notes;
        if (Array.isArray(arr) && arr.length){
          const filtered = jobId ? arr.filter(it => (it.job||it.jobId||it.project||it.site||'').toString() === jobId.toString()) : arr;
          if (filtered.length) all.push(...filtered.map((it)=>({...it,__key:k})));
        }
      }
    }
    if (!all.length && Array.isArray(binder.logs)) return binder.logs;
    return all;
  }

  async function openSelectModal(){
    const selStatus = document.getElementById('selStatus');
    const selList = document.getElementById('selList');
    const selEmpty = document.getElementById('selEmpty');
    const selJob = document.getElementById('selJob');
    const modal = document.getElementById('selectModal');

    selStatus.textContent = 'Loading…';
    modal.style.display = 'flex';
    await loadEmailSettings();
    let binder = null;
    try {
      const r = await fetch('/.netlify/functions/load', { headers:{'cache-control':'no-cache'} });
      binder = r.ok ? await r.json() : {};
    } catch { binder = {}; }
    const jobId = findJobId();
    selJob.textContent = jobId ? jobId : 'current job';
    const items = entriesForJob(binder, jobId);
    selList.innerHTML = '';
    if (!items.length){
      selEmpty.style.display = 'block';
    } else {
      selEmpty.style.display = 'none';
      items.forEach((it, i) => {
        const li = document.createElement('li');
        const cb = document.createElement('input'); cb.type='checkbox'; cb.dataset.idx=i;
        const date = document.createElement('div'); date.className='date'; date.textContent = fmt(it.date||it.timestamp||it.time||'');
        const txt = document.createElement('div'); txt.innerHTML = (it.text||it.note||it.message||it.desc||'').replace(/\n/g,'<br>');
        li.append(cb,date,txt); selList.appendChild(li);
      });
      selList.dataset.count = items.length;
      selList._items = items;
    }
    selStatus.textContent = '';
  }

  function selected(){
    const selList = document.getElementById('selList');
    const items = selList? (selList._items || []) : [];
    const set = new Set([...document.querySelectorAll('#selList input[type=checkbox]:checked')].map(x=>+x.dataset.idx));
    return items.filter((_,i)=>set.has(i));
  }

  function printSelected(){
    const items = selected();
    if (!items.length){ alert('Select at least one log.'); return; }
    const w = window.open('', '_blank');
    const body = items.map(htmlFromEntry).join('\\n');
    w.document.write('<!doctype html><html><head><title>Print Logs</title></head><body>'+body+'</body></html>');
    w.document.close();
    w.focus(); w.print();
  }

  async function emailSelected(){
    const items = selected();
    if (!items.length){ alert('Select at least one log.'); return; }
    const whoSel = document.getElementById('whoSel');
    const jobId = (document.getElementById('selJob').textContent)||'';
    const subject = document.getElementById('selSubject').value || 'HVAC Binder – Log updates';
    const to = document.getElementById('selTo').value.split(',').map(s=>s.trim()).filter(Boolean);
    const intro = '<p><strong>'+ (whoSel.textContent.replace(/[()]/g,'') || 'A user') + '</strong> added info to <strong>'+ (jobId||'this job') +'</strong>.</p>';
    const resHtml = items.map(htmlFromEntry).join('');
    const html = '<h2>'+subject+'</h2>' + intro + resHtml;
    const res = await fetch('/.netlify/functions/send-email', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ subject, html, fromName:'', fromEmail:'', to })
    });
    if (!res.ok){ const t = await res.text().catch(()=>'' ); alert('Send failed: '+t); return; }
    try{ await fetch('/.netlify/functions/email-settings-save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to })}); }catch {}
    document.getElementById('selectModal').style.display = 'none';
    alert('Sent!');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const right = ensureHeaderRight();
    if (!right) return;
    if (!right.querySelector('#selectLogsBtn')){
      const btn = document.createElement('button');
      btn.id='selectLogsBtn'; btn.className='ghost'; btn.textContent='Select';
      const anchor = right.querySelector('#logoutBtn') || right.firstChild;
      right.insertBefore(btn, anchor || null);
      injectModal();
      btn.addEventListener('click', openSelectModal);
      const overlay = document.getElementById('selectModal');
      overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.style.display='none'; });
      document.getElementById('selCancel').addEventListener('click', ()=> overlay.style.display='none');
      document.getElementById('selPrint').addEventListener('click', printSelected);
      document.getElementById('selEmail').addEventListener('click', emailSelected);
    }
  });
})();