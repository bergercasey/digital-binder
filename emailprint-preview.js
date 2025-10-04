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
        <div id="ep-foot">
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

  function escapeHtml(s){ return (s||"").replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])); }

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
