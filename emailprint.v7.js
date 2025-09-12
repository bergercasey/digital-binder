
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

    var ov = el('div', {id:'epv7_ov', style:'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:9999;'});
    var box = el('div', {style:'position:absolute;top:10%;left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;max-width:740px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,0.2);'});
    ov.appendChild(box);

    var head = el('div', {style:'padding:12px 14px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;'});
    head.appendChild(el('div',{style:'font-weight:700;font-size:16px'},[document.createTextNode('Email / Print')]));
    var xbtn = el('button',{style:'border:1px solid #ddd;background:#f8f8f8;border-radius:6px;padding:4px 8px;cursor:pointer;'},['Close']);
    xbtn.addEventListener('click', function(){ document.body.removeChild(ov); });
    head.appendChild(xbtn);
    box.appendChild(head);

    var wrap = el('div',{style:'padding:12px 14px;'});
var addRow = el('div',{style:'display:flex;gap:8px;align-items:center;margin:0 0 10px 0;'});
var addInput = el('input',{type:'text',placeholder:'Name <email@domain.com>',style:'flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:6px'});
var addBtn = el('button',{style:'border:1px solid #2563eb;background:#2563eb;color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer;'},['Add']);
addRow.appendChild(addInput); addRow.appendChild(addBtn); wrap.appendChild(addRow);

    var contacts = loadContacts();
var listTitle = el('div',{style:'font-size:14px;margin-bottom:6px;color:#444;'},['Recipients:']);
var listBox = el('div',{});
wrap.appendChild(listTitle);
wrap.appendChild(listBox);
function renderList(){
  listBox.innerHTML = '';
  if(!contacts.length){ listBox.appendChild(el('div',{style:'color:#666;margin-bottom:8px;'},['No saved contacts yet. Add one above.'])); return; }
  contacts.forEach(function(c){
    var row = el('label',{style:'display:flex;align-items:center;gap:8px;padding:3px 0;'});
    var cb = el('input',{type:'checkbox','data-email':c.email});
    var sp = el('span', null, [document.createTextNode((c.name||c.email)+' <'+c.email+'>')]);
    row.appendChild(cb); row.appendChild(sp); listBox.appendChild(row);
  });
}
renderList();
addBtn.addEventListener('click', function(){
  var v = addInput.value.trim(); if(!v) return;
  var o = parseContact(v); if(!o){ alert('Use Name <email@domain.com> or an email'); return; }
  var dup = contacts.some(function(x){ return (x.email||'').toLowerCase()===o.email.toLowerCase(); });
  if(!dup){ contacts.push(o); saveContacts(contacts); }
  renderList(); addInput.value='';
  // auto-select the newly added contact
  var last = listBox.querySelector('input[data-email="'+o.email.replace(/"/g,'&quot;')+'"]');
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
    btnPrint.addEventListener('click', function(){ openPreview(info, notes); });

    btnSend.addEventListener('click', async function(){
      var to = Array.prototype.map.call(listBox.querySelectorAll('input[type="checkbox"]:checked'), function(n){ return n.getAttribute('data-email'); });
      if (!to.length){ alert('Pick at least one recipient.'); return; }
      var subject = (info.name||'Job Log') + ' - Log Update';
      // Text body
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
      var text = lines.join('\n');

      // HTML body same as preview
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

  function isPrintNode(n){
    if(!n) return false;
    if(n.id==='print-job') return true;
    var t=(n.textContent||'').trim().toLowerCase();
    return t==='print selected' || t==='print' || t==='email/print' || t==='email/print preview';
  }

  function intercept(){
    function handler(e){
      var t = e.target && e.target.closest ? e.target.closest('button, a[role="button"], #print-job') : e.target;
      if (isPrintNode(t)){
        e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
        openModal();
      }
    }
    ['touchstart','pointerdown','mousedown','click'].forEach(function(tp){ document.addEventListener(tp, handler, true); });
  }

  function rename(){
    var n = $('#print-job'); if (n) n.textContent='Email/Print';
    $all('button, a[role="button"]').forEach(function(b){
      var t=(b.textContent||'').trim().toLowerCase();
      if (t==='print selected' || t==='print') b.textContent='Email/Print';
    });
  }

  ready(function(){ rename(); intercept(); });
})();
