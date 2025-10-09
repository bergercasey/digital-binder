// fixes/print-os-fix-v2.js — iOS/Safari reliable print via hidden iframe
(function(){
  if (window.__printOSFixV2) return; window.__printOSFixV2 = true;

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  // Heuristics to find the current note's HTML
  function getActiveNoteHTML(){
    // Prefer a live preview element if your app has one
    const preview = $('#notePreview, .note-preview, #activeNotePreview, #printPreview, .print-preview');
    if (preview){
      const html = (preview.innerHTML || '').trim();
      if (html) return html;
    }
    // Fallback: contenteditable notes
    const ce = $('[contenteditable="true"]');
    if (ce){
      const html = (ce.innerHTML || '').trim();
      if (html) return html;
    }
    // Fallback: notes textarea (may include HTML snippets)
    const ta = $('#notes, #note, textarea[id*="note" i], textarea[name*="note" i]');
    if (ta){
      const val = (ta.value || '').trim();
      if (val){
        // If it looks like plain text, convert newlines to <br>
        const looksHTML = /<\w+[^>]*>|&[a-z]+;/.test(val);
        return looksHTML ? val : val.replace(/\n/g, '<br>');
      }
    }
    return '<em>No note content</em>';
  }

  function getPrintTitle(){
    const titleEl = $('#noteTitle, .note-title, input[name="noteTitle"], #jobTitle, .job-title, h1, h2');
    let t = '';
    if (titleEl){
      t = (titleEl.value || titleEl.textContent || '').trim();
    }
    return t || 'Notes';
  }

  function buildPrintHTML(){
    const content = getActiveNoteHTML();
    const title = getPrintTitle();
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; line-height:1.35; }
  .wrap { padding: 16px; }
  h1 { margin:0 0 12px; font-size:18px; }
  img { max-width:100%; height:auto; display:block; margin:8px 0; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${title}</h1>
    <div class="note-body">${content}</div>
  </div>
  <script>
    (function(){
      function raf2(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
      function go(){ raf2(function(){ try { window.focus(); window.print(); } catch(e){} }); }
      function ready(fn){
        if (document.readyState === 'complete' || document.readyState === 'interactive') return fn();
        document.addEventListener('DOMContentLoaded', fn, {once:true});
      }
      ready(function(){
        var imgs = Array.prototype.slice.call(document.images||[]);
        if (!imgs.length){ return go(); }
        var left = imgs.length;
        function done(){ if (--left<=0) go(); }
        imgs.forEach(function(img){
          if (img.complete) return done();
          img.addEventListener('load', done);
          img.addEventListener('error', done);
        });
        setTimeout(go, 1500); // safety
      });
    })();
  </script>
</body>
</html>`;
  }

  function printViaIframe(){
    // Create (or reuse) a hidden iframe to avoid popup blockers
    var frame = document.getElementById('os-print-frame');
    if (!frame){
      frame = document.createElement('iframe');
      frame.id = 'os-print-frame';
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '1px';
      frame.style.height = '1px';
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';
      document.body.appendChild(frame);
    }
    var doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(buildPrintHTML());
    doc.close();
    // Backup print from parent after a delay
    setTimeout(function(){
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch(e){}
    }, 1800);
  }

  function isPrintButton(el){
    if (!el) return false;
    var txt = (el.textContent || el.value || '').trim().toLowerCase();
    return txt === 'print' || txt === 'os print' || txt.includes('print');
  }

  function attach(){
    document.addEventListener('click', function(ev){
      var t = ev.target && ev.target.closest && ev.target.closest('button, a, input[type="button"], input[type="submit"]');
      if (!t) return;
      if (!isPrintButton(t)) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      printViaIframe();
    }, true);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attach, {once:true});
  } else {
    attach();
  }
})();
