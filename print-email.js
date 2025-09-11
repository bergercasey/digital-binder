/* /print-email.js — v35 */
(function(){
  const P = {
    headingText: 'Log',
    printBtnSelectors: ['#print-job','button','a[role="button"]'],
    containerHints: ['#notes-list','.notes','.logs','#entries','.entries','section.logs','main .logs','main .notes']
  };
  const $ = (s,r=document)=>r.querySelector(s);
  const $all = (s,r=document)=>Array.from(r.querySelectorAll(s));

  function hideOldSelectionUI(){
    try{
      document.querySelectorAll('.selected-chip, .select-platform, .select, .selection, #log-tip').forEach(el=>{ el.style.display='none'; });
      Array.from(document.querySelectorAll('th')).forEach(th=>{ if((th.textContent||'').trim().toLowerCase()==='selected') th.style.display='none'; });
    }catch(e){}
  }

  function cssOnce(id, css){ if(document.getElementById(id)) return; const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s); }
  cssOnce('pe35css', `
    .note-date{display:inline-flex; align-items:center; gap:6px}

    .pe-inline{ display:inline-flex; align-items:center; gap:6px; margin-left:10px; }
    .pe-date-inline{ display:inline-flex; align-items:center; gap:6px; margin-left:6px; vertical-align:middle; }
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

  function findHeading(){
    // Try strict: any heading tag with exact "Log"
    const heads = Array.from(document.querySelectorAll('h1,h2,h3,h4,.section-title,.title,.log-title,label'));
    let h = heads.find(el => (el.textContent||'').trim().toLowerCase() === P.headingText.toLowerCase());
    if (h) return h;
    // Fallback: find container first, then walk back to a sibling that contains "Log"
    const container = document.querySelector('#notes-list') || document.querySelector('.notes') || document.querySelector('.logs') || document.querySelector('#entries') || document.querySelector('.entries');
    if (container){
      let n = container.previousElementSibling, steps = 0;
      while(n && steps < 5){
        const txt=(n.textContent||'').trim().toLowerCase();
        if (txt.includes('log')) return n;
        n = n.previousElementSibling; steps++;
      }
    }
    return null;
  }



  function ensureModal(){
    if(document.getElementById('pe_overlay')) return;
    const overlay=document.createElement('div'); overlay.id='pe_overlay';
    const modal=document.createElement('div'); modal.id='pe_modal';
    modal.innerHTML=`
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
      <div class="pe-col">
        <div class="pe-muted" style="margin-bottom:6px">Recipients (saved)</div>
        <div id="pe_addr_list" class="pe-list"></div>
        <div id="pe_addr_add">
          <input id="pe_addr_input" type="text" placeholder="name <email@company.com> or email@company.com"/>
          <button id="pe_addr_add_btn" class="pe-btn">Add</button>
        </div>
        <div class="pe-row" style="margin-top:8px">
          <button id="pe_addr_save" class="pe-btn">Save list</button>
          <span id="pe_addr_msg" class="pe-muted"></span>
        </div>
      </div>`;
    overlay.appendChild(modal); document.body.appendChild(overlay);
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.style.display='none'; });
    document.getElementById('pe_close').addEventListener('click', ()=> overlay.style.display='none');
    document.getElementById('pe_print').addEventListener('click', doPrint);
    document.getElementById('pe_email').addEventListener('click', doEmail);
    document.getElementById('pe_addr_add_btn').addEventListener('click', addAddressFromInput);
    document.getElementById('pe_addr_save').addEventListener('click', saveAddressBook);
  }

  function jobInfoHTML(){
    const h1=document.querySelector('h1');
    const summary=document.querySelector('#job-info, .job-info, #job-summary, .job-summary, #project-info, .project-info');
    let inner=''; if(h1) inner += '<h2 style="margin:0 0 6px 0">'+(h1.textContent||'').trim()+'</h2>';
    if(summary) inner += summary.outerHTML;
    return inner ? '<div class="pe-job">'+inner+'</div>' : '';
  }

  function getSelectedHTML(container){
    const rows=findRows(container), out=[];
    rows.forEach(r=>{
      const cb=r.querySelector('.pe_cb_row');
      if(cb && cb.checked){
        const clone=r.cloneNode(true);
        Array.from(clone.querySelectorAll('.pe-date-inline')).forEach(n=>n.remove());
        out.push(clone.innerHTML);
      }
    });
    return out;
  }

  function openModal(){
    ensureModal();
    const head=findHeading(); const container=findContainer(head);
    const chosen=getSelectedHTML(container);
    if(!chosen.length){ alert('Check Select all or specific logs first.'); return; }
    document.getElementById('pe_preview').innerHTML = jobInfoHTML() + chosen.join('');
    document.getElementById('pe_count').textContent = chosen.length + ' log(s) selected';
    loadAddressBook();
    document.getElementById('pe_overlay').style.display='flex';
  }

  function doPrint(){
    const html=document.getElementById('pe_preview').innerHTML;
    const w=window.open('','_blank');
    w.document.write('<!doctype html><html><head><title>Print Logs</title></head><body>'+html+'</body></html>');
    w.document.close(); w.focus(); w.print();
  }

  // Recipients (safe fallbacks for missing functions/env)
  function contactChip(c){
    const d=document.createElement('label'); d.className='pe-chip';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=c.checked!==false;
    cb.dataset.email=c.email; cb.dataset.name=c.name||'';
    const span=document.createElement('span'); span.textContent = c.name ? `${c.name} <${c.email}>` : c.email;
    d.append(cb, span); return d;
  }
  function parseContact(s){
    s=(s||'').trim(); if(!s) return null;
    const m=/^(.*)<([^>]+)>$/.exec(s);
    if(m) return { name:m[1].trim(), email:m[2].trim(), checked:true };
    return { name:'', email:s, checked:true };
  }
  async function loadAddressBook(){
    try{
      const resp = await fetch('/.netlify/functions/email-contacts-load');
      if(!resp.ok) throw 0;
      const j = await resp.json();
      const list=document.getElementById('pe_addr_list'); list.innerHTML='';
      (j.contacts||[]).forEach(c=> list.appendChild(contactChip(c)));
    }catch{
      // no-op fallback
      document.getElementById('pe_addr_list').innerHTML='';
    }
  }
  async function saveAddressBook(){
    const chips=Array.from(document.querySelectorAll('#pe_addr_list input[type=checkbox]'));
    const contacts=chips.map(x=>({ name:x.dataset.name||'', email:x.dataset.email||'', checked:x.checked }));
    const msg=document.getElementById('pe_addr_msg'); msg.textContent='Saving…';
    try{
      const r=await fetch('/.netlify/functions/email-contacts-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contacts})});
      msg.textContent=r.ok?'Saved':'Error';
    }catch{ msg.textContent='Error'; }
    setTimeout(()=> msg.textContent='',1200);
  }
  function addAddressFromInput(){
    const box=document.getElementById('pe_addr_input');
    const c=parseContact(box.value); if(!c) return;
    document.getElementById('pe_addr_list').appendChild(contactChip(c));
    box.value='';
  }

  
function ensureRowCheckboxes(container){
  try{
    var dates = Array.prototype.slice.call(document.querySelectorAll('#notes-list .note-date, .note-item .note-date'));
    // If there is a "tip" line immediately under the Log heading, hide it to keep the row tight.
    try{
      var head = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4')).find(function(h){ return (h.textContent||'').trim().toLowerCase() === P.headingText.toLowerCase(); });
      if (head && head.nextElementSibling && /tip/i.test((head.nextElementSibling.textContent||''))) head.nextElementSibling.style.display='none';
    }catch(e){}
    if (dates.length) {
      dates.forEach(function(dateEl){
        var sig = hashNode(dateEl);
        if (dateEl.querySelector('.pe_cb_row[data-bind="'+sig+'"]')) return;
        var label = document.createElement('label'); label.className = 'pe-date-inline';
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'pe_cb_row'; cb.setAttribute('data-bind', sig);
        label.appendChild(cb);
        dateEl.appendChild(label);
      });
      return;
    }
  }catch(e){}
  // Fallback: try to guess rows and then locate a date-like element
  try{
    var rows = [];
    if (container) {
      if (/^(UL|OL)$/i.test(container.tagName)) { rows = Array.prototype.slice.call(container.children); }
      else if (/^TABLE$/i.test(container.tagName)) { rows = Array.prototype.slice.call((container.tBodies[0]||container).querySelectorAll('tr')); }
      else { rows = Array.prototype.slice.call(container.children); }
    }
    rows.forEach(function(row){
      var dateEl = row.querySelector('.note-date,.date,.log-date,[data-date],time');
      if(!dateEl){
        var cand = Array.prototype.slice.call(row.querySelectorAll('*')).find(function(el){
          return /\\b\\d{4}\\-\\d{2}\\-\\d{2}\\b|\\b\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}\\b/.test((el.textContent||''));
        });
        if (cand) dateEl = cand;
      }
      if(!dateEl) return;
      var sig = hashNode(dateEl);
      if (row.querySelector('.pe_cb_row[data-bind="'+sig+'"]')) return;
      var label = document.createElement('label'); label.className = 'pe-date-inline';
      var cb = document.createElement('input'); cb.type='checkbox'; cb.className='pe_cb_row'; cb.setAttribute('data-bind', sig);
      label.appendChild(cb);
      dateEl.appendChild(label);
    });
  }catch(e){}
}

function replaceAllPrintButtons(){
  try{
    // Primary: id="print-job"
    var btn = document.getElementById('print-job');
    var handler = function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(err){} try{ openModal(); }catch(err){} };
    if(btn && !btn.dataset.pe35){
      btn.textContent = 'Email/Print';
      try{ btn.addEventListener('click', handler, {capture:true}); }catch(e){ try{ btn.addEventListener('click', handler); }catch(_e){} }
      btn.dataset.pe35='1';
    }
    // Secondary: any visible button with the Email/Print text
    var nodes = Array.prototype.slice.call(document.querySelectorAll('button, a[role="button"]'));
    nodes.forEach(function(n){
      var t=(n.textContent||'').trim().toLowerCase();
      if((t==='email/print' || t==='print selected' || t==='print') && !n.dataset.pe35){
        try{ n.addEventListener('click', handler, {capture:true}); }catch(e){ try{ n.addEventListener('click', handler); }catch(_e){} }
        n.dataset.pe35='1';
      }
    });
  }catch(e){ /* swallow */ }
}
function boot(){
    try { if (typeof hideOldSelectionUI === 'function') hideOldSelectionUI(); } catch(e){}
    const container = document.querySelector('#notes-list') || document.querySelector('.notes') || document.querySelector('.logs') || document.querySelector('#entries') || document.querySelector('.entries') || document.body;
    const head = findHeading();
    if(!head || !container) return;
    ensureSelectAllInline(head, container);
    ensureRowCheckboxes(container);
    replaceAllPrintButtons();
    const mo=new MutationObserver(()=> ensureRowCheckboxes(container));
    mo.observe(container,{childList:true,subtree:true});
  }

  document.addEventListener('DOMContentLoaded', boot);
})();

function ensureSelectAllInline(head, container){
  if(!head) return;
  if(document.getElementById('pe_cb_all')) return;
  var span=document.createElement('span'); span.className='pe-inline';
  var cb=document.createElement('input'); cb.type='checkbox'; cb.id='pe_cb_all';
  span.appendChild(cb);
  span.appendChild(document.createTextNode(' Select all'));
  head.appendChild(span);
  cb.addEventListener('change', function(){
    Array.prototype.slice.call(container.querySelectorAll('.pe_cb_row')).forEach(function(x){ x.checked = cb.checked; });
  });
  // Hide the old tip line if it exists
  try{
    var sib=head.nextElementSibling; if(sib && /tip/i.test((sib.textContent||''))) sib.style.display='none';
  }catch(e){}
}
