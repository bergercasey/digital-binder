/* Email/Print Add-on v5.3 (Build 1759579321)
 * Reliability + UX fixes:
 *  - Global handlers for Close/Print/Send (Close now works)
 *  - Optional FIXED selectors for Name/Address/Stage/Crew
 *  - Safer notes extraction (no chips/dates/"Select all")
 *  - Floating fallback button if anchor not found
 */
(function(){"use strict";
  const CFG = Object.assign({
    deleteButtonSelectorList: ['#deleteSelected','[data-action="delete-selection"]','.delete-selection','.btn-delete-selection'],

    headerScopes: ['.job-header', '.detail-header', '.job-summary', '.job-card', 'main', '#app'],
    nameSelectors: ['.job-name', '.job-title', 'h1', 'h2'],
    addressSelectors: ['.job-address', 'a[href*="maps"]', '.address', 'p'],
    stageLabel: 'Stage',
    crewLabel: 'Crew',

    fixedNameSelector: '',
    fixedAddressSelector: '',
    fixedStageSelector: '',
    fixedCrewSelector: '',

    notesTextSelectors: [
      '.note-text', '.note-body', '.log-text', '.log-body',
      'textarea', 'pre', '.content', '.card-text', '.body', 'p'
    ],

    fallbackDelayMs: 3000
  }, window.EMAIL_PRINT_CONFIG || {});

  let cached = { delBtn: null, logsScope: null, headerScope: null, mounted: false, fallbackShown:false };

  const elText = (el) => (el && (el.value!=null ? el.value : el.textContent) || '').trim();
  const escapeHtml = (s) => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const looksLikeDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s||'').trim());
  const isTrivial = (s) => !s || /select\s*all/i.test(s) || looksLikeDate(s);

  function toBulletedHTML(text){
    const lines = String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const cleaned = lines.filter(l => !isTrivial(l) && !/^crew\s*:/i.test(l) && !/^stage\s*:/i.test(l));
    const items = cleaned.map(l => l.replace(/^(-|\*|•)\s+/, '').trim()).filter(Boolean);
    if (!items.length) return '';
    const seen = new Set(); const uniq = items.filter(t=> (seen.has(t)?false:(seen.add(t),true)));
    return '<ul>' + uniq.map(t => `<li>${escapeHtml(t)}</li>`).join('') + '</ul>';
  }

  function findDeleteButton(){
    for (const sel of CFG.deleteButtonSelectorList) { try { const el = document.querySelector(sel); if (el) return el; } catch(_e){} }
    const labels = ['delete selection','delete selected','delete note','delete notes'];
    const btns = Array.from(document.querySelectorAll('button, .btn, [role="button"]'));
    return btns.find(b => labels.includes(elText(b).toLowerCase())) || null;
  }

  function initScopes(){
    const del = findDeleteButton();
    cached.delBtn = del;
    if (del) cached.logsScope = del.closest('.log, .logs, .log-list, .log-panel, .notes, .list-group, .card, section, .container') || del.parentElement;

    if (CFG.fixedNameSelector || CFG.fixedAddressSelector || CFG.fixedStageSelector || CFG.fixedCrewSelector){
      cached.headerScope = document;
    } else {
      for (const sel of CFG.headerScopes){ const h = document.querySelector(sel); if (h) { cached.headerScope = h; break; } }
    }
    if (!cached.headerScope) cached.headerScope = document.body;
  }

  function getFixedOr(elSel, fallbackFn){
    if (!elSel) return fallbackFn();
    const el = document.querySelector(elSel);
    if (!el) return fallbackFn();
    const t = elText(el);
    if (!t) return fallbackFn();
    return t.replace(/^\s*\w[\w\s]*:\s*/,'').trim();
  }

  function getName(){
    return getFixedOr(CFG.fixedNameSelector, () => {
      const scope = cached.headerScope || document;
      for (const sel of CFG.nameSelectors){ const el = scope.querySelector(sel); if (el && elText(el)) return elText(el); }
      return '(No Name)';
    });
  }

  function getAddress(){
    return getFixedOr(CFG.fixedAddressSelector, () => {
      const scope = cached.headerScope || document;
      for (const sel of CFG.addressSelectors){ const el = scope.querySelector(sel); if (el && elText(el)) return elText(el); }
      return '';
    });
  }

  function getStage(){
    return getFixedOr(CFG.fixedStageSelector, () => getChipValue('Stage'));
  }
  function getCrew(){
    return getFixedOr(CFG.fixedCrewSelector, () => getChipValue('Crew'));
  }

  function getChipValue(label){
    const scope = cached.headerScope || document;
    const nodes = Array.from(scope.querySelectorAll('*')).slice(0, 300);
    for (const el of nodes){
      const t = elText(el); if (!t) continue;
      const m = t.match(new RegExp('^\s*'+label+'\s*:\s*(.+)$','i'));
      if (m) return m[1].trim();
    }
    return '';
  }

  function gatherSelectedNotes(){
    const scope = cached.logsScope || document;
    const cbs = Array.from(scope.querySelectorAll('input[type="checkbox"]:checked'));
    const texts = [];
    for (const cb of cbs){
      const labelText = elText(cb.closest('label')||null);
      if (/all|select\s*all/i.test(labelText) || /all|select\s*all/i.test(cb.id||'')) continue;
      const entry = cb.closest('.log-entry, .note-entry, li, .list-group-item, .row, .item, .card, .entry') || cb.parentElement;
      if (!entry) continue;

      let text = '';
      for (const sel of CFG.notesTextSelectors){
        const el = entry.querySelector(sel);
        if (el && elText(el)) { text = elText(el); break; }
      }
      if (!text) text = elText(entry);
      text = text.replace(/\s+/g,' ').trim();
      if (!isTrivial(text) && !/^crew\s*:/i.test(text) && !/^stage\s*:/i.test(text)) texts.push(text);
    }
    const seen = new Set(); const out = [];
    for (const t of texts){ if (t.length>=3 && !seen.has(t)) { seen.add(t); out.push(t); } }
    return out;
  }

  function buildPreviewHTML(){
    const name = getName();
    const address = getAddress();
    const stage = getStage();
    const crew = getCrew();

    const lists = gatherSelectedNotes().map(toBulletedHTML).filter(Boolean).join('\n');
    const meta = [];
    if (address) meta.push(`<div>${escapeHtml(address)}</div>`);
    meta.push(`<div><strong>Current stage:</strong> ${escapeHtml(stage)}</div>`);
    meta.push(`<div><strong>Crew:</strong> ${
      escapeHtml(crew)
    }</div>`);

    return `<div class="ep-card" style="background:#fff;color:#000;border-radius:10px;padding:16px;">
      <h2 style="margin:0 0 8px 0;font-weight:800;font-size:20px;">${escapeHtml(name)}</h2>
      <div class="ep-meta" style="margin-bottom:12px;line-height:1.35;font-size:14px;">${meta.join('')}</div>
      <div class="ep-notes">${lists || '<p><em>(no notes selected)</em></p>'}</div>
    </div>`;
  }

  function ensureModal(){
    if (document.getElementById('ep-modal')) return;
    const dlg = document.createElement('dialog');
    dlg.id = 'ep-modal';
    dlg.innerHTML = `
      <style>
        #ep-modal::backdrop { background: rgba(0,0,0,.45); }
        #ep-modal { border:1px solid #cfd8dc; padding:0; border-radius:12px; width:min(880px,96vw); background:#f7f9fb; color:#111; }
        #ep-head { padding:12px 14px; border-bottom:1px solid #e0e6ea; display:flex; justify-content:space-between; align-items:center; background:#ffffff; border-radius:12px 12px 0 0; }
        #ep-body { padding:14px; background:#f7f9fb; }
        #ep-actions { padding:10px 14px; border-top:1px solid #e0e6ea; display:flex; gap:10px; justify-content:flex-end; background:#ffffff; border-radius:0 0 12px 12px; }
        .ep-small { font-size:12px; opacity:.7; margin-top:8px; }
        .ep-btn { padding:8px 12px; border-radius:8px; border:1px solid rgba(0,0,0,.15); background:#fff; cursor:pointer; }
        .ep-btn.primary { background:#4EA7FF; color:#fff; border-color:rgba(0,0,0,.2); }
      </style>
      <div id="ep-head"><div>Preview</div><button id="ep-close" class="ep-btn" aria-label="Close">✕</button></div>
      <div id="ep-body">
        <div id="ep-card"></div>
        <div class="ep-small">This preview is exactly what will be printed or emailed.</div>
      </div>
      <div id="ep-actions">
        <button id="ep-send" class="ep-btn primary">Send Email</button>
        <button id="ep-print" class="ep-btn">Print</button>
      </div>`;
    document.body.appendChild(dlg);
  }

  function showPreview(){ ensureModal(); document.getElementById('ep-card').innerHTML = buildPreviewHTML(); const dlg = document.getElementById('ep-modal'); if (!dlg.open) dlg.showModal(); }
  function closePreview(){ const dlg = document.getElementById('ep-modal'); if (dlg && dlg.open) dlg.close(); }

  function printPreview(){
    const html = buildPreviewHTML();
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
    if(!w){ alert('Please allow pop-ups to print.'); return; }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { margin:0; padding:20px; font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#fff; color:#000; }
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
        window.onload = function(){ setTimeout(function(){ window.print(); setTimeout(safeClose,2000); }, 50); };
      <\/script>
    </body></html>`);
    w.document.close();
  }

  async function sendEmail(){
    const html = buildPreviewHTML();
    const api = window.env && window.env.EMAIL_API_URL;
    const to = (window.env && window.env.DEFAULT_TO) || '';
    const subject = getName() || 'Job Update';
    if (api) {
      try {
        const r = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to, subject, html }) });
        if (!r.ok) throw new Error('Email API error');
        alert('Email sent.');
        return;
      } catch(e){ console.error(e); alert('Email API failed, falling back to mailto…'); }
    }
    const temp = document.createElement('div'); temp.innerHTML = html;
    const bullets = Array.from(temp.querySelectorAll('li')).map(li=>'• '+li.textContent.trim());
    const header = (()=>{
      const name = getName(); const address = getAddress(); const stage = getStage(); const crew = getCrew();
      return name + (address ? '\n'+address : '') + '\nCurrent stage: ' + (stage||'') + '\nCrew: ' + (crew||'');
    })();
    const body = encodeURIComponent(header + '\n\n' + (bullets.length? bullets.join('\n') : '(no notes selected)'));
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  function addSiblingButton(del){
    const btn = document.createElement('button');
    btn.id = 'emailPrint';
    btn.textContent = 'Email/Print';
    btn.className = del.className || '';
    btn.style.marginLeft = '8px';
    btn.style.background = '#4EA7FF';
    btn.style.color = '#fff';
    btn.style.border = '1px solid rgba(0,0,0,.2)';
    btn.style.borderRadius = '8px';
    btn.style.padding = '8px 12px';
    btn.style.fontWeight = '600';
    del.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', showPreview);
  }

  function addFloatingFallback(){
    if (cached.fallbackShown) return;
    cached.fallbackShown = true;
    const btn = document.createElement('button');
    btn.id = 'emailPrintFloating';
    btn.textContent = 'Email/Print';
    Object.assign(btn.style, {
      position:'fixed', right:'16px', bottom:'16px', zIndex:'2147483647',
      background:'#4EA7FF', color:'#fff', border:'1px solid rgba(0,0,0,.2)',
      borderRadius:'999px', padding:'10px 14px', fontWeight:'700',
      boxShadow:'0 4px 14px rgba(0,0,0,.2)', cursor:'pointer'
    });
    document.body.appendChild(btn);
    btn.addEventListener('click', showPreview);
  }

  function mount(){
    if (cached.mounted) return;
    initScopes();
    const del = cached.delBtn;
    if (del && !del.dataset.emailPrintInjected) {
      addSiblingButton(del);
      del.dataset.emailPrintInjected = '1';
      cached.mounted = true;
    }
  }

  // Global handlers so modal buttons always work
  document.addEventListener('click', function(e){
    const id = e && e.target && e.target.id;
    if (id === 'ep-close') return closePreview();
    if (id === 'ep-print') return printPreview();
    if (id === 'ep-send') return sendEmail();
  });

  // Manual trigger
  window.EmailPrint = window.EmailPrint || { openPreview: () => showPreview() };

  const observer = new MutationObserver(() => { if (!cached.mounted) mount(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setTimeout(() => { if (!cached.mounted) addFloatingFallback(); }, CFG.fallbackDelayMs);

  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', mount);

})();
