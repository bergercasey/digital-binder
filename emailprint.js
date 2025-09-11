
(function(){
  if (window.__emailPrintLoaded) return; window.__emailPrintLoaded = true;

  function $(id){ return document.getElementById(id); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ---- Contacts (normalize to {name,email}) ----
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
        var arr = Array.isArray(val) ? val : (typeof val === 'string' ? val.split(/[,\n]/) : []);
        arr.forEach(function(s){
          var o = parseContact(s); if (!o) return;
          var key = o.email.toLowerCase(); if (seen[key]) return; seen[key] = true;
          out.push(o);
        });
      }catch(_){}
    });
    return out;
  }
  function saveContacts(list){
    try{ localStorage.setItem('binder_contacts', JSON.stringify(list)); }catch(_){}
  }

  // ---- Selection helpers ----
  function getSelectedNotes(){
    var items = qsa('#notes-list .note-item');
    var sel = [];
    items.forEach(function(it){
      var dateEl = it.querySelector('.note-date'); if (!dateEl) return;
      var cb = dateEl.querySelector('input.pe_row_chk'); if (!cb || !cb.checked) return;
      var dateText = (dateEl.textContent||'').replace(/\s*\d{1,2}:\d{2}.*$/,'').trim();
      var body = it.querySelector('.note-text') || it.querySelector('.note-body') || it;
      var bodyText = body ? (body.innerText || body.textContent || '').trim() : '';
      sel.push({date: dateText, text: bodyText});
    });
    return sel;
  }
  function currentJobTitle(){
    var h = document.querySelector('h3.job-title, h2.job-title, h1.job-title');
    if (h) return (h.textContent||'').trim();
    var main = document.querySelector('#job-title') || document.querySelector('.job-header');
    if (main) return (main.textContent||'').trim();
    return document.title || 'Job Log';
  }

  // ---- Modal ----
  function openModal(){
    var ov = document.createElement('div'); ov.id='ep_overlay';
    ov.style.position='fixed'; ov.style.inset='0'; ov.style.background='rgba(0,0,0,0.35)'; ov.style.zIndex='9999';
    ov.addEventListener('click', function(e){ if (e.target===ov) document.body.removeChild(ov); });
    var box = document.createElement('div'); box.id='ep_box';
    box.style.position='absolute'; box.style.top='10%'; box.style.left='50%'; box.style.transform='translateX(-50%)';
    box.style.background='#fff'; box.style.borderRadius='12px'; box.style.padding='16px'; box.style.minWidth='360px'; box.style.maxWidth='92%'; box.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
    ov.appendChild(box);

    var title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='8px'; title.textContent='Email / Print';
    var note = document.createElement('div'); note.style.fontSize='13px'; note.style.color='#555'; note.style.marginBottom='10px'; note.textContent='Choose recipients to email selected log entries, or print the selection.';
    box.appendChild(title); box.appendChild(note);

    var contacts = loadContacts();

    var listWrap = document.createElement('div'); listWrap.style.maxHeight='220px'; listWrap.style.overflowY='auto'; listWrap.style.border='1px solid #e5e7eb'; listWrap.style.borderRadius='8px'; listWrap.style.padding='8px'; listWrap.style.fontSize='16px';
    box.appendChild(listWrap);

    function renderContacts(){
      listWrap.innerHTML='';
      if (!contacts || !contacts.length){
        var empty=document.createElement('div'); empty.style.color='#666'; empty.textContent='No saved contacts yet.';
        listWrap.appendChild(empty);
        return;
      }
      contacts.forEach(function(c, idx){
        var row=document.createElement('div'); row.style.display='grid'; row.style.gridTemplateColumns='auto 1fr auto'; row.style.alignItems='center'; row.style.gap='8px'; row.style.padding='4px 2px';
        var cb=document.createElement('input'); cb.type='checkbox'; cb.className='ep_rec'; cb.value=c.email; cb.setAttribute('data-index', idx);
        var txt=document.createElement('span'); txt.textContent=(c.name||c.email)+' <'+c.email+'>';
        var del=document.createElement('button'); del.className='btn'; del.textContent='Remove';
        del.addEventListener('click', function(){
          contacts.splice(idx,1); saveContacts(contacts); renderContacts();
        });
        row.appendChild(cb); row.appendChild(txt); row.appendChild(del); listWrap.appendChild(row);
      });
    }
    renderContacts();

    // Add new contact (Name + Email)
    var addRow=document.createElement('div'); addRow.style.marginTop='10px'; addRow.style.display='grid'; addRow.style.gridTemplateColumns='1fr 1fr auto'; addRow.style.gap='6px';
    var nameInput=document.createElement('input'); nameInput.placeholder='Name'; nameInput.type='text'; nameInput.style.fontSize='16px'; nameInput.style.padding='10px 12px'; nameInput.style.borderRadius='8px';
    var emailInput=document.createElement('input'); emailInput.placeholder='email@domain'; emailInput.type='email'; emailInput.style.fontSize='16px'; emailInput.style.padding='10px 12px'; emailInput.style.borderRadius='8px';
    var addBtn=document.createElement('button'); addBtn.textContent='Add'; addBtn.className='btn';
    addBtn.addEventListener('click', function(){
      var nm=(nameInput.value||'').trim(); var em=(emailInput.value||'').trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ alert('Enter a valid email'); return; }
      if(!nm) nm = em;
      contacts.push({name:nm, email:em});
      saveContacts(contacts); nameInput.value=''; emailInput.value=''; renderContacts();
    });
    addRow.appendChild(nameInput); addRow.appendChild(emailInput); addRow.appendChild(addBtn); box.appendChild(addRow);

    // Actions
    var actions=document.createElement('div'); actions.style.marginTop='14px'; actions.style.display='flex'; actions.style.gap='8px'; actions.style.justifyContent='flex-end';
    var btnEmail=document.createElement('button'); btnEmail.textContent='Send Email'; btnEmail.className='btn primary';
    var btnPrint=document.createElement('button'); btnPrint.textContent='Print Selection'; btnPrint.className='btn';
    var btnCancel=document.createElement('button'); btnCancel.textContent='Cancel'; btnCancel.className='btn';
    actions.appendChild(btnCancel); actions.appendChild(btnPrint); actions.appendChild(btnEmail); box.appendChild(actions);

    btnCancel.addEventListener('click', function(){ document.body.removeChild(ov); });
    btnEmail.addEventListener('click', async function(){
      var picks = qsa('.ep_rec', listWrap).filter(function(x){return x.checked;}).map(function(x){return x.value;});
      if(!picks.length){ alert('Pick at least one recipient.'); return; }
      var notes = getSelectedNotes(); if(!notes.length){ alert('Select at least one log entry.'); return; }
      var info = jobInfo();
      var subj = (info.name || currentJobTitle()) + ' - Log Update';
      var bodyLines = notes.map(function(n){ return n.date + '\n' + n.text + '\n'; });
      var textBody = bodyLines.join('\n');
      var info2 = jobInfo();
      function esc(s){ return String(s||'').replace(/[&<>]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]); }); }
      var headerHtml = '';
      if (info2.name) headerHtml += '<div style="font-size:16px;font-weight:600;margin:0 0 6px">'+esc(info2.name)+'</div>';
      var meta=[]; if(info2.address) meta.push('Address: '+esc(info2.address)); if(info2.po) meta.push('PO: '+esc(info2.po)); if(info2.stage) meta.push('Stage: '+esc(info2.stage));
      if (meta.length) headerHtml += '<div style="color:#555;font-size:13px;margin:0 0 12px">'+meta.join(' • ')+'</div>';
      
      
      var htmlBody = headerHtml + notes.map(function(n){
        return '<div class="log-entry">'
          + '<div><strong>' + esc(info2.name || '') + '</strong></div>'
          + '<div>Address: ' + esc(info2.address || '') + '</div>'
          + '<div>PO: ' + esc(info2.po || '') + '</div>'
          + '<div>Status: ' + esc(info2.stage || '') + '</div>'
          + '<div>Date: ' + esc(n.date || '') + '</div>'
          + '<div><strong>Job Notes</strong></div>'
          + '<div>' + esc(n.text || '') + '</div>'
          + '</div><hr>';
      }).join('');
    

      try{
        var resp = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: picks, subject: subj, text: textBody, html: htmlBody })
        });
        if (!resp.ok) {
          var txt = await resp.text();
          alert('Send failed: ' + txt);
          return;
        }
        alert('Email sent!');
        document.body.removeChild(ov);
      } catch(e){
        alert('Send failed: ' + (e && e.message ? e.message : String(e)));
      }
    });
