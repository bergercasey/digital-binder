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
        <div id="ep-foot">\n          <button id="ep-email" class="primary">Email</button>\n          <button id="ep-print" class="primary">Print</button>
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

  
  /* Email overlay (lightweight, self-contained) */
  function _epFavsKey(){ return 'ep_favorites'; }
  function _epGetFavs(){ try{ const arr = JSON.parse(localStorage.getItem(_epFavsKey())); return Array.isArray(arr)?arr:[]; }catch(_){ return []; } }
  function _epSaveFavs(list){ try{ localStorage.setItem(_epFavsKey(), JSON.stringify(list||[])); }catch(_){ } }
  function _epAddFav(email){ const v=(email||'').trim(); if(!v) return; const list=_epGetFavs(); if(!list.includes(v)){ list.push(v); _epSaveFavs(list);} }

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
          <div class="row" style="display:flex; gap:8px; align-items:center;">
            <input id="ep-add-email" type="email" placeholder="add@email.com" style="flex:1; padding:8px; border:1px solid #e5e7eb; border-radius:8px;"/>
            <label class="row" style="gap:6px; font-size:12px; color:#374151;">
              <input id="ep-add-save" type="checkbox" checked/> Save to favorites
            </label>
            <button id="ep-add-btn" class="ghost">Add</button>
          </div>
          <div class="row" style="display:flex; gap:8px; align-items:center;">
            <span class="hint" style="min-width:60px; color:#6b7280; font-size:12px;">Subject</span>
            <input id="ep-subj" type="text" style="flex:1; padding:8px; border:1px solid #e5e7eb; border-radius:8px;"/>
          </div>
        </div>
        <div id="ep-mail-foot">
          <button id="ep-mail-send" class="primary">Send</button>
          <button id="ep-mail-cancel" class="ghost">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    if (!document.getElementById('ep-mail-styles')){
      const st = document.createElement('style'); st.id='ep-mail-styles';
      st.textContent = `
        #ep-mail-wrap{ position:fixed; inset:0; z-index:10010; display:none; }
        #ep-mail-backdrop{ position:absolute; inset:0; background: rgba(0,0,0,0.45); }
        #ep-mail-modal{ position:relative; margin: 8vh auto; max-width: 720px; width: calc(100% - 32px); background: #fff; color:#111; border-radius: 12px; box-shadow: 0 30px 80px rgba(0,0,0,0.35); overflow: hidden; }
        #ep-mail-head{ display:flex; align-items:center; justify-content:space-between; padding: 12px 16px; border-bottom:1px solid #e5e7eb; }
        #ep-mail-title{ font-weight:700; font-size:16px; }
        #ep-mail-close{ border:none; background:transparent; font-size:22px; cursor:pointer; line-height:1; }
        #ep-mail-body{ padding: 14px 16px; max-height: 68vh; overflow:auto; display:grid; gap:10px; }
        #ep-mail-foot{ padding: 12px 16px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:8px; }
        #ep-mail-favs label{ display:inline-flex; align-items:center; gap:6px; margin:4px 10px 4px 0; }
        @media (max-width: 480px){
          #ep-mail-modal{ margin: 0 auto; width:100%; max-width:100%; height:100%; border-radius:0; display:flex; flex-direction:column; }
          #ep-mail-body{ max-height:none; flex:1; }
        }`;
      document.head.appendChild(st);
    }
  }

  function showEmailOverlay(previewHtml){
    buildEmailOverlay();
    const wrap = document.getElementById('ep-mail-wrap');
    const favWrap = document.getElementById('ep-mail-favs');
    const favs = _epGetFavs();
    favWrap.innerHTML = favs.length
      ? `<div class="hint" style="margin-bottom:4px;">Favorites</div>` + favs.map(e => {
          const esc = e.replace(/&/g,'&amp;').replace(/</g,'&lt;');
          return `<label><input type="checkbox" class="ep-fav" value="${esc}"/> ${esc}</label>`;
        }).join('')
      : `<div class="hint">No favorites yet. Add an email below, check "Save to favorites", then click Add.</div>`;
    const subjDefault = (() => {
      try { 
        const name = getValue('job-name'); const po = getValue('job-po');
        if (name && po) return `${name} — PO ${po}`;
        if (name) return name;
      } catch(_){}
      return 'Job Update';
    })();
    const subjEl = document.getElementById('ep-subj'); if (subjEl) subjEl.value = subjDefault;

    const hide = ()=>{ wrap.style.display = 'none'; };
    document.getElementById('ep-mail-close').onclick = hide;
    document.getElementById('ep-mail-cancel').onclick = hide;
    document.getElementById('ep-mail-backdrop').onclick = hide;
    document.getElementById('ep-add-btn').onclick = ()=>{
      const addInput = document.getElementById('ep-add-email');
      const v = (addInput.value||'').trim(); if (!v) return;
      if (document.getElementById('ep-add-save').checked) _epAddFav(v);
      addInput.value = '';
      showEmailOverlay(previewHtml);
    };
    document.getElementById('ep-mail-send').onclick = async ()=>{
      const to = Array.from(document.querySelectorAll('#ep-mail-favs .ep-fav:checked')).map(el => el.value);
      const extra = (document.getElementById('ep-add-email').value||'').trim(); if (extra) to.push(extra);
      if (!to.length){ alert('Select at least one recipient or add an email.'); return; }
      const subject = (document.getElementById('ep-subj').value || 'Job Update');
      try {
        const resp = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ to, subject, html: previewHtml })
        });
        if (resp.ok){ alert('Email sent!'); hide(); const overlay = document.getElementById('ep-overlay'); if (overlay) overlay.style.display='none'; }
        else { const t = await resp.text(); alert('Email failed: ' + t); }
      } catch(err){ alert('Email error: ' + (err && err.message || err)); }
    };
    wrap.style.display = 'block';
  }

  function escapeHtml(s){ return (s||"").replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])); }

  
  function buildPrintHtml(inner){
  // Inline minimal styles to match modal view — but scaled down for print
  const css = `
    :root{ --ink:#111; --line:#e5e7eb; }

    body{
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      color: var(--ink);
      margin: 10px;
      font-size: 11px;
      line-height: 1.2;
    }

    .ep-name{
      font-weight: 800;
      font-size: 14px;
      margin: 0 0 6px 0;
    }

    .ep-note{
      margin: 4px 0;
      padding: 4px 6px;
      border: 1px solid var(--line);
      border-radius: 6px;
      page-break-inside: avoid;
    }

    .ep-ts{
      font-size: 10px;
      color: #6b7280;
    }

    .ep-note :where(p, ul, ol){
      margin: 4px 0;
    }

    .ep-note ul{
      padding-left: 16px;
      list-style: disc;
    }

    .ep-note ol{
      padding-left: 16px;
      list-style: decimal;
    }

    img{
      max-width: 100%;
      height: auto;
    }

    @page { margin: 10mm; }
  `;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Print</title><style>${css}</style></head>
<body>${inner}</body></html>`;
}


  function printPreviewAndClose(){
    const overlay = document.getElementById("ep-overlay");
    const body = document.getElementById("ep-body");
    if (!body) return;
    // Create hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow || iframe.contentDocument;
    const w = iframe.contentWindow;
    const d = iframe.contentDocument || (doc && doc.document);
    const html = buildPrintHtml(body.innerHTML);
    (d || doc.document).open();
    (d || doc.document).write(html);
    (d || doc.document).close();

    // Close overlay after printing
    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch(_){}
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
    const ebtn = document.getElementById('ep-email'); if (ebtn) ebtn.onclick = ()=> showEmailOverlay(body.innerHTML);
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
})();
