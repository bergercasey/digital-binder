
// Floating Email/Print button — Step 1 (placement only)
// Does not change data or existing flows. Visible only when a job is open.
(function(){
  function createFAB(){

  // ---- Inline fallback preview/print if global hook is unavailable ----

  // --- Safety shims (ep_getValue, ep_getCrew) ---
  if (typeof ep_getValue !== 'function'){
    function ep_getValue(id){
      var el = document.getElementById(id);
      if (!el) return "";
      if (el.tagName === "SELECT"){
        var opt = el.options[el.selectedIndex];
        return (opt && (opt.text || opt.value)) || el.value || "";
      }
      return (el.value || el.textContent || "").trim();
    }
  }
  if (typeof ep_getCrew !== 'function'){
    function ep_getCrew(){
      var box = document.getElementById("crew-box"); if (!box) return [];
      var out = [];
      Array.prototype.forEach.call(box.querySelectorAll('input[type="checkbox"]'), function(cb){
        if (cb.checked){
          var name = "";
          var wrap = cb.parentElement;
          if (wrap){
            var span = wrap.querySelector("span");
            name = span ? span.textContent.trim() : (wrap.textContent || "").replace(/\s+/g," ").trim();
          }
          if (!name) name = cb.getAttribute("data-name") || "";
          if (name) out.push(name);
        }
      });
      return out;
    }
  }

  function ep_qs(sel, root){ return (root||document).querySelector(sel); }
  function ep_qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function ep_escape(s){ return (s||"").replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])); }

  function ep_getValue(id){
    const el = document.getElementById(id);
    if (!el) return "";
    if (el.tagName === "SELECT"){
      const opt = el.options[el.selectedIndex];
      return (opt && (opt.text || opt.value)) || el.value || "";
    }
    return (el.value || el.textContent || "").trim();
  }
  function ep_getCrew(){
    const box = document.getElementById("crew-box"); if (!box) return [];
    const out = [];
    ep_qsa('input[type="checkbox"]', box).forEach(cb => {
      if (cb.checked){
        let name = ""; const wrap = cb.parentElement;
        if (wrap){ const span = wrap.querySelector("span"); name = span ? span.textContent.trim() : wrap.textContent.replace(/\s+/g," ").trim(); }
        if (!name) name = cb.getAttribute("data-name") || "";
        if (name) out.push(name);
      }
    });
    return out;
  }
  function ep_getCheckedNotes(){
    const list = document.getElementById("notes-list"); if (!list) return [];
    const out = [];
    ep_qsa(".note-item", list).forEach(item => {
      const cb = ep_qs(".note-date input.pe_row_chk", item);
      if (cb && cb.checked){
        const body = ep_qs(".note-text", item);
        const dEl = ep_qs(".note-date", item);
        let ts = "";
        if (dEl){
          ts = Array.from(dEl.childNodes).filter(n => n.nodeType===3).map(n=>n.nodeValue).join(" ").trim();
          if (!ts) ts = (dEl.textContent||"").trim();
        }
        if (body){ out.push({ html: body.innerHTML, ts }); }
      }
    });
    return out;
  }
  function ep_ensureModal(){
    if (document.getElementById("ep-overlay")) return;
    const wrap = document.createElement("div");
    wrap.id = "ep-overlay";
    wrap.setAttribute("role","dialog"); wrap.setAttribute("aria-modal","true");
    wrap.innerHTML = `
      <div id="ep-backdrop"></div>
      <div id="ep-modal">
        <div id="ep-head">
          <div id="ep-title">Email / Print Preview</div>
          <button id="ep-close" aria-label="Close">×</button>
        </div>
        <div id="ep-body"></div>
        <div id="ep-foot">\n          <button id="ep-email" class="primary">Email</button>
          <button id="ep-print" class="primary">Print</button>
          <button id="ep-close-2" class="ghost">Close</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    if (!document.getElementById("ep-styles")){
      const st = document.createElement("style"); st.id="ep-styles";
      st.textContent = `
        #ep-overlay{ position:fixed; inset:0; display:none; z-index:10000; }
        #ep-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,0.45); }
        #ep-modal{ position:relative; margin:6vh auto; max-width:820px; width:calc(100% - 24px); background:#fff; color:#111; border-radius:12px; box-shadow:0 30px 80px rgba(0,0,0,0.35); }
        #ep-head{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #e5e7eb; }
        #ep-title{ font-weight:700; font-size:16px; }
        #ep-close{ border:none; background:transparent; font-size:22px; cursor:pointer; line-height:1; }
        #ep-body{ padding:16px; max-height:70vh; overflow:auto; }
        #ep-foot{ padding:12px 16px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:8px; }
        .ep-name{ font-weight:800; font-size:18px; margin:0 0 8px 0; }
        .ep-note{ margin:8px 0; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; }
        .ep-ts{ font-size:12px; color:#6b7280; }
        .ep-note :where(p, ul, ol){ margin:6px 0; }
        .ep-note ul{ padding-left:20px; list-style:disc; }
        .ep-note ol{ padding-left:20px; list-style:decimal; }
        @media print{ #ep-overlay{ display:none !important; } }
      `;
      document.head.appendChild(st);
    }
  }
  function ep_buildPrintHtml(inner){
    const baseHref = (() => {
      try {
        const path = (location.pathname || '/');
        const dir = path.endsWith('/') ? path : path.replace(/[^/]*$/, '');
        return location.origin + dir;
      } catch(_){ return ''; }
    })();
    const css = `
      :root{ --ink:#111; --line:#e5e7eb; }
      body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji; color: var(--ink); margin: 24px; }
      .ep-name{ font-weight: 800; font-size: 18px; margin: 0 0 8px 0; }
      .ep-note{ margin: 8px 0; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; }
      .ep-ts{ font-size: 12px; color: #6b7280; }
      .ep-note :where(p, ul, ol){ margin: 6px 0; }
      .ep-note ul{ padding-left: 20px; list-style: disc; }
      .ep-note ol{ padding-left: 20px; list-style: decimal; }
      @page { margin: 16mm; }
    `;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Print</title><base href="${baseHref}"><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${css}</style></head><body>${inner}</body></html>`;
  }
  function ep_printAndClose(){
    const overlay = document.getElementById("ep-overlay");
    const body = document.getElementById("ep-body"); if (!body) return;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    iframe.setAttribute("aria-hidden","true");
    document.body.appendChild(iframe);
    const html = ep_buildPrintHtml(body.innerHTML);
    const cleanup = ()=>{ try{ document.body.removeChild(iframe);}catch(_){ } if (overlay) overlay.style.display="none"; };
    const onReady = ()=>{
      try{
        const w = iframe.contentWindow; if (!w){ cleanup(); return; }
        requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
          try{ w.focus(); }catch(_){}
          const after = ()=>{ try{ w.removeEventListener('afterprint', after);}catch(_){ } cleanup(); };
          try{ w.addEventListener('afterprint', after);}catch(_){}
          try{ w.print(); }catch(_){ cleanup(); }
          setTimeout(cleanup, 2500);
        }); });
      }catch(_){ cleanup(); }
    };
    if ('srcdoc' in iframe){ iframe.onload = onReady; iframe.srcdoc = html; }
    else { const d = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document); if (d){ iframe.onload = onReady; d.open(); d.write(html); d.close(); } else { cleanup(); } }
  }
  function ep_openPreviewInline(){
    ep_ensureModal();
    const overlay = document.getElementById("ep-overlay");
    const body = document.getElementById("ep-body");
    const name = ep_getValue("job-name");
    const address = ep_getValue("job-address");
    const po = ep_getValue("job-po");
    const stage = ep_getValue("job-stage");
    const crew = ep_getCrew();
    const notes = ep_getCheckedNotes();
    const notesHtml = notes.length ? notes.map(n => `<div class="ep-note"><div class="ep-ts">${ep_escape(n.ts)}</div>${n.html}</div>`).join("") : `<div class="ep-note"><em>No notes selected.</em></div>`;
    body.innerHTML = `<div class="ep-name">${ep_escape(name)}</div><div>${ep_escape(address)}</div><div>${ep_escape(po)}</div><div>${crew.map(ep_escape).join(", ")}</div><div>${ep_escape(stage)}</div>${notesHtml}`;
    overlay.style.display = "block";
    const close = ()=>{ overlay.style.display="none"; };
    document.getElementById("ep-close").onclick = close;
    document.getElementById("ep-close-2").onclick = close;
    document.getElementById("ep-backdrop").onclick = close;
    const p = document.getElementById("ep-print"); if (p) p.onclick = ep_printAndClose;
    const e = document.getElementById("ep-email"); if (e) e.onclick = ()=> ep_showEmailOverlay(body.innerHTML);
  }
  function ep_openPreviewEnsure(){
    // Prefer official hook if present
    if (window._epOpenPreview){ try{ window._epOpenPreview(); return; }catch(_){ } }
    // If preview script not loaded, attempt to load it then open
    if (!document.querySelector('script[src$="emailprint-preview.js"]')){
      const s = document.createElement('script'); s.src = 'emailprint-preview.js'; s.onload = ()=>{ if (window._epOpenPreview) { try{ window._epOpenPreview(); }catch(_){ ep_openPreviewInline(); } } else { ep_openPreviewInline(); } }; s.onerror = ()=>{ ep_openPreviewInline(); };
      document.head.appendChild(s); return;
    }
    // Fallback inline
    ep_openPreviewInline();
  }

    if (document.getElementById('emailPrintFAB')) return;
    const btn = document.createElement('button');
    btn.id = 'emailPrintFAB';
    btn.type = 'button';
    btn.className = 'fab-ep';
    btn.setAttribute('aria-label','Email / Print');
    btn.textContent = 'Email / Print';
    btn.style.display = 'none'; // hidden until a job tab is active
    document.body.appendChild(btn);
    // Placeholder click (no-op for Step 1)
    btn.addEventListener('click', function(){ ep_openPreviewEnsure(); });
}

  function injectStyles(){
    if (document.getElementById('fab-ep-styles')) return;
    const st = document.createElement('style');
    st.id = 'fab-ep-styles';
    st.textContent = `
      #emailPrintFAB.fab-ep{
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        padding: 12px 16px;
        border-radius: 999px;
        font-weight: 600;
        border: 1px solid #dbeafe;
        background: #bfdbfe;
        color: #0b1220;
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        cursor: pointer;
      }
      #emailPrintFAB.fab-ep:active{ transform: translateY(1px); }
      @media print{
        #emailPrintFAB{ display: none !important; }
      }
    `;
    document.head.appendChild(st);
  }

  function jobOpen(){
    // Show when job fields panel is visible (display !== 'none')
    const jobFields = document.getElementById('job-fields');
    if (!jobFields) return false;
    const style = window.getComputedStyle(jobFields);
    return style && style.display !== 'none';
  }

  function updateFABVisibility(){
    const fab = document.getElementById('emailPrintFAB');
    if (!fab) return;
    fab.style.display = jobOpen() ? 'inline-flex' : 'none';
  }

  function setupObservers(){
    const jobFields = document.getElementById('job-fields');
    if (!jobFields) return;
    // Watch for show/hide changes
    const obs = new MutationObserver(updateFABVisibility);
    obs.observe(jobFields, { attributes: true, attributeFilter: ['style', 'class'] });
    // Also poll lightly as safety for app-driven state changes
    let lastState = null;
    setInterval(()=>{
      const isOpen = jobOpen();
      if (isOpen !== lastState){
        updateFABVisibility();
        lastState = isOpen;
      }
    }, 500);
  }

  function init(){
    injectStyles();
    createFAB();
    updateFABVisibility();
    setupObservers();
    // Safety: rebind click in case element is replaced
    setInterval(() => {
      const b = document.getElementById('emailPrintFAB');
      if (b && !b._epBound){ b._epBound = true; b.onclick = function(){ try{ if (window._epOpenPreview) window._epOpenPreview(); }catch(_){ } }; }
    }, 600);
    // On navigation (hashchange) also update
    window.addEventListener('hashchange', updateFABVisibility);
    document.addEventListener('visibilitychange', updateFABVisibility);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


  // --- Fallback Email favorites helpers ---
  function ep_favsKey(){ return 'ep_favorites'; }
  function ep_getFavs(){
    try { const raw = localStorage.getItem(ep_favsKey()); const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch(_){ return []; }
  }
  function ep_saveFavs(list){ try{ localStorage.setItem(ep_favsKey(), JSON.stringify(list||[])); }catch(_){ } }
  function ep_addFav(email){
    const v = (email||'').trim(); if (!v) return;
    const list = ep_getFavs(); if (!list.includes(v)) { list.push(v); ep_saveFavs(list); }
  }
  function ep_renderEmailPanel(previewHtml){
    const modal = document.getElementById('ep-modal');
    let panel = document.getElementById('ep-mail');
    if (!panel){
      panel = document.createElement('div'); panel.id = 'ep-mail';
      panel.innerHTML = `
        <div style="border-top:1px solid #e5e7eb; padding:12px 16px; display:grid; gap:8px;">
          <div style="font-weight:600;">Send Email</div>
          <div id="ep-favs"></div>
          <div style="display:flex; gap:6px;">
            <input id="ep-add-email" type="email" placeholder="add@email.com" style="flex:1; padding:8px; border:1px solid #e5e7eb; border-radius:8px;"/>
            <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#374151;">
              <input id="ep-add-save" type="checkbox" checked/> Save to favorites
            </label>
            <button id="ep-add-btn" class="ghost">Add</button>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <label style="min-width:60px; color:#6b7280; font-size:12px;">Subject</label>
            <input id="ep-subj" type="text" style="flex:1; padding:8px; border:1px solid #e5e7eb; border-radius:8px;"/>
          </div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="ep-send" class="primary">Send</button>
          </div>
        </div>`;
      modal.appendChild(panel);
    }
    // Favorites list
    const wrap = document.getElementById('ep-favs');
    const favs = ep_getFavs();
    if (!favs.length){
      wrap.innerHTML = `<div style="font-size:12px; color:#6b7280;">No favorites yet. Add an email above, check "Save to favorites", then click Add.</div>`;
    } else {
      wrap.innerHTML = `<div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Favorites</div>` + favs.map(e => {
        const esc = e.replace(/&/g,'&amp;').replace(/</g,'&lt;');
        return `<label style="display:inline-flex; align-items:center; gap:6px; margin:4px 8px 4px 0;"><input type="checkbox" class="ep-fav" value="${esc}"/> ${esc}</label>`;
      }).join('');
    }
    const subjDefault = (() => {
      try {
        const name = ep_getValue('job-name'); 
        const po = ep_getValue('job-po');
        if (name && po) return `${name} — PO ${po}`;
        if (name) return name;
      } catch(_){}
      return 'Job Update';
    })();
    const subjEl = document.getElementById('ep-subj');
    if (subjEl && !subjEl.value) subjEl.value = subjDefault;

    // Wire Add & Send
    const addBtn = document.getElementById('ep-add-btn');
    const addInput = document.getElementById('ep-add-email');
    addBtn.onclick = () => {
      const v = (addInput.value||'').trim();
      if (!v) return;
      if (document.getElementById('ep-add-save').checked) ep_addFav(v);
      addInput.value = '';
      ep_renderEmailPanel(previewHtml);
    };
    document.getElementById('ep-send').onclick = async () => {
      const to = Array.from(document.querySelectorAll('#ep-favs .ep-fav:checked')).map(el => el.value);
      const extra = (addInput.value||'').trim();
      if (extra) to.push(extra);
      if (!to.length){ alert('Select at least one recipient or add an email.'); return; }
      const subject = document.getElementById('ep-subj').value || 'Job Update';
      try {
        const resp = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ to, subject, html: previewHtml })
        });
        if (resp.ok){
          alert('Email sent!');
          const overlay = document.getElementById('ep-overlay'); if (overlay) overlay.style.display = 'none';
        } else {
          const t = await resp.text();
          alert('Email failed: ' + t);
        }
      } catch (err) {
        alert('Email error: ' + (err && err.message || err));
      }
    };
  }



  /* Fallback Email overlay (on top of preview) */
  function ep_buildEmailOverlay(){
    if (document.getElementById('ep-mail-wrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'ep-mail-wrap';
    wrap.innerHTML = `
      <div id="ep-mail-backdrop"></div>
      <div id="ep-mail-modal">
        <div id="ep-mail-head">
          <div id="ep-mail-title">Send Email</div>
          <button id="ep-mail-close" aria-label="Close">×</button>
        </div>
        <div id="ep-mail-body">
          <div id="ep-mail-favs"></div>
          <div class="row">
            <input id="ep-add-email" type="email" placeholder="add@email.com"/>
            <label class="row" style="gap:6px; font-size:12px; color:#374151;">
              <input id="ep-add-save" type="checkbox" checked/> Save to favorites
            </label>
            <button id="ep-add-btn" class="ghost">Add</button>
          </div>
          <div class="row">
            <span class="hint" style="min-width:60px;">Subject</span>
            <input id="ep-subj" type="text"/>
          </div>
        </div>
        <div id="ep-mail-foot">
          <button id="ep-mail-send" class="primary">Send</button>
          <button id="ep-mail-cancel" class="ghost">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    // minimal styles if main ones absent
    if (!document.getElementById('ep-styles')){
      const st = document.createElement('style'); st.id='ep-styles';
      st.textContent = `
        #ep-overlay{ position:fixed; inset:0; display:none; z-index:10000; }
        #ep-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,0.45); }
        #ep-modal{ position:relative; margin:6vh auto; max-width:820px; width:calc(100% - 24px); background:#fff; color:#111; border-radius:12px; box-shadow:0 30px 80px rgba(0,0,0,0.35); }
        #ep-head{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #e5e7eb; }
        #ep-title{ font-weight:700; font-size:16px; }
        #ep-close{ border:none; background:transparent; font-size:22px; cursor:pointer; line-height:1; }
        #ep-body{ padding:16px; max-height:70vh; overflow:auto; }
        #ep-foot{ padding:12px 16px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:8px; }
        .ep-name{ font-weight:800; font-size:18px; margin:0 0 8px 0; }
        .ep-note{ margin:8px 0; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; }
        .ep-ts{ font-size:12px; color:#6b7280; }
        .ep-note :where(p, ul, ol){ margin:6px 0; }
        .ep-note ul{ padding-left:20px; list-style:disc; }
        .ep-note ol{ padding-left:20px; list-style:decimal; }
        /* Email overlay */
        #ep-mail-wrap{ position:fixed; inset:0; z-index:10010; display:none; }
        #ep-mail-backdrop{ position:absolute; inset:0; background: rgba(0,0,0,0.45); }
        #ep-mail-modal{ position:relative; margin: 8vh auto; max-width: 720px; width: calc(100% - 32px); background: #fff; color:#111; border-radius: 12px; box-shadow: 0 30px 80px rgba(0,0,0,0.35); overflow: hidden; }
        #ep-mail-head{ display:flex; align-items:center; justify-content:space-between; padding: 12px 16px; border-bottom:1px solid #e5e7eb; }
        #ep-mail-title{ font-weight:700; font-size:16px; }
        #ep-mail-close{ border:none; background:transparent; font-size:22px; cursor:pointer; line-height:1; }
        #ep-mail-body{ padding: 14px 16px; max-height: 68vh; overflow:auto; display:grid; gap:10px; }
        #ep-mail-body .row{ display:flex; gap:8px; align-items:center; }
        #ep-mail-body input[type="email"], #ep-mail-body input[type="text"]{ flex:1; padding:8px; border:1px solid #e5e7eb; border-radius:8px; }
        #ep-mail-body .hint{ font-size:12px; color:#6b7280; }
        #ep-mail-foot{ padding: 12px 16px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:8px; }
        #ep-mail-favs label{ display:inline-flex; align-items:center; gap:6px; margin:4px 10px 4px 0; }
        @media (max-width: 480px){
          #ep-mail-modal{ margin: 0 auto; width:100%; max-width:100%; height:100%; border-radius:0; display:flex; flex-direction:column; }
          #ep-mail-body{ max-height:none; flex:1; }
        }
      `;
      document.head.appendChild(st);
    }
  }
  function ep_showEmailOverlay(previewHtml){
    ep_buildEmailOverlay();
    const wrap = document.getElementById('ep-mail-wrap');
    const favWrap = document.getElementById('ep-mail-favs');
    const favs = ep_getFavs();
    if (!favs.length){
      favWrap.innerHTML = `<div class="hint">No favorites yet. Add an email below, check "Save to favorites", then click Add.</div>`;
    } else {
      favWrap.innerHTML = `<div class="hint" style="margin-bottom:4px;">Favorites</div>` + favs.map(e => {
        const esc = e.replace(/&/g,'&amp;').replace(/</g,'&lt;');
        return `<label><input type="checkbox" class="ep-fav" value="${esc}"/> ${esc}</label>`;
      }).join('');
    }
    const subjDefault = (() => {
      try {
        const name = ep_getValue('job-name'); const po = ep_getValue('job-po');
        if (name && po) return `${name} — PO ${po}`;
        if (name) return name;
      } catch(_){}
      return 'Job Update';
    })();
    const subjEl = document.getElementById('ep-subj'); if (subjEl) subjEl.value = subjDefault;

    document.getElementById('ep-add-btn').onclick = () => {
      const addInput = document.getElementById('ep-add-email');
      const v = (addInput.value||'').trim();
      if (!v) return;
      if (document.getElementById('ep-add-save').checked) ep_addFav(v);
      addInput.value = '';
      ep_showEmailOverlay(previewHtml);
    };
    const hide = ()=>{ document.getElementById('ep-mail-wrap').style.display = 'none'; };
    document.getElementById('ep-mail-close').onclick = hide;
    document.getElementById('ep-mail-cancel').onclick = hide;
    document.getElementById('ep-mail-backdrop').onclick = hide;
    document.getElementById('ep-mail-send').onclick = async () => {
      const to = Array.from(document.querySelectorAll('#ep-mail-favs .ep-fav:checked')).map(el => el.value);
      const extra = (document.getElementById('ep-add-email').value||'').trim();
      if (extra) to.push(extra);
      if (!to.length){ alert('Select at least one recipient or add an email.'); return; }
      const subject = (document.getElementById('ep-subj').value || 'Job Update');
      try {
        const resp = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ to, subject, html: previewHtml })
        });
        if (resp.ok){
          alert('Email sent!');
          hide();
          const overlay = document.getElementById('ep-overlay'); if (overlay) overlay.style.display = 'none';
        } else {
          const t = await resp.text();
          alert('Email failed: ' + t);
        }
      } catch (err) {
        alert('Email error: ' + (err && err.message || err));
      }
    };
    wrap.style.display = 'block';
  }



document.addEventListener('click', function(ev){ if (ev && ev.target && ev.target.id==='ep-email'){ try{ ep_showEmailOverlay(document.getElementById('ep-body').innerHTML); }catch(_){ } } }, false);

function removeInlineEmailPanel(){
  try{
    const p = document.getElementById('ep-mail');
    if (p && p.parentElement) p.parentElement.removeChild(p);
  }catch(_){}
}
document.addEventListener('click', function(ev){
  try{
    const t = ev && ev.target;
    if (!t) return;
    const btn = t.id === 'ep-email' ? t : (t.closest ? t.closest('#ep-email') : null);
    if (btn){
      // If the main overlay is available, use it; else, fallback
      ev.preventDefault(); ev.stopPropagation();
      removeInlineEmailPanel();
      if (typeof showEmailOverlay === 'function'){
        try{ showEmailOverlay(document.getElementById('ep-body').innerHTML); }catch(_){}
      } else if (typeof ep_showEmailOverlay === 'function'){
        try{ ep_showEmailOverlay(document.getElementById('ep-body').innerHTML); }catch(_){}
      }
    }
  }catch(_){}
}, true);
