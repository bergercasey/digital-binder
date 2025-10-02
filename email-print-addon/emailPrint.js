/* Email/Print Addon — injected next to Delete Selection */
(function(){
  const CFG = Object.assign({
    // Removed :contains() to avoid selector SyntaxError
    deleteButtonSelectorList: [
      'button#deleteSelected',
      'button[data-action="delete-selection"]',
      'button.delete-selection',
      'button.btn-delete-selection'
    ],
    selectedNoteCheckboxSelector: 'input[type="checkbox"][data-role="log-select"]:checked, .log-entry input[type="checkbox"]:checked, .note-entry input[type="checkbox"]:checked, li input[type="checkbox"]:checked',
    noteTextSelectorWithinEntry: '.note-text, .log-text, textarea, .text, .content, .note-body',
    fields: {
      name: '#jobName, [data-field="name"], #name',
      address: '#jobAddress, [data-field="address"], #address',
      stage: '#currentStage, #jobStage, [data-field="stage"], #stage',
      crew: '#crew, #jobCrew, [data-field="crew"]'
    }
  }, window.EMAIL_PRINT_CONFIG || {});

  function findDeleteButton() {
    // Try explicit selectors first
    for (const sel of CFG.deleteButtonSelectorList) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (e) { /* ignore invalid selectors */ }
    }
    // Fallback: scan buttons and match by text content
    const btns = Array.from(document.querySelectorAll('button'));
    const match = btns.find(b => (b.textContent || '').trim().toLowerCase() === 'delete selection');
    return match || null;
  }
  function findDeleteButton(){
    let el = document.querySelector(CFG.deleteButtonSelector);
    if (el) return el;
    return qsContains(document, 'button', 'Delete Selection');
  }
  function injectModal(){
    if (document.getElementById('ep-modal')) return;
    const dlg = document.createElement('dialog');
    dlg.id = 'ep-modal';
    dlg.innerHTML = `
      <style>
        #ep-modal::backdrop { background: rgba(0,0,0,.6); }
        #ep-modal { border:1px solid #333; padding:0; border-radius:12px; width:min(800px,95vw); background:#121212; color:#eee; }
        #ep-head { padding:14px 16px; border-bottom:1px solid #2b2b2b; display:flex; justify-content:space-between; align-items:center; }
        #ep-body { padding:16px; background:#111; }
        #ep-actions { padding:12px 16px; border-top:1px solid #2b2b2b; display:flex; gap:10px; justify-content:flex-end; background:#111; }
        .ep-card { background:#fff; color:#000; border-radius:10px; padding:16px; }
        .ep-card h2 { margin:0 0 8px 0; font-size:20px; font-weight:800; }
        .ep-meta { margin-bottom:12px; line-height:1.35; font-size:14px; }
        .ep-notes ul { margin:0; padding-left:20px; }
        .ep-notes li { margin:6px 0; }
        .ep-small { font-size:12px; opacity:.7; margin-top:8px; }
      </style>
      <div id="ep-head"><div>Preview</div><button id="ep-close">✕</button></div>
      <div id="ep-body">
        <div id="ep-card" class="ep-card"></div>
        <div class="ep-small">This preview is exactly what will be printed or emailed.</div>
      </div>
      <div id="ep-actions">
        <button id="ep-send">Send Email</button>
        <button id="ep-print">Print</button>
      </div>`;
    document.body.appendChild(dlg);
  }
  function escapeHtml(s){return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function toBulletedHTML(text){
    const items = String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(l=>l.replace(/^(-|\*|•)\s+/,'').trim());
    if (!items.length) return '<p><em>(empty)</em></p>';
    return '<ul>'+items.map(t=>`<li>${escapeHtml(t)}</li>`).join('')+'</ul>';
  }
  function getField(list){
    const selectors = list.split(',').map(s=>s.trim());
    for (const sel of selectors){
      const el = document.querySelector(sel);
      if (el){ return el.value!=null ? el.value.trim() : (el.textContent||'').trim(); }
    }
    return '';
  }
  function gatherSelectedNoteTexts(){
    const cbs = Array.from(document.querySelectorAll(CFG.selectedNoteCheckboxSelector));
    const texts = [];
    for (const cb of cbs){
      if (cb.dataset && /all|selectall/i.test(cb.dataset.role||'')) continue;
      const container = cb.closest('.log-entry, .note-entry, li, .row, .item') || cb.parentElement;
      let text = '';
      if (container){
        const tEl = container.querySelector(CFG.noteTextSelectorWithinEntry);
        text = tEl ? (tEl.value!=null ? tEl.value : tEl.textContent) : (container.textContent||'');
      }
      text = (text||'').trim();
      if (text) texts.push(text);
    }
    return texts;
  }
  function buildPreviewHTML(){
    const name = getField(CFG.fields.name);
    const address = getField(CFG.fields.address);
    const stage = getField(CFG.fields.stage);
    const crew = getField(CFG.fields.crew);
    const lists = gatherSelectedNoteTexts().map(toBulletedHTML).join('\\n');
    const head = `
      <h2>${escapeHtml(name || '(No Name)')}</h2>
      <div class="ep-meta">
        <div>${escapeHtml(address)}</div>
        <div><strong>Current stage:</strong> ${escapeHtml(stage)}</div>
        <div><strong>Crew:</strong> ${escapeHtml(crew)}</div>
      </div>`;
    return `<div class="ep-card">${head}<div class="ep-notes">${lists}</div></div>`;
  }
  function showPreview(){
    injectModal();
    document.getElementById('ep-card').innerHTML = buildPreviewHTML();
    const dlg = document.getElementById('ep-modal');
    if (!dlg.open) dlg.showModal();
  }
  function closePreview(){ const dlg = document.getElementById('ep-modal'); if (dlg && dlg.open) dlg.close(); }
  function printPreview(){
    const html = buildPreviewHTML();
    const w = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
    if (!w){ alert('Please allow pop-ups to print.'); return; }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { margin:0; padding:20px; font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
        .ep-card { background:#fff; color:#000; border-radius:10px; padding:16px; }
        .ep-card h2 { margin:0 0 8px 0; font-weight:800; }
        .ep-meta { margin-bottom:12px; line-height:1.35; font-size:14px; }
        .ep-notes ul { margin:0; padding-left:20px; }
        .ep-notes li { margin:6px 0; }
      </style>
    </head><body>${html}
      <script>
        function safeClose(){ try{ window.close(); }catch(e){} }
        window.onafterprint = safeClose;
        window.onload = function(){
          setTimeout(function(){ window.print(); setTimeout(safeClose,2000); }, 50);
        };
      <\/script>
    </body></html>`);
    w.document.close();
  }
  async function sendEmail(){
    const html = buildPreviewHTML();
    const api = window.env && window.env.EMAIL_API_URL;
    const to = (window.env && window.env.DEFAULT_TO) || '';
    const subject = getField(CFG.fields.name) || 'Job Update';
    if (api){
      try{
        const r = await fetch(api,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({to, subject, html})});
        if(!r.ok) throw new Error('Email API error');
        alert('Email sent.');
        return;
      }catch(e){ console.error(e); alert('Email API failed, falling back to mailto…'); }
    }
    const temp = document.createElement('div'); temp.innerHTML = html;
    const bullets = Array.from(temp.querySelectorAll('li')).map(li=>'• '+li.textContent.trim());
    const name = getField(CFG.fields.name)||'(No Name)';
    const address = getField(CFG.fields.address)||'';
    const stage = getField(CFG.fields.stage)||'';
    const crew = getField(CFG.fields.crew)||'';
    const header = `${name}\n${address}\nCurrent stage: ${stage}\nCrew: ${crew}`;
    const body = encodeURIComponent(header + '\\n\\n' + bullets.join('\\n'));
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  }
  function ensureButtons(){
    const del = findDeleteButton();
    if (!del || del.dataset.emailPrintInjected) return;
    const btn = document.createElement('button');
    btn.id = 'emailPrint'; btn.textContent = 'Email/Print';
    btn.style.marginLeft = '8px';
    btn.className = del.className || '';
    del.insertAdjacentElement('afterend', btn);
    del.dataset.emailPrintInjected = '1';
    btn.addEventListener('click', showPreview);
    document.addEventListener('click', function(e){
      if (e.target && e.target.id === 'ep-close') closePreview();
      if (e.target && e.target.id === 'ep-print') printPreview();
      if (e.target && e.target.id === 'ep-send') sendEmail();
    });
  }
  function ready(fn){ document.readyState!=='loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(ensureButtons);
})();