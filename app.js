/* app.js v3.12 */
(function(){
  const $ = (id) => document.getElementById(id);
  let statusEl;

  // Error banner
  const errbar = $("errbar");
  window.addEventListener("error", (e) => { if (!errbar) return; errbar.style.display = "block"; errbar.textContent = "Script error: " + (e.message || e.error || e.filename); });
  window.addEventListener("unhandledrejection", (e) => { if (!errbar) return; errbar.style.display = "block"; errbar.textContent = "Promise error: " + (e.reason && e.reason.message ? e.reason.message : String(e.reason)); });

  const uuid = () => Math.random().toString(36).slice(2, 10);
  const debounce = (fn, ms=400) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };

  const ymd = (d=new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };

  function hexToRGBA(hex, alpha=0.28) {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const m = hex.replace('#','');
    const bigint = parseInt(m.length === 3 ? m.split('').map(c=>c+c).join('') : m, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const API = {
    async load() {
      try {
        const res = await fetch("/.netlify/functions/load");
        if (!res.ok) throw new Error("load failed");
        return await res.json();
      } catch (err) {
        console.warn("Load failed, falling back to localStorage", err);
        const raw = localStorage.getItem("binder-data");
        return raw ? JSON.parse(raw) : null;
      }
    },
    async save(data) {
      try {
        const res = await fetch("/.netlify/functions/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("save failed");
        return await res.json();
      } catch (err) {
        console.warn("Save failed, writing to localStorage", err);
        localStorage.setItem("binder-data", JSON.stringify(data));
        return { ok: true, local: true };
      }
    }
  };

  let state = {
    companyLogoDataUrl: "",
    roster: ["Alice","Bob","Chris","Dee"],
    stages: ["Bid","Rough-in","Trim","Complete"],
    stageColors: { "Bid": "#60a5fa", "Rough-in": "#f59e0b", "Trim": "#a78bfa", "Complete": "#34d399" },
    contractors: [
      { id: uuid(), name: "Acme Mechanical", logoDataUrl: "", jobs: [
        { id: uuid(), name: "101 - 123 Main St", po: "PO-1001", address: "123 Main St, Springfield", stage: "Rough-in", crew: ["Alice","Bob"], notes: [
          { d: ymd(), text: "Created" }
        ], archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), initComplete: true }
      ]}
    ],
    ui: { selectedContractorId: null, selectedJobId: null, view: "main", showArchived: false, archiveSelected: {}, editing: false }
  };

  function status(msg) { if (statusEl) statusEl.textContent = msg; }
  function toast(msg, ms=1800) {
    const wrap = $("toast-wrap"); if (!wrap) return;
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(6px)"; t.style.transition = "all 220ms ease"; }, ms);
    setTimeout(() => wrap.removeChild(t), ms + 260);
  }

  function showView(name) {
    state.ui.view = name;
    $("view-main").classList.toggle("active", name === "main");
    $("view-settings").classList.toggle("active", name === "settings");
    $("view-archives").classList.toggle("active", name === "archives");
    $("to-main").style.display = name === "settings" ? "inline-block" : "none";
  }

  const currentContractor = () => state.contractors.find(c => c.id === state.ui.selectedContractorId) || null;
  const currentJob = () => { const c = currentContractor(); if (!c) return null; return c.jobs.find(j => j.id === state.ui.selectedJobId) || null; };

  function parseLeadingNumber(name) {
    if (!name) return null;
    const m = String(name).trim().match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  function renderContractors() {
    const list = $("contractor-list");
    list.innerHTML = "";
    const count = state.contractors.length;
    $("contractor-count").textContent = count === 1 ? "1 contractor" : count + " contractors";

    // Sort A → Z
    const sorted = state.contractors.slice().sort((a,b)=> String(a.name||"").localeCompare(String(b.name||"")));

    sorted.forEach(c => {
      const box = document.createElement("div");
      box.className = "contractor" + (c.id === state.ui.selectedContractorId ? " active" : "");

      const nameInput = document.createElement("input");
      nameInput.type = "text"; nameInput.value = c.name; nameInput.title = "Click card to open";
      nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
      nameInput.addEventListener("blur", (e) => {
        const val = e.target.value.trim() || "Untitled Contractor";
        if (val !== c.name) { c.name = val; save(); renderContractors(); }
      });

      // Open on SINGLE CLICK (ignore clicks on the input)
      box.addEventListener("click", (ev) => {
        // allow click on nameInput to open (was guarded before)
        finishInit();
        state.ui.selectedContractorId = c.id; state.ui.selectedJobId = null; renderAll();
      });

      box.appendChild(nameInput);
      list.appendChild(box);
    });
  }

  function stageTint(stage) {
    const hex = state.stageColors[stage] || "#c4c4c4";
    return hexToRGBA(hex, 0.28);
  }

  function renderTabs() {
    const c = currentContractor();
    const tabs = $("job-tabs");
    tabs.innerHTML = "";
    if (!c) return;

    const jobs = c.jobs
      .filter(j => !j.archived)
      .slice()
      .sort((a,b) => {
        const na = parseLeadingNumber(a.name);
        const nb = parseLeadingNumber(b.name);
        if (na !== null && nb !== null) return na - nb;
        if (na !== null) return -1;
        if (nb !== null) return 1;
        return String(a.name).localeCompare(String(b.name));
      });

    jobs.forEach(j => {
      const el = document.createElement("div");
      el.className = "tab" + (j.id === state.ui.selectedJobId ? " active" : "");
      el.style.background = j.id === state.ui.selectedJobId ? "#fff" : stageTint(j.stage);
      el.style.borderColor = "#d1d5db";

      const label = document.createElement("div"); label.className = "label";
      const line1 = document.createElement("div"); line1.className = "line1"; line1.textContent = (j.address || "").split("\n")[0] || j.address || "—";
      const line2 = document.createElement("div"); line2.className = "line2"; line2.textContent = j.name || "Untitled Job";
      label.appendChild(line1); label.appendChild(line2);

      el.appendChild(label);
      el.addEventListener("click", () => { state.ui.editing = false; state.ui.editing = false; state.ui.editing = false; finishInit(); state.ui.selectedJobId = j.id; renderAll(); });
      tabs.appendChild(el);
    });
  }

  function renderSettings() {
    $("roster-input").value = state.roster.join("\n");
    $("stages-input").value = state.stages.join("\n");
    const wrap = $("stage-colors"); wrap.innerHTML = "";
    state.stages.slice(0,10).forEach(stage => {
      const row = document.createElement("div"); row.className = "row";
      const label = document.createElement("label"); label.textContent = stage;
      const picker = document.createElement("input"); picker.type = "color";
      picker.value = state.stageColors[stage] || "#cccccc";
      picker.addEventListener("input", () => { state.stageColors[stage] = picker.value; renderTabs(); });
      row.appendChild(label); row.appendChild(picker); wrap.appendChild(row);
    });

    const prev = $("company-logo-preview");
    if (state.companyLogoDataUrl) { prev.src = state.companyLogoDataUrl; prev.style.display = "block"; }
    else { prev.style.display = "none"; }
  }

  function finishInit() {
    const j = currentJob();
    if (j && !j.initComplete) { j.initComplete = true; save(); }
  }

  // Search now includes PO#
  function searchAndOpen(q) {
    const query = (q || "").trim().toLowerCase();
    if (!query) return;

    const num = /^\d+/.test(query) ? parseInt(query.match(/^\d+/)[0],10) : null;
    const candidates = [];
    state.contractors.forEach(c => {
      c.jobs.forEach(j => {
        const name = (j.name || "").toLowerCase();
        const addr = (j.address || "").toLowerCase();
        const po = (j.po || "").toLowerCase();
        const leading = parseLeadingNumber(j.name);
        let score = -1;
        // Name
        if (name === query) score = 100;
        else if (name.startsWith(query)) score = Math.max(score, 85);
        else if (name.includes(query)) score = Math.max(score, 70);
        // Address
        if (addr) {
          if (addr === query) score = Math.max(score, 100);
          else if (addr.startsWith(query)) score = Math.max(score, 88);
          else if (addr.includes(query)) score = Math.max(score, 72);
        }
        // PO
        if (po) {
          if (po === query) score = Math.max(score, 100);
          else if (po.startsWith(query)) score = Math.max(score, 95);
          else if (po.includes(query)) score = Math.max(score, 80);
        }
        // Leading job #
        if (num !== null && leading === num) score = Math.max(score, 92);
        if (score >= 0) candidates.push({ c, j, score });
      });
    });
    if (!candidates.length) { toast("No job found"); return; }
    candidates.sort((a,b) => b.score - a.score);
    const best = candidates[0];
    finishInit();
    state.ui.selectedContractorId = best.c.id;
    state.ui.selectedJobId = best.j.id;
    showView("main");
    renderAll();
    toast(`Opened: ${best.j.name}`);
  }

  function renderPanel() {
    const landing = $("placeholder-landing"); const companyLogoImg = $("company-logo"); const companyLogoEmpty = $("company-logo-empty");
    const contractorPanel = $("contractor-logo-panel"); const contractorLogo = $("contractor-logo");
    const contractorControls = $("contractor-controls");
    const contractorLogoFile = $("contractor-logo-file"); const deleteContractorBtn = $("delete-contractor");
    const jobFields = $("job-fields"); const jobActions = $("job-actions");

    const c = currentContractor(); const j = currentJob();

    if (!c) {
      // Landing
      jobFields.style.display = "none"; contractorPanel.style.display = "none"; contractorControls.style.display = "none"; landing.style.display = "flex";
      if (state.companyLogoDataUrl) { companyLogoImg.src = state.companyLogoDataUrl; companyLogoImg.style.display = "block"; companyLogoEmpty.style.display = "none"; }
      else { companyLogoImg.style.display = "none"; companyLogoEmpty.style.display = "block"; }
      return;
    }

    if (!j) {
      // Contractor selected, no job
      landing.style.display = "none"; jobFields.style.display = "none";
      contractorPanel.style.display = "flex"; contractorControls.style.display = "flex";
      contractorLogo.src = c.logoDataUrl || state.companyLogoDataUrl || "";
      contractorLogoFile.onchange = () => {
        const f = contractorLogoFile.files?.[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = () => { c.logoDataUrl = reader.result; contractorLogo.src = c.logoDataUrl; save(); toast("Contractor logo updated"); };
        reader.readAsDataURL(f);
      };
      deleteContractorBtn.onclick = () => {
        if (!confirm("Delete contractor and all jobs?")) return;
        state.contractors = state.contractors.filter(x => x.id !== c.id);
        state.ui.selectedContractorId = null; state.ui.selectedJobId = null;
        save(); renderAll(); toast("Contractor deleted");
      };
      return;
    }

    // Job selected
    landing.style.display = "none"; contractorPanel.style.display = "none"; contractorControls.style.display = "none"; jobFields.style.display = "block"; jobActions.style.display = "block"; (function(){ const fieldsEl = $("job-fields-inner"); if (fieldsEl) fieldsEl.style.display = state.ui.editing ? "block" : "none"; })(); renderJobSummary(j);
    // Sync Edit label
    (function(){ const b=$("edit-job"); if(b){ b.textContent = state.ui.editing ? "Done" : "Edit Job"; } })();

    // Fields
    $("job-name").value = j?.name || "";
    $("job-po").value = j?.po || "";
    $("job-address").value = j?.address || "";

    const stageSel = $("job-stage"); stageSel.innerHTML = "";
    state.stages.forEach(s => { const opt = document.createElement("option"); opt.value = s; opt.textContent = s; stageSel.appendChild(opt); });
    if (j?.stage) stageSel.value = j.stage;

    const crewBox = $("crew-box"); crewBox.innerHTML = "";
    const crewSet = new Set(j?.crew || []);
    state.roster.forEach(name => {
      const id = "crew-" + name.replace(/\s+/g, "_");
      const wrap = document.createElement("label"); wrap.className = "chip"; wrap.style.display = "inline-flex"; wrap.style.alignItems = "center"; wrap.style.gap = "6px";
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = id; cb.value = name;
      cb.checked = crewSet.has(name);
      cb.addEventListener("change", () => {
        if (!j) return;
        if (cb.checked) { if (!j.crew.includes(name)) j.crew.push(name); }
        else { j.crew = j.crew.filter(x => x !== name); }
        // Crew changes NEVER logged
        markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
      });
      const txt = document.createElement("span"); txt.textContent = name;
      wrap.appendChild(cb); wrap.appendChild(txt); crewBox.appendChild(wrap);
    });

    const list = $("notes-list"); list.innerHTML = "";
    (j.notes || []).forEach(n => {
      const obj = typeof n === "string" ? { d: ymd(), text: n } : n;
      const item = document.createElement("div"); item.className = "note-item";
      const d = document.createElement("div"); d.className = "note-date"; d.textContent = obj.d || ymd();
      const body = document.createElement("div"); body.className = "note-text"; body.innerHTML = obj.html ? sanitizeHtml(obj.html) : formatMarkdownLite(obj.text || String(n));
      item.appendChild(d); item.appendChild(body); list.appendChild(item);
    });

    $("job-updated").textContent = j?.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";
  }

  
  function renderArchives() {
    const list = $("archive-list"); const count = $("archive-count");
    if (!list) return;
    const q = ($("archive-search")?.value || "").trim().toLowerCase();
    const rows = [];
    state.contractors.forEach(c => {
      c.jobs.forEach(j => {
        if (j.archived) {
          const text = [j.name||"", j.po||"", c.name||"", j.address||""].join(" ").toLowerCase();
          if (!q || text.includes(q)) {
            rows.push({ cId: c.id, cName: c.name||"—", id: j.id, name: j.name||"(Untitled)", po: j.po||"", updated: j.updatedAt||"", stage: j.stage||"" });
          }
        }
      });
    });
    rows.sort((a,b) => String(a.name).localeCompare(String(b.name)));
    list.innerHTML = "";
    const selected = state.ui.archiveSelected || {};
    rows.forEach(r => {
      const item = document.createElement("div");
      item.className = "card"; item.setAttribute("data-id", r.id);
      item.style.padding = "8px 10px";
      item.style.border = "1px solid var(--line)";
      item.style.borderRadius = "8px";
      item.style.display = "grid";
      item.style.gridTemplateColumns = "24px 1fr auto";
      item.style.gap = "8px";
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!selected[r.id];
      cb.addEventListener("change", () => { selected[r.id] = cb.checked; updateDeleteBtn(); });
      const main = document.createElement("div");
      const title = document.createElement("div"); title.style.fontWeight = "600"; title.textContent = r.name + (r.po ? `  ·  PO ${r.po}` : "");
      const sub = document.createElement("div"); sub.className = "muted"; sub.style.fontSize = "12px"; sub.textContent = `${r.cName}  ·  Updated ${r.updated ? new Date(r.updated).toLocaleString() : "—"}`;
      main.appendChild(title); main.appendChild(sub);
      const openBtn = document.createElement("button"); openBtn.className = "ghost"; openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => { state.ui.selectedContractorId = r.cId; state.ui.selectedJobId = r.id; showView("main"); renderAll(); });
      item.appendChild(cb); item.appendChild(main); item.appendChild(openBtn);
      list.appendChild(item);
    });
    count.textContent = rows.length ? `${rows.length} archived` : "No archived jobs";
    state.ui.archiveSelected = selected;
    updateDeleteBtn();
  }

  function updateDeleteBtn() {
    const any = Object.values(state.ui.archiveSelected||{}).some(Boolean);
    const btn = $("archive-delete-selected"); if (btn) btn.disabled = !any;
  }

  function renderJobSummary(j) {
    const box = $("job-summary"); if (!box) return;
    if (!j) { box.style.display = "none"; box.innerHTML = ""; return; }
    const crew = (j.crew || []).join(", ") || "—";
    const po = j.po || "—";
    const addr = j.address || "—";
    const stage = j.stage || "—";
    const updated = j.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";
    box.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <div style="font-size:18px; font-weight:700;">${j.name || "Untitled"}</div>
        <span class="chip">Stage: ${stage}</span>
        <span class="chip">PO: ${po}</span>
        <span class="chip">Crew: ${crew}</span>
      </div>
      <div class="muted" style="margin-top:6px;">${addr}</div>
      <div class="muted" style="font-size:12px; margin-top:4px;">Last updated: ${updated}</div>
    `;
    box.style.display = state.ui.editing ? "none" : "block";
  }

  // --- Notes helpers (HTML + markdown-lite fallback) ---
  function escapeHtml(s) { return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function inlineFmt(s) {
    let x = s; x = x.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    x = x.replace(/__(.+?)__/g, '<u>$1</u>');
    x = x.replace(/(^|[^_])_([^_](?:.*?[^_])?)_(?!_)/g, '$1<em>$2</em>');
    x = x.replace(/==(.+?)==/g, '<mark>$1</mark>');
    return x;
  }
  function formatMarkdownLite(s) {
    const lines = String(s || "").split(/\n/); const out = []; let inList = false;
    for (const raw of lines) {
      const line = escapeHtml(raw);
      if (/^\s*-\s+/.test(line)) { if (!inList) { out.push("<ul>"); inList = true; }
        const item = line.replace(/^\s*-\s+/, ""); out.push("<li>" + inlineFmt(item) + "</li>");
      } else { if (inList) { out.push("</ul>"); inList = false; } out.push(inlineFmt(line) + "<br>"); }
    }
    if (inList) out.push("</ul>"); return out.join("");
  }
  function sanitizeHtml(input) {
    const allowed = new Set(["STRONG","EM","U","MARK","BR","UL","OL","LI","P","DIV","SPAN"]);
    const wrap = document.createElement("div"); wrap.innerHTML = input || "";
    (function walk(node){
      for (let i=node.childNodes.length-1; i>=0; i--) {
        const ch = node.childNodes[i];
        if (ch.nodeType === 1) {
          if (!allowed.has(ch.tagName)) { while (ch.firstChild) node.insertBefore(ch.firstChild, ch); node.removeChild(ch); }
          else { for (const a of Array.from(ch.attributes)) ch.removeAttribute(a.name); walk(ch); }
        }
      }
    })(wrap);
    return wrap.innerHTML.replace(/\n/g,"");
  }
function renderAll() {
    showView(state.ui.view);
    renderContractors();
    renderTabs();
    renderPanel();
    status("Ready");
  }

  function markUpdated(job) { job.updatedAt = new Date().toISOString(); }
  function pushNote(job, payload) {
    job.notes = job.notes || [];
    if (typeof payload === "string") job.notes.push({ d: ymd(), text: payload });
    else job.notes.push({ d: ymd(), ...(payload || {}) });
  }

  const save = debounce(async () => {
    status("Saving…");
    const payload = { ...state, version: 17 };
    try {
      const res = await API.save(payload);
      status(res.local ? "Saved locally (offline)" : "Saved");
    } catch (e) {
      status("Error saving (stored locally)");
    }
  }, 300);

  function wire() {
    statusEl = $("status");

    // WYSIWYG toolbar with selection restore and highlight toggle
    (function(){
      const ed = $("new-note-editor"); if (!ed) return;
      function isInsideEditor(node){ let n=node; while(n){ if(n===ed) return true; n=n.parentNode; } return false; }
      function placeCaretAtEnd(){ const r=document.createRange(); r.selectNodeContents(ed); r.collapse(false); const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
      let savedRange = null;
      function saveSel() {
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.rangeCount > 0 && isInsideEditor(sel.anchorNode)) savedRange = sel.getRangeAt(0);
      }
      function restoreSel() {
        const sel = window.getSelection && window.getSelection();
        if (!sel) return;
        if (!savedRange || !isInsideEditor(savedRange.commonAncestorContainer)) { placeCaretAtEnd(); return; }
        sel.removeAllRanges(); sel.addRange(savedRange);
      }
      // Keep selection when clicking toolbar
      ["note-bold","note-italic","note-underline","note-highlight","note-bullet"].forEach(id => {
        const b = $(id); if (!b) return;
        b.addEventListener("mousedown", (e)=>{ e.preventDefault(); restoreSel(); });
      });
      ed.addEventListener("mouseup", saveSel);
      ed.addEventListener("keyup", saveSel);
      ed.addEventListener("mouseleave", saveSel);
      function focusEd(){ ed.focus(); restoreSel(); if(!isInsideEditor((window.getSelection()&&window.getSelection().anchorNode))) placeCaretAtEnd(); }
      function surround(tag){
        const sel = window.getSelection && window.getSelection();
        if (!sel || sel.rangeCount === 0 || !isInsideEditor(sel.anchorNode)) { placeCaretAtEnd(); saveSel(); return; }
        const r = sel.getRangeAt(0);
        try { const el = document.createElement(tag); r.surroundContents(el); saveSel(); }
        catch(e){ document.execCommand('insertHTML', false, `<${tag}>${sel.toString()}</${tag}>`); saveSel(); }
      }
      function unwrapTag(tag) {
        const sel = window.getSelection && window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const r = sel.getRangeAt(0);
        const container = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement; if (!isInsideEditor(container)) return;
        const marks = Array.from(container.querySelectorAll(tag));
        marks.forEach(m => {
          const range = document.createRange();
          range.selectNodeContents(m);
          if (r.intersectsNode(m)) {
            while (m.firstChild) m.parentNode.insertBefore(m.firstChild, m);
            m.parentNode.removeChild(m);
          }
        });
        saveSel();
      }
      // Commands
      const cmd = (name) => { focusEd(); document.execCommand(name); refresh(); saveSel(); };
      const b = $("note-bold"); if (b) b.addEventListener("click", (e)=>{ e.preventDefault(); cmd("bold"); });
      const i = $("note-italic"); if (i) i.addEventListener("click", (e)=>{ e.preventDefault(); cmd("italic"); });
      const u = $("note-underline"); if (u) u.addEventListener("click", (e)=>{ e.preventDefault(); cmd("underline"); });
      
      const bl = $("note-bullet"); if (bl) bl.addEventListener("click", (e)=>{
        e.preventDefault(); focusEd();
        const sel = window.getSelection && window.getSelection();
        if (!sel || sel.rangeCount === 0 || !isInsideEditor(sel.anchorNode)) { placeCaretAtEnd(); saveSel(); }
        try { document.execCommand("insertUnorderedList"); } catch(e) {}
        const sel2 = window.getSelection && window.getSelection();
        if (!isInsideEditor(sel2.anchorNode)) { placeCaretAtEnd(); }
        // Fallback manual toggle
        function nearest(node, tag){ let n = node && (node.nodeType===1 ? node : node.parentElement); tag = String(tag||"").toUpperCase(); while(n){ if(n===ed) break; if(n.tagName===tag) return n; n=n.parentElement;} return null; }
        function unwrapList(ul){ if(!ul||!ul.parentNode) return; if(!isInsideEditor(ul)) return; const frag=document.createDocumentFragment(); const lis=Array.from(ul.children); lis.forEach((li,idx)=>{ while(li.firstChild) frag.appendChild(li.firstChild); if(idx<lis.length-1) frag.appendChild(document.createElement("br"));}); ul.parentNode.replaceChild(frag, ul); }
        function wrapSelectionWithList(range){ if(!isInsideEditor(range.commonAncestorContainer)) return; const ul=document.createElement("ul"); const li=document.createElement("li"); const contents=range.extractContents(); if(!contents||!contents.firstChild){ li.appendChild(document.createElement("br")); } else { li.appendChild(contents);} ul.appendChild(li); range.insertNode(ul); const r2=document.createRange(); r2.selectNodeContents(li); r2.collapse(true); const s=window.getSelection(); s.removeAllRanges(); s.addRange(r2); }
        const r = (window.getSelection() && window.getSelection().getRangeAt(0));
        const li = nearest((window.getSelection() && window.getSelection().anchorNode), "LI");
        if (li) { const ul = nearest(li, "UL"); unwrapList(ul); }
        else { if (!nearest((window.getSelection() && window.getSelection().anchorNode), "LI")) wrapSelectionWithList(r); }
        refresh(); saveSel();
      });
     $("note-highlight"); const hl = $("note-highlight");
      if (hl) hl.addEventListener("click", (e)=>{
        e.preventDefault(); focusEd();
        // Toggle: if selection is inside <mark>, unwrap; otherwise apply
        const sel = window.getSelection && window.getSelection();
        let insideMark = false;
        if (sel && sel.anchorNode && isInsideEditor(sel.anchorNode)) {
          let n = sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement;
          while (n) { if (n.tagName === "MARK") { insideMark = true; break; } n = n.parentElement; }
        }
        if (insideMark) { unwrapTag("mark"); } else { surround("mark"); }
        refresh(); saveSel();
      });
      // Active-state
      function hasAncestor(node, tagName){
        let n = node && (node.nodeType===1 ? node : node.parentElement);
        while (n) { if (n.tagName === tagName) return true; n = n.parentElement; }
        return false;
      }
      function refresh(){
        let onB=false,onI=false,onU=false,onHL=false;
        try { onB=document.queryCommandState("bold"); onI=document.queryCommandState("italic"); onU=document.queryCommandState("underline"); } catch(e){}
        const sel = window.getSelection && window.getSelection();
        const node = sel && sel.anchorNode ? (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement) : null;
        onHL = !!(node && hasAncestor(node,"MARK"));
        if ($("note-bold")) $("note-bold").classList.toggle("active", !!onB);
        if ($("note-italic")) $("note-italic").classList.toggle("active", !!onI);
        if ($("note-underline")) $("note-underline").classList.toggle("active", !!onU);
        if ($("note-highlight")) $("note-highlight").classList.toggle("active", !!onHL);
      }
      document.addEventListener("selectionchange", refresh);
      ed.addEventListener("keyup", refresh);
      refresh();
    })();

    // Edit Job toggle
    const editBtn = $("edit-job");
    if (editBtn) {
      const setLabel = () => { editBtn.textContent = state.ui.editing ? "Done" : "Edit Job"; };
      setLabel();
      editBtn.addEventListener("click", () => {
        const j = currentJob(); if (!j) return;
        // If turning OFF editing for the first time, mark setup complete so later changes log
        if (state.ui.editing && j && !j.initComplete) j.initComplete = true;
        state.ui.editing = !state.ui.editing;
        setLabel();
        renderPanel();
      });
    }

    // Archives: toolbar button + view controls
    const btnArchTop = $("open-archives-top");
    if (btnArchTop) btnArchTop.addEventListener("click", () => { finishInit(); showView("archives"); renderArchives(); });

    const backArch = $("back-from-archives");
    if (backArch) backArch.addEventListener("click", () => { finishInit(); showView("main"); renderAll(); });

    const searchArch = $("archive-search");
    if (searchArch) searchArch.addEventListener("input", () => { renderArchives(); });

    const selAll = $("archive-select-all");
    if (selAll) selAll.addEventListener("change", (e) => {
      const checked = e.target.checked;
      const cards = Array.from(document.querySelectorAll("#archive-list .card"));
      const map = state.ui.archiveSelected || {};
      cards.forEach(card => {
        const cb = card.querySelector('input[type=checkbox]'); if (!cb) return;
        cb.checked = checked;
        const id = card.getAttribute("data-id"); if (id) map[id] = checked;
      });
      state.ui.archiveSelected = map; updateDeleteBtn();
    });

    const delBtn = $("archive-delete-selected");
    if (delBtn) delBtn.addEventListener("click", () => {
      const ids = Object.entries(state.ui.archiveSelected||{}).filter(([,v]) => v).map(([k]) => k);
      if (!ids.length) return;
      if (!confirm("Delete selected archived jobs? This cannot be undone.")) return;
      state.contractors.forEach(c => { c.jobs = c.jobs.filter(j => !(j.archived && ids.includes(j.id))); });
      state.ui.archiveSelected = {};
      save(); renderArchives(); renderContractors(); renderTabs(); renderPanel(); toast("Deleted selected archived jobs");
    });


    $("to-settings").addEventListener("click", () => { finishInit(); renderSettings(); showView("settings"); });
    $("to-main").addEventListener("click", () => { finishInit(); showView("main"); });

    $("save-settings").addEventListener("click", () => {
      const roster = $("roster-input").value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const stages = $("stages-input").value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      if (roster.length) state.roster = roster;
      if (stages.length) state.stages = stages;
      const existing = { ...state.stageColors };
      const defaults = ["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#f472b6","#f59e0b","#22d3ee","#93c5fd","#86efac"];
      state.stages.slice(0,10).forEach((s,i) => { if (!existing[s]) existing[s] = defaults[i % defaults.length]; });
      Object.keys(existing).forEach(k => { if (!state.stages.includes(k)) delete existing[k]; });
      state.stageColors = existing;
      save(); renderSettings(); renderTabs(); renderPanel(); toast("Settings saved");
    });

    // Company logo upload
    const companyFile = $("company-logo-file");
    companyFile?.addEventListener("change", () => {
      const f = companyFile.files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { state.companyLogoDataUrl = reader.result; $("company-logo-preview").src = state.companyLogoDataUrl; $("company-logo-preview").style.display = "block"; save(); renderPanel(); toast("Company logo updated"); };
      reader.readAsDataURL(f);
    });

    $("add-contractor").addEventListener("click", () => {
      finishInit();
      const c = { id: uuid(), name: "New Contractor", logoDataUrl: "", jobs: [] };
      state.contractors.unshift(c);
      state.ui.selectedContractorId = c.id;
      state.ui.selectedJobId = null;
      save(); renderAll();
      toast("Contractor added");
    });

    $("add-job").addEventListener("click", () => {
      const c = currentContractor(); if (!c) { alert("Open a contractor first (click a name)."); return; }
      finishInit();
      const j = { id: uuid(), name: "New Job", po: "", address: "", stage: state.stages[0] || "", crew: [], notes: [], archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), initComplete: false };
      pushNote(j, "Created");
      c.jobs.unshift(j);
      state.ui.selectedJobId = j.id;
      state.ui.editing = true; state.ui.editing = true; renderTabs(); renderPanel(); save();
      toast("Job created");
    });

    $("archive-job").addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
      finishInit();
      j.archived = !j.archived;
      pushNote(j, j.archived ? "Archived" : "Un-archived");
      markUpdated(j); save(); renderAll();
      toast(j.archived ? "Job archived" : "Job un-archived");
    });

    $("delete-job").addEventListener("click", () => {
      const c = currentContractor(); const j = currentJob(); if (!c || !j) return;
      if (!confirm("Delete this job?")) return;
      c.jobs = c.jobs.filter(x => x.id !== j.id);
      state.ui.selectedJobId = null;
      save(); renderAll();
      toast("Job deleted");
    });

    // Name / PO / Address edits — only log after initComplete
    $("job-name").addEventListener("blur", (e) => {
      const j = currentJob(); if (!j) return;
      const val = e.target.value.trim();
      if (val !== j.name) {
        j.name = val;
        if (j.initComplete) pushNote(j, `Job renamed to "${val || "Untitled"}"`);
        markUpdated(j); save(); renderTabs(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
      }
    });
    $("job-name").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });

    $("job-po").addEventListener("blur", (e) => {
      const j = currentJob(); if (!j) return;
      const val = e.target.value.trim();
      if (val !== (j.po || "")) {
        j.po = val;
        if (j.initComplete) pushNote(j, `PO# changed to ${val || "—"}`);
        markUpdated(j); save(); renderTabs(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
      }
    });
    $("job-po").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });

    $("job-address").addEventListener("blur", (e) => {
      const j = currentJob(); if (!j) return;
      const val = e.target.value.trim();
      if (val !== (j.address || "")) {
        j.address = val;
        if (j.initComplete) pushNote(j, `Address changed`);
        markUpdated(j); save(); renderTabs(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
      }
    });
    $("job-address").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });

    $("job-stage").addEventListener("change", e => {
      const j = currentJob(); if (!j) return;
      const newStage = e.target.value;
      const prev = j.stage;
      j.stage = newStage;
      if (j.initComplete && newStage !== prev) pushNote(j, `Stage changed to ${j.stage}`);
      markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString(); renderTabs(); if (j.initComplete) toast("Stage updated");
    });

    $("add-note").addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
      const ed = $("new-note-editor");
      const html = (ed && ed.innerHTML ? ed.innerHTML.trim() : "");
      const txt  = (ed && ed.innerText ? ed.innerText.trim() : "");
      if (!html && !txt) return;
      if (!j.initComplete) j.initComplete = true;
      pushNote(j, { text: txt, html: sanitizeHtml(html) });
      if (ed) ed.innerHTML = "";
      markUpdated(j); save(); renderPanel();
    });

    $("refresh-btn").addEventListener("click", async () => {
      const data = await API.load();
      if (data) { state = { ...state, ...data, ui: { ...state.ui, ...(state.ui || {}) } }; }
      // Always force MAIN view and clear selections after reload; also finish init for current job
      finishInit();
      state.ui.view = "main";
      state.ui.selectedContractorId = null;
      state.ui.selectedJobId = null;
      renderAll();
      toast("Reloaded");
    });

    // Header search wiring
    const headerInput = $("header-search");
    const headerBtn = $("header-search-btn");
    headerInput?.addEventListener("keydown", (e)=>{ if (e.key === "Enter") searchAndOpen(headerInput.value); });
    headerBtn?.addEventListener("click", ()=> searchAndOpen(headerInput.value));
  }

  async function boot() {
    status("Loading…");
    const data = await API.load();
    if (data) state = { ...state, ...data };
    // Always land on MAIN and clear selected contractor & job
    state.ui.view = "main";
    state.ui.selectedContractorId = null;
    state.ui.selectedJobId = null;
    renderAll();
  }

  
  // Global delegated handler for Edit Job (more reliable on iPad/touch)
  document.addEventListener("click", (ev) => {
    const btn = ev.target && (ev.target.id === "edit-job" ? ev.target : ev.target.closest && ev.target.closest("#edit-job"));
    if (!btn) return;
    const j = currentJob(); if (!j) return;
    if (state.ui.editing && !j.initComplete) j.initComplete = true;
    state.ui.editing = !state.ui.editing;
    renderPanel();
  }, { passive: true });
