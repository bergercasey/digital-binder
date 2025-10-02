/* Email/Print Add-on v4 (Build 1759418102)
 * - DOES NOT modify your Delete button
 * - Inserts a distinct, lighter-blue "Email/Print" button right after Delete Selection
 * - Light preview (white card, dark text), identical for print/email
 * - More robust field/notes detection for Binder-style UI
 */
(function(){"use strict";
  const CFG = Object.assign({
    deleteButtonSelectorList: [
      '#deleteSelected',
      '[data-action="delete-selection"]',
      '.delete-selection',
      '.btn-delete-selection'
    ],
    // Very broad: include typical places a checked note checkbox might live
    selectedNoteCheckboxSelector: [
      // common patterns in Binder logs
      '.log input[type="checkbox"]:checked',
      '.logs input[type="checkbox"]:checked',
      '.log-entry input[type="checkbox"]:checked',
      '.note-entry input[type="checkbox"]:checked',
      // fallback: any checked checkbox on the page (we will filter later)
      'input[type="checkbox"]:checked'
    ].join(','),
    // Where note text might be inside a selected entry
    noteTextSelectorWithinEntry: '.note-text, .log-text, .content, .note-body, .form-control, textarea, p, li',
    fields: {
      // Try common Binder targets and generic fallbacks
      // Name
      nameList: [
        '[data-field="name"]',
        '.job-name',
        '.job-title',
        '.job-header h1',
        '.job-header h2',
        '.detail-header h1',
        'main h1',
        'main h2',
        'h1.job, h2.job',
        'h1, h2'
      ],
      // Address
      addressList: [
        '[data-field="address"]',
        '.job-address',
        '.address',
        '.detail-header .subline',
        '.job-header + *', // sibling under header
        'p'
      ]
    }
  }, window.EMAIL_PRINT_CONFIG || {});

  /* ---------- helpers ---------- */
  function findDeleteButton(){
    for (const sel of CFG.deleteButtonSelectorList) {
      try { const el = document.querySelector(sel); if (el) return el; } catch(_e){}
    }
    // Text fallbacks (non-destructive)
    const labels = ['delete selection','delete selected','delete note','delete notes'];
    const btns = Array.from(document.querySelectorAll('button, .btn, [role="button"]'));
    return btns.find(b => labels.includes((b.textContent||'').trim().toLowerCase())) || null;
  }

  function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

  function toBulletedHTML(text){
    const lines = String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    // Treat lines starting with -, *, or • as bullets; others become individual bullets too (for readability)
    const items = lines.map(l => l.replace(/^(-|\*|•)\s+/, '').trim()).filter(Boolean);
    if (!items.length) return '<p><em>(empty)</em></p>';
    return '<ul>' + items.map(t => `<li>${escapeHtml(t)}</li>`).join('') + '</ul>';
  }

  // Try "label:" style chips like "Stage: Rough-In", "Crew: Dylan"
  function getChipValue(label){
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all){
      const t = (el.textContent||'').trim();
      if (!t) continue;
      const idx = t.toLowerCase().indexOf(label.toLowerCase()+':');
      if (idx === 0 || idx > -1) {
        // Prefer exact "Label: Value" forms
        const parts = t.split(':').map(s=>s.trim());
        if (parts.length >= 2 && parts[0].toLowerCase() === label.toLowerCase()) {
          return parts.slice(1).join(':').trim();
        }
      }
    }
    return '';
  }

  function firstTextFrom(selectors){
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) { return (el.value != null ? el.value : el.textContent || '').trim(); }
      } catch(_e){}
    }
    return '';
  }

  function looksLikeAddress(s){
    // Simple heuristic for addresses
    return /\d+\s+\S+\s+(St|Street|Ave|Avenue|Blvd|Road|Rd|Dr|Drive|Ct|Court|Ln|Lane|Way)\b/i.test(s);
  }

  function findAddress(){ // try explicit lists first
    const explicit = firstTextFrom(CFG.fields.addressList);
    if (explicit && explicit.length > 0) return explicit;
    // otherwise, scan elements near the header for an address-looking string
    const candidates = Array.from(document.querySelectorAll('h1, h2, .job-header, .detail-header, .header'))
      .slice(0,4) // nearby blocks
      .flatMap(h => Array.from(h.parentElement ? h.parentElement.querySelectorAll('*') : []));
    for (const el of candidates){
      const t = (el.textContent||'').trim();
      if (t && looksLikeAddress(t)) return t;
    }
    // global search fallback
    const all = Array.from(document.querySelectorAll('p, div, span'));
    for (const el of all){
      const t = (el.textContent||'').trim();
      if (t && looksLikeAddress(t)) return t;
    }
    return '';
  }

  function getName(){
    const name = firstTextFrom(CFG.fields.nameList);
    if (name) return name;
    // fallback: top-most visible heading
    const hd = document.querySelector('h1, h2, [role="heading"]');
    return (hd && (hd.textContent||'').trim()) || '';
  }

  function gatherSelectedNoteTexts(){
    const cbs = Array.from(document.querySelectorAll(CFG.selectedNoteCheckboxSelector));
    const texts = [];
    for (const cb of cbs){
      // skip obvious "select all"
      if (cb.dataset && /all|selectall/i.test(cb.dataset.role||'')) continue;
      let container = cb.closest('.log-entry, .note-entry, li, .list-group-item, .row, .item, .card') || cb.parentElement;
      if (!container) continue;
      // Prefer explicit note text nodes
      let textEl = container.querySelector(CFG.noteTextSelectorWithinEntry);
      let text = textEl ? (textEl.value != null ? textEl.value : textEl.textContent) : '';
      // If empty, take container text minus any label/checkbox clutter
      if (!text || !text.trim()) text = container.textContent || '';
      text = (text||'').replace(/\s+/g,' ').trim();
      if (text) texts.push(text);
    }
    // De-dup and filter super-short noise
    const uniq = Array.from(new Set(texts)).filter(t => t.length > 2);
    return uniq;
  }

  /* ---------- preview ---------- */
  function buildPreviewHTML(){
    const name = getName() || '(No Name)';
    const address = findAddress();
    const stage = getChipValue('Stage') || getChipValue('Current stage') || '';
    const crew = getChipValue('Crew') || '';

    const lists = gatherSelectedNoteTexts().map(toBulletedHTML).join('\n');
    const head = `
      <h2 style="margin:0 0 8px 0;font-weight:800;font-size:20px;">${escapeHtml(name)}</h2>
      <div class="ep-meta" style="margin-bottom:12px;line-height:1.35;font-size:14px;">
        ${address ? `<div>${escapeHtml(address)}</div>` : ''}
        <div><strong>Current stage:</strong> ${escapeHtml(stage)}</div>
        <div><strong>Crew:</strong> ${escapeHtml(crew)}</div>
      </div>`;
    return `<div class="ep-card" style="background:#fff;color:#000;border-radius:10px;padding:16px;">
      ${head}
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
    const name = getName() || '(No Name)';
    const address = findAddress() || '';
    const stage = getChipValue('Stage') || '';
    const crew = getChipValue('Crew') || '';
    const header = `${name}\n${address ? address + '\n' : ''}Current stage: ${stage}\nCrew: ${crew}`;
    const body = encodeURIComponent(header + '\n\n' + (bullets.length ? bullets.join('\n') : '(no notes selected)'));
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  function insertButtonNextToDelete(){
    const del = findDeleteButton();
    if (!del || del.dataset.emailPrintInjected) return;
    // New, distinct button (lighter blue)
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