btnPrint.addEventListener('click', function(){
      var notes=getSelectedNotes(); if(!notes.length){ alert('Select at least one log entry.'); return; }
      var w=window.open('','_blank');
      var info = jobInfo();
      var title = info.name || currentJobTitle();
      var html='<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;padding:24px}h1{font-size:20px;margin:0 0 6px} .meta{color:#555;margin:0 0 14px} .n{margin:0 0 10px;padding:10px 12px;border:1px solid #ddd;border-radius:8px} .d{font-weight:700;margin-bottom:4px}</style></head><body><h1>'+ title +'</h1>';
      var meta=[]; if(info.address) meta.push('Address: '+info.address); if(info.po) meta.push('PO: '+info.po); if(info.stage) meta.push('Stage: '+info.stage);
      if(meta.length) html += '<div class="meta">'+ meta.join(' • ') +'</div>';
      notes.forEach(function(n){ html+='<div class=\"n\"><div class=\"d\">'+n.date+'</div><div class=\"t\">'+n.text.replace(/[&<>]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]);})+'</div></div>'; });
      html+='<script>window.print();<\/script></body></html>';
      w.document.open(); w.document.write(html); w.document.close();
    });

    document.body.appendChild(ov);
  }

  // ---- Intercept original button (do not remove) ----
  function matchPrintNode(n){
    if(!n) return false;
    if(n.id==='print-job') return true;
    var t=(n.textContent||'').trim().toLowerCase();
    return t==='print selected' || t==='print';
  }
  function interceptEvents(){
    function handle(e){
      try{
        var t = e.target && e.target.closest ? e.target.closest('button, a[role=\"button\"], #print-job') : e.target;
        if (matchPrintNode(t)){
          e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
          openModal();
        }
      }catch(_){}
    }
    ['touchstart','pointerdown','mousedown','click'].forEach(function(type){
      document.addEventListener(type, handle, true);
    });
  }
  function renameButton(){
    var btn = $('print-job'); if (btn) btn.textContent = 'Email/Print';
    qsa('button, a[role=\"button\"]').forEach(function(n){ var t=(n.textContent||'').trim().toLowerCase(); if(t==='print selected') n.textContent='Email/Print'; });
  }

  onReady(function(){
    renameButton();
    interceptEvents();
    var tries=0, t=setInterval(function(){ renameButton(); tries++; if(tries>=6) clearInterval(t); }, 500);
  });
})();
  
