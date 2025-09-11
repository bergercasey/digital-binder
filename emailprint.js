
(function(){
  if (window.__emailPrintLoaded) return; window.__emailPrintLoaded = true;

  function $(id){ return document.getElementById(id); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ---------- Selection ----------
  function getSelectedNotes(){
    var items = qsa('#notes-list .note-item');
    var sel = [];
    items.forEach(function(it){
      var dateEl = it.querySelector('.note-date'); if (!dateEl) return;
      var cb = dateEl.querySelector('input.pe_row_chk'); if (!cb || !cb.checked) return;
      var dateText = (dateEl.textContent||'').replace(/\s*\d{1,2}:\d{2}.*$/, '').trim();
      var body = it.querySelector('.note-text') || it.querySelector('.note-body') || it;
      var bodyText = body ? (body.innerText || body.textContent || '').trim() : '';
      sel.push({date: dateText, text: bodyText});
    });
    return sel;
  }

  // ---------- Job info + header rendering ----------
  function jobInfo(){
    function val(id){ var n = document.getElementById(id); return n ? (n.textContent||'').trim() : ''; }
    var info = {
      name: val('job-name') || (document.querySelector('h3.job-title, h2.job-title, h1.job-title')||{}).textContent || '',
      address: val('job-address'),
      po: val('job-po'),
      stage: val('job-stage'),
      crew: (document.getElementById('job-crew')||{textContent:''}).textContent || ''
    };
    if (info.name && / Stage:| PO:| Crew:/.test(info.name)) {
      info.name = info.name.split(/\s(?:Stage:|PO:|Crew:)/)[0].trim();
    }
    return info;
  }
  function renderHeaderHTML(info){
    function esc(s){ return String(s||'').replace(/[&<>]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]); }); }
    var rows = [];
    if (info.address) rows.push(['Address', info.address]);
    if (info.po) rows.push(['PO', info.po]);
    if (info.stage) rows.push(['Stage', info.stage]);
    if (info.crew) rows.push(['Crew', info.crew]);
    var table = rows.length ? (
      '<table class="meta"><tbody>' + rows.map(function(r){
        return '<tr><th>'+esc(r[0])+'</th><td>'+esc(r[1])+'</td></tr>';
      }).join('') + '</tbody></table>'
    ) : '';
    var title = esc(info.name || 'Job');
    return '<div class="head"><div class="title">'+title+'</div>'+table+'</div>';
  }

  // ---------- Contacts store ----------
  function loadContacts(){
    var raw = null;
    try{ raw = localStorage.getItem('binder_contacts'); }catch(_){}
    var list = [];
    if (raw){
      try{ list = JSON.parse(raw) || []; }catch(_){ list = []; }
    }
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }
  function saveContacts(list){
    try{ localStorage.setItem('binder_contacts', JSON.stringify(list)); }catch(_){}
  }

  // ---------- Modal ----------
  function openModal(){
    var ov = document.createElement('div'); ov.id='ep_overlay';
    ov.style.position='fixed'; ov.style.inset='0'; ov.style.background='rgba(0,0,0,.35)'; ov.style.zIndex='9999';
    ov.addEventListener('click', function(e){ if(e.target===ov) document.body.removeChild(ov); });
    var box = document.createElement('div'); box.id='ep_box';
    box.style.position='absolute'; box.style.top='10%'; box.style.left='50%'; box.style.transform='translateX(-50%)';
    box.style.background='#fff'; box.style.borderRadius='12px'; box.style.padding='16px'; box.style.minWidth='360px'; box.style.maxWidth='92%'; box.style.boxShadow='0 10px 30px rgba(0,0,0,.2)';
    ov.appendChild(box);

    var title=document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='8px'; title.textContent='Email / Print';
    var note=document.createElement('div'); note.style.fontSize='13px'; note.style.color='#555'; note.style.marginBottom='10px'; note.textContent='Choose recipients to email selected log entries, or print the selection.';
    box.appendChild(title); box.appendChild(note);

    var contacts = loadContacts();

    var listWrap=document.createElement('div'); listWrap.style.maxHeight='220px'; listWrap.style.overflowY='auto'; listWrap.style.border='1px solid #e5e7eb'; listWrap.style.borderRadius='8px'; listWrap.style.padding='8px'; listWrap.style.fontSize='16px';
    box.appendChild(listWrap);

    function renderContacts(){
      listWrap.innerHTML='';
      if(!contacts.length){
        var empty=document.createElement('div'); empty.style.color='#666'; empty.textContent='No saved contacts yet.'; listWrap.appendChild(empty);
      }else{
        contacts.forEach(function(c, idx){
          var row=document.createElement('div'); row.style.display='grid'; row.style.gridTemplateColumns='auto 1fr auto'; row.style.alignItems='center'; row.style.gap='8px'; row.style.padding='4px 2px';
          var cb=document.createElement('input'); cb.type='checkbox'; cb.className='ep_rec'; cb.value=c.email; cb.setAttribute('data-index', idx);
          var txt=document.createElement('span'); txt.textContent=(c.name||c.email)+' <'+c.email+'>';
          var del=document.createElement('button'); del.className='btn'; del.textContent='Remove';
          del.addEventListener('click', function(){ contacts.splice(idx,1); saveContacts(contacts); renderContacts(); });
          row.appendChild(cb); row.appendChild(txt); row.appendChild(del); listWrap.appendChild(row);
        });
      }
    }
    renderContacts();

    var addRow=document.createElement('div'); addRow.style.marginTop='10px'; addRow.style.display='grid'; addRow.style.gridTemplateColumns='1fr 1fr auto'; addRow.style.gap='6px';
    var nameInput=document.createElement('input'); nameInput.placeholder='Name'; nameInput.type='text'; nameInput.style.fontSize='16px'; nameInput.style.padding='10px 12px'; nameInput.style.borderRadius='8px';
    var emailInput=document.createElement('input'); emailInput.placeholder='email@domain'; emailInput.type='email'; emailInput.style.fontSize='16px'; emailInput.style.padding='10px 12px'; emailInput.style.borderRadius='8px';
    var addBtn=document.createElement('button'); addBtn.textContent='Add'; addBtn.className='btn';
    addBtn.addEventListener('click', function(){
      var nm=(nameInput.value||'').trim(); var em=(emailInput.value||'').trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ alert('Enter a valid email'); return; }
      if(!nm) nm = em;
      contacts.push({name:nm, email:em}); saveContacts(contacts); nameInput.value=''; emailInput.value=''; renderContacts();
    });
    addRow.appendChild(nameInput); addRow.appendChild(emailInput); addRow.appendChild(addBtn); box.appendChild(addRow);

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
      var subj = (info.name || 'Job') + ' - Log Update';

      // text + html bodies
      var headerTxt = []; if(info.name) headerTxt.push(info.name);
      if(info.address) headerTxt.push('Address: ' + info.address);
      if(info.po) headerTxt.push('PO: ' + info.po);
      if(info.stage) headerTxt.push('Stage: ' + info.stage);
      if(info.crew) headerTxt.push('Crew: ' + info.crew);
      var textBody = headerTxt.join('\n') + '\\n\\n' + notes.map(function(n){ return n.date + '\\n' + n.text + '\\n'; }).join('\\n');

      function esc(s){ return String(s||'').replace(/[&<>]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]); }); }
      var htmlBody = renderHeaderHTML(info) + notes.map(function(n){
        return '<div class="entry"><div class="date">'+esc(n.date)+'</div><div class="text">'+esc(n.text).replace(/\\n/g,'<br>')+'</div></div>';
      }).join('');

      try{
        var resp = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: picks, subject: subj, text: textBody, html: htmlBody })
        });
        if (!resp.ok) { var t = await resp.text(); alert('Send failed: ' + t); return; }
        alert('Email sent!'); document.body.removeChild(ov);
      }catch(e){ alert('Send failed: ' + (e && e.message ? e.message : String(e))); }
    });

    btnPrint.addEventListener('click', function(){
      var notes = getSelectedNotes(); if(!notes.length){ alert('Select at least one log entry.'); return; }
      var info = jobInfo();
      var w = window.open('','_blank');
      var html = '<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>' +
        '*{box-sizing:border-box}' +
        'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;padding:24px;line-height:1.35}' +
        '.title{font-size:18px;font-weight:600;margin:0 0 6px}' +
        'table.meta{border-collapse:collapse;margin:0 0 14px;width:auto}' +
        '.meta th{font-weight:600;text-align:left;color:#555;padding:2px 14px 2px 0;vertical-align:top;font-size:13px;white-space:nowrap}' +
        '.meta td{color:#111;padding:2px 0;font-size:13px}' +
        '.entry{margin:0 0 12px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid}' +
        '.date{font-weight:600;margin-bottom:4px}' +
        '.text{white-space:pre-wrap}' +
      '</style></head><body>' + renderHeaderHTML(info);

      notes.forEach(function(n){
        function esc(s){ return String(s||'').replace(/[&<>]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]);}); }
        html += '<div class="entry"><div class="date">'+esc(n.date)+'</div><div class="text">'+esc(n.text)+'</div></div>';
      });
      html += '<script>window.print();<\/script></body></html>';
      w.document.open(); w.document.write(html); w.document.close();
    });

    document.body.appendChild(ov);
  }

  // ---------- Intercept original Print button ----------
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
    var tries=0, t=setInterval(function(){ renameButton(); tries++; if(tries>=8) clearInterval(t); }, 500);
  });
})();
