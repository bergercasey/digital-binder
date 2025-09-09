(function(){
  const SEL = { list:'#notes-list', row:'.note-item', date:'.note-date', printBtn:'#print-job' };

  function cssOnce(id, css){ if(document.getElementById(id)) return; const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s); }
  cssOnce('pe31css', `
    .pe-rel{ position: relative !important; }
    .pe-right{ position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; gap: 6px; }
    .pe-right input{ width:16px; height:16px; }
    .pe-td{ white-space:nowrap; }
    .pe-sel-all{ float: right; font-size: 13px; display:inline-flex; align-items:center; gap:6px; margin-left: 10px; }
    #pe_overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;z-index:9999}
    #pe_modal{width:min(92vw,900px);max-height:82vh;overflow:auto;background:#fff;border:1px solid #d0d7de;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:14px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111}
    #pe_modal h3{margin:0 0 8px 0;font-size:16px}
    .pe-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .pe-btn{padding:8px 12px;border:1px solid #d0d7de;background:#fff;border-radius:8px;cursor:pointer}
    .pe-btn.primary{font-weight:700}
    .pe-list{border:1px solid #d0d7de;border-radius:8px;padding:10px;max-height:38vh;overflow:auto;background:#fff}
    .pe-muted{color:#6b7280;font-size:12px}
    .pe-col{min-width:260px;flex:1}
    .pe-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #d0d7de;border-radius:999px;padding:4px 8px;margin:4px 6px 0 0}
    .pe-chip input{margin:0}
    #pe_addr_add{display:flex;gap:6px;margin-top:6px}
    #pe_addr_add input{flex:1;padding:8px 10px;border:1px solid #d0d7de;border-radius:8px}
    #pe_addr_add button{white-space:nowrap}
    .pe-job{border:1px solid #d0d7de;border-radius:10px;padding:10px;margin-bottom:10px;background:#fafafa}
  `);

  function $(s, r=document){ return r.querySelector(s); }
  function $all(s, r=document){ return Array.from(r.querySelectorAll(s)); }

  function ensureSelectAll(){
    const head = Array.from(document.querySelectorAll('h1,h2,h3,h4')).find(h => (h.textContent||'').trim()==='Log');
    if(!head || $('#pe_cb_all')) return;
    const label = document.createElement('label'); label.className='pe-sel-all';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.id='pe_cb_all';
    label.append(cb, document.createTextNode('Select all'));
    head.insertAdjacentElement('afterend', label);
    cb.addEventListener('change', () => {
      const list = $(SEL.list); if (!list) return;
      $all('.pe_cb_row', list).forEach(x => x.checked = cb.checked);
    });
  }

  function ensureRowCheckbox(row){
    if(row.querySelector('.pe_cb_row')) return;
    if(row.tagName==='TR'){
      // add a trailing cell
      const td = document.createElement('td'); td.className='pe-td';
      const lab = document.createElement('label'); lab.className='pe-right'; lab.style.position='static';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.className='pe_cb_row';
      lab.appendChild(cb); td.appendChild(lab);
      row.appendChild(td);
    }else{
      row.classList.add('pe-rel');
      const lab = document.createElement('label'); lab.className='pe-right';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.className='pe_cb_row';
      lab.appendChild(cb); row.appendChild(lab);
    }
  }

  function injectRowCheckboxes(){
    const list = $(SEL.list); if(!list) return;
    const rows = findRows(list);
    rows.forEach(ensureRowCheckbox);
  }

  function findRows(list){
    if(!list) return [];
    if(list.tagName==='UL'||list.tagName==='OL'){ return $all(':scope > li', list); }
    if(list.tagName==='TABLE'){ return $all('tbody tr', list).length ? $all('tbody tr', list) : $all('tr', list); }
    return $all(':scope > .note-item, :scope > div, :scope > article', list);
  }

  function getSelectedHTML(){
    const list = $(SEL.list); if (!list) return [];
    const rows = findRows(list);
    const out = [];
    rows.forEach(r=>{
      const cb = r.querySelector('.pe_cb_row');
      if(cb && cb.checked){
        const clone = r.cloneNode(true);
        // remove injected UIs
        $all('.pe-right', clone).forEach(n=>n.remove());
        out.push(clone.innerHTML);
      }
    });
    return out;
  }

  function replacePrintButton(){
    const orig = document.querySelector(SEL.printBtn);
    if(!orig || orig.dataset.pe31) return;
    const clone = orig.cloneNode(true);
    clone.textContent = 'Print/Email';
    clone.dataset.pe31 = '1';
    // Remove default click (replace node drops existing listeners)
    orig.parentNode.replaceChild(clone, orig);
    clone.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); openModal(); }, {capture:true});
  }

  function jobInfoHTML(){
    const h1 = document.querySelector('h1');
    const summary = document.querySelector('#job-info, .job-info, #job-summary, .job-summary, #project-info, .project-info');
    let inner = '';
    if(h1){ inner += '<h2 style="margin:0 0 6px 0">'+(h1.textContent||'').trim()+'</h2>'; }
    if(summary){ inner += summary.outerHTML; }
    return inner ? '<div class="pe-job">'+inner+'</div>' : '';
  }

  function ensureModal(){
    if($('#pe_overlay')) return;
    const overlay = document.createElement('div'); overlay.id='pe_overlay';
    const modal = document.createElement('div'); modal.id='pe_modal';
    modal.innerHTML = `
      <h3>Print or Email</h3>
      <div id="pe_count" class="pe-muted"></div>
      <div class="pe-row" style="margin:8px 0 10px">
        <button id="pe_print" class="pe-btn">Print selected</button>
        <button id="pe_email" class="pe-btn primary">Email selected</button>
        <button id="pe_close" class="pe-btn">Close</button>
      </div>
      <div class="pe-col" style="margin-bottom:10px">
        <div class="pe-muted" style="margin-bottom:6px">Job info + Preview</div>
        <div id="pe_preview" class="pe-list"></div>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div class="pe-col">
          <div class="pe-muted" style="margin-bottom:6px">Recipients (saved per user)</div>
          <div id="pe_addr_list" class="pe-list"></div>
          <div id="pe_addr_add">
            <input id="pe_addr_input" type="text" placeholder="name <email@company.com> or email@company.com"/>
            <button id="pe_addr_add_btn" class="pe-btn">Add</button>
          </div>
          <div class="pe-row" style="margin-top:8px">
            <button id="pe_addr_save" class="pe-btn">Save list</button>
            <span id="pe_addr_msg" class="pe-muted"></span>
          </div>
        </div>
      </div>
    `;
    overlay.appendChild(modal); document.body.appendChild(overlay);
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.style.display='none'; });
    $('#pe_close').addEventListener('click', ()=> overlay.style.display='none');
    $('#pe_print').addEventListener('click', doPrint);
    $('#pe_email').addEventListener('click', doEmail);
    $('#pe_addr_add_btn').addEventListener('click', addAddressFromInput);
    $('#pe_addr_save').addEventListener('click', saveAddressBook);
  }

  function contactChip(c){
    const d = document.createElement('label'); d.className='pe-chip';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = c.checked!==false;
    cb.dataset.email = c.email; cb.dataset.name = c.name || '';
    const span = document.createElement('span'); span.textContent = c.name ? `${c.name} <${c.email}>` : c.email;
    d.append(cb, span);
    return d;
  }

  function parseContact(s){
    s = (s||'').trim(); if(!s) return null;
    const m = /^(.*)<([^>]+)>$/.exec(s);
    if(m) return { name:m[1].trim(), email:m[2].trim(), checked:true };
    return { name:'', email:s, checked:true };
  }

  async function loadAddressBook(){
    try{
      const j = await fetch('/.netlify/functions/email-contacts-load').then(r=>r.json());
      const list = $('#pe_addr_list'); list.innerHTML='';
      (j.contacts||[]).forEach(c=> list.appendChild(contactChip(c)));
    }catch{}
  }

  async function saveAddressBook(){
    const chips = $all('#pe_addr_list input[type=checkbox]');
    const contacts = chips.map(x=>({ name:x.dataset.name||'', email:x.dataset.email||'', checked:x.checked }));
    const msg = $('#pe_addr_msg'); msg.textContent='Saving…';
    try{
      const r = await fetch('/.netlify/functions/email-contacts-save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contacts })});
      msg.textContent = r.ok ? 'Saved' : 'Error';
      setTimeout(()=> msg.textContent='', 1200);
    }catch{ msg.textContent='Error'; setTimeout(()=> msg.textContent='',1200); }
  }

  function addAddressFromInput(){
    const box = $('#pe_addr_input'); const c = parseContact(box.value); if(!c) return;
    $('#pe_addr_list').appendChild(contactChip(c)); box.value='';
  }

  function openModal(){
    ensureModal();
    const chosen = getSelectedHTML();
    if(!chosen.length){ alert('Check Select all or specific logs first.'); return; }
    const html = jobInfoHTML() + chosen.join('');
    $('#pe_preview').innerHTML = html;
    $('#pe_count').textContent = chosen.length + ' log(s) selected';
    loadAddressBook();
    $('#pe_overlay').style.display='flex';
  }

  function doPrint(){
    const html = $('#pe_preview').innerHTML;
    const w = window.open('', '_blank');
    w.document.write('<!doctype html><html><head><title>Print Logs</title></head><body>'+html+'</body></html>');
    w.document.close(); w.focus(); w.print();
  }

  async function doEmail(){
    const chips = $all('#pe_addr_list input[type=checkbox]');
    const to = chips.filter(x=>x.checked).map(x=>x.dataset.email).filter(Boolean);
    if(!to.length){ alert('Check at least one recipient.'); return; }
    let who={}; try{ who = await fetch('/.netlify/functions/auth-check').then(r=>r.json()); }catch{}
    const jobTitle = (document.querySelector('h1')?.textContent||'Job').trim();
    const subject = 'HVAC Binder – Log updates for ' + jobTitle;
    const intro = '<p><strong>'+((who&&who.user)||'A user')+'</strong> added info to <strong>'+jobTitle+'</strong>.</p>';
    const html = '<h2>'+subject+'</h2>'+intro+$('#pe_preview').innerHTML;
    const r = await fetch('/.netlify/functions/send-email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ subject, html, to })});
    if(!r.ok){ const t = await r.text().catch(()=>'' ); alert('Send failed: '+t); return; }
    alert('Sent!'); $('#pe_overlay').style.display='none';
  }

  function mount(){
    ensureSelectAll();
    injectRowCheckboxes();
    replacePrintButton();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    mount();
    const list = document.querySelector(SEL.list);
    if(list){
      const mo = new MutationObserver(()=> injectRowCheckboxes());
      mo.observe(list, { childList:true, subtree:true });
    }
  });
})();