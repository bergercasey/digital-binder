/* Email/Print Add-on v5.4 (Build 1759579852)
 * - Close is reliable (ESC, ✕, and after re-open). Modal is rebuilt each time.
 * - Print via hidden iframe (no blank tab), auto-removes.
 * - Optional fixed selectors for Name/Address/Stage/Crew for exact pulls.
 * - Floating fallback button if anchor isn't found quickly.
 * - Does NOT modify your Delete button.
 */
(function(){ "use strict";
  const CFG = Object.assign({
    deleteButtonSelectorList: ['#deleteSelected','[data-action="delete-selection"]','.delete-selection','.btn-delete-selection'],
    headerScopes: ['.detail-header','.job-header','main','#app'],
    nameSelectors: ['.job-name','.job-title','h1','h2'],
    addressSelectors: ['.job-address','a[href*="maps"]','.address','p'],
    stageLabel: 'Stage',
    crewLabel: 'Crew',
    fixedNameSelector: '',
    fixedAddressSelector: '',
    fixedStageSelector: '',
    fixedCrewSelector: '',
    notesTextSelectors: ['.note-text','.note-body','.log-text','.log-body','textarea','pre','.content','.card-text','.body','p'],
    fallbackDelayMs: 3000
  }, window.EMAIL_PRINT_CONFIG || {});

  let mounted = false, anchorBtn = null, logsScope = null, headerScope = null;

  const T = el => (el && (el.value!=null ? el.value : el.textContent) || '').trim();
  const esc = s => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const looksDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s||'').trim());
  const trivial = s => !s || /select\s*all/i.test(s) || looksDate(s);

  function findDelete() {
    for (const sel of CFG.deleteButtonSelectorList) {
      try { const el = document.querySelector(sel); if (el) return el; } catch {}
    }
    const labels = ['delete selection','delete selected','delete note','delete notes'];
    return Array.from(document.querySelectorAll('button,.btn,[role="button"]'))
      .find(b => labels.includes(T(b).toLowerCase())) || null;
  }

  function initScopes() {
    anchorBtn = findDelete();
    if (anchorBtn) {
      logsScope = anchorBtn.closest('.log,.logs,.log-list,.log-panel,.notes,.list-group,.card,section,.container') || anchorBtn.parentElement;
    }
    if (CFG.fixedNameSelector || CFG.fixedAddressSelector || CFG.fixedStageSelector || CFG.fixedCrewSelector) {
      headerScope = document;
    } else {
      for (const sel of CFG.headerScopes) { const h = document.querySelector(sel); if (h) { headerScope = h; break; } }
      if (!headerScope) headerScope = document.body;
    }
  }

  function getFixedOr(sel, fallback) {
    if (!sel) return fallback();
    const el = document.querySelector(sel);
    const txt = T(el);
    return txt ? txt.replace(/^\s*\w[\w\s]*:\s*/,'').trim() : fallback();
  }
  const getName    = () => getFixedOr(CFG.fixedNameSelector, () => {
    for (const sel of CFG.nameSelectors) { const el = (headerScope||document).querySelector(sel); if (el && T(el)) return T(el); }
    return '(No Name)';
  });
  const getAddress = () => getFixedOr(CFG.fixedAddressSelector, () => {
    for (const sel of CFG.addressSelectors){ const el = (headerScope||document).querySelector(sel); if (el && T(el)) return T(el); }
    return '';
  });
  const getChip = (label) => {
    const nodes = Array.from((headerScope||document).querySelectorAll('*')).slice(0,300);
    for (const el of nodes) {
      const txt = T(el); if (!txt) continue;
      const m = txt.match(new RegExp('^\s*'+label+'\s*:\s*(.+)$','i'));
      if (m) return m[1].trim();
    }
    return '';
  };
  const getStage  = () => getFixedOr(CFG.fixedStageSelector, () => getChip(CFG.stageLabel));
  const getCrew   = () => getFixedOr(CFG.fixedCrewSelector,  () => getChip(CFG.crewLabel));

  function getSelectedNotes() {
    const scope = logsScope || document;
    const cbs = Array.from(scope.querySelectorAll('input[type="checkbox"]:checked'));
    const out = [];
    for (const cb of cbs) {
      const labelText = T(cb.closest('label'));
      if (/all|select\s*all/i.test(labelText) || /all|select\s*all/i.test(cb.id||'')) continue;
      const entry = cb.closest('.log-entry,.note-entry,li,.list-group-item,.row,.item,.card,.entry') || cb.parentElement;
      if (!entry) continue;

      let txt = '';
      for (const sel of CFG.notesTextSelectors) { const el = entry.querySelector(sel); if (el && T(el)) { txt = T(el); break; } }
      if (!txt) txt = T(entry);
      txt = txt.replace(/\s+/g,' ').trim();
      if (!trivial(txt) && !/^crew\s*:/i.test(txt) && !/^stage\s*:/i.test(txt)) out.push(txt);
    }
    const seen = new Set(); const uniq = [];
    for (const t of out) if (t.length>=3 && !seen.has(t)) { seen.add(t); uniq.push(t); }
    return uniq;
  }

  function bulletsFrom(text) {
    const lines = String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const cleaned = lines.filter(l => !trivial(l));
    const items = cleaned.map(l => l.replace(/^(-|\*|•)\s+/, '').trim()).filter(Boolean);
    if (!items.length) return '';
    const seen = new Set(); const uniq = items.filter(t => (seen.has(t) ? false : (seen.add(t), true)));
    return '<ul>'+uniq.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>';
  }

  function openPreview() {
    closePreview();
    const dlg = document.createElement('div');
    dlg.id = 'ep-overlay';
    dlg.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483646;"></div>
      <div role="dialog" aria-modal="true" style="position:fixed;z-index:2147483647;left:50%;top:50%;transform:translate(-50%,-50%);max-width:880px;width:96vw;background:#fff;border:1px solid #cfd8dc;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);">
        <div style="padding:12px 14px;border-bottom:1px solid #e0e6ea;display:flex;justify-content:space-between;align-items:center;">
          <div>Preview</div>
          <button id="ep-close" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">✕</button>
        </div>
        <div style="padding:14px;">
          <div class="ep-card" style="background:#fff;color:#000;border-radius:10px;padding:16px;">
            <h2 style="margin:0 0 8px 0;font-weight:800;font-size:20px;">${esc(getName())}</h2>
            <div style="margin-bottom:12px;line-height:1.35;font-size:14px;">
              ${(getAddress()? `<div>${esc(getAddress())}</div>`:'')}
              <div><strong>Current stage:</strong> ${esc(getStage())}</div>
              <div><strong>Crew:</strong> ${esc(getCrew())}</div>
            </div>
            <div class="ep-notes">
              ${ (getSelectedNotes().map(bulletsFrom).filter(Boolean).join('')) || '<p><em>(no notes selected)</em></p>' }
            </div>
          </div>
          <div style="font-size:12px;opacity:.7;margin-top:8px;">This preview is exactly what will be printed or emailed.</div>
        </div>
        <div style="padding:10px 14px;border-top:1px solid #e0e6ea;display:flex;gap:10px;justify-content:flex-end;">
          <button id="ep-send"  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#4EA7FF;color:#fff;cursor:pointer">Send Email</button>
          <button id="ep-print" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">Print</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);
  }

  function closePreview() {
    const exist = document.getElementById('ep-overlay');
    if (exist) exist.remove();
  }

  function printPreview() {
    const blocks = (getSelectedNotes().map(bulletsFrom).filter(Boolean).join('')) || '<p><em>(no notes selected)</em></p>';
    const htmlInner = `
      <div class="ep-card" style="background:#fff;color:#000;border-radius:10px;padding:16px;font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <h2 style="margin:0 0 8px 0;font-weight:800;font-size:20px;">${esc(getName())}</h2>
        <div style="margin-bottom:12px;line-height:1.35;font-size:14px;">
          ${(getAddress()? `<div>${esc(getAddress())}</div>`:'')}
          <div><strong>Current stage:</strong> ${esc(getStage())}</div>
          <div><strong>Crew:</strong> ${esc(getCrew())}</div>
        </div>
        <div class="ep-notes">${blocks}</div>
      </div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print</title>
      <style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}body{margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#000}.ep-notes ul{margin:0;padding-left:20px}.ep-notes li{margin:6px 0}</style>
    </head><body>${htmlInner}</body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.position='fixed'; iframe.style.right='-9999px'; iframe.style.bottom='-9999px';
    document.body.appendChild(iframe);
    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open(); iDoc.write(html); iDoc.close();
    iframe.onload = () => { setTimeout(()=>{ iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(()=> iframe.remove(), 500); }, 50); };
  }

  async function sendEmail() {
    const blocks = getSelectedNotes().map(bulletsFrom).filter(Boolean).join('');
    const name = getName(), address = getAddress(), stage = getStage(), crew = getCrew();
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
        <h2>${esc(name)}</h2>
        ${address? `<div>${esc(address)}</div>`:''}
        <div><strong>Current stage:</strong> ${esc(stage)}</div>
        <div><strong>Crew:</strong> ${esc(crew)}</div>
        <div style="margin-top:12px">${blocks || '<p><em>(no notes selected)</em></p>'}</div>
      </div>`;
    const api = window.env && window.env.EMAIL_API_URL;
    const to = (window.env && window.env.DEFAULT_TO) || '';
    const subject = name || 'Job Update';
    if (api) {
      try {
        const r = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to, subject, html }) });
        if (!r.ok) throw new Error('Email API error');
        alert('Email sent.');
        return;
      } catch (e) { console.error(e); alert('Email API failed, falling back to mailto…'); }
    }
    const listText = blocks.replace(/<[^>]+>/g,'').split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
    const header = name + (address? `\n${address}`:'') + `\nCurrent stage: ${stage}\nCrew: ${crew}`;
    const body = encodeURIComponent(header + '\n\n' + (listText||'(no notes selected)'));
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  function mount() {
    if (mounted) return;
    initScopes();
    if (anchorBtn && !anchorBtn.dataset.emailPrintInjected) {
      const b = document.createElement('button');
      b.id='emailPrint'; b.textContent='Email/Print';
      b.className = anchorBtn.className || '';
      Object.assign(b.style,{ marginLeft:'8px', background:'#4EA7FF', color:'#fff', border:'1px solid rgba(0,0,0,.2)', borderRadius:'8px', padding:'8px 12px', fontWeight:'600' });
      anchorBtn.insertAdjacentElement('afterend', b);
      anchorBtn.dataset.emailPrintInjected = '1';
      b.addEventListener('click', openPreview);
      mounted = true;
    }
  }

  function floatingFallback() {
    if (document.getElementById('emailPrintFloating')) return;
    const btn = document.createElement('button');
    btn.id='emailPrintFloating'; btn.textContent='Email/Print';
    Object.assign(btn.style,{ position:'fixed', right:'16px', bottom:'16px', zIndex:'2147483647', background:'#4EA7FF', color:'#fff', border:'1px solid rgba(0,0,0,.2)', borderRadius:'999px', padding:'10px 14px', fontWeight:'700', boxShadow:'0 4px 14px rgba(0,0,0,.2)', cursor:'pointer' });
    document.body.appendChild(btn);
    btn.addEventListener('click', openPreview);
  }

  document.addEventListener('click', (e) => {
    const id = e && e.target && e.target.id;
    if (id === 'ep-close') return closePreview();
    if (id === 'ep-print') return printPreview();
    if (id === 'ep-send')  return sendEmail();
    if (e.target && e.target.parentElement && e.target.parentElement.id === 'ep-overlay') closePreview();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePreview(); });

  window.EmailPrint = window.EmailPrint || { openPreview };

  const mo = new MutationObserver(()=> { if (!mounted) mount(); });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  setTimeout(()=> { if (!mounted) floatingFallback(); }, CFG.fallbackDelayMs);

  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
