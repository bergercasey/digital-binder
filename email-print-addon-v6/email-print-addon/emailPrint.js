
/* Email/Print Add-on v6
 * New approach: use a tiny app hook (BinderEmailPrint) so preview/print/email get exact data.
 * Shows a floating Email/Print button ONLY when a job page is open.
 * Close is robust; Print uses hidden iframe (no blank tab).
 */
(function () {
  "use strict";

  // --------- config (fallbacks only; hook is preferred) ---------
  const CFG = Object.assign({
    jobContextSelectors: ['.detail-header', '.job-header', '[data-job-id]'],
    fixedNameSelector: '',
    fixedAddressSelector: '',
    fixedStageSelector: '',
    fixedCrewSelector: '',
    notesTextSelectors: ['.content','textarea','pre','p','.note-text','.log-text'],
    noteCheckboxSelector: '.log-entry input[type="checkbox"]:checked',
    showDelayMs: 300
  }, window.EMAIL_PRINT_CONFIG || {});

  // --------- helpers ---------
  const T = el => (el && (el.value!=null ? el.value : el.textContent) || '').trim();
  const q = sel => { try { return sel ? document.querySelector(sel) : null; } catch { return null; } };
  const escapeHtml = s => String(s||'')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#39;");

  function bullets(items) {
    const lines = [];
    for (const t of (items||[])) {
      String(t).split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
        .forEach(p => lines.push(p.replace(/^(-|\*|•)\s+/, '').trim()));
    }
    if (!lines.length) return '<p><em>(no notes selected)</em></p>';
    return '<ul>' + lines.map(li => '<li>'+escapeHtml(li)+'</li>').join('') + '</ul>';
  }

  function buildHTML(ctx) {
    return (
      '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">' +
        '<h2 style="margin:0 0 8px 0;font-weight:800;font-size:20px;">' + escapeHtml(ctx.name||'(No Name)') + '</h2>' +
        (ctx.address ? '<div>' + escapeHtml(ctx.address) + '</div>' : '') +
        '<div><strong>Current stage:</strong> ' + escapeHtml(ctx.stage||'') + '</div>' +
        '<div><strong>Crew:</strong> ' + escapeHtml(ctx.crew||'') + '</div>' +
        '<div style="margin-top:12px">' + bullets(ctx.notes) + '</div>' +
      '</div>'
    );
  }

  // --------- preferred: app-provided context ---------
  function callAppContext() {
    try {
      if (window.BinderEmailPrint && typeof window.BinderEmailPrint.getContext === 'function') {
        const d = window.BinderEmailPrint.getContext();
        if (d && typeof d === 'object' && Array.isArray(d.notes)) {
          return {
            name: (d.name||'').trim(),
            address: (d.address||'').trim(),
            stage: (d.stage||'').trim(),
            crew: (d.crew||'').trim(),
            notes: d.notes.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim())
          };
        }
      }
    } catch(e) { console.warn('[Email/Print] app context error', e); }
    return null;
  }

  // --------- minimal fallback (used only if no hook) ---------
  function pickLabelValue(label) {
    const nodes = Array.from(document.querySelectorAll('.detail-header *, .job-header *'));
    for (const el of nodes.slice(0,300)) {
      const t = T(el); if (!t) continue;
      const m = t.match(new RegExp('^\\s*'+label+'\\s*:\\s*(.+)$','i'));
      if (m) return m[1].trim();
    }
    return '';
  }
  function gatherCheckedNotes() {
    const cbs = Array.from(document.querySelectorAll(CFG.noteCheckboxSelector));
    const out = [];
    for (const cb of cbs) {
      const lbl = (cb.closest('label') ? T(cb.closest('label')) : '');
      if (/select\s*all/i.test(lbl) || /select\s*all/i.test(cb.id||'')) continue;
      const row = cb.closest('.log-entry, .list-group-item, .note-entry, .row, .card') || cb.parentElement;
      if (!row) continue;
      let text = '';
      for (const sel of CFG.notesTextSelectors) { const el=row.querySelector(sel); if (el && T(el)) { text=T(el); break; } }
      if (!text) text=T(row);
      text = text.replace(/\s+/g,' ').trim();
      if (!text) continue;
      if (/^stage\s*:/i.test(text) || /^crew\s*:/i.test(text)) continue;
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) continue;
      out.push(text);
    }
    const seen=new Set(); const uniq=[]; for(const t of out) if(!seen.has(t)) { seen.add(t); uniq.push(t); } return uniq;
  }
  function fallbackContext() {
    const name = T(q(CFG.fixedNameSelector)) || T(q('.detail-header h1')) || T(q('.job-header h1'));
    const address = T(q(CFG.fixedAddressSelector)) || T(q('.detail-header a[href*="maps"]')) || T(q('.job-header .address'));
    const stage = T(q(CFG.fixedStageSelector)) || pickLabelValue('Stage');
    const crew = T(q(CFG.fixedCrewSelector)) || pickLabelValue('Crew');
    const notes = gatherCheckedNotes();
    return { name, address, stage, crew, notes };
  }

  // --------- job page detection ---------
  function isOnJobPage() {
    if (window.BinderEmailPrint && typeof window.BinderEmailPrint.isJobPage === 'function') {
      try { return !!window.BinderEmailPrint.isJobPage(); } catch { return false; }
    }
    for (const sel of CFG.jobContextSelectors) { try { if (document.querySelector(sel)) return true; } catch {} }
    return false;
  }

  // --------- modal & actions ---------
  function closePreview() {
    const el = document.getElementById('ep-overlay'); if (el) el.remove();
  }
  function openPreview() {
    if (!isOnJobPage()) return;
    const ctx = callAppContext() || fallbackContext();
    closePreview();
    const overlay = document.createElement('div');
    overlay.id = 'ep-overlay';
    overlay.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483646;"></div>' +
      '<div role="dialog" aria-modal="true" style="position:fixed;z-index:2147483647;left:50%;top:50%;transform:translate(-50%,-50%);max-width:880px;width:96vw;background:#fff;border:1px solid #cfd8dc;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);">' +
        '<div style="padding:12px 14px;border-bottom:1px solid #e0e6ea;display:flex;justify-content:space-between;align-items:center;">' +
          '<div>Preview</div>' +
          '<button id="ep-close" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">✕</button>' +
        '</div>' +
        '<div style="padding:14px;">' +
          buildHTML(ctx) +
          '<div style="font-size:12px;opacity:.7;margin-top:8px;">This preview is exactly what will be printed or emailed.</div>' +
        '</div>' +
        '<div style="padding:10px 14px;border-top:1px solid #e0e6ea;display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="ep-send"  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#4EA7FF;color:#fff;cursor:pointer">Send Email</button>' +
          '<button id="ep-print" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">Print</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  }
  function printPreview() {
    const ctx = callAppContext() || fallbackContext();
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Print</title>' +
      '<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
      'body{margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#000}' +
      '.ep-notes ul{margin:0;padding-left:20px}.ep-notes li{margin:6px 0}</style>' +
      '</head><body>' + buildHTML(ctx) + '</body></html>';
    const iframe=document.createElement('iframe'); Object.assign(iframe.style,{position:'fixed', right:'-9999px', bottom:'-9999px'});
    document.body.appendChild(iframe);
    const doc=iframe.contentDocument||iframe.contentWindow.document; doc.open(); doc.write(html); doc.close();
    iframe.onload=()=>setTimeout(()=>{ iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(()=>iframe.remove(),400); },50);
  }
  async function sendEmail() {
    const ctx = callAppContext() || fallbackContext();
    const html = buildHTML(ctx);
    const text = html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    const body = encodeURIComponent(text);
    const subject = encodeURIComponent(ctx.name || 'Job Update');
    location.href = 'mailto:?subject='+subject+'&body='+body;
  }

  // --------- floating button only on job pages ---------
  let btn = null, lastHref = location.href;
  function ensureButton() {
    const shouldShow = isOnJobPage();
    if (shouldShow && !btn) {
      btn = document.createElement('button');
      btn.id = 'emailPrintFloating';
      btn.textContent = 'Email/Print';
      Object.assign(btn.style, {
        position:'fixed', right:'16px', bottom:'16px', zIndex:'2147483647',
        background:'#4EA7FF', color:'#fff', border:'1px solid rgba(0,0,0,.2)',
        borderRadius:'999px', padding:'10px 14px', fontWeight:'700',
        boxShadow:'0 4px 14px rgba(0,0,0,.2)', cursor:'pointer'
      });
      btn.addEventListener('click', openPreview);
      document.body.appendChild(btn);
    } else if (!shouldShow && btn) {
      btn.remove(); btn = null;
    }
  }

  // global handlers
  document.addEventListener('click', (e) => {
    const id = e?.target?.id;
    if (id === 'ep-close') return closePreview();
    if (id === 'ep-print') return printPreview();
    if (id === 'ep-send')  return sendEmail();
    if (e.target && e.target.parentElement && e.target.parentElement.id === 'ep-overlay') closePreview();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePreview(); });

  // expose manual trigger (optional)
  window.BinderEmailPrint = window.BinderEmailPrint || {};
  if (!window.BinderEmailPrint.openPreview) window.BinderEmailPrint.openPreview = openPreview;

  // SPA awareness
  const mo = new MutationObserver(() => ensureButton());
  mo.observe(document.documentElement, { childList:true, subtree:true });
  setInterval(() => { if (lastHref !== location.href) { lastHref = location.href; ensureButton(); } }, 400);

  // init
  setTimeout(ensureButton, CFG.showDelayMs);
})();
