/* /print-email.js — v35 */
(function(){
  const P = {
    headingText: 'Log',
    printBtnSelectors: ['#print-job','button','a[role="button"]'],
    containerHints: ['#notes-list','.notes','.logs','#entries','.entries','section.logs','main .logs','main .notes']
  };
  const $ = (s,r=document)=>r.querySelector(s);
  const $all = (s,r=document)=>Array.from(r.querySelectorAll(s));

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
    return Array.from(document.querySelectorAll('h1,h2,h3,h4'))
      .find(h => (h.textContent||'').trim().toLowerCase() === P.headingText.toLowerCase());
  }
  function findContainer(head){
    let n=head&&head.nextElementSibling;
    while(n){ if(/^(UL|OL|DIV|SECTION|TABLE)$/i.test(n.tagName)) return n; n=n.nextElementSibling; }
    for(const sel of P.containerHints){ const el=document.querySelector(sel); if(el) return el; }
    const main=document.querySelector('main')||document.body;
    return main.querySelector('ul,ol,table,section,div');
  }

  function ensureSelectAllInline(head, container){
    if(!head || document.getElementById('pe_cb_all')) return;
    const span=document.createElement('span'); span.className='pe-inline';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.id='pe_cb_all';
    span.append(cb, document.createTextNode('Select all'));
    head.appendChild(span);
    cb.addEventListener('change', ()=> Array.from(container.querySelectorAll('.pe_cb_row')).forEach(x=> x.checked = cb.checked) );
    // Hide any "Tip ..." sibling to keep the line clean
    const sib=head.nextElementSibling; if(sib && /tip/i.test(sib.textContent||'')) sib.style.display='none';
  }

  
function ensureRowCheckboxes(container){
  // Prefer explicit selector for this app
  const dates = Array.from(document.querySelectorAll('#notes-list .note-date, .note-item .note-date'));
  if (dates.length) {
    dates.forEach(dateEl => {
      const sig = hashNode(dateEl);
      if (dateEl.querySelector(`.pe_cb_row[data-bind="${sig}"]`)) return;
      const label = document.createElement('label'); label.className = 'pe-date-inline';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'pe_cb_row'; cb.dataset.bind = sig;
      label.appendChild(cb);
      dateEl.appendChild(label);
    });
    return;
  }
  // Fallback: generic row scan
  const rows=findRows(container);
  rows.forEach(row=>{
    let dateEl=row.querySelector('.note-date,.date,.log-date,[data-date],time');
    if(!dateEl){
      const cand=Array.from(row.querySelectorAll('*')).find(el=>/\b\d{4}\-\d{2}\-\d{2}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(el.textContent||''));
      if(cand) dateEl=cand;
    }
    if(!dateEl) return;
    const sig = hashNode(dateEl);
    if(row.querySelector(`.pe_cb_row[data-bind="${sig}"]`)) return;
    const label=document.createElement('label'); label.className='pe-date-inline';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.className='pe_cb_row'; cb.dataset.bind=sig;
    label.appendChild(cb);
    dateEl.appendChild(label);
  });
}
)();