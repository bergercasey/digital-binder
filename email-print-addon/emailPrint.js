
/* Email/Print Add-on v6 FORCE BUTTON VERSION
 * Floating button always visible (for testing).
 */
(function () {
  "use strict";

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
    return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">'+
      '<h2>' + escapeHtml(ctx.name||'(No Name)') + '</h2>'+
      (ctx.address? '<div>'+escapeHtml(ctx.address)+'</div>':'')+
      '<div><strong>Current stage:</strong> '+escapeHtml(ctx.stage||'')+'</div>'+
      '<div><strong>Crew:</strong> '+escapeHtml(ctx.crew||'')+'</div>'+
      '<div style="margin-top:12px">'+bullets(ctx.notes)+'</div>'+
    '</div>';
  }

  function getCtx() {
    // Fake context if app doesn't provide one
    if (window.BinderEmailPrint && typeof window.BinderEmailPrint.getContext==='function') {
      try { return window.BinderEmailPrint.getContext(); } catch {}
    }
    return { name:'(test job)', address:'', stage:'', crew:'', notes:['This is a test note'] };
  }

  function closePreview(){ const el=document.getElementById('ep-overlay'); if(el) el.remove(); }
  function openPreview() {
    const ctx=getCtx();
    closePreview();
    const overlay=document.createElement('div');
    overlay.id='ep-overlay';
    overlay.innerHTML='<div style="position:fixed;inset:0;background:rgba(0,0,0,.45);"></div>'+
      '<div style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;max-width:880px;width:96vw;z-index:2147483647;padding:20px;border-radius:10px;">'+
      '<button id="ep-close">✕</button>'+
      buildHTML(ctx)+
      '<div style="margin-top:10px;text-align:right">'+
      '<button id="ep-send">Send Email</button> '+
      '<button id="ep-print">Print</button>'+
      '</div>'+
      '</div>';
    document.body.appendChild(overlay);
  }
  function printPreview(){ window.print(); }
  function sendEmail(){ alert('Email send placeholder'); }

  // Always show floating button
  function ensureButton() {
    if (!document.getElementById('emailPrintFloating')) {
      const btn=document.createElement('button');
      btn.id='emailPrintFloating';
      btn.textContent='Email/Print';
      Object.assign(btn.style,{position:'fixed',right:'16px',bottom:'16px',zIndex:'2147483647',
        background:'#4EA7FF',color:'#fff',borderRadius:'999px',padding:'10px 14px'});
      btn.onclick=openPreview;
      document.body.appendChild(btn);
    }
  }

  document.addEventListener('click',(e)=>{
    if(e.target.id==='ep-close') closePreview();
    if(e.target.id==='ep-print') printPreview();
    if(e.target.id==='ep-send') sendEmail();
  });

  setTimeout(ensureButton,200);
})();
