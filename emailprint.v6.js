
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
      '<style>body{font:17px/1.5 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;margin:70px 22px 22px;color:#111}.toolbar{position:fixed;top:0;left:0;right:0;background:#fff;border-bottom:1px solid #ccc;padding:10px 12px;display:flex;gap:8px;align-items:center}.toolbar button{font:16px;padding:6px 10px;border:1px solid #ccc;border-radius:6px;background:#f8f8f8;cursor:pointer}' +
      '.header{margin:0 0 16px 0} .header div{line-height:1.5;margin:3px 0}' +
      '.jobname{font-size:22px;font-weight:700}' +
      '.jobfield{font-size:18px;color:#222}' +
      '.entry{margin:0 0 16px 0}' +
      '.entry .label{font-weight:700;font-size:18px;margin:0 0 4px 0}' +
      '.entry .date{color:#000;margin:0 0 6px 0;font-size:16px}' +
      'hr{border:none;border-top:1px solid #ccc;margin:12px 0}' +
      '</style></head><body><div class="toolbar"><button onclick="window.print()">Print</button><button id="ep_email_btn">Email</button></div>';

    html += '<div class="header">'
      + '<div class="jobname">' + esc(info.name||'') + '</div>'
      + (info.address? '<div class="jobfield">Address: ' + esc(info.address) + '</div>' : '')
      + (info.po? '<div class="jobfield">PO: ' + esc(info.po) + '</div>' : '')
      + (info.stage? '<div class="jobfield">Status: ' + esc(info.stage) + '</div>' : '')
      + '</div><hr>';

    html += notes.map(function(n){
      return '<div class="entry">'
        + '<div class="label">Job Notes</div>'
        + '<div class="date">' + esc(n.date||'') + '</div>'
        + '<div>' + esc(n.text||'') + '</div>'
        + '</div><hr>';
    }).join('');

    html += '<script>(function(){var b=document.getElementById("ep_email_btn");if(!b)return;b.addEventListener("click",function(){try{var header=document.querySelector(".header");var name=(header&&header.querySelector(".jobname"))?header.querySelector(".jobname").textContent.trim():"Job Log";var lines=[];if(header){var hf=header.querySelectorAll(".jobfield");lines.push("Job Name: "+name);hf.forEach(function(x){lines.push(x.textContent.trim());});lines.push("");}var es=document.querySelectorAll(".entry");es.forEach(function(e,i){lines.push("Job Notes");var d=e.querySelector(".date");if(d)lines.push("Date: "+d.textContent.trim());var t=e.lastElementChild;if(t)lines.push(t.textContent.trim());if(i<es.length-1)lines.push("---");});var subj=name+" - Log";var body=lines.join("\n");window.location.href="mailto:?subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(body);}catch(_){}});})();</'+'script>'; html +=\nhtml += '<script>(function(){document.addEventListener(\"DOMContentLoaded\", function(){var btn=document.getElementById(\"ep_email_btn\"); if(!btn) return; function gather(){ var header=document.querySelector(\".header\"); var name=(header&&header.querySelector(\".jobname\"))?header.querySelector(\".jobname\").textContent.trim():\"Job Log\"; var info={name:name,address:\"\",po:\"\",stage:\"\"}; header && header.querySelectorAll(\".jobfield\").forEach(function(x){var t=x.textContent.trim(); if(/^Address:/i.test(t)) info.address=t.replace(/^Address:\\s*/i,\"\"); else if(/^PO:/i.test(t)) info.po=t.replace(/^PO:\\s*/i,\"\"); else if(/^Status:/i.test(t)) info.stage=t.replace(/^Status:\\s*/i,\"\");}); var entries=[].map.call(document.querySelectorAll(\".entry\"), function(e){ return {date:(e.querySelector(\".date\")||{}).textContent||\"\", text:(e.lastElementChild||{}).textContent||\"\"}; }); return {info:info, notes:entries}; } function composeText(d){var lines=[]; if(d.info.name) lines.push(\"Job Name: \"+d.info.name); if(d.info.address) lines.push(\"Address: \"+d.info.address); if(d.info.po) lines.push(\"PO: \"+d.info.po); if(d.info.stage) lines.push(\"Status: \"+d.info.stage); lines.push(\"\"); d.notes.forEach(function(n,i){lines.push(\"Job Notes\"); if(n.date) lines.push(\"Date: \"+n.date.trim()); if(n.text) lines.push(n.text.trim()); if(i<d.notes.length-1) lines.push(\"---\");}); return lines.join(\"\\n\"); } function openModal(){var d=gather(); var ov=document.createElement(\"div\"); ov.style.position=\"fixed\"; ov.style.inset=\"0\"; ov.style.background=\"rgba(0,0,0,0.35)\"; ov.style.zIndex=\"999999\"; ov.addEventListener(\"click\", function(e){ if(e.target===ov) document.body.removeChild(ov); }); var box=document.createElement(\"div\"); box.style.position=\"absolute\"; box.style.top=\"12%\"; box.style.left=\"50%\"; box.style.transform=\"translateX(-50%)\"; box.style.background=\"#fff\"; box.style.borderRadius=\"10px\"; box.style.width=\"min(600px, 92%)\"; box.style.padding=\"14px\"; box.style.boxShadow=\"0 10px 28px rgba(0,0,0,0.2)\"; ov.appendChild(box); var title=document.createElement(\"div\"); title.textContent=\"Email / Print\"; title.style.fontSize=\"18px\"; title.style.fontWeight=\"700\"; title.style.marginBottom=\"8px\"; box.appendChild(title); var list=document.createElement(\"div\"); list.style.maxHeight=\"240px\"; list.style.overflow=\"auto\"; list.style.border=\"1px solid #ddd\"; list.style.borderRadius=\"8px\"; list.style.padding=\"6px\"; box.appendChild(list); var contacts=(function(){try{var c = localStorage.getItem(\"binder_contacts\"); return c ? JSON.parse(c) : []; }catch(e){return []}})(); if(!contacts || !contacts.length){ var empty=document.createElement(\"div\"); empty.style.color=\"#666\"; empty.textContent=\"No saved contacts yet (binder_contacts).\"; list.appendChild(empty);} else { contacts.forEach(function(c, i){ var row=document.createElement(\"label\"); row.style.display=\"flex\"; row.style.alignItems=\"center\"; row.style.gap=\"8px\"; row.style.padding=\"4px 2px\"; var cb=document.createElement(\"input\"); cb.type=\"checkbox\"; cb.value=(c.email||c); row.appendChild(cb); var span=document.createElement(\"span\"); span.textContent=(c.name||c.email||c); row.appendChild(span); list.appendChild(row); }); } var actions=document.createElement(\"div\"); actions.style.display=\"flex\"; actions.style.justifyContent=\"flex-end\"; actions.style.gap=\"8px\"; actions.style.marginTop=\"10px\"; box.appendChild(actions); var send=document.createElement(\"button\"); send.textContent=\"Send via Gmail\"; send.style.padding=\"6px 10px\"; send.style.border=\"1px solid #ccc\"; send.style.borderRadius=\"6px\"; send.style.background=\"#2563eb\"; send.style.color=\"#fff\"; actions.appendChild(send); var cancel=document.createElement(\"button\"); cancel.textContent=\"Cancel\"; cancel.style.padding=\"6px 10px\"; cancel.style.border=\"1px solid #ccc\"; cancel.style.borderRadius=\"6px\"; actions.appendChild(cancel); cancel.addEventListener(\"click\", function(){ document.body.removeChild(ov); }); send.addEventListener(\"click\", async function(){ var to=[].map.call(list.querySelectorAll(\"input[type=checkbox]:checked\"), function(cb){ return cb.value; }); if(!to.length){ alert(\"Choose at least one recipient.\"); return; } var d=gather(); var subject=(d.info.name||\"Job Log\")+\" - Log Update\"; var text=composeText(d); try{ var resp = await fetch('/.netlify/functions/send-email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to: to, subject: subject, text: text }) }); if(!resp.ok){ var t=await resp.text(); alert('Email failed: '+t); } else { alert('Email sent.'); document.body.removeChild(ov); } }catch(e){ alert('Email error: '+e.message); } }); document.body.appendChild(ov); } btn.addEventListener(\"click\", openModal); });});})();</script>';\n + '</body></html>';
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

  
  // Contacts utilities (load from localStorage like before)
  function parseContact(s){
    if (typeof s === 'object' && s && s.email) return {name: s.name || s.email, email: s.email};
    var m = String(s).match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
    if (m) return {name: m[1] || m[2], email: m[2]};
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s))) return {name: String(s), email: String(s)};
    return null;
  }
  function loadContacts(){
    var keys = ['binder_contacts','pe_contacts','pe35_contacts','contacts'];
    var seen = {}; var out = [];
    keys.forEach(function(k){
      try{
        var raw = localStorage.getItem(k); if (!raw) return;
        var val; try{ val = JSON.parse(raw); } catch(e){ val = raw; }
        var arr = Array.isArray(val) ? val : (typeof val === 'string' ? val.split(/[\n,]/) : []);
        arr.forEach(function(item){
          var o = parseContact(item); if (!o) return;
          var key = o.email.toLowerCase(); if (seen[key]) return; seen[key] = true;
          out.push(o);
        });
      }catch(_){}
    });
    return out;
  }

  ready(function(){ rename(); intercept(); });
})();
