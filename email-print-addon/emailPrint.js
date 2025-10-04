
/* Email/Print Add-on v6.2 (Build 1759581802)
 * Stronger job-page detection (header + checkboxes OR 'Stage:/Crew:' present)
 * Hook-first; minimal fallback; floating button on job only
 */
(function(){"use strict";
  const CFG = Object.assign({
    showDelayMs: 200
  }, window.EMAIL_PRINT_CONFIG || {});

  const T = el => (el && (el.value!=null ? el.value : el.textContent) || '').trim();
  const esc = s => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

  function bullets(items){
    const lines=[];
    for(const t of (items||[])){
      String(t).split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
        .forEach(p=>lines.push(p.replace(/^(-|\*|•)\s+/, '').trim()));
    }
    if(!lines.length) return '<p><em>(no notes selected)</em></p>';
    return '<ul>'+lines.map(li=>'<li>'+esc(li)+'</li>').join('')+'</ul>';
  }

  function html(ctx){
    return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">'+
      '<h2 style="margin:0 0 8px 0;font-weight:800;font-size:20px;">'+esc(ctx.name||'(No Name)')+'</h2>'+
      (ctx.address? '<div>'+esc(ctx.address)+'</div>':'')+
      '<div><strong>Current stage:</strong> '+esc(ctx.stage||'')+'</div>'+
      '<div><strong>Crew:</strong> '+esc(ctx.crew||'')+'</div>'+
      '<div style="margin-top:12px">'+bullets(ctx.notes||[])+'</div>'+
    '</div>';
  }

  // --------- Context (prefer app hook) ---------
  function getCtx(){
    try {
      if (window.BinderEmailPrint && typeof window.BinderEmailPrint.getContext==='function') {
        const d = window.BinderEmailPrint.getContext();
        if (d && typeof d==='object') return {
          name:(d.name||'').trim(),
          address:(d.address||'').trim(),
          stage:(d.stage||'').trim(),
          crew:(d.crew||'').trim(),
          notes: Array.isArray(d.notes) ? d.notes.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()) : []
        };
      }
    } catch(e){ console.warn('[Email/Print] context error', e); }
    // fallback minimal; still shows preview
    return { name:'', address:'', stage:'', crew:'', notes:[] };
  }

  // --------- Job view detection ---------
  function hasHeader(){
    return !!(document.querySelector('.detail-header h1, .job-header h1, h1, .job-title'));
  }
  function hasNoteCheckboxes(){
    return !!(document.querySelector('.log-entry input[type="checkbox"], .logs input[type="checkbox"], .log input[type="checkbox"], .list-group input[type="checkbox"]'));
  }
  function hasStageOrCrewText(){
    const txt = document.body.innerText || '';
    return /\bStage\s*:/i.test(txt) || /\bCrew\s*:/i.test(txt);
  }
  function isOnJobPage(){
    // App-provided hook wins
    if (window.BinderEmailPrint && typeof window.BinderEmailPrint.isJobPage==='function') {
      try { return !!window.BinderEmailPrint.isJobPage(); } catch { return false; }
    }
    // Heuristic
    if (!hasHeader()) return false;
    if (hasNoteCheckboxes()) return true;
    if (hasStageOrCrewText()) return true;
    return false;
  }

  // --------- Modal & actions ---------
  function closePreview(){ const el=document.getElementById('ep-overlay'); if(el) el.remove(); }
  function openPreview(){
    if (!isOnJobPage()) return;
    const ctx = getCtx();
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
        '<div style="padding:14px;">'+ html(ctx) +'</div>'+
        '<div style="padding:10px 14px;border-top:1px solid #e0e6ea;display:flex;gap:10px;justify-content:flex-end;">'+
          '<button id="ep-send"  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#4EA7FF;color:#fff;cursor:pointer">Send Email</button>'+
          '<button id="ep-print" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;cursor:pointer">Print</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(overlay);
  }

  function printPreview(){
    const ctx = getCtx();
    const docHtml='<!doctype html><html><head><meta charset="utf-8"><title>Print</title>'+
      '<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}body{margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#000}.ep-notes ul{margin:0;padding-left:20px}.ep-notes li{margin:6px 0}</style>'+
      '</head><body>'+html(ctx)+'</body></html>';
    const iframe=document.createElement('iframe');
    Object.assign(iframe.style,{position:'fixed',right:'-9999px',bottom:'-9999px'});
    document.body.appendChild(iframe);
    const doc=iframe.contentDocument||iframe.contentWindow.document; doc.open(); doc.write(docHtml); doc.close();
    iframe.onload=()=>setTimeout(()=>{ iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(()=>iframe.remove(),400); },50);
  }

  function sendEmail(){
    const ctx = getCtx();
    const h = html(ctx).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    const body = encodeURIComponent(h);
    const subject = encodeURIComponent(ctx.name || 'Job Update');
    location.href = 'mailto:?subject='+subject+'&body='+body;
  }

  // --------- Floating button ---------
  let btn=null, lastHref=location.href;
  function ensureButton(){
    const shouldShow = isOnJobPage();
    if (shouldShow && !btn) {
      btn=document.createElement('button');
      btn.id='emailPrintFloating'; btn.textContent='Email/Print';
      Object.assign(btn.style,{ position:'fixed', right:'16px', bottom:'16px', zIndex:'2147483647',
        background:'#4EA7FF', color:'#fff', border:'1px solid rgba(0,0,0,.2)', borderRadius:'999px',
        padding:'10px 14px', fontWeight:'700', boxShadow:'0 4px 14px rgba(0,0,0,.2)', cursor:'pointer' });
      btn.addEventListener('click', openPreview);
      document.body.appendChild(btn);
    } else if (!shouldShow && btn) { btn.remove(); btn=null; }
  }

  document.addEventListener('click', e=>{ const id=e?.target?.id; if(id==='ep-close') return closePreview(); if(id==='ep-print') return printPreview(); if(id==='ep-send') return sendEmail(); if (e.target && e.target.parentElement && e.target.parentElement.id==='ep-overlay') closePreview(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closePreview(); });

  window.BinderEmailPrint = window.BinderEmailPrint || {};
  if (!window.BinderEmailPrint.openPreview) window.BinderEmailPrint.openPreview = openPreview;

  const mo=new MutationObserver(()=>ensureButton()); mo.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{ if(lastHref!==location.href){ lastHref=location.href; ensureButton(); } }, 400);
  setTimeout(ensureButton, CFG.showDelayMs);
})();
