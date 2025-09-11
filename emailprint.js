
/* Clean rebuild of emailprint.js
 * - Do NOT change selection UI or email function endpoints.
 * - Only handle: wiring the Email/Print button, and the PRINT/EMAIL layouts.
 * - Header layout: Job name; Address (own line); then list of Stage, PO, Crew, Updated.
 */
(function(){
  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $all(sel, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }
  function txt(n){ return n ? (n.innerText || n.textContent || '').trim() : ''; }
  function esc(s){ return String(s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function on(el, ev, fn, capture){ if(el) el.addEventListener(ev, fn, !!capture); }

  function jobInfo(){
    function gt(id){ return txt(document.getElementById(id)); }
    var summary = gt('job-summary');
    var name = gt('job-name') || txt($('.job-title')) || txt($('h1')) || (summary ? (summary.split(/(?:Stage:|PO:|Crew:|Last updated:)/)[0]||'').trim() : document.title);
    var address = gt('job-address');
    var po = gt('job-po'); if(!po && summary){ var m = summary.match(/PO:\s*([^|•\n]+)/i); if(m) po = m[1].trim(); }
    var stage = gt('job-stage'); if(!stage && summary){ var m2 = summary.match(/Stage:\s*([^|•\n]+)/i); if(m2) stage = m2[1].trim(); }
    if(stage && /bid.?rough.?in.?trim.?complete/i.test(stage)){
      var body = (document.body.innerText||''); var m3 = body.match(/Stage:\s*(Bid|Rough-?in|Trim|Complete)\b/i);
      if(m3) stage = m3[1].replace(/Rough ?in/i,'Rough-in');
    }
    var crew = '', updated='';
    if(summary){ var mC = summary.match(/Crew:\s*([^|•\n]+)/i); if(mC) crew = mC[1].trim(); var mU = summary.match(/Last updated:\s*([^\n]+)/i); if(mU) updated = mU[1].trim(); }
    return { name, address, po, stage, crew, updated };
  }

  function renderHeaderHTML(info){
    var items=[];
    if(info.stage)   items.push('<li><b>Stage:</b> '+esc(info.stage)+'</li>');
    if(info.po)      items.push('<li><b>PO:</b> '+esc(info.po)+'</li>');
    if(info.crew)    items.push('<li><b>Crew:</b> '+esc(info.crew)+'</li>');
    if(info.updated) items.push('<li><b>Updated:</b> '+esc(info.updated)+'</li>');
    return '<div class="head"><div class="title">'+ esc(info.name||'Job') +'</div>'
      + (info.address ? '<div class="addr">'+ esc(info.address) +'</div>' : '')
      + (items.length ? '<ul class="meta-list">'+ items.join('') +'</ul>' : '')
      + '</div>';
  }

  function getSelectedNotesSafe(){
    if (typeof getSelectedNotes === 'function') { try { return getSelectedNotes(); } catch(_) {} }
    var rows = $all('input[type=checkbox]:checked').map(cb => cb.closest('.log-row') || cb.closest('.log') || cb.closest('li') || cb.closest('div'));
    var notes=[]; rows.forEach(function(r){ if(!r) return; var date = txt($('.date', r)) || txt($('.log-date', r)) || (txt(r).match(/\d{4}-\d{2}-\d{2}/)||[''])[0]; var textEl = $('.text', r) || $('.log-text', r); var text = textEl ? txt(textEl) : txt(r).replace(date,'').trim(); if(date || text) notes.push({date, text}); });
    return notes;
  }

  function printSelected(){
    var notes = getSelectedNotesSafe();
    if(!notes.length){ alert('Select at least one log entry.'); return; }
    var info = jobInfo();
    var w = window.open('', '_blank');
    var css = '*{box-sizing:border-box}'
      + 'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;padding:16px;line-height:1.35}'
      + '.head{border-bottom:1px solid #ddd;margin:0 0 8px;padding:0 0 6px}'
      + '.title{font-size:16px;font-weight:700;margin:0 0 6px}'
      + '.addr{margin:2px 0 6px;color:#333;font-size:12px}'
      + '.meta-list{list-style:none;margin:0;padding:0;font-size:12px;color:#111}'
      + '.meta-list li{margin:2px 0}'
      + '.entry{margin:0 0 10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid}'
      + '.date{font-weight:600;margin-bottom:4px}'
      + '.text{white-space:pre-wrap}';
    var html='<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>'+css+'</style></head><body>'
      + renderHeaderHTML(info);
    notes.forEach(function(n){ html += '<div class="entry"><div class="date">'+esc(n.date)+'</div><div class="text">'+esc(n.text)+'</div></div>'; });
    html += '<script>window.print();<\/script></body></html>';
    w.document.open(); w.document.write(html); w.document.close();
  }

  function isEmailPrintButton(n){
    if(!n || (n.closest && n.closest('#ep_box'))) return false;
    var t=(n.textContent||n.value||'').trim().toLowerCase();
    return t==='email/print' || (t.includes('email') && t.includes('print'));
  }

  function bindButtons(){
    var main = Array.prototype.find.call(document.querySelectorAll('button, a, .btn, [role="button"]'), isEmailPrintButton);
    if (main && !main.__ep_bound){ main.__ep_bound=true; on(main,'click',function(e){ e.preventDefault(); e.stopPropagation(); try{ if(typeof openModal==='function') openModal(); }catch(_){} },true); }
    var modal = document.getElementById('ep_box');
    if (modal){
      var pbtn = Array.prototype.find.call(modal.querySelectorAll('button, a'), function(b){ var t=(b.textContent||b.value||'').trim().toLowerCase(); return t==='print' || t==='print selected' || t==='print logs'; });
      if(pbtn && !pbtn.__ep_bound){ pbtn.__ep_bound=true; on(pbtn,'click',function(e){ e.preventDefault(); e.stopPropagation(); printSelected(); },true); }
    }
  }

  try{
    var _orig = window.print;
    window.print = function(){ try{ if(typeof openModal==='function') openModal(); }catch(_){} };
    document.addEventListener('keydown', function(e){ var k=(e.key||'').toLowerCase(); if((e.ctrlKey||e.metaKey)&&k==='p'){ e.preventDefault(); e.stopPropagation(); try{ if(typeof openModal==='function') openModal(); }catch(_){} } }, true);
  }catch(_){}

  function handle(e){
    try{
      if(e.target && e.target.closest && e.target.closest('#ep_box')) return;
      var t = e.target && e.target.closest ? e.target.closest('button, a[role="button"], .btn, a') : e.target;
      if(isEmailPrintButton(t)){ e.preventDefault(); e.stopPropagation(); try{ if(typeof openModal==='function') openModal(); }catch(_){} }
    }catch(_){}
  }
  ['click','touchstart','pointerdown','mousedown'].forEach(function(ev){ document.addEventListener(ev, handle, true); });

  var tries=0, timer=setInterval(function(){ try{ bindButtons(); }catch(_){ } if(++tries>20) clearInterval(timer); }, 300);
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', bindButtons, {once:true}); } else { bindButtons(); }

  window.__ep_printSelected = printSelected;
})();
