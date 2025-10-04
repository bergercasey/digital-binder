// Email/Print Modal Preview — Clean build
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function getValue(id){
    const el = document.getElementById(id);
    if (!el) return "";
    if (el.tagName === "SELECT"){
      const opt = el.options[el.selectedIndex];
      return (opt && (opt.text || opt.value)) || el.value || "";
    }
    return (el.value || el.textContent || "").trim();
  }

  function getCrewList(){
    const box = document.getElementById("crew-box");
    if (!box) return [];
    const out = [];
    qsa('input[type="checkbox"]', box).forEach(cb => {
      if (cb.checked){
        let name = "";
        const wrap = cb.parentElement;
        if (wrap){
          const span = wrap.querySelector("span");
          name = span ? span.textContent.trim() : wrap.textContent.replace(/\s+/g," ").trim();
        }
        if (!name) name = cb.getAttribute("data-name") || "";
        if (name) out.push(name);
      }
    });
    return out;
  }

  function getCheckedNotes(){
    const list = document.getElementById("notes-list");
    if (!list) return [];
    const out = [];
    qsa(".note-item", list).forEach(item => {
      const cb = qs(".note-date input.pe_row_chk", item);
      if (cb && cb.checked){
        const body = qs(".note-text", item);
        const dEl = qs(".note-date", item);
        let ts = "";
        if (dEl){
          // grab only text nodes (avoid checkbox)
          ts = Array.from(dEl.childNodes).filter(n => n.nodeType === 3).map(n => n.nodeValue).join(" ").trim();
          if (!ts) ts = (dEl.textContent || "").trim();
        }
        if (body){
          out.push({ html: body.innerHTML, ts });
        }
      }
    });
    return out;
  }

  function ensureModal(){
    if (document.getElementById("ep-overlay")) return;
    const wrap = document.createElement("div");
    wrap.id = "ep-overlay";
    wrap.setAttribute("role","dialog");
    wrap.setAttribute("aria-modal","true");
    wrap.innerHTML = `
      <div id="ep-backdrop"></div>
      <div id="ep-modal">
        <div id="ep-head">
          <div id="ep-title">Email / Print Preview</div>
          <button id="ep-close" aria-label="Close">×</button>
        </div>
        <div id="ep-body"></div>
        <div id="ep-foot">\n          <button id="ep-email" class="primary">Email</button>\n          <button id="ep-email" class="primary">Email</button>\n          <button id="ep-print" class="ghost">Print</button>
          <button id="ep-close-2" class="ghost">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function injectStyles(){
    if (document.getElementById("ep-styles")) return;
    const st = document.createElement("style");
    st.id = "ep-styles";
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
      @media (max-width: 480px){
        #ep-modal{ margin:0 auto; border-radius:0; width:100%; max-width:100%; height:100%; display:flex; flex-direction:column; }
        #ep-body{ max-height:none; flex:1; }
      }
      @media print{ #ep-overlay{ display:none !important; } }
    `;
    document.head.appendChild(st);
  }

  
  // --- Email favorites helpers ---
  function favsKey(){ return 'ep_favorites'; }
  function getFavs(){
    try { const raw = localStorage.getItem(favsKey()); return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []; } catch(_){ return []; }
  }
  function saveFavs(list){ try{ localStorage.setItem(favsKey(), JSON.stringify(list||[])); }catch(_){ } }
  function addFav(email){
    const v = (email||'').trim(); if (!v) return;
    const list = getFavs(); if (!list.includes(v)) { list.push(v); saveFavs(list); }
  }

  
  function buildEmailOverlay(){
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
  }
  function showEmailOverlay(previewHtml){
    buildEmailOverlay();
    const wrap = document.getElementById('ep-mail-wrap');
    const favWrap = document.getElementById('ep-mail-favs');

    // Favorites helpers shared with preview script
    const favs = getFavs();
    if (!favs.length){
      favWrap.innerHTML = `<div class="hint">No favorites yet. Add an email below, check "Save to favorites", then click Add.</div>`;
    } else {
      favWrap.innerHTML = `<div class="hint" style="margin-bottom:4px;">Favorites</div>` + favs.map(e => {
        const esc = e.replace(/&/g,'&amp;').replace(/</g,'&lt;');
        return `<label><input type="checkbox" class="ep-fav" value="${esc}"/> ${esc}</label>`;
      }).join('');
    }

    // Subject default
    const subjDefault = (() => {
      try {
        const name = getValue('job-name'); const po = getValue('job-po');
        if (name && po) return `${name} — PO ${po}`;
        if (name) return name;
      } catch(_){}
      return 'Job Update';
    })();
    const subjEl = document.getElementById('ep-subj');
    if (subjEl) subjEl.value = subjDefault;

    // Wire buttons
    document.getElementById('ep-add-btn').onclick = () => {
      const addInput = document.getElementById('ep-add-email');
      const v = (addInput.value||'').trim();
      if (!v) return;
      if (document.getElementById('ep-add-save').checked) addFav(v);
      addInput.value = '';
      showEmailOverlay(previewHtml); // re-render favorites
    };
    document.getElementById('ep-mail-close').onclick = () => wrap.style.display = 'none';
    document.getElementById('ep-mail-cancel').onclick = () => wrap.style.display = 'none';
    document.getElementById('ep-mail-backdrop').onclick = () => wrap.style.display = 'none';

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
          // Close both overlays
          wrap.style.display = 'none';
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

function renderEmailPanel(previewHtml){
    const overlay = document.getElementById('ep-overlay');
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
      document.getElementById('ep-modal').appendChild(panel);
    }
    // Render favorites
    const wrap = document.getElementById('ep-favs');
    const favs = getFavs();
    if (!favs.length){
      wrap.innerHTML = `<div style="font-size:12px; color:#6b7280;">No favorites yet. Add an email above, check "Save to favorites", then click Add.</div>`;
    } else {
      wrap.innerHTML = `<div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Favorites</div>` + favs.map(e => {
        const esc = e.replace(/&/g,'&amp;').replace(/</g,'&lt;');
        return `<label style="display:inline-flex; align-items:center; gap:6px; margin:4px 8px 4px 0;"><input type="checkbox" class="ep-fav" value="${esc}"/> ${esc}</label>`;
      }).join('');
    }
    const subjDefault = (() => {
      const name = getValue('job-name'); const po = getValue('job-po');
      return name ? (po ? `${name} — PO ${po}` : name) : 'Job Update';
    })();
    const subjEl = document.getElementById('ep-subj');
    if (subjEl && !subjEl.value) subjEl.value = subjDefault;

    // Wiring
    const addBtn = document.getElementById('ep-add-btn');
    const addInput = document.getElementById('ep-add-email');
    addBtn.onclick = () => {
      const v = (addInput.value||'').trim();
      if (!v) return;
      if (document.getElementById('ep-add-save').checked) addFav(v);
      addInput.value = '';
      renderEmailPanel(previewHtml); // re-render list
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
          // Close the overlay
          const overlay = document.getElementById('ep-overlay');
          if (overlay) overlay.style.display = 'none';
        } else {
          const t = await resp.text();
          alert('Email failed: ' + t);
        }
      } catch (err) {
        alert('Email error: ' + (err && err.message || err));
      }
    };
  }