window.addEventListener("DOMContentLoaded", () => { statusEl = $("status");

    // WYSIWYG toolbar with selection restore and highlight toggle
    (function(){
      const ed = $("new-note-editor"); if (!ed) return;
      let savedRange = null;
      function saveSel() {
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
      }
      function restoreSel() {
        if (!savedRange) return;
        const sel = window.getSelection && window.getSelection();
        if (!sel) return;
        sel.removeAllRanges(); sel.addRange(savedRange);
      }
      // Keep selection when clicking toolbar
      ["note-bold","note-italic","note-underline","note-highlight","note-bullet"].forEach(id => {
        const b = $(id); if (!b) return;
        b.addEventListener("mousedown", (e)=>{ e.preventDefault(); restoreSel(); });
      });
      ed.addEventListener("mouseup", saveSel);
      ed.addEventListener("keyup", saveSel);
      ed.addEventListener("mouseleave", saveSel);
      function focusEd(){ ed.focus(); restoreSel(); }
      function surround(tag){
        const sel = window.getSelection && window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const r = sel.getRangeAt(0);
        try { const el = document.createElement(tag); r.surroundContents(el); saveSel(); }
        catch(e){ document.execCommand('insertHTML', false, `<${tag}>${sel.toString()}</${tag}>`); saveSel(); }
      }
      function unwrapTag(tag) {
        const sel = window.getSelection && window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const r = sel.getRangeAt(0);
        const container = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
        const marks = Array.from(container.querySelectorAll(tag));
        marks.forEach(m => {
          const range = document.createRange();
          range.selectNodeContents(m);
          if (r.intersectsNode(m)) {
            while (m.firstChild) m.parentNode.insertBefore(m.firstChild, m);
            m.parentNode.removeChild(m);
          }
        });
        saveSel();
      }
      // Commands
      const cmd = (name) => { focusEd(); document.execCommand(name); refresh(); saveSel(); };
      const b = $("note-bold"); if (b) b.addEventListener("click", (e)=>{ e.preventDefault(); cmd("bold"); });
      const i = $("note-italic"); if (i) i.addEventListener("click", (e)=>{ e.preventDefault(); cmd("italic"); });
      const u = $("note-underline"); if (u) u.addEventListener("click", (e)=>{ e.preventDefault(); cmd("underline"); });
      const bl = $("note-bullet"); if (bl) bl.addEventListener("click", (e)=>{ e.preventDefault(); cmd("insertUnorderedList"); });
      const hl = $("note-highlight"); if (hl) hl.addEventListener("click", (e)=>{
        e.preventDefault(); focusEd();
        // Toggle: if selection is inside <mark>, unwrap; otherwise apply
        const sel = window.getSelection && window.getSelection();
        let insideMark = false;
        if (sel && sel.anchorNode) {
          let n = sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement;
          while (n) { if (n.tagName === "MARK") { insideMark = true; break; } n = n.parentElement; }
        }
        if (insideMark) { unwrapTag("mark"); } else { surround("mark"); }
        refresh(); saveSel();
      });
      // Active-state
      function hasAncestor(node, tagName){
        let n = node && (node.nodeType===1 ? node : node.parentElement);
        while (n) { if (n.tagName === tagName) return true; n = n.parentElement; }
        return false;
      }
      function refresh(){
        let onB=false,onI=false,onU=false,onHL=false;
        try { onB=document.queryCommandState("bold"); onI=document.queryCommandState("italic"); onU=document.queryCommandState("underline"); } catch(e){}
        const sel = window.getSelection && window.getSelection();
        const node = sel && sel.anchorNode ? (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement) : null;
        onHL = !!(node && hasAncestor(node,"MARK"));
        if ($("note-bold")) $("note-bold").classList.toggle("active", !!onB);
        if ($("note-italic")) $("note-italic").classList.toggle("active", !!onI);
        if ($("note-underline")) $("note-underline").classList.toggle("active", !!onU);
        if ($("note-highlight")) $("note-highlight").classList.toggle("active", !!onHL);
      }
      document.addEventListener("selectionchange", refresh);
      ed.addEventListener("keyup", refresh);
      refresh();
    })();

    // Edit Job toggle
    const editBtn = $("edit-job");
    if (editBtn) {
      const setLabel = () => { editBtn.textContent = state.ui.editing ? "Done" : "Edit Job"; };
      setLabel();
      editBtn.addEventListener("click", () => {
        const j = currentJob(); if (!j) return;
        // If turning OFF editing for the first time, mark setup complete so later changes log
        if (state.ui.editing && j && !j.initComplete) j.initComplete = true;
        state.ui.editing = !state.ui.editing;
        setLabel();
        renderPanel();
      });
    }

    // Archives: toolbar button + view controls
    const btnArchTop = $("open-archives-top");
    if (btnArchTop) btnArchTop.addEventListener("click", () => { finishInit(); showView("archives"); renderArchives(); });

    const backArch = $("back-from-archives");
    if (backArch) backArch.addEventListener("click", () => { finishInit(); showView("main"); renderAll(); });

    const searchArch = $("archive-search");
    if (searchArch) searchArch.addEventListener("input", () => { renderArchives(); });

    const selAll = $("archive-select-all");
    if (selAll) selAll.addEventListener("change", (e) => {
      const checked = e.target.checked;
      const cards = Array.from(document.querySelectorAll("#archive-list .card"));
      const map = state.ui.archiveSelected || {};
      cards.forEach(card => {
        const cb = card.querySelector('input[type=checkbox]'); if (!cb) return;
        cb.checked = checked;
        const id = card.getAttribute("data-id"); if (id) map[id] = checked;
      });
      state.ui.archiveSelected = map; updateDeleteBtn();
    });

    const delBtn = $("archive-delete-selected");
    if (delBtn) delBtn.addEventListener("click", () => {
      const ids = Object.entries(state.ui.archiveSelected||{}).filter(([,v]) => v).map(([k]) => k);
      if (!ids.length) return;
      if (!confirm("Delete selected archived jobs? This cannot be undone.")) return;
      state.contractors.forEach(c => { c.jobs = c.jobs.filter(j => !(j.archived && ids.includes(j.id))); });
      state.ui.archiveSelected = {};
      save(); renderArchives(); renderContractors(); renderTabs(); renderPanel(); toast("Deleted selected archived jobs");
    });
 wire(); boot(); });
})();