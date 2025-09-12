
/* EP v6 - clean rebuild */
(function(){
  if (window.__EPV6__) return; window.__EPV6__ = true;

  function $(q, root){ return (root||document).querySelector(q); }
  function $all(q, root){ return Array.prototype.slice.call((root||document).querySelectorAll(q)); }
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  function getVal(el){
    if (!el) return '';
    var tag=(el.tagName||'').toUpperCase();
    if (tag==='INPUT' || tag==='TEXTAREA') return (el.value||'').trim();
    if (tag==='SELECT') {
      var t=(el.selectedOptions && el.selectedOptions[0] && (el.selectedOptions[0].text||'')) || (el.value||'');
      return String(t).trim();
    }
    return (el.textContent||'').trim();
  }

  
  function jobInfo(){
    function getVal(el){
      if (!el) return '';
      var tag=(el.tagName||'').toUpperCase();
      if (tag==='INPUT' || tag==='TEXTAREA') return (el.value||'').trim();
      if (tag==='SELECT'){
        var t=(el.selectedOptions && el.selectedOptions[0] && (el.selectedOptions[0].text||'')) || (el.value||'');
        return String(t).trim();
      }
      return (el.textContent||'').trim();
    }
    function parseFromSummary(txt){
      var out = {name:'', address:'', po:'', stage:''};
      if (!txt) return out;
      var s = String(txt).replace(/\u00A0/g,' ').replace(/\s+\n/g,'\n').trim();
      var lines = s.split(/\n+/).map(function(x){return x.trim();}).filter(Boolean);
      // name: first non-empty line
      if (lines.length) out.name = lines[0];
      // Stage, PO via regex
      var m;
      m = s.match(/Stage:\s*([^\n•]+)/i); if (m) out.stage = m[1].trim();
      m = s.match(/\bPO[:#]?\s*([^\n•]+)/i); if (m) out.po = m[1].trim();
      // Address: try to find a line that is not a label line
      var addr = '';
      for (var i=1;i<Math.min(lines.length,6);i++){
        var L = lines[i];
        if (!/^(Stage:|PO\b|Crew:|Last updated|Updated|Status:)/i.test(L) && L.length>2){ addr = L; break; }
      }
      out.address = addr;
      return out;
    }
    var nameEl = document.getElementById('job-name');
    var addrEl = document.getElementById('job-address');
    var poEl = document.getElementById('job-po');
    var stageEl = document.getElementById('job-stage');
    var sumEl = document.getElementById('job-summary');
    var name = getVal(nameEl);
    var address = getVal(addrEl);
    var po = getVal(poEl);
    var stage = getVal(stageEl);
    if ((!name || !address || !po || !stage) && sumEl){
      var parsed = parseFromSummary(getVal(sumEl));
      if (!name) name = parsed.name;
      if (!address) address = parsed.address;
      if (!po) po = parsed.po;
      if (!stage) stage = parsed.stage;
    }
    return {name:name || document.title, address:address, po:po, stage:stage};
  }


  function selectedNotes(){
    var out=[];
    $all('#notes-list .note-item').forEach(function(it){
      var dateEl = it.querySelector('.note-date'); if (!dateEl) return;
      var cb = dateEl.querySelector('input.pe_row_chk'); if (!cb || !cb.checked) return;
      var dateText = (dateEl.textContent||'').replace(/\s*\d{1,2}:\d{2}.*$/,'').trim();
      var body = it.querySelector('.note-text') || it.querySelector('.note-body') || it;
      var bodyText = body ? (body.innerText || body.textContent || '').trim() : '';
      out.push({date: dateText, text: bodyText});
    });
    return out;
  }

  function buildPreviewHTML(info, notes){
    function esc(s){ return String(s||'').replace(/[&<>]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]); }); }
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Log Preview</title>' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<style>body{font:15px/1.4 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;margin:16px;color:#111}' +
      '.log-entry{margin:0 0 8px 0} .log-entry div{line-height:1.25;font-size:15px} hr{border:none;border-top:1px solid #e5e7eb;margin:8px 0}' +
      '</style></head><body>';
    html += notes.map(function(n){
      return '<div class="log-entry">' +
        '<div><strong>' + esc(info.name||'') + '</strong></div>' +
        '<div>Address: ' + esc(info.address||'') + '</div>' +
        '<div>PO: ' + esc(info.po||'') + '</div>' +
        '<div>Status: ' + esc(info.stage||'') + '</div>' +
        '<div>Date: ' + esc(n.date||'') + '</div>' +
        '<div><strong>Job Notes</strong></div>' +
        '<div>' + esc(n.text||'') + '</div>' +
      '</div><hr>';
    }).join('');
    html += '</body></html>';
    return html;
  }

  function openPreview(){
    var notes = selectedNotes();
    if (!notes.length){ alert('Select at least one log entry.'); return; }
    var info = jobInfo();
    var w = window.open('', '_blank');
    if (!w){ alert('Popup blocked. Allow popups and try again.'); return; }
    w.document.open(); w.document.write(buildPreviewHTML(info, notes)); w.document.close();
  }

  function intercept(){
    function isTarget(n){
      if (!n) return false;
      if (n.id === 'print-job') return true;
      var t=(n.textContent||'').trim().toLowerCase();
      return t==='print selected' || t==='print' || t==='email/print' || t==='email/print new';
    }
    function handler(e){
      var t = e.target && e.target.closest ? e.target.closest('button, a[role="button"], #print-job') : e.target;
      if (isTarget(t)){
        e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
        openPreview();
      }
    }
    ['touchstart','pointerdown','mousedown','click'].forEach(function(type){
      document.addEventListener(type, handler, true);
    });
  }

  function rename(){
    var n = $('#print-job'); if (n) n.textContent='Email/Print PREVIEW';
    $all('button, a[role="button"]').forEach(function(b){
      var t=(b.textContent||'').trim().toLowerCase();
      if (t==='print selected' || t==='print') b.textContent='Email/Print PREVIEW';
    });
  }

  ready(function(){ rename(); intercept(); });
})();