function escapeHtml(s){ return (s||"").replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])); }

  
  
  function buildPrintHtml(inner){
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
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"><title>Print</title>
  <base href="${baseHref}">
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>${css}</style>
</head>
<body>${inner}</body>
</html>`;
  }

  function printPreviewAndClose(){
    const overlay = document.getElementById("ep-overlay");
    const body = document.getElementById("ep-body");
    if (!body) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const html = buildPrintHtml(body.innerHTML);

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch(_){}
      if (overlay) overlay.style.display = "none";
    };

    const onFrameReady = () => {
      try {
        const w = iframe.contentWindow;
        if (!w) { cleanup(); return; }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try { w.focus(); } catch(_){}
            const after = () => { try{ w.removeEventListener('afterprint', after);}catch(_){ } cleanup(); };
            try { w.addEventListener('afterprint', after); } catch(_){}
            try { w.print(); } catch(_){ cleanup(); }
            setTimeout(cleanup, 2500);
          });
        });
      } catch(_){ cleanup(); }
    };

    if ('srcdoc' in iframe){
      iframe.onload = onFrameReady;
      iframe.srcdoc = html;
    } else {
      const doc = iframe.contentDocument || iframe.contentWindow && iframe.contentWindow.document;
      if (doc){
        iframe.onload = onFrameReady;
        doc.open(); doc.write(html); doc.close();
      } else {
        cleanup();
      }
    }
  }
catch(_){}
      if (overlay) overlay.style.display = "none";
    };

    if (w) {
      // Safari/iOS friendly approach
      const after = () => { w.removeEventListener('afterprint', after); cleanup(); };
      try { w.addEventListener('afterprint', after); } catch(_){}
      try { w.focus(); } catch(_){}
      try { w.print(); } catch(_){ cleanup(); }
      // Fallback cleanup
      setTimeout(cleanup, 2000);
    } else {
      cleanup();
    }
  }
function openPreview(){
    injectStyles();
    ensureModal();
    const overlay = document.getElementById("ep-overlay");
    const body = document.getElementById("ep-body");

    const name = getValue("job-name");
    const address = getValue("job-address");
    const po = getValue("job-po");
    const stage = getValue("job-stage");
    const crew = getCrewList();
    const notes = getCheckedNotes();

    const notesHtml = notes.length
      ? notes.map(n => `<div class="ep-note"><div class="ep-ts">${escapeHtml(n.ts)}</div>${n.html}</div>`).join("")
      : `<div class="ep-note"><em>No notes selected.</em></div>`;

    body.innerHTML = `
      <div class="ep-name">${escapeHtml(name)}</div>
      <div>${escapeHtml(address)}</div>
      <div>${escapeHtml(po)}</div>
      <div>${crew.map(c => escapeHtml(c)).join(", ")}</div>
      <div>${escapeHtml(stage)}</div>
      ${notesHtml}
    `;

    overlay.style.display = "block";
    const pbtn = document.getElementById('ep-print'); if (pbtn) pbtn.onclick = printPreviewAndClose;
    const ebtn = document.getElementById('ep-email'); if (ebtn) ebtn.onclick = () => showEmailOverlay(body.innerHTML);
    const close = () => { overlay.style.display = "none"; };
    document.getElementById("ep-close").onclick = close;
    document.getElementById("ep-close-2").onclick = close;
    document.getElementById("ep-backdrop").onclick = close;
  }

  function attach(){
    const fab = document.getElementById("emailPrintFAB");
    if (!fab) return;
    if (fab.dataset._ep) return;
    fab.dataset._ep = "1";
    fab.addEventListener("click", openPreview);
  }

  function init(){
    if (document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", attach);
    } else {
      attach();
    }
    let tries = 0; const t = setInterval(() => { attach(); tries++; if (tries>=10) clearInterval(t); }, 400);
  }
  init();
  try{ window._epOpenPreview = openPreview; }catch(_){}
})();
