/* Email/Print Add-on v6.3 (Build 1759582482)
 * Tailored to Binder header: Name, Address, PO, Crew, Stage.
 * Notes preserve HTML (bullets/lists) from the selected entries.
 * Floating button shows on job pages; print via hidden iframe; robust close.
 */
(function(){"use strict";

  // --- Selectors tuned for your Binder UI ---
  const SEL = Object.assign({
    // Job header container & fields (robust fallbacks)
    header: '.detail-header, .job-header',
    name: '.detail-header h1, .job-header h1, h1',
    address: '.detail-header a[href*="maps"], .job-header a[href*="maps"]',
    chipsScope: '.detail-header, .job-header, .detail-header *',

    // Chips/labels text will be parsed like "Stage: Rough-In", "PO: HDI2504", "Crew: Dylan"
    stagePattern: /\bStage\s*:\s*(.+)/i,
    poPattern: /\bPO\s*:\s*(.+)/i,
    crewPattern: /\bCrew\s*:\s*(.+)/i,

    // Log entry + checkbox + where the note HTML usually is
    noteCheckbox: '.log-entry input[type="checkbox"]:checked, .list-group-item input[type="checkbox"]:checked',
    noteEntry: '.log-entry, .list-group-item, .note-entry, .card',
    noteHTML: '.content, .body, .card-body, .note-text, .log-text, .ql-editor, .form-control, pre, p',

    // Job page heuristic (so floating button only shows there)
    jobGate: '.detail-header h1, .job-header h1'
  }, window.EMAIL_PRINT_SELECTORS || {});

  // --- helpers ---
  const T = el => (el && (el.value!=null ? el.value : el.textContent) || '').trim();
  const H = el => (el && el.innerHTML) || '';
  const $ = (sel, root=document) => { try { return root.querySelector(sel); } catch { return null; } };
  const $$ = (sel, root=document) => { try { return Array.from(root.querySelectorAll(sel)); } catch { return []; } };
  const esc = s => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

  function readChip(pattern) {
    // scan limited nodes inside header area for a "Label: Value"
    const scope = $(SEL.header) || document;
    const nodes = $$(SEL.chipsScope, scope).slice(0, 400);
    for (const el of nodes) {
      const txt = T(el);
      if (!txt) continue;
      const m = txt.match(pattern);
      if (m) return m[1].trim();
    }
    // fallback: search entire page if not found
    const m2 = (document.body.innerText||'').match(pattern);
    return m2 ? m2[1].trim() : '';
  }

  function getHeader() {
    const name = T($(SEL.name)) || '(No Name)';
    const address = T($(SEL.address)) || '';
    const stage = readChip(SEL.stagePattern);
    const po = readChip(SEL.poPattern);
    const crew = readChip(SEL.crewPattern);
    return { name, address, stage, po, crew };
  }

  // Preserve the note HTML so bullets and list styling remain intact
  function collectSelectedNotesHTML() {
    const cbs = $$(SEL.noteCheckbox);
    const out = [];
    for (const cb of cbs) {
      const row = cb.closest(SEL.noteEntry) || cb.parentElement;
      if (!row) continue;
      // Prefer an inner content block
      let html = '';
      const picks = $$(SEL.noteHTML, row);
      for (const p of picks) { const h = H(p).trim(); if (h) { html = h; break; } }
      if (!html) html = esc(T(row));
      html = html.replace(/\s+$/,''); // tidy trailing whitespace
      // skip pure date-only rows
      if (/^\s*\d{4}-\d{2}-\d{2}\s*$/.test(html.replace(/<[^>]+>/g,''))) continue;
      out.push(`<div class="note-block">${html}</div>`);
    }
    // dedupe identical blocks
    const seen = new Set(); const uniq = [];
    for (const h of out) { if (!seen.has(h)) { seen.add(h); uniq.push(h); } }
    return uniq;
  }

  function buildPreviewHTML() {
    const hdr = getHeader();
    const notes = collectSelectedNotesHTML();
    return `
      <div class="ep-card" style="background:#fff;color:#000;border-radius:10px;padding:16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
        <h2 style="margin:0 0 6px 0;font-weight:800;font-size:20px;">${esc(hdr.name)}</h2>
        ${hdr.address ? `<div>${esc(hdr.address)}</div>` : ''}
        <div><strong>PO#:</strong> ${esc(hdr.po)}</div>
        <div><strong>Crew:</strong> ${esc(hdr.crew)}</div>
        <div><strong>Current stage:</strong> ${esc(hdr.stage)}</div>
        <div style="margin-top:12px" class="ep-notes">
          ${notes.length ? notes.join('\n') : '<p><em>(no notes selected)</em></p>'}
        </div>
      </div>`;
  }

  // --- modal ---
  function closePreview() { const el = document.getElementById('ep-overlay'); if (el) el.remove(); }
  function openPreview() {
    if (!isOnJobPage()) return;
    closePreview();
    const overlay = document.createElement('div');
    overlay.id = 'ep-overlay';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483646;"></div>
      <div role="dialog" aria-modal="true" style="position:fixed;z-index:2147483647;left:50%;top:50%;transform:translate(-50%,-50%);max-width:880px;width:96vw;background:#fff;border:1px solid #cfd8dc;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);">
        <div style="padding:12px 14px;border-bottom:1px solid #e0e6ea;display:flex;justify-content:space-between;align-items:center;">
          <div>Preview</div>
          <button id="ep-close" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">✕</button>
        </div>
        <div style="padding:14px;">${buildPreviewHTML()}</div>
        <div style="padding:10px 14px;border-top:1px solid #e0e6ea;display:flex;gap:10px;justify-content:flex-end;">
          <button id="ep-send"  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#4EA7FF;color:#fff;cursor:pointer">Send Email</button>
          <button id="ep-print" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">Print</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  // --- print ---
  function printPreview() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print</title>
      <style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      body{margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#000}
      .ep-notes ul{margin:0;padding-left:20px} .ep-notes li{margin:6px 0} .note-block{margin:8px 0}
      </style>
      </head><body>${buildPreviewHTML()}</body></html>`;
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position:'fixed', right:'-9999px', bottom:'-9999px' });
    document.body.appendChild(iframe);
    const idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open(); idoc.write(html); idoc.close();
    iframe.onload = () => setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => iframe.remove(), 400); }, 50);
  }

  // --- email --- (mailto; hook your API if desired)
  function sendEmail() {
    const temp = document.createElement('div');
    temp.innerHTML = buildPreviewHTML();
    const text = temp.innerText.replace(/\s+/g,' ').trim();
    const subject = (T($(SEL.name)) || 'Job Update').trim();
    const body = encodeURIComponent(text);
    location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + body;
  }

  // --- job detection & floating button ---
  function isOnJobPage() { return !!$(SEL.jobGate); }

  let btn = null, lastHref = location.href;
  function ensureButton() {
    const shouldShow = isOnJobPage();
    if (shouldShow && !btn) {
      btn = document.createElement('button');
      btn.id = 'emailPrintFloating';
      btn.textContent = 'Email/Print';
      Object.assign(btn.style, {
        position: 'fixed', right: '16px', bottom: '16px', zIndex: '2147483647',
        background: '#4EA7FF', color: '#fff', border: '1px solid rgba(0,0,0,.2)',
        borderRadius: '999px', padding: '10px 14px', fontWeight: '700',
        boxShadow: '0 4px 14px rgba(0,0,0,.2)', cursor: 'pointer'
      });
      btn.addEventListener('click', openPreview);
      document.body.appendChild(btn);
    } else if (!shouldShow && btn) {
      btn.remove(); btn = null;
    }
  }

  document.addEventListener('click', (e) => {
    const id = e?.target?.id;
    if (id === 'ep-close') return closePreview();
    if (id === 'ep-print') return printPreview();
    if (id === 'ep-send')  return sendEmail();
    if (e.target && e.target.parentElement && e.target.parentElement.id === 'ep-overlay') closePreview();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePreview(); });

  const mo = new MutationObserver(() => ensureButton());
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => { if (lastHref !== location.href) { lastHref = location.href; ensureButton(); } }, 400);
  setTimeout(ensureButton, 200);

})();
