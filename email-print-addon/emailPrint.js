/* Email/Print Add-on v5 (Build 1759577514)
 * Focused selectors to avoid duplicate/irrelevant content.
 * - DOES NOT modify the Delete button (adds new Email/Print button after it)
 * - Header fields are read ONLY from a nearby header container
 * - Selected notes are read ONLY from the logs container around the Delete button
 */
(function(){"use strict";
  const CFG = Object.assign({
    deleteButtonSelectorList: ['#deleteSelected','[data-action="delete-selection"]','.delete-selection','.btn-delete-selection'],
    // Header scoping: look upward from name node or use these known containers
    headerScopes: ['.job-header', '.detail-header', '.job-summary', '.job-card', 'main', '#app'],
    // Within header scope, try these selectors for name & address
    nameSelectors: ['.job-name', '.job-title', 'h1', 'h2'],
    addressSelectors: ['.job-address', 'a[href*="maps"]', '.address', 'p'],
    // Chips inside header scope
    stageLabel: 'Stage',
    crewLabel: 'Crew'
  }, window.EMAIL_PRINT_CONFIG || {});

  let cached = { delBtn: null, logsScope: null, headerScope: null };

  /* ---------- utilities ---------- */
  function elText(el) { return (el && (el.value!=null ? el.value : el.textContent) || '').trim(); }
  function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
  function looksLikeDate(s){ return /^\d{4}-\d{2}-\d{2}$/.test(String(s||'').trim()); }
  function isTrivial(line){ return !line || /select\s*all/i.test(line) || looksLikeDate(line); }

  function toBulletedHTML(text){
    const lines = String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const cleaned = lines.filter(l => !isTrivial(l));
    const items = cleaned.map(l => l.replace(/^(-|\*|•)\s+/, '').trim()).filter(Boolean);
    if (!items.length) return '<p><em>(empty)</em></p>';
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
    if (del){ cached.logsScope = del.closest('.log, .logs, .log-list, .log-panel, .notes, .list-group, .card, section, .container') || del.parentElement; }
    for (const sel of CFG.headerScopes){ const h = document.querySelector(sel); if (h) { cached.headerScope = h; break; } }
    if (!cached.headerScope) cached.headerScope = document.body;
  }

  /* ---------- header extraction (scoped) ---------- */
  function getName(){
    const scope = cached.headerScope || document;
    for (const sel of CFG.nameSelectors) { const el = scope.querySelector(sel); if (el && elText(el)) return elText(el); }
    return '(No Name)';
  }
  function getAddress(){
    const scope = cached.headerScope || document;
    for (const sel of CFG.addressSelectors) { const el = scope.querySelector(sel); if (el && elText(el)) return elText(el); }
    return '';
  }
  function getChipValue(label){
    const scope = cached.headerScope || document;
    const nodes = Array.from(scope.querySelectorAll('*'));
    for (const el of nodes.slice(0, 300)){ 
      const t = elText(el);
      if (!t) continue;
      const m = t.match(new RegExp('^\s*'+label+'\s*:\s*(.+)$','i'));
      if (m) return m[1].trim();
    }
    return '';
  }

  /* ---------- notes extraction (scoped to logs container) ---------- */
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
      const candidates = entry.querySelectorAll('.note-text, .log-text, .content, .note-body, textarea, p');
      for (const cel of candidates){ if (elText(cel)) { text = elText(cel); break; } }
      if (!text) text = elText(entry);
      text = text.replace(/\s+/g,' ').trim();
      if (!isTrivial(text)) texts.push(text);
    }
    const seen = new Set(); const out = [];
    for (const t of texts){ if (t.length>=3 && !seen.has(t)) { seen.add(t); out.push(t); } }
    return out;
  }

  /* ---------- preview ---------- */
  function buildPreviewHTML(){
    const name = getName();
    const address = getAddress();
    const stage = getChipValue(CFG.stageLabel);
    const crew = getChipValue(CFG.crewLabel);

    const lists = gatherSelectedNotes().map(toBulletedHTML).join('\n');
    const meta = [];
    if (address) meta.push(`<div>${escapeHtml(address)}</div>`);
    meta.push(`<div><strong>Current stage:</strong> ${escapeHtml(stage)}</div>`);
    meta.push(`<div><strong>Crew:</strong> ${escapeHtml(crew)}</div>`);

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
    const address = getAddress(); const stage = getChipValue('Stage'); const crew = getChipValue('Crew');
    const header = (getName() || '(No Name)') + (address ? '\n'+address : '') + '\nCurrent stage: ' + (stage||'') + '\nCrew: ' + (crew||'');
    const body = encodeURIComponent(header + '\n\n' + (bullets.length? bullets.join('\n') : '(no notes selected)'));
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  function insertButtonNextToDelete(){
    initScopes();
    const del = cached.delBtn;
    if (!del || del.dataset.emailPrintInjected) return;
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
    del.dataset.emailPrintInjected = '1';
    btn.addEventListener('click', showPreview);
    document.addEventListener('click', function(e){
      if (e.target && e.target.id === 'ep-close') closePreview();
      if (e.target && e.target.id === 'ep-print') printPreview();
      if (e.target && e.target.id === 'ep-send') sendEmail();
    });
  }

  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(insertButtonNextToDelete);
})();