function jobInfo(){
    function gv(id){
      var el = document.getElementById(id);
      if (!el) return '';
      var tag = (el.tagName||'').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') return (el.value||'').trim();
      if (tag === 'SELECT') {
        var t = (el.selectedOptions && el.selectedOptions[0] && (el.selectedOptions[0].text||'')) || (el.value||'');
        return String(t).trim();
      }
      return (el.textContent||'').trim();
    }
    var name = gv('job-name') || gv('job-summary') || currentJobTitle();
    var address = gv('job-address');
    var po = gv('job-po');
    var stage = gv('job-stage');
    var lines = [];
    if (name) lines.push('Job: ' + name);
    if (address) lines.push('Address: ' + address);
    if (po) lines.push('PO: ' + po);
    if (stage) lines.push('Stage: ' + stage);
    return { name: name, address: address, po: po, stage: stage, lines: lines };
  }
    var name = gt('job-name') || gt('job-summary') || currentJobTitle();
    var address = gt('job-address');
    var po = gt('job-po');
    var stage = gt('job-stage');
    var lines = [];
    if (name) lines.push('Job: ' + name);
    if (address) lines.push('Address: ' + address);
    if (po) lines.push('PO: ' + po);
    if (stage) lines.push('Stage: ' + stage);
    return { name: name, address: address, po: po, stage: stage, lines: lines };
  }
