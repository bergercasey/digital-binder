/* Email/Print Add-on v6.5 (Build 1759584183)
 * Job-only button: requires an address link OR notes list + "Delete Selected" present.
 * Header is parsed from the job card that contains the address link (avoids global page title).
 */
(function(){"use strict";

  const SEL = {
    addressLink: 'a[href*="maps"]',
    notesList: '#notes-list, .logs, .log',
    deleteText: /\bdelete\s*selected\b/i,
    noteCheckbox: '.log-entry input[type="checkbox"]:checked, .list-group-item input[type="checkbox"]:checked, #notes-list input[type="checkbox"]:checked',
    noteEntry: '.log-entry, .list-group-item, .note-entry, .card',
    noteHTML: '.content, .body, .card-body, .note-text, .log-text, .ql-editor, .form-control, pre, p'
  };

  const T = el => (el && (el.value!=null ? el.value : el.textContent) || '').trim();
  const H = el => (el && el.innerHTML) || '';
  const $ = (sel, root=document) => { try { return root.querySelector(sel); } catch { return null; } };
  const $$ = (sel, root=document) => { try { return Array.from(root.querySelectorAll(sel)); } catch { return []; } };
  const esc = s => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

  function findJobCard() {
    const addr = $(SEL.addressLink);
    if (!addr) return null;
    // climb until we hit a block with multi-line text (name/chips + address)
    let box = addr.closest('div, section, article, main') || addr.parentElement;
    while (box && (box.innerText||'').split('\n').filter(Boolean).length < 2) box = box.parentElement;
    return box || null;
  }

  function parseHeaderFromCard(card) {
    const text = (card?.innerText || '').replace(/\s+\n/g,'\n').trim();
    // name: text up to 'Stage:' or the first newline
    let name = '';
    const stageIdx = text.search(/\bStage\s*:/i);
    if (stageIdx > 0) name = text.slice(0, stageIdx).split('\n').pop().trim();
    if (!name) name = text.split('\n')[0].trim();

    const address = T($(SEL.addressLink, card)) || '';
    const mStage = text.match(/\bStage\s*:\s*([^\n]+)/i);
    const mPO    = text.match(/\bPO\s*:\s*([^\n]+)/i);
    const mCrew  = text.match(/\bCrew\s*:\s*([^\n]+)/i);
    return {
      name: name || '(No Name)',
      address,
      stage: (mStage && mStage[1].trim()) || '',
      po:    (mPO && mPO[1].trim())    || '',
      crew:  (mCrew && mCrew[1].trim())|| ''
    };
  }

  function getHeader() {
    const card = findJobCard();
    if (card) return parseHeaderFromCard(card);
    // fallback minimal
    return { name:'(No Name)', address:'', stage:'', po:'', crew:'' };
  }

  function collectSelectedNotesHTML() {
    const cbs = $$(SEL.noteCheckbox);
    const out = [];
    for (const cb of cbs) {
      const row = cb.closest(SEL.noteEntry) || cb.parentElement;
      if (!row) continue;
      let html='';
      const picks = $$(SEL.noteHTML, row);
      for (const p of picks) { const h=H(p).trim(); if(h){ html=h; break; } }
      if (!html) html = esc(T(row));
      const textOnly = html.replace(/<[^>]+>/g,'').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(textOnly)) continue;
      out.push('<div class="note-block">'+html+'</div>');
    }
    const seen = new Set(); const uniq=[]; for(const h of out) if(!seen.has(h)){ seen.add(h); uniq.push(h); }
    return uniq;
  }

  function buildPreviewHTML() {
    const h = getHeader();
    const notes = collectSelectedNotesHTML();
    return '<div class="ep-card" style="background:#fff;color:#000;border-radius:10px;padding:16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">'+
      '<h2 style="margin:0 0 6px 0;font-weight:800;font-size:20px;">'+esc(h.name)+'</h2>'+
      (h.address? '<div>'+esc(h.address)+'</div>':'')+
      '<div><strong>PO#:</strong> '+esc(h.po)+'</div>'+
      '<div><strong>Crew:</strong> '+esc(h.crew)+'</div>'+
      '<div><strong>Current stage:</strong> '+esc(h.stage)+'</div>'+
      '<div style="margin-top:12px" class="ep-notes">'+(notes.length? notes.join('\n') : '<p><em>(no notes selected)</em></p>')+'</div>'+
    '</div>';
  }

  function isOnJobPage() {
    // Must have address link (job card present) OR notes list + Delete Selected button
    if (document.querySelector(SEL.addressLink)) return true;
    if (document.querySelector(SEL.notesList)) {
      const btns = Array.from(document.querySelectorAll('button, .btn, [role="button"]'));
      if (btns.some(b => SEL.deleteText.test((b.textContent||'').trim()))) return true;
    }
    return false;
  }

  // Modal + actions
  function closePreview(){ const el=document.getElementById('ep-overlay'); if(el) el.remove(); }
  function openPreview(){
    if (!isOnJobPage()) return;
    closePreview();
    const overlay=document.createElement('div');
    overlay.id='ep-overlay';
    overlay.innerHTML=
      '<div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483646;"></div>'+
      '<div role="dialog" aria-modal="true" style="position:fixed;z-index:2147483647;left:50%;top:50%;transform:translate(-50%,-50%);max-width:880px;width:96vw;background:#fff;border:1px solid #cfd8dc;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);">'+
        '<div style="padding:12px 14px;border-bottom:1px solid #e0e6ea;display:flex;justify-content:space-between;align-items:center;">'+
          '<div>Preview</div>'+
          '<button id="ep-close" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">✕</button>'+
        '</div>'+
        '<div style="padding:14px;">'+buildPreviewHTML()+'</div>'+
        '<div style="padding:10px 14px;border-top:1px solid #e0e6ea;display:flex;gap:10px;justify-content:flex-end;">'+
          '<button id="ep-send"  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#4EA7FF;color:#fff;cursor:pointer">Send Email</button>'+
          '<button id="ep-print" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">Print</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(overlay);
  }

  function printPreview(){
    const docHtml='<!doctype html><html><head><meta charset="utf-8"><title>Print</title>'+
      '<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}body{margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#000}.ep-notes ul{margin:0;padding-left:20px}.ep-notes li{margin:6px 0}</style>'+
      '</head><body>'+buildPreviewHTML()+'</body></html>';
    const iframe=document.createElement('iframe'); Object.assign(iframe.style,{position:'fixed',right:'-9999px',bottom:'-9999px'});
    document.body.appendChild(iframe);
    const idoc=iframe.contentDocument||iframe.contentWindow.document; idoc.open(); idoc.write(docHtml); idoc.close();
    iframe.onload=()=>setTimeout(()=>{ idoc.defaultView.focus(); idoc.defaultView.print(); setTimeout(()=>iframe.remove(),400); },50);
  }

  function sendEmail(){
    const tmp=document.createElement('div'); tmp.innerHTML=buildPreviewHTML();
    const text=tmp.innerText.replace(/\s+/g,' ').trim();
    const subject=encodeURIComponent((findJobCard()?.innerText.split('\n')[0] || 'Job Update').trim());
    const body=encodeURIComponent(text);
    location.href='mailto:?subject='+subject+'&body='+body;
  }

  // Floating button
  let btn=null, lastHref=location.href;
  function ensureButton(){
    const shouldShow = isOnJobPage();
    if (shouldShow && !btn) {
      btn=document.createElement('button');
      btn.id='emailPrintFloating'; btn.textContent='Email/Print';
      Object.assign(btn.style,{ position:'fixed', right:'16px', bottom:'16px', zIndex:'2147483647', background:'#4EA7FF', color:'#fff', border:'1px solid rgba(0,0,0,.2)', borderRadius:'999px', padding:'10px 14px', fontWeight:'700', boxShadow:'0 4px 14px rgba(0,0,0,.2)', cursor:'pointer' });
      btn.addEventListener('click', openPreview);
      document.body.appendChild(btn);
    } else if (!shouldShow && btn) { btn.remove(); btn=null; }
  }

  document.addEventListener('click', (e)=>{ const id=e?.target?.id; if(id==='ep-close') return closePreview(); if(id==='ep-print') return printPreview(); if(id==='ep-send') return sendEmail(); if (e.target && e.target.parentElement && e.target.parentElement.id==='ep-overlay') closePreview(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closePreview(); });

  const mo=new MutationObserver(()=>ensureButton()); mo.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{ if(lastHref!==location.href){ lastHref=location.href; ensureButton(); } }, 400);
  setTimeout(ensureButton, 250);
})();
