
(function(){
  if (window.__checksLoaded) return; window.__checksLoaded = true;
  function $(id){ return document.getElementById(id); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function injectStyles(){
    if (document.getElementById('checks-css')) return;
    var css = '.note-date{display:inline-flex;align-items:center;gap:6px} .note-date input.pe_row_chk{margin-left:6px} .pe-inline{margin-left:10px; font-weight:400; color:var(--ink);}';
    var s = document.createElement('style'); s.id = 'checks-css'; s.textContent = css; document.head.appendChild(s);
  }
  function findLogHeading(){
    var heads = qsa('h1,h2,h3,h4');
    for (var i=0;i<heads.length;i++){ var t=(heads[i].textContent||'').trim().toLowerCase(); if (t==='log') return heads[i]; }
    var cont = $('notes-list'); if (cont){ var n=cont.previousElementSibling, steps=0; while(n && steps<4){ if(((n.textContent||'').trim().toLowerCase()).indexOf('log')!==-1) return n; n=n.previousElementSibling; steps++; } }
    return null;
  }
  function ensureSelectAllInline(head, container){
    if (!head || document.getElementById('pe_sel_all')) return;
    var span=document.createElement('span'); span.className='pe-inline';
    var cb=document.createElement('input'); cb.type='checkbox'; cb.id='pe_sel_all';
    span.appendChild(cb); span.appendChild(document.createTextNode(' Select all'));
    head.appendChild(span);
    cb.addEventListener('change', function(){
      qsa('input.pe_row_chk', container).forEach(function(x){ x.checked = cb.checked; });
    });
  }
  function ensureRowCheckboxes(container){
    var dates = qsa('#notes-list .note-date, .note-item .note-date'); if(!dates.length && container) dates = qsa('.note-date', container);
    for (var i=0;i<dates.length;i++){ var d=dates[i]; if (d.querySelector('input.pe_row_chk')) continue; var c=document.createElement('input'); c.type='checkbox'; c.className='pe_row_chk'; d.appendChild(c); }
  }
  function boot(){
    injectStyles();
    var container = $('notes-list') || document.querySelector('.notes') || document.querySelector('.logs') || document.body;
    var head = findLogHeading();
    ensureSelectAllInline(head, container);
    ensureRowCheckboxes(container);
    try{
      var mo=new MutationObserver(function(){ ensureRowCheckboxes(container); });
      mo.observe(container, {childList:true, subtree:true});
      var tries=0, t=setInterval(function(){ tries++; ensureRowCheckboxes(container); if(tries>=6) clearInterval(t); }, 500);
    }catch(_){}
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();