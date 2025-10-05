
// email-send-style.js
// Ensures outgoing email HTML matches the on-screen preview (fonts, spacing, bullets, note boxes).
// Drop this in and include AFTER emailprint-preview.js.
(function(){
  function prepareEmailHtml(inner){
    // Minimal, email-client-friendly CSS
    var css = [
      "body{margin:0;padding:0;}", 
      ".mail-wrap{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,Apple Color Emoji,Segoe UI Emoji;color:#111;line-height:1.45;font-size:14px;padding:12px;}",
      ".ep-name{font-weight:800;font-size:18px;margin:0 0 8px 0;}",
      ".ep-note{margin:12px 0;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;}",
      ".ep-ts{font-size:12px;color:#6b7280;margin-bottom:4px;}",
      ".ep-note p{margin:6px 0;}",
      ".ep-note ul{margin:6px 0;padding-left:20px;list-style:disc;}",
      ".ep-note ol{margin:6px 0;padding-left:20px;list-style:decimal;}",
      "a{color:inherit;text-decoration:underline;}",
      "div{margin:2px 0;}"
    ].join("");
    return "<!doctype html><html><head><meta charset='utf-8'><title>Job Update</title><meta name='x-apple-disable-message-reformatting' content='true'><style>"+css+"</style></head><body><div class='mail-wrap'>"+inner+"</div></body></html>";
  }

  function collectRecipients(){
    var to = Array.from(document.querySelectorAll('#ep-mail-favs .ep-fav:checked')).map(function(el){ return el.value; });
    var extraEl = document.getElementById('ep-add-email');
    var extra = (extraEl && extraEl.value || "").trim();
    if (extra) to.push(extra);
    return to;
  }

  function sendPrepared(previewInner){
    var to = collectRecipients();
    if (!to.length){ alert('Select at least one recipient or add an email.'); return; }
    var subject = (document.getElementById('ep-subj') && document.getElementById('ep-subj').value) || 'Job Update';
    var emailHtml = prepareEmailHtml(previewInner || "");
    fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: to, subject: subject, html: emailHtml })
    }).then(function(resp){
      if (resp.ok){
        alert('Email sent!');
        try{ var wrap = document.getElementById('ep-mail-wrap'); if (wrap) wrap.style.display='none'; }catch(_){}
        try{ var overlay = document.getElementById('ep-overlay'); if (overlay) overlay.style.display='none'; }catch(_){}
      } else {
        return resp.text().then(function(t){ throw new Error(t || 'Email failed'); });
      }
    }).catch(function(err){
      alert('Email error: ' + (err && err.message || err));
    });
  }

  function getPreviewInner(){
    var body = document.getElementById('ep-body');
    return body ? body.innerHTML : "";
  }

  function intercept(){
    // Capture-phase: prevent the default handler and send our styled email
    document.addEventListener('click', function(e){
      var t = e.target;
      if (!t) return;
      var btn = t.id === 'ep-mail-send' ? t : (t.closest && t.closest('#ep-mail-send'));
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation && e.stopImmediatePropagation();
      sendPrepared(getPreviewInner());
    }, true);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', intercept);
  } else {
    intercept();
  }
})();
