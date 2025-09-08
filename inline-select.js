(function(){
  function cssOnce(id, css){ if(document.getElementById(id)) return; const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s); }
  function el(tag, attrs={}, children=[]){ const x=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='style'&&typeof v==='object')Object.assign(x.style,v); else if(k==='class')x.className=v; else x.setAttribute(k, v);}); (Array.isArray(children)?children:[children]).forEach(c=>{ if(typeof c==='string') x.appendChild(document.createTextNode(c)); else if(c) x.appendChild(c);}); return x; }
  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function isDatey(text){ return /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text||''); }

  function currentJob(){
    const url=new URL(location.href);
    if(url.searchParams.get('job')) return url.searchParams.get('job');
    const b=document.body; if(b?.dataset?.job) return b.dataset.job;
    const el = $('[data-job-id]') || $('#jobId') || $('.job-id');
    if(el) return (el.dataset && el.dataset.jobId) || (el.textContent||'').trim();
    const h = $('h1,h2'); return h? (h.textContent||'').trim() : '';
  }

  function findLogsContainer(){
    const candidates = ['#logsList','#logs','.logs','.log-list','#entries','.entries'];
    for(const sel of candidates){ const n=$(sel); if(n) return n; }
    const main = $('main') || document.body;
    return (main && (main.querySelector('ul,ol,table,div.list,section.logs'))) || null;
  }

  function findLogRows(container){
    const rows=[];
    if(!container) return rows;
    if(container.tagName==='UL'||container.tagName==='OL'){
      $all(':scope > li', container).forEach(li=> rows.push(li));
    }else if(container.tagName==='TABLE'){
      $all('tbody tr', container).forEach(tr=> rows.push(tr));
    }else{
      $all(':scope > div', container).forEach(d=> rows.push(d));
    }
    return rows.filter(n=> (n.textContent||'').trim().length>0);
  }

  function addCheckbox(row){
    if(row.querySelector('.log-select-cb')) return;
    let dateEl = row.querySelector('.date,.log-date,[data-date]');
    if(!dateEl){
      dateEl = $all('*', row).find(n=> isDatey(n.textContent||'')) || row.firstChild;
    }
    const label = el('label', {class:'log-check', style:{display:'inline-flex',alignItems:'center',gap:'6px',marginRight:'8px'}});
    const cb = el('input', {type:'checkbox', class:'log-select-cb'});
    label.appendChild(cb);
    if(dateEl && dateEl.parentNode) dateEl.parentNode.insertBefore(label, dateEl);
    else row.insertBefore(label, row.firstChild);
  }

  function getSelectedHTML(container){
    const rows = findLogRows(container);
    const chosen = [];
    rows.forEach((r)=>{
      const cb=r.querySelector('.log-select-cb');
      if(cb && cb.checked){
        const clone = r.cloneNode(true);
        $all('.log-check,button,.actions', clone).forEach(n=> n.remove());
        chosen.push(clone.innerHTML);
      }
    });
    return chosen;
  }

  function ensureActions(container){
    let host = document.querySelector('header .header-right');
    if(!host){
      cssOnce('floatActionsCSS', `.floating-actions{position:fixed;right:12px;top:10px;display:inline-flex;gap:8px;align-items:center;z-index:9999}`);
      host = document.querySelector('.floating-actions');
      if(!host){ host = document.createElement('div'); host.className='floating-actions'; document.body.appendChild(host); }
    }
    if(!document.getElementById('openShareModal')){
      const btn = document.createElement('button'); btn.id='openShareModal'; btn.className='ghost'; btn.textContent='Print / Email';
      host.appendChild(btn); btn.addEventListener('click', ()=> openModal(container));
    }
    const head = Array.from(document.querySelectorAll('h1,h2,h3,h4')).find(h=> /^log(s)?$/i.test((h.textContent||'').trim()));
    if(head && !document.getElementById('selectAllLogs')){
      const wrap = document.createElement('label');
      wrap.style.marginLeft='10px'; wrap.style.fontSize='13px'; wrap.style.display='inline-flex'; wrap.style.alignItems='center'; wrap.style.gap='6px';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.id='selectAllLogs';
      wrap.append(cb, document.createTextNode('Select all'));
      head.parentNode.insertBefore(wrap, head.nextSibling);
      cb.addEventListener('change', ()=> Array.from(container.querySelectorAll('.log-select-cb')).forEach(x=> x.checked = cb.checked));
    }
  }

  function ensureModal(){
    if(document.getElementById('shareModal')) return;
    cssOnce('shareModalCSS', `.overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);display:none;align-items:center;justify-content:center;z-index:10000}.dialog{width:min(92vw,780px);max-height:82vh;overflow:auto;background:#fff;border:1px solid #d0d7de;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:14px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.btn{padding:8px 12px;border:1px solid #d0d7de;background:#fff;border-radius:8px;cursor:pointer}.btn.primary{font-weight:700}input[type=text],textarea{width:100%;padding:8px 10px;border:1px solid #d0d7de;border-radius:8px}.list{border:1px solid #d0d7de;border-radius:8px;padding:10px;max-height:38vh;overflow:auto}.muted{color:#6b7280;font-size:12px}`);
    const overlay = document.createElement('div'); overlay.id='shareModal'; overlay.className='overlay';
    overlay.innerHTML = `<div class="dialog">
        <h3>Share selected logs</h3>
        <div id="selCount" class="muted" style="margin-top:-6px;margin-bottom:6px"></div>
        <div class="row">
          <button id="doPrint" class="btn">Print selected</button>
          <button id="doEmail" class="btn primary">Email selected</button>
          <button id="closeShare" class="btn">Cancel</button>
        </div>
        <div style="margin-top:10px">
          <label class="muted" style="display:block;margin-bottom:6px;">Recipients (comma separated)</label>
          <textarea id="toList" rows="3" placeholder="boss@co.com, team@co.com"></textarea>
          <div class="row" style="margin-top:8px">
            <button id="saveFavs" class="btn">Save as favorites</button>
            <span id="saveMsg" class="muted"></span>
          </div>
        </div>
        <div style="margin-top:10px">
          <label class="muted" style="display:block;margin-bottom:6px;">Subject</label>
          <input id="subject" type="text" placeholder="HVAC Binder – Log updates"/>
        </div>
        <div style="margin-top:12px">
          <div class="muted" style="margin-bottom:6px">Preview</div>
          <div id="preview" class="list"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.style.display='none'; });
    document.getElementById('closeShare').addEventListener('click', ()=> overlay.style.display='none');
    document.getElementById('saveFavs').addEventListener('click', async ()=>{
      const to = (document.getElementById('toList').value||'').split(',').map(s=>s.trim()).filter(Boolean);
      try{
        const r = await fetch('/.netlify/functions/email-settings-save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to })});
        document.getElementById('saveMsg').textContent = r.ok ? 'Saved' : 'Error';
        setTimeout(()=> document.getElementById('saveMsg').textContent='', 1200);
      }catch{}
    });
    document.getElementById('doPrint').addEventListener('click', ()=>{
      const html = document.getElementById('preview').innerHTML;
      const w = window.open('', '_blank');
      w.document.write('<!doctype html><html><head><title>Print Logs</title></head><body>'+html+'</body></html>');
      w.document.close(); w.focus(); w.print();
    });
    document.getElementById('doEmail').addEventListener('click', async ()=>{
      const to = (document.getElementById('toList').value||'').split(',').map(s=>s.trim()).filter(Boolean);
      if(!to.length){ alert('Add at least one recipient'); return; }
      const subject = document.getElementById('subject').value || 'HVAC Binder – Log updates';
      const job = currentJob();
      let who={}; try{ who = await fetch('/.netlify/functions/auth-check').then(r=>r.json()); }catch{}
      const intro = '<p><strong>'+((who&&who.user)||'A user')+'</strong> added info to <strong>'+(job||'this job')+'</strong>.</p>';
      const html = '<h2>'+subject+'</h2>'+intro+document.getElementById('preview').innerHTML;
      const r = await fetch('/.netlify/functions/send-email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ subject, html, to, fromName:'', fromEmail:'' })});
      if(!r.ok){ const t = await r.text().catch(()=>'' ); alert('Send failed: '+t); return; }
      try{ await fetch('/.netlify/functions/email-settings-save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to })}); }catch{}
      document.getElementById('shareModal').style.display='none'; alert('Sent!');
    });
  }

  async function loadFavorites(){
    try{
      const j = await fetch('/.netlify/functions/email-settings-load').then(r=>r.json());
      if(j?.to){ const box=document.getElementById('toList'); if(box && !box.value) box.value=(j.to||[]).join(', '); }
    }catch{}
  }

  function openModal(container){
    const chosen = getSelectedHTML(container);
    if(!chosen.length){ alert('Check the boxes next to the logs you want first.'); return; }
    document.getElementById('preview').innerHTML = chosen.join('\n');
    document.getElementById('selCount').textContent = chosen.length + ' log(s) selected';
    ensureModal(); loadFavorites();
    document.getElementById('shareModal').style.display='flex';
  }

  function init(){
    const cont = findLogsContainer();
    if(!cont) return;
    findLogRows(cont).forEach(addCheckbox);
    ensureActions(cont);
    ensureModal();
  }

  document.addEventListener('DOMContentLoaded', init);
})();