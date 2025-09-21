
/* EP v7 — clean modal + preview + Gmail function; no auto-print */
(function(){
  if (window.__EPV7__) return; window.__EPV7__ = true;

  function $(q,root){return (root||document).querySelector(q);}
  function $all(q,root){return Array.prototype.slice.call((root||document).querySelectorAll(q));}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }

  function el(tag, props, children){
    var n=document.createElement(tag);
    if(props) Object.keys(props).forEach(function(k){ if(k in n) n[k]=props[k]; else n.setAttribute(k, props[k]); });
    (children||[]).forEach(function(c){ n.appendChild(typeof c==='string'? document.createTextNode(c): c); });
    return n;
  }

  function getVal(node){
    if(!node) return '';
    var t=(node.tagName||'').toUpperCase();
    if(t==='INPUT' || t==='TEXTAREA') return (node.value||'').trim();
    if(t==='SELECT'){ var o=(node.selectedOptions&&node.selectedOptions[0]); return ((o&&o.text)||node.value||'').trim(); }
    return (node.textContent||'').trim();
  }

  function jobInfo(){
    var info = {
      name:   getVal($('#job-name')) || getVal($('#job-summary')) || document.title,
      address:getVal($('#job-address')),
      po:     getVal($('#job-po')),
      stage:  getVal($('#job-stage'))
    };
    // If some fields are empty, parse #job-summary (view mode)
    var sum = $('#job-summary');
    if (sum){
      var txt = getVal(sum).replace(/\u00A0/g,' ');
      if(!info.address){
        var lines = txt.split(/\n+/).map(function(s){return s.trim();}).filter(Boolean);
        // pick first non-label line after name
        for(var i=1;i<Math.min(lines.length,6);i++){ if(!/^(Stage:|PO\b|Crew:|Last updated|Updated|Status:)/i.test(lines[i])){ info.address=lines[i]; break; } }
      }
      if(!info.po){ var m = txt.match(/\bPO[:#]?\s*([^\n•]+)/i); if(m) info.po = m[1].trim(); }
      if(!info.stage){ var m2 = txt.match(/Stage:\s*([^\n•]+)/i); if(m2) info.stage = m2[1].trim(); }
      if(!info.name){ info.name = (txt.split(/\n+/)[0]||'').trim() || document.title; }
    }
    return info;
  }

  function selectedNotes(){
    var out=[];
    $all('#notes-list .note-item').forEach(function(it){
      var dateEl = it.querySelector('.note-date'); if(!dateEl) return;
      var cb = dateEl.querySelector('input.pe_row_chk'); if(!cb || !cb.checked) return;
      var dateText = (dateEl.textContent||'').replace(/\s*\d{1,2}:\d{2}.*$/,'').trim();
      var body = it.querySelector('.note-text') || it.querySelector('.note-body') || it;
      var bodyText = body ? (body.innerText || body.textContent || '').trim() : '';
      out.push({date: dateText, text: bodyText});
    });
    return out;
  }

  function buildPreviewHTML(info, notes){
    function esc(s){return String(s||'').replace(/[&<>]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]);});}
    var css = 'body{font:17px/1.5 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;margin:22px;color:#111}'
            + '.header{margin:0 0 16px 0} .header div{line-height:1.5;margin:3px 0}'
            + '.jobname{font-size:22px;font-weight:700} .jobfield{font-size:18px;color:#222}'
            + '.entry{margin:0 0 16px 0} .entry .label{font-weight:700;font-size:18px;margin:0 0 4px 0}'
            + '.entry .date{color:#000;margin:0 0 6px 0;font-size:16px} hr{border:none;border-top:1px solid #ccc;margin:12px 0}';
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Log Preview</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>'+css+'</style></head><body>';
    html += '<div class="header">'
         + '<div class="jobname">'+esc(info.name||'')+'</div>'
         + (info.address? '<div class="jobfield">Address: '+esc(info.address)+'</div>':'')
         + (info.po? '<div class="jobfield">PO: '+esc(info.po)+'</div>':'')
         + (info.stage? '<div class="jobfield">Status: '+esc(info.stage)+'</div>':'')
         + '</div><hr>';
    html += notes.map(function(n){
      return '<div class="entry">'
        + '<div class="label">Job Notes</div>'
        + '<div class="date">'+esc(n.date||'')+'</div>'
        + '<div>'+esc(n.text||'')+'</div>'
        + '</div><hr>';
    }).join('');
    html += '</body></html>';
    return html;
  }

  function openPreview(info, notes){
    var w = window.open('', '_blank'); if(!w){ alert('Popup blocked. Allow popups and try again.'); return; }
    w.document.open(); w.document.write(buildPreviewHTML(info, notes)); w.document.close();
  }

  // --- Modal ---
  function parseContact(s){
    s = String(s||'').trim();
    if (!s) return null;
    var m = s.match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
    if (m) return {name: m[1] || m[2], email: m[2]};
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return {name: s, email: s};
    return null;
  }
  function saveContacts(arr){
    try{ localStorage.setItem('binder_contacts', JSON.stringify(arr)); }catch(_){}
  }
  function loadContacts(){
    var keys=['binder_contacts','pe_contacts','pe35_contacts','contacts']; var seen={}, out=[];
    keys.forEach(function(k){
      try{
        var raw = localStorage.getItem(k); if(!raw) return;
        var val; try{ val=JSON.parse(raw); } catch(e){ val = raw; }
        var arr = Array.isArray(val) ? val : (typeof val==='string' ? val.split(/[\n,]/) : []);
        arr.forEach(function(s){
          s=String(s).trim(); if(!s) return;
          var m = s.match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
          var name, email;
          if (m){ name=m[1]||m[2]; email=m[2]; } else if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)){ name=s; email=s; } else { return; }
          var key=email.toLowerCase(); if(seen[key]) return; seen[key]=true;
          out.push({name:name, email:email});
        });
      }catch(_){}
    });
    return out;
  }

  
function openModal(){
  var info = jobInfo();
  var notes = selectedNotes();
  if (!notes.length){ alert('Select at least one log entry.'); return; }

  function parseContact(s){
    s = String(s||'').trim();
    var m = s.match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
    if (m) return {name: m[1] || m[2], email: m[2]};
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return {name: s, email: s};
    return null;
  }
  function saveContacts(arr){
    try{ localStorage.setItem('binder_contacts', JSON.stringify(arr)); }catch(_){}
  }
  function loadContacts(){
    try{
      var raw = localStorage.getItem('binder_contacts');
      if (!raw) return [];
      var val = JSON.parse(raw);
      if (Array.isArray(val)) return val.filter(Boolean).map(function(v){
        if (typeof v==='string') return parseContact(v);
        return {name: v.name || v.email, email: v.email};
      }).filter(Boolean);
      if (typeof val==='string') return val.split(/[\n,]/).map(parseContact).filter(Boolean);
      return [];
    }catch(_){ return []; }
  }

  var ov = el('div', {id:'epv7_ov', style:'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:9999;'});
  var box = el('div', {style:'position:absolute;top:10%;left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;max-width:820px;width:94%;box-shadow:0 10px 30px rgba(0,0,0,0.2);'});
  ov.appendChild(box);

  var head = el('div', {style:'padding:12px 14px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;'});
  head.appendChild(el('div',{style:'font-weight:700;font-size:16px'},[document.createTextNode('Email / Print')]));
  var xbtn = el('button',{style:'border:1px solid #ddd;background:#f8f8f8;border-radius:6px;padding:4px 8px;cursor:pointer;'},['Close']);
  xbtn.addEventListener('click', function(){ document.body.removeChild(ov); });
  head.appendChild(xbtn);
  box.appendChild(head);

  var wrap = el('div',{style:'padding:12px 14px;'});

  // Add Contact (two inputs)
  var addRow = el('div',{style:'display:grid;grid-template-columns: 1fr 1fr auto;gap:8px;align-items:center;margin:0 0 10px 0;'});
  var nameInput = el('input',{type:'text',placeholder:'Name',style:'padding:6px 8px;border:1px solid #ddd;border-radius:6px'});
  var emailInput = el('input',{type:'email',placeholder:'email@domain.com',style:'padding:6px 8px;border:1px solid #ddd;border-radius:6px'});
  var addBtn = el('button',{style:'border:1px solid #2563eb;background:#2563eb;color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer;'},['Add']);
  addRow.appendChild(nameInput); addRow.appendChild(emailInput); addRow.appendChild(addBtn);
  wrap.appendChild(addRow);

  // List title
  wrap.appendChild(el('div',{style:'font-size:14px;margin:6px 0;color:#444;'},['Recipients:']));

  // Two-column list container
  var listHeader = el('div',{style:'display:grid;grid-template-columns:24px 1fr 1.2fr 40px;gap:8px;padding:6px 4px;color:#666;font-size:12px;border-bottom:1px solid #eee;margin-bottom:4px;'});
  listHeader.appendChild(el('div',{},[])); // checkbox col
  listHeader.appendChild(el('div',{},[document.createTextNode('Name')]));
  listHeader.appendChild(el('div',{},[document.createTextNode('Email')]));
  listHeader.appendChild(el('div',{},[document.createTextNode('')])); // actions
  wrap.appendChild(listHeader);

  var listBox = el('div',{});
  wrap.appendChild(listBox);

  var contacts = loadContacts();

  function renderList(){
    listBox.innerHTML='';
    if(!contacts.length){
      listBox.appendChild(el('div',{style:'color:#666;margin:8px 0;'},['No saved contacts. Add one above.']));
      return;
    }
    contacts.forEach(function(c, idx){
      var row = el('div',{style:'display:grid;grid-template-columns:24px 1fr 1.2fr 40px;gap:8px;align-items:center;padding:6px 4px;border-bottom:1px dashed #f0f0f0;'});
      var cb = el('input',{type:'checkbox','data-email':c.email});
      var nm = el('div',{style:'font-size:14px;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'},[document.createTextNode(c.name||c.email)]);
      var em = el('div',{style:'font-size:14px;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'},[document.createTextNode(c.email)]);
      var del = el('button',{title:'Remove',style:'border:1px solid #ddd;background:#fff;border-radius:6px;padding:4px 6px;cursor:pointer'},['🗑']);
      del.addEventListener('click', function(){
        contacts.splice(idx,1);
        saveContacts(contacts); renderList();
      });
      row.appendChild(cb); row.appendChild(nm); row.appendChild(em); row.appendChild(del);
      listBox.appendChild(row);
    });
  }
  renderList();

  // Add button logic
  addBtn.addEventListener('click', function(){
    var nm = (nameInput.value||'').trim();
    var em = (emailInput.value||'').trim();
    if(!em){ alert('Enter an email'); return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ alert('Enter a valid email'); return; }
    if(!nm) nm = em;
    var o = {name:nm, email:em};
    var dup = contacts.some(function(x){ return (x.email||'').toLowerCase()===em.toLowerCase(); });
    if(!dup){ contacts.push(o); saveContacts(contacts); }
    renderList();
    nameInput.value=''; emailInput.value='';
    // auto-select newly added contact
    var last = listBox.querySelector('input[data-email="'+em.replace(/"/g,'&quot;')+'"]');
    if(last){ last.checked = true; }
  });

  box.appendChild(wrap);

  var foot = el('div',{style:'padding:12px 14px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end;'});
  var btnPreview = el('button',{style:'border:1px solid #ccc;border-radius:6px;background:#f8f8f8;padding:6px 10px;cursor:pointer;'},['Preview']);
  var btnPrint = el('button',{style:'border:1px solid #ccc;border-radius:6px;background:#f8f8f8;padding:6px 10px;cursor:pointer;'},['Print']);
  var btnSend = el('button',{style:'border:1px solid #2563eb;background:#2563eb;color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;'},['Send Email']);
  foot.appendChild(btnPreview); foot.appendChild(btnPrint); foot.appendChild(btnSend);
  box.appendChild(foot);

  btnPreview.addEventListener('click', function(){ openPreview(info, notes); });
  btnPrint.addEventListener('click', function(){ openPreview(info, notes); setTimeout(function(){ try{ window.focus(); }catch(_){ } }, 0); });

  btnSend.addEventListener('click', async function(){
    var to = Array.prototype.map.call(listBox.querySelectorAll('input[type="checkbox"]:checked'), function(n){ return n.getAttribute('data-email'); });
    if (!to.length){ alert('Pick at least one recipient.'); return; }
    var subject = (info.name||'Job Log') + ' - Log Update';

    // text body
    var lines = [];
    if (info.name) lines.push('Job Name: ' + info.name);
    if (info.address) lines.push('Address: ' + info.address);
    if (info.po) lines.push('PO: ' + info.po);
    if (info.stage) lines.push('Status: ' + info.stage);
    lines.push('');
    notes.forEach(function(n, i){
      lines.push('Job Notes');
      if (n.date) lines.push('Date: ' + n.date);
      if (n.text) lines.push(n.text);
      if (i < notes.length-1) lines.push('---');
    });
    var text = lines.join('\\n');

    var html = buildPreviewHTML(info, notes);

    try{
      var resp = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ to: to, subject: subject, text: text, html: html })
      });
      if (!resp.ok){ var t = await resp.text(); throw new Error(t||('HTTP '+resp.status)); }
      alert('Email sent.');
      document.body.removeChild(ov);
    }catch(e){
      alert('Email failed: ' + e.message);
    }
  });

  ov.addEventListener('click', function(e){ if(e.target===ov) document.body.removeChild(ov); });
  document.body.appendChild(ov);
}


  function isPrintNode(n){ return !!(n && n.id === 'print-job'); }
  function intercept(){
  function handler(e){
    var t = e.target && e.target.closest ? e.target.closest('#print-job') : e.target;
    if (matchPrintNode(t)) { e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); openModal(); }
  }
  ['click','touchstart','pointerdown','mousedown'].forEach(function(tp){ document.addEventListener(tp, handler, true); });
}
['touchstart','pointerdown','mousedown','click'].forEach(function(tp){ document.addEventListener(tp, handler, true); });
  }

  function rename(){}
  ready(function(){ intercept(); });
})();
