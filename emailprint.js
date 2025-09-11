
(function(){
  if (window.__emailPrintLoaded) return; window.__emailPrintLoaded = true;

  function $(id){ return document.getElementById(id); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function loadContacts(){
    var keys = ['binder_contacts','pe_contacts','pe35_contacts','contacts'];
    var items = [];
    keys.forEach(function(k){
      try{
        var raw = localStorage.getItem(k);
        if (!raw) return;
        var val;
        try { val = JSON.parse(raw); } catch(e){ val = raw; }
        if (Array.isArray(val)) items = items.concat(val);
        else if (typeof val === 'string') {
          val.split(/[,\n]/).forEach(function(s){ s=s.trim(); if (s) items.push(s); });
        }
      }catch(e){}
    });
    // dedupe + normalize into {name,email}
    var seen = {};
    var out = [];
    function parseOne(s){
      if (typeof s === 'object' && s && s.email) return { name: s.name || s.email, email: s.email };
      var m = String(s).match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
      if (m) return { name: m[1] || m[2], email: m[2] };
      // plain email
      if (/@/.test(String(s))) return { name: String(s), email: String(s) };
      return null;
    }
    items.forEach(function(s){
      var obj = parseOne(s);
      if (!obj) return;
      var key = obj.email.toLowerCase();
      if (seen[key]) return; seen[key] = true;
      out.push(obj);
    });
    return out;
  }

  function saveContacts(list){
    try{ localStorage.setItem('binder_contacts', JSON.stringify(list)); }catch(e){}
  }

  function getSelectedNotes(){
    var items = qsa('#notes-list .note-item');
    var sel = [];
    items.forEach(function(it){
      var dateEl = it.querySelector('.note-date');
      if (!dateEl) return;
      var cb = dateEl.querySelector('input.pe_row_chk');
      if (!cb || !cb.checked) return;
      var dateText = (dateEl.textContent || '').replace(/\s*\d{1,2}:\d{2}.*$/, '').trim();
      var body = it.querySelector('.note-body');
      var bodyText = body ? body.innerText : '';
      sel.push({date: dateText, text: bodyText});
    });
    return sel;
  }

  function currentJobTitle(){
    var h = document.querySelector('h3.job-title, h2.job-title, h1.job-title');
    if (h) return (h.textContent||'').trim();
    // fallback: first strong title in the main panel
    var main = document.querySelector('#job-title') || document.querySelector('.job-header');
    if (main) return (main.textContent||'').trim();
    return document.title || 'Job Log';
  }

  function openModal(){
    // build overlay
    var ov = document.createElement('div'); ov.id='ep_overlay';
    ov.style.position='fixed'; ov.style.inset='0'; ov.style.background='rgba(0,0,0,0.35)'; ov.style.zIndex='9999';
    ov.addEventListener('click', function(e){ if (e.target===ov) document.body.removeChild(ov); });

    var box = document.createElement('div'); box.id='ep_box';
    box.style.position='absolute'; box.style.top='10%'; box.style.left='50%'; box.style.transform='translateX(-50%)';
    box.style.background='#fff'; box.style.borderRadius='12px'; box.style.padding='16px'; box.style.minWidth='340px'; box.style.maxWidth='92%'; box.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
    ov.appendChild(box);

    var title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='8px'; title.textContent='Email / Print';
    box.appendChild(title);

    var note = document.createElement('div'); note.style.fontSize='13px'; note.style.color='#555'; note.style.marginBottom='10px';
    note.textContent = 'Choose recipients to email selected log entries, or print the selection.';
    box.appendChild(note);

    // contacts area
    var contacts = loadContacts();
    var listWrap = document.createElement('div'); listWrap.style.maxHeight='220px'; listWrap.style.overflowY='auto'; listWrap.style.border='1px solid #e5e7eb'; listWrap.style.borderRadius='8px'; listWrap.style.padding='8px';
    box.appendChild(listWrap);

    function renderContacts(){
      listWrap.innerHTML='';
      if (!contacts || !contacts.length){
        var empty = document.createElement('div'); empty.style.color='#666'; empty.textContent='No saved contacts yet.';
        listWrap.appendChild(empty);
      } else {
        contacts.forEach(function(c, idx){
          var row = document.createElement('label'); row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px'; row.style.padding='4px 2px';
          var cb=document.createElement('input'); cb.type='checkbox'; cb.className='ep_rec'; cb.value=c.email; cb.setAttribute('data-index', idx);
          var txt=document.createElement('span'); txt.textContent = c.name + ' <' + c.email + '>';
          row.appendChild(cb); row.appendChild(txt); listWrap.appendChild(row);
        });
      }
    }
    renderContacts();

    // add-new row
    var addRow = document.createElement('div'); addRow.style.marginTop='10px'; addRow.style.display='flex'; addRow.style.gap='6px';
    var addInput = document.createElement('input'); addInput.placeholder='name <email@domain>'; addInput.style.flex='1'; addInput.type='text';
    var addBtn = document.createElement('button'); addBtn.textContent='Add'; addBtn.className='btn';
    addBtn.addEventListener('click', function(){
      var v = (addInput.value||'').trim(); if (!v) return;
      var m = v.match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
      if (!m){ alert('Use: Name <email@domain>'); return; }
      contacts.push({ name: m[1]||m[2], email: m[2] });
      saveContacts(contacts); addInput.value=''; renderContacts();
    });
    addRow.appendChild(addInput); addRow.appendChild(addBtn); box.appendChild(addRow);

    // actions
    var actions = document.createElement('div'); actions.style.marginTop='14px'; actions.style.display='flex'; actions.style.gap='8px'; actions.style.justifyContent='flex-end';
    var btnEmail = document.createElement('button'); btnEmail.textContent='Send Email'; btnEmail.className='btn primary';
    var btnPrint = document.createElement('button'); btnPrint.textContent='Print Selection'; btnPrint.className='btn';
    var btnCancel = document.createElement('button'); btnCancel.textContent='Cancel'; btnCancel.className='btn';
    actions.appendChild(btnCancel); actions.appendChild(btnPrint); actions.appendChild(btnEmail); box.appendChild(actions);

    btnCancel.addEventListener('click', function(){ document.body.removeChild(ov); });

    btnEmail.addEventListener('click', function(){
      var picks = qsa('.ep_rec', listWrap).filter(function(x){ return x.checked; }).map(function(x){ return x.value; });
      if (!picks.length){ alert('Pick at least one recipient.'); return; }
      var notes = getSelectedNotes();
      if (!notes.length){ alert('Select at least one log entry.'); return; }
      var subj = currentJobTitle() + ' - Log Update';
      var bodyLines = notes.map(function(n){ return n.date + '\\n' + n.text + '\\n'; });
      var body = encodeURIComponent(bodyLines.join('\\n'));
      var to = encodeURIComponent(picks.join(','));
      var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subj) + '&body=' + body;
      window.location.href = href;
    });

    btnPrint.addEventListener('click', function(){
      var notes = getSelectedNotes();
      if (!notes.length){ alert('Select at least one log entry.'); return; }
      var w = window.open('', '_blank');
      var html = '<!doctype html><html><head><meta charset="utf-8"><title>Print</title>' +
        '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;padding:24px} h1{font-size:18px;margin:0 0 12px} .n{margin:0 0 10px; padding:10px 12px; border:1px solid #ddd; border-radius:8px} .d{font-weight:700; margin-bottom:4px}</style>' +
        '</head><body><h1>' + (currentJobTitle()) + ' - Selected Logs</h1>';
      notes.forEach(function(n){ html += '<div class="n"><div class="d">' + n.date + '</div><div class="t">' + n.text.replace(/[&<>]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]); }) + '</div></div>'; });
      html += '<script>window.print();<\/script></body></html>';
      w.document.open(); w.document.write(html); w.document.close();
    });

    document.body.appendChild(ov);
  }

  function hookButton(){
    function attachTo(node){
      if (!node || node.__epHooked) return;
      node.__epHooked = true;
      node.addEventListener('click', function(e){
        try{ e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); }catch(_){}
        openModal();
      }, {capture:true, passive:false});
      node.textContent = 'Email/Print';
      if (node.tagName === 'A') { try{ node.setAttribute('href', 'javascript:void(0)'); }catch(_){ } }
      if (!node.getAttribute('type')) node.setAttribute('type','button');
    }
    function replacePrint(node){
      if (!node) return null;
      var repl = document.createElement('button');
      repl.className = node.className || '';
      repl.id = 'email-print-btn';
      repl.type = 'button';
      try{ repl.style.cssText = node.style.cssText; }catch(_){}
      repl.textContent = 'Email/Print';
      // Replace in DOM so any old listeners on the original cannot fire
      if (node.parentNode){
        node.parentNode.replaceChild(repl, node);
      } else {
        // As a fallback, clear all attributes/handlers on the original and reuse it
        try{
          node.removeAttribute('onclick');
          node.removeAttribute('href');
          node.textContent = 'Email/Print';
          node.id = 'email-print-btn';
          repl = node;
        }catch(_){}
      }
      // Ensure no default action occurs
      try{ repl.addEventListener('click', function(e){ e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); openModal(); }, {capture:true, passive:false}); }catch(_){}
      return repl;
    }
    var btn = document.getElementById('print-job');
    if (btn && !document.getElementById('email-print-btn')) {
      replacePrint(btn);
      return;
    }
    // Fallback: search for a visible button with "Print selected" or "Print"
    var nodes = Array.prototype.slice.call(document.querySelectorAll('button, a[role="button"]'));
    var cand = nodes.find(function(n){
      var t=(n.textContent||'').trim().toLowerCase();
      return (t==='print selected' || t==='print') && !n.__epHooked;
    });
    if (cand) {
      replacePrint(cand);
      return;
    }
    // As a last resort, if we already created email-print-btn but it's not hooked, attach
    var ep = document.getElementById('email-print-btn');
    if (ep && !ep.__epHooked) attachTo(ep);
  })();
