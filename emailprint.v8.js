(function(){
  'use strict';
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  // Print via hidden iframe (avoids popup blockers/blank about:blank)
  function printHTML(html){
    var iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    try { doc.open(); doc.write(html); doc.close(); } catch(_){}
    function doPrint(){
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch(_){}
      setTimeout(function(){ try{ iframe.parentNode && iframe.parentNode.removeChild(iframe); }catch(_){ } }, 1200);
    }
    setTimeout(doPrint, 300);
  }

  // --- Job meta helpers ---
  function currentJobSafe(){
    try { return (typeof currentJob === 'function') ? currentJob() : null; } catch(_){ return null; }
  }
  function getText(el){
    if (!el) return '';
    try{
      var tag = (el.tagName||'').toLowerCase();
      if (tag === 'select'){
        var opt = el.options && el.selectedIndex>=0 ? el.options[el.selectedIndex] : null;
        return (opt && (opt.text || opt.value)) || (el.value || el.textContent || '');
      }
      return (el.value || el.textContent || '').trim();
    }catch(_){ return ''; }
  }
  function joinParts(parts, sep){
    var out = []; var i;
    for (i=0;i<parts.length;i++){ if (parts[i] && String(parts[i]).trim().length>0) out.push(parts[i]); }
    return out.join(sep || ', ');
  }
  function getJobMeta(){
    var j = currentJobSafe() || {};
    var name = (j && (j.name || j.jobName || j.title)) || '';
    if (!name){
      var t = $('#job-name') || $('.job-name') || $('[data-role="job-name"]');
      name = getText(t) || 'Job';
    }
    var address = '';
    var a = j && (j.address || j.addr || j.location || j.siteAddress || j.jobAddress);
    if (typeof a === 'string'){ address = a; }
    else if (a && typeof a === 'object'){
      address = joinParts([ a.line1||a.street||a.street1, a.line2||a.street2, joinParts([a.city, a.state, a.zip], ' ') ], ', ');
    }
    if (!address){
      var el = $('#job-address') || $('.job-address') || $('[data-role="job-address"]') || $('#address') || $('.address');
      address = getText(el);
    }
    var stage = j && (j.stage || j.status || j.pipelineStage || j.phase || (j.pipeline && j.pipeline.stage));
    if (!stage){
      var sEl = $('#job-stage') || $('.job-stage') || $('[data-role="job-stage"]') || $('#stage') || $('.stage') || $('.status') || $('[data-stage]');
      stage = getText(sEl);
    }
    if (typeof stage === 'object' && stage && (stage.name || stage.title)) stage = stage.name || stage.title;
    return { name: String(name||'Job'), address: String(address||''), stage: String(stage||'') };
  }

  function gatherSelectedNotes(){
    var list = document.getElementById('notes-list');
    if (!list) return [];
    var rows = $all('.note-item', list);
    var i, out = [];
    for (i=0;i<rows.length;i++){
      var row = rows[i];
      var cb = row.querySelector('.note-date input.pe_row_chk');
      if (cb && cb.checked) out.push(row);
    }
    if (out.length === 0) out = rows;
    return out;
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"]/g, function(c){
      return c==='&'?'&amp;':(c==='<'?'&lt;':(c==='>'?'&gt;':'&quot;'));
    });
  }

  function buildPreviewHTML(){
    var meta = getJobMeta();
    var jobName = meta.name;
    var jobAddress = meta.address;
    var jobStage = meta.stage;

    var sel = gatherSelectedNotes();
    var itemsArr = [];
    for (var i=0;i<sel.length;i++){
      var row = sel[i];
      var copy = row.cloneNode(true);
      // strip interactive widgets
      var toRemove = copy.querySelectorAll('input.pe_row_chk, .note-actions, button, input[type="checkbox"], input[type="radio"]');
      for (var k=0;k<toRemove.length;k++){ toRemove[k].parentNode && toRemove[k].parentNode.removeChild(toRemove[k]); }
      // normalize literal "\n" sequences to <br>
      var bodies = copy.querySelectorAll('.note-body, [data-role="note-body"]');
      for (var b=0;b<bodies.length;b++){
        try {
          bodies[b].innerHTML = String(bodies[b].innerHTML).replace(/\\n/g, '<br>');
        } catch(_){}
      }
      // card styles
      copy.style.padding = '10px 12px';
      copy.style.border = '1px solid #e5e7eb';
      copy.style.borderRadius = '10px';
      copy.style.margin = '0 0 10px 0';
      itemsArr.push(copy.outerHTML);
    }
    var items = itemsArr.join('\n');

    var css = ''
      + 'body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.45;color:#111827;background:#fff;padding:16px;}'
      + 'h1{font-size:18px;margin:0 0 4px 0;color:#111827;}'
      + '.line{margin:0 0 8px 0;color:#374151;}'
      + '.muted{color:#6b7280;font-size:12px;margin:12px 0 8px 0;}'
      + '.note-item{background:#fff;}'
      + '.note-body{white-space:pre-wrap;}';

    var header = '<h1>'+escapeHtml(jobName)+'</h1>'
      + (jobAddress ? '<div class="line">'+escapeHtml(jobAddress)+'</div>' : '')
      + (jobStage ? '<div class="line">Stage: '+escapeHtml(jobStage)+'</div>' : '');

    var when = new Date().toLocaleString();
    var metaLine = '<div class="muted">Generated '+escapeHtml(when)+'</div>';

    var html = '<!doctype html><html><head><meta charset="utf-8"><title>'
      + escapeHtml(jobName) + ' — Log</title><style>' + css + '</style></head><body>'
      + header + metaLine + items + '</body></html>';

    return html;
  }

  function openPreview(){
    try{
      var html = buildPreviewHTML();
      var overlay = document.createElement('div');
      overlay.id = 'ep-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
      var panel = document.createElement('div');
      panel.style.cssText = 'background:#fff;max-width:900px;width:100%;max-height:85vh;overflow:auto;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.15);';
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff;z-index:1;';
      var title = document.createElement('div'); title.textContent = 'Email/Print Preview'; title.style.cssText = 'font-weight:700;color:#111827;';
      var actions = document.createElement('div');
      var btnClose = document.createElement('button'); btnClose.textContent='Close'; styleBtn(btnClose);
      var btnPrint = document.createElement('button'); btnPrint.textContent='Print'; styleBtn(btnPrint);
      var btnSend  = document.createElement('button'); btnSend.textContent='Send Email'; styleBtn(btnSend, true);
      actions.appendChild(btnSend); actions.appendChild(btnPrint); actions.appendChild(btnClose);
      bar.appendChild(title); bar.appendChild(actions);
      var frame = document.createElement('iframe'); frame.style.cssText = 'border:0;width:100%;height:70vh;display:block;';
      panel.appendChild(bar); panel.appendChild(frame);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      var doc = frame.contentDocument || frame.contentWindow.document;
      try { doc.open(); doc.write(html); doc.close(); } catch(_){}

      btnClose.onclick = function(){ overlay.remove(); };
      btnPrint.onclick = function(){
        try {
          var htmlToPrint = (frame.contentDocument || frame.contentWindow.document).documentElement.outerHTML;
          printHTML(htmlToPrint);
        } catch (e) {
          try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch(_){}
        }
      };
      btnSend.onclick = function(){ sendEmail(doc.documentElement.outerHTML, overlay); };
    }catch(e){ alert('Could not open preview'); }
  }

  function styleBtn(b, primary){
    b.style.cssText='margin-left:8px;padding:8px 12px;border-radius:8px;border:1px solid #d1d5db;background:'+(primary?'#2563eb':'#f9fafb')+';color:'+(primary?'#fff':'#111827')+';cursor:pointer;font-weight:600';
  }

  function sendEmail(html, overlay){
    var meta = getJobMeta();
    var subject = meta.name + ' — Log';
    fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ subject: subject, html: html })
    }).then(function(r){
      if (!r.ok) throw new Error('HTTP '+r.status);
      return r.json().catch(function(){ return {}; });
    }).then(function(){
      toast('Email sent.');
      if (overlay) overlay.remove();
    }).catch(function(err){
      alert('Email failed');
    });
  }

  function toast(msg){
    try{
      var t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;right:12px;bottom:12px;padding:10px 14px;background:#111827;color:#fff;border-radius:10px;z-index:999999;box-shadow:0 6px 16px rgba(0,0,0,.2)';
      document.body.appendChild(t);
      setTimeout(function(){ t.remove(); }, 2000);
    }catch(_){}
  }

  // Delegated click so it works even if button is injected late
  document.addEventListener('click', function(e){
    var t = e && e.target ? e.target : null;
    if (!t) return;
    var btn = null;
    // emulate closest('#email-print') without optional chaining
    while (t && t !== document){
      if (t.id === 'email-print'){ btn = t; break; }
      t = t.parentNode;
    }
    if (btn){
      if (e && e.preventDefault) e.preventDefault();
      try { openPreview(); } catch(_) {}
    }
  });

})();