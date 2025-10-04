
// Email/Print Modal Preview — Step 2
// Builds an in-page modal showing the selected job fields and checked notes.
(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function getValue(id){
    const el = document.getElementById(id);
    if (!el) return "";
    if (el.tagName === "SELECT"){
      return el.options[el.selectedIndex] ? (el.options[el.selectedIndex].text || el.value || "") : (el.value || "");
    }
    return (el.value || el.textContent || "").trim();
  }

  function getCrewList(){
    const box = document.getElementById("crew-box");
    if (!box) return [];
    const rows = qsa('label, .crew-row, div', box); // try to capture label text regardless of structure
    const selectedNames = [];
    qsa('input[type="checkbox"]', box).forEach(cb => {
      if (cb.checked){
        // try nearest text label
        let name = "";
        const wrap = cb.parentElement;
        if (wrap){
          const span = wrap.querySelector("span");
          if (span) name = span.textContent.trim();
          else name = wrap.textContent.replace(/\s+/g,' ').trim();
        }
        if (!name) name = cb.getAttribute("data-name") || "";
        if (name) selectedNames.push(name);
      }
    });
    return selectedNames;
  }

  function getCheckedNotes(){
    const list = document.getElementById("notes-list");
    if (!list) return [];
    const out = [];
    Array.from(list.querySelectorAll(".note-item")).forEach(item => {
      const cb = item.querySelector(".note-date input.pe_row_chk");
      if (cb && cb.checked){
        const body = item.querySelector(".note-text");
        const dEl = item.querySelector(".note-date");
        let ts = "";
        if (dEl){
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
);
        }
      }
    });
    return out;
  }
  function ensureModal(){
    if (document.getElementById("ep-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "ep-overlay";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.innerHTML = `
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
    document.body.appendChild(overlay);
  }

  function injectStyles(){
    if (document.getElementById("ep-styles")) return;
    const st = document.createElement("style");
    st.id = "ep-styles";
    st.textContent = `
      #ep-overlay{ position:fixed; inset:0; display:none; z-index: 10000; }
      #ep-backdrop{ position:absolute; inset:0; background: rgba(0,0,0,0.45); }
      #ep-modal{ position:relative; margin: 6vh auto; max-width: 820px; background: #fff; color:#111; border-radius: 12px; box-shadow: 0 30px 80px rgba(0,0,0,0.35); padding: 0; width: calc(100% - 24px); }
      #ep-head{ display:flex; align-items:center; justify-content:space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
      #ep-title{ font-weight:700; font-size: 16px; }
      #ep-close{ border:none; background:transparent; font-size: 22px; cursor:pointer; line-height:1; }
      #ep-body{ padding: 16px; max-height: 70vh; overflow:auto; }
      #ep-foot{ padding: 12px 16px; border-top: 1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:8px; }
      .ep-field{ margin-bottom: 6px; }
      .ep-label{ font-size: 12px; color:#6b7280; display:block; margin-bottom: 2px; }
      .ep-name{ font-weight: 800; font-size: 18px; margin-bottom: 8px; }
      .ep-notes{ margin-top: 14px; }
      .ep-notes h4{ margin: 0 0 6px 0; font-size: 13px; color:#374151; }
      .ep-note{ margin: 8px 0; padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px; }
      .ep-note :where(p, ul, ol){ margin: 6px 0; }
      .ep-note ul{ padding-left: 20px; list-style: disc; }
      .ep-note ol{ padding-left: 20px; list-style: decimal; }
      @media (max-width: 480px){
        #ep-modal{ margin: 0 auto; border-radius: 0; width: 100%; max-width: 100%; height: 100%; display:flex; flex-direction: column; }
        #ep-body{ max-height: none; flex: 1; }
      }
      @media print{
        #ep-overlay{ display: none !important; }
      }
    `;
    document.head.appendChild(st);
  }

  function openPreview(){
    injectStyles();
    ensureModal();
    const body = document.getElementById("ep-body");
    const overlay = document.getElementById("ep-overlay");

    const name = getValue("job-name");
    const address = getValue("job-address");
    const po = getValue("job-po");
    const stage = getValue("job-stage");
    const crew = getCrewList();
    const notes = getCheckedNotes();

    const notesHtml = notes.length ? notes.map(n => `<div class="ep-note">${n.html}</div>`).join("") : `<div class="ep-note"><em>No notes selected.</em></div>`;

    body.innerHTML = `
      <div class="ep-name">${escapeHtml(name)}</div>
      <div>${escapeHtml(address)}</div>
      <div>${escapeHtml(po)}</div>
      <div>${crew.map(c => escapeHtml(c)).join(", ")}</div>
      <div>${escapeHtml(stage)}</div>
      <div class="ep-notes" style="margin-top:14px;">
        ${notes.length ? notes.map(n => `
          <div class="ep-note">
            <div class="ep-ts" style="font-size:12px;color:#6b7280;">${escapeHtml(n.ts)}</div>
            ${n.html}
          </div>
        `).join("") : `<div class="ep-note"><em>No notes selected.</em></div>`}
      </div>
    `;
// open
    overlay.style.display = "block";
    // wire close
    const close = () => { overlay.style.display = "none"; };
    document.getElementById("ep-close").onclick = close;
    document.getElementById("ep-close-2").onclick = close;
    document.getElementById("ep-backdrop").onclick = close;
  }

  function escapeHtml(s){
    return (s || "").replace(/[&<>"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  function init(){
    // Attach to FAB
    const attach = () => {
      const fab = document.getElementById("emailPrintFAB");
      if (!fab) return;
      if (fab.dataset._ep) return;
      fab.dataset._ep = "1";
      fab.addEventListener("click", openPreview);
    };
    if (document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", attach);
    } else {
      attach();
    }
    // also retry a few times for late injection
    let tries=0; const t=setInterval(()=>{ attach(); tries++; if (tries>=10) clearInterval(t); }, 400);
  }
  init();
})();
