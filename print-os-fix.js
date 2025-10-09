// fixes/print-os-fix.js — robust OS print preview for Notes (iPad/Safari friendly)
(function(){
  if (window.__printOSFixInit) return; window.__printOSFixInit = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  // Try to extract the "active note" content. Adjust selectors if your app uses different ids.
  function getActiveNoteHTML(){
    // Preference: a preview element that already renders the note as HTML
    const preview = $('#notePreview, .note-preview, #activeNotePreview, #printPreview, .print-preview');
    if (preview){
      // Use innerHTML so <img> and formatting render in print
      const html = preview.innerHTML && preview.innerHTML.trim();
      if (html) return html;
    }
    // Fallback: read from the notes textarea/contenteditable
    const notes = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i], [contenteditable="true"]');
    if (notes){
      if ((notes.getAttribute && notes.getAttribute('contenteditable') === 'true') || notes.isContentEditable){
        return notes.innerHTML || notes.textContent || '';
      }
      // If it's a textarea, the value may include HTML snippets we inserted for images
      return notes.value || '';
    }
    // Final fallback: empty
    return '<em>No note content</em>';
  }

  function getPrintTitle(){
    // Use the note title if present; otherwise a generic title
    const titleEl = $('#noteTitle, .note-title, input[name="noteTitle"], #jobTitle, .job-title');
    const t = titleEl ? (titleEl.value || titleEl.textContent || '').trim() : '';
    return t || 'Notes';
  }

  function buildPrintHTML(){
    const content = getActiveNoteHTML();
    const title = getPrintTitle();
    // Basic print styles; add your brand styles here if needed
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height:1.35; }
  .wrap { padding: 16px; }
  h1 { margin:0 0 12px; font-size: 18px; }
  img { max-width: 100%; height: auto; display: block; margin: 8px 0; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${title}</h1>
    <div class="note-body">${content}</div>
  </div>
  <script>
    // Ensure images finish decoding then trigger print
    (function(){
      function whenReady(fn){
        if (document.readyState === 'complete' || document.readyState === 'interactive') return fn();
        document.addEventListener('DOMContentLoaded', fn, {once:true});
      }
      whenReady(function(){
        const imgs = Array.from(document.images || []);
        if (!imgs.length){
          requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ window.focus(); window.print(); }); });
          return;
        }
        let loaded = 0;
        function go(){ requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ window.focus(); window.print(); }); }); }
        imgs.forEach(img => {
          if (img.complete) { if (++loaded === imgs.length) go(); }
          else {
            img.addEventListener('load', ()=>{ if (++loaded === imgs.length) go(); });
            img.addEventListener('error', ()=>{ if (++loaded === imgs.length) go(); });
          }
        });
        // Safety timeout after 1500ms
        setTimeout(go, 1500);
      });
    })();
  </script>
</body>
</html>`;
  }

  function printActiveNote(){
    // Create a separate window for consistent OS print preview
    const html = buildPrintHTML();
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w){
      alert('Popup blocked. Please allow popups for print.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Fallback: if the onload script inside doesn't fire, fire print after a delay
    setTimeout(()=>{ try { w.focus(); w.print(); } catch(e){} }, 2000);
  }

  function isPrintButton(el){
    if (!el) return false;
    const txt = (el.textContent || el.value || '').trim().toLowerCase();
    return txt === 'print' || txt === 'os print' || txt.includes('print');
  }

  function attach(){
    // Delegate: capture clicks on any Print/OS Print buttons
    document.addEventListener('click', function(ev){
      const t = ev.target.closest('button, a, input[type="button"], input[type="submit"]');
      if (!t) return;
      if (!isPrintButton(t)) return;
      // Prevent any existing print handlers that might be mis-timed
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      printActiveNote();
    }, true);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attach, {once:true});
  } else {
    attach();
  }
})();
