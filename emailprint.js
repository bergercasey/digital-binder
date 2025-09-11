
(function(){
  if (window.__emailPrintLoaded) return; window.__emailPrintLoaded = true;

  function $(id){ return document.getElementById(id); }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ---------- Selected log entries ----------
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

  // ---------- Helpers to pick a sane job name ----------
  function chooseJobName(){
    var cands = [];
    function add(sel){
      var el = q(sel);
      if (el) cands.push((el.textContent||'').replace(/\s+/g,' ').trim());
    }
    add('#job-name'); add('#job-title'); add('.job-title');
    add('.job-header h1'); add('.job-header h2'); add('.job-header h3');
    add('main h1'); add('main h2'); add('main h3');

    // Look near the Email/Print button
    var btn = $('print-job') || (function(){
      var all = qsa('button, a[role="button"]'); 
      for (var i=0;i<all.length;i++){
        var t=(all[i].textContent||'').trim().toLowerCase();
        if (t==='email/print' || t==='print selected' || t==='print') return all[i];
      }
      return null;
    })();
    if (btn){
      var cont = btn.closest('.card, .panel, .section, .container, .content, .box, .wrap, .header') || btn.closest('div');
      if (cont){
        var hh = cont.querySelector('h1,h2,h3,.title');
        if (hh) cands.push((hh.textContent||'').replace(/\s+/g,' ').trim());
      }
    }

    // Filter out headings that are clearly not a job name
    cands = cands.filter(Boolean).filter(function(s){
      var x = s.toLowerCase();
      if (x === 'log' || x === 'logs') return false;
      if (x.indexOf('select all') !== -1) return false;
      if (/^contractors?\b/.test(x)) return false;
      return true;
    });

    // Prefer strings that look like a job (numbers / address / contains hyphen)
    cands.sort(function(a,b){
      function score(s){
        var sc = 0;
        if (/\d/.test(s)) sc += 2;           // has digits (addresses / job numbers)
        if (/\s-\s/.test(s)) sc += 2;        // "101 - 123 Main St"
        sc += Math.min(s.length, 60) / 60;   // longer (up to a point)
        return sc;
      }
      return score(b) - score(a);
    });

    return cands[0] || '';
  }

  // ---------- Job info (robust) ----------
  function jobInfo(){
    function val(id){ var n = document.getElementById(id); return n ? (n.textContent||'').trim() : ''; }
    function pickFromText(label, text){
      var m = String(text||'').match(new RegExp(label+':\\s*([^]+?)(?=\\s(?:Stage:|PO:|Crew:|Address:|Last updated:|$))','i'));
      return m ? m[1].trim() : '';
    }
    function firstNonEmpty(arr){ for (var i=0;i<arr.length;i++){ var s=arr[i]; if (s && String(s).trim()) return String(s).trim(); } return ''; }

    var name = val('job-name') || chooseJobName();
    var address = val('job-address');
    var po = val('job-po');
    var stage = val('job-stage');
    var crew = (document.getElementById('job-crew')||{textContent:''}).textContent || '';

    var host = q('#job-header, .job-header') || ( $('print-job') ? $('print-job').closest('.card, .panel, .section, .container') : null );
    var headerText = host ? (host.textContent||'') : document.body.textContent || '';

    address = firstNonEmpty([address, pickFromText('Address', headerText)]);
    if (!address){
      var mAddr = headerText.match(/\b\d{1,6}\s+[^,]+,\s*[A-Za-z][A-Za-z .-]+(?:,\s*[A-Z]{2})?/);
      if (mAddr) address = mAddr[0];
    }
    po = firstNonEmpty([po, pickFromText('PO', headerText)]);
    stage = firstNonEmpty([stage, pickFromText('Stage', headerText)]);
    crew = firstNonEmpty([crew, pickFromText('Crew', headerText)]);

    if (name && / Stage:| PO:| Crew:| Address:/i.test(name)) {
      name = name.split(/\s(?:Stage:|PO:|Crew:|Address:)/i)[0].trim();
    }
    if (!name) name = document.title || 'Job';
    return { name:name, address:address, po:po, stage:stage, crew:crew };
  }

  function renderHeaderHTML(info){
    function esc(s){ return String(s||'').replace(/[&<>]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]); }); }
    var rows=[];
    if(info.address) rows.push(['Address', info.address]);
    if(info.po) rows.push(['PO', info.po]);
    if(info.stage) rows.push(['Stage', info.stage]);
    if(info.crew) rows.push(['Crew', info.crew]);
    var table = rows.length ? ('<table class="meta"><tbody>'+rows.map(function(r){return '<tr><th>'+esc(r[0])+'</th><td>'+esc(r[1])+'</td></tr>';}).join('')+'</tbody></table>') : '';
    return '<div class="head"><div class="title">'+esc(info.name||'Job')+'</div>'+table+'</div>';
  }

  // ---------- Contacts store ----------
  function parseContact(s){
    if (typeof s === 'object' && s && s.email) return {name: s.name || s.email, email: s.email};
    var m = String(s).match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
    if (m) return {name: m[1] || m[2], email: m[2]};
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s))) return {name: String(s), email: String(s)};
    return null;
  }
  function loadContacts(){
    var keys = ['binder_contacts','pe_contacts','pe35_contacts','contacts'];
    var seen = {}, out = [];
    keys.forEach(function(k){
      try{
        var raw = localStorage.getItem(k); if (!raw) return;
        var val; try{ val = JSON.parse(raw); } catch(e){ val = raw; }
        var arr = Array.isArray(val) ? val : (typeof val === 'string' ? val.split(/[,\n]/) : []);
        arr.forEach(function(s){ var o = parseContact(s); if(o && !seen[o.email.toLowerCase()]){ seen[o.email.toLowerCase()] = true; out.push(o); } });
      }catch(_){}
    });
    return out;
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

      var headerTxt=[]; if(info.name) headerTxt.push(info.name);
      if(info.address) headerTxt.push('Address: '+info.address);
      if(info.po) headerTxt.push('PO: '+info.po);
      if(info.stage) headerTxt.push('Stage: '+info.stage);
      if(info.crew) headerTxt.push('Crew: '+info.crew);
      var textBody = headerTxt.join('\\n') + '\\n\\n' + notes.map(function(n){ return n.date + '\\n' + n.text + '\\n'; }).join('\\n');

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
