
(function(){
  if (window.__emailPrintLoaded) return; window.__emailPrintLoaded = true;

  function $(id){ return document.getElementById(id); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // -------- Modal (unchanged behavior) --------
  function loadContacts(){
    var keys = ['binder_contacts','pe_contacts','pe35_contacts','contacts'];
    var items = []; var seen={};
    keys.forEach(function(k){
      try{
        var raw = localStorage.getItem(k); if (!raw) return;
        var val; try{ val = JSON.parse(raw); }catch(e){ val = raw; }
        if (Array.isArray(val)) items = items.concat(val);
        else if (typeof val === 'string') val.split(/[,\n]/).forEach(function(s){ s=s.trim(); if(s) items.push(s); });
      }catch(_){}
    });
    var out=[];
    function parseOne(s){
      if (typeof s === 'object' && s && s.email) return { name: s.name || s.email, email: s.email };
      var m = String(s).match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
      if (m) return { name: m[1]||m[2], email: m[2] };
      if (/@/.test(String(s))) return { name: String(s), email: String(s) };
      return null;
    }
    items.forEach(function(s){ var o=parseOne(s); if(!o) return; var key=o.email.toLowerCase(); if(seen[key]) return; seen[key]=true; out.push(o); });
    return out;
  }
  function saveContacts(list){ try{ localStorage.setItem('binder_contacts', JSON.stringify(list)); }catch(_){ } }

  function getSelectedNotes(){
    var items = qsa('#notes-list .note-item');
    var sel = [];
    items.forEach(function(it){
      var dateEl = it.querySelector('.note-date'); if (!dateEl) return;
      var cb = dateEl.querySelector('input.pe_row_chk'); if (!cb || !cb.checked) return;
      var dateText = (dateEl.textContent||'').replace(/\s*\d{1,2}:\d{2}.*$/,'').trim();
      var body = it.querySelector('.note-body'); var bodyText = body ? body.innerText : '';
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

  function openModal(){
    var ov = document.createElement('div'); ov.id='ep_overlay';
    ov.style.position='fixed'; ov.style.inset='0'; ov.style.background='rgba(0,0,0,0.35)'; ov.style.zIndex='9999';
    ov.addEventListener('click', function(e){ if (e.target===ov) document.body.removeChild(ov); });
    var box = document.createElement('div'); box.id='ep_box';
    box.style.position='absolute'; box.style.top='10%'; box.style.left='50%'; box.style.transform='translateX(-50%)';
    box.style.background='#fff'; box.style.borderRadius='12px'; box.style.padding='16px'; box.style.minWidth='340px'; box.style.maxWidth='92%'; box.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
    ov.appendChild(box);

    var title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='8px'; title.textContent='Email / Print';
    var note = document.createElement('div'); note.style.fontSize='13px'; note.style.color='#555'; note.style.marginBottom='10px'; note.textContent='Choose recipients to email selected log entries, or print the selection.';
    box.appendChild(title); box.appendChild(note);

    var contacts = loadContacts();
    var listWrap = document.createElement('div'); listWrap.style.maxHeight='220px'; listWrap.style.overflowY='auto'; listWrap.style.border='1px solid #e5e7eb'; listWrap.style.borderRadius='8px'; listWrap.style.padding='8px';
    box.appendChild(listWrap);
    function renderContacts(){
      listWrap.innerHTML='';
      if (!contacts || !contacts.length){ var empty=document.createElement('div'); empty.style.color='#666'; empty.textContent='No saved contacts yet.'; listWrap.appendChild(empty); }
      else {
        contacts.forEach(function(c, idx){
          var row=document.createElement('label'); row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px'; row.style.padding='4px 2px';
          var cb=document.createElement('input'); cb.type='checkbox'; cb.className='ep_rec'; cb.value=c.email; cb.setAttribute('data-index', idx);
          var txt=document.createElement('span'); txt.textContent=c.name+' <'+c.email+'>';
          row.appendChild(cb); row.appendChild(txt); listWrap.appendChild(row);
        });
      }
    }
    renderContacts();

    var addRow=document.createElement('div'); addRow.style.marginTop='10px'; addRow.style.display='flex'; addRow.style.gap='6px';
    var addInput=document.createElement('input'); addInput.placeholder='name <email@domain>'; addInput.style.flex='1'; addInput.type='text';
    var addBtn=document.createElement('button'); addBtn.textContent='Add'; addBtn.className='btn';
    addBtn.addEventListener('click', function(){
      var v=(addInput.value||'').trim(); if(!v) return;
      var m=v.match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/); if(!m){ alert('Use: Name <email@domain>'); return; }
      contacts.push({name:m[1]||m[2], email:m[2]}); saveContacts(contacts); addInput.value=''; renderContacts();
    });
    addRow.appendChild(addInput); addRow.appendChild(addBtn); box.appendChild(addRow);

    var actions=document.createElement('div'); actions.style.marginTop='14px'; actions.style.display='flex'; actions.style.gap='8px'; actions.style.justifyContent='flex-end';
    var btnEmail=document.createElement('button'); btnEmail.textContent='Send Email'; btnEmail.className='btn primary';
    var btnPrint=document.createElement('button'); btnPrint.textContent='Print Selection'; btnPrint.className='btn';
    var btnCancel=document.createElement('button'); btnCancel.textContent='Cancel'; btnCancel.className='btn';
    actions.appendChild(btnCancel); actions.appendChild(btnPrint); actions.appendChild(btnEmail); box.appendChild(actions);

    btnCancel.addEventListener('click', function(){ document.body.removeChild(ov); });
    btnEmail.addEventListener('click', function(){
      var picks=qsa('.ep_rec', listWrap).filter(function(x){return x.checked;}).map(function(x){return x.value;});
      if(!picks.length){ alert('Pick at least one recipient.'); return; }
      var notes=getSelectedNotes(); if(!notes.length){ alert('Select at least one log entry.'); return; }
      var subj=currentJobTitle()+' - Log Update';
      var bodyLines=notes.map(function(n){ return n.date+'\\n'+n.text+'\\n'; });
      var body=encodeURIComponent(bodyLines.join('\\n')); var to=encodeURIComponent(picks.join(','));
      var href='mailto:'+to+'?subject='+encodeURIComponent(subj)+'&body='+body; window.location.href=href;
    });
    btnPrint.addEventListener('click', function(){
      var notes=getSelectedNotes(); if(!notes.length){ alert('Select at least one log entry.'); return; }
      var w=window.open('','_blank');
      var html='<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;padding:24px}h1{font-size:18px;margin:0 0 12px}.n{margin:0 0 10px;padding:10px 12px;border:1px solid #ddd;border-radius:8px}.d{font-weight:700;margin-bottom:4px}</style></head><body><h1>'+ (currentJobTitle()) +' - Selected Logs</h1>';
      notes.forEach(function(n){ html+='<div class="n"><div class="d">'+n.date+'</div><div class="t">'+n.text.replace(/[&<>]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]);})+'</div></div>'; });
      html+='<script>window.print();<\/script></body></html>'; w.document.open(); w.document.write(html); w.document.close();
    });
    document.body.appendChild(ov);
  }

  // -------- Remove legacy print and add our own clean button --------
  function purgeLegacyPrintButtons(){
    var removed = false, refParent = null, refSibling = null, refClass = '';
    var nodes = [];
    var idBtn = $('print-job'); if (idBtn) nodes.push(idBtn);
    qsa('button, a[role="button"]').forEach(function(n){
      var t=(n.textContent||'').trim().toLowerCase();
      if (t==='print selected' || t==='print') nodes.push(n);
    });
    nodes.forEach(function(n){
      if (!refParent && n.parentNode){ refParent = n.parentNode; refSibling = n.nextSibling; refClass = n.className || ''; }
      try{ n.remove(); removed = true; }catch(_){ try{ n.style.display='none'; }catch(__){} }
    });
    return {removed:removed, parent:refParent, sibling:refSibling, klass:refClass};
  }
  function ensureEmailPrintButton(anchor){
    if (document.getElementById('email-print-btn')) return;
    var b=document.createElement('button'); b.id='email-print-btn'; b.type='button'; b.textContent='Email/Print';
    b.className = (anchor && anchor.klass) ? anchor.klass : 'btn';
    b.addEventListener('click', function(e){ e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); openModal(); }, {capture:true, passive:false});
    var parent = anchor && anchor.parent ? anchor.parent : (document.querySelector('.toolbar,.actions,.header') || document.body);
    if (parent){
      if (anchor && anchor.sibling) parent.insertBefore(b, anchor.sibling); else parent.appendChild(b);
    } else {
      document.body.appendChild(b);
    }
  }
  function ensureCorrectButton(){
    var info = purgeLegacyPrintButtons();
    ensureEmailPrintButton(info);
  }

  onReady(function(){
    ensureCorrectButton();
    var tries=0, t=setInterval(function(){ ensureCorrectButton(); tries++; if(tries>=8) clearInterval(t); }, 500);
    try{
      var mo=new MutationObserver(function(){ ensureCorrectButton(); });
      mo.observe(document.body, {childList:true, subtree:true});
    }catch(_){}
  });
})();
