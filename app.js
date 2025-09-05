/* app.js v3.4 */
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

  // Convert hex (#rrggbb) to rgba with alpha 0.25
  function hexToRGBA(hex, alpha=0.25) {
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
        { id: uuid(), name: "101 - 123 Main St", stage: "Rough-in", crew: ["Alice","Bob"], notes: [
          { d: ymd(), text: "Ducts delivered. Rough inspection Fri." }
        ], archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]}
    ],
    ui: { selectedContractorId: null, selectedJobId: null, view: "main", showArchived: false }
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
    $("to-main").style.display = name === "settings" ? "inline-block" : "none";
  }

  function currentContractor() { return state.contractors.find(c => c.id === state.ui.selectedContractorId) || null; }
  function currentJob() { const c = currentContractor(); if (!c) return null; return c.jobs.find(j => j.id === state.ui.selectedJobId) || null; }

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

    state.contractors.forEach(c => {
      const box = document.createElement("div");
      box.className = "contractor" + (c.id === state.ui.selectedContractorId ? " active" : "");

      const row = document.createElement("div"); row.className = "row";
      const nameInput = document.createElement("input");
      nameInput.type = "text"; nameInput.value = c.name;
      nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
      nameInput.addEventListener("blur", (e) => {
        const val = e.target.value.trim() || "Untitled Contractor";
        if (val !== c.name) { c.name = val; save(); }
      });

      const openBtn = document.createElement("button"); openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => { state.ui.selectedContractorId = c.id; state.ui.selectedJobId = null; renderAll(); });

      const delBtn = document.createElement("button"); delBtn.className = "danger"; delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        if (!confirm("Delete contractor and all jobs?")) return;
        state.contractors = state.contractors.filter(x => x.id !== c.id);
        if (state.ui.selectedContractorId === c.id) { state.ui.selectedContractorId = null; state.ui.selectedJobId = null; }
        save(); renderAll(); toast("Contractor deleted");
      });

      row.appendChild(nameInput); row.appendChild(openBtn); row.appendChild(delBtn);
      box.appendChild(row);

      // Logo upload when active
      const logoField = document.createElement("div");
      logoField.className = "logo-field";
      const logoLabel = document.createElement("label"); logoLabel.textContent = "Logo (PNG/JPG)";
      const file = document.createElement("input"); file.type = "file"; file.accept = "image/*";
      const prev = document.createElement("img"); prev.className = "logo-preview"; prev.style.display = c.logoDataUrl ? "block" : "none"; prev.src = c.logoDataUrl || "";
      file.addEventListener("change", () => {
        const f = file.files?.[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = () => { c.logoDataUrl = reader.result; prev.src = c.logoDataUrl; prev.style.display = "block"; save(); renderPanel(); toast("Contractor logo updated"); };
        reader.readAsDataURL(f);
      });
      logoField.appendChild(logoLabel); logoField.appendChild(file); logoField.appendChild(prev);
      box.appendChild(logoField);

      list.appendChild(box);
    });
  }

  // Colors
  function hexToRGBAColor(hex) {
    const m = hex.replace('#','');
    const bigint = parseInt(m.length === 3 ? m.split('').map(c=>c+c).join('') : m, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return {r,g,b};
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
      .filter(j => state.ui.showArchived ? true : !j.archived)
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

      const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = state.stageColors[j.stage] || "#9ca3af";
      const label = document.createElement("span"); label.className = "label"; label.textContent = j.name || "Untitled Job";

      el.appendChild(dot); el.appendChild(label);
      el.addEventListener("click", () => { state.ui.selectedJobId = j.id; renderAll(); });
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

    // Company logo preview
    const prev = $("company-logo-preview");
    if (state.companyLogoDataUrl) { prev.src = state.companyLogoDataUrl; prev.style.display = "block"; }
    else { prev.style.display = "none"; }
  }

  // Normalize notes to objects if needed when rendering or pushing new ones
  const coerceNote = (n) => typeof n === "string" ? { d: ymd(), text: n } : n;

  function renderPanel() {
    const landing = $("placeholder-landing"); const companyLogoImg = $("company-logo"); const companyLogoEmpty = $("company-logo-empty");
    const contractorPanel = $("contractor-logo-panel"); const contractorLogo = $("contractor-logo");
    const jobFields = $("job-fields"); const jobActions = $("job-actions");

    const c = currentContractor(); const j = currentJob();

    if (!c) {
      // Landing
      jobFields.style.display = "none"; contractorPanel.style.display = "none"; landing.style.display = "flex";
      if (state.companyLogoDataUrl) { companyLogoImg.src = state.companyLogoDataUrl; companyLogoImg.style.display = "block"; companyLogoEmpty.style.display = "none"; }
      else { companyLogoImg.style.display = "none"; companyLogoEmpty.style.display = "block"; }
      return;
    }

    if (!j) {
      // Contractor selected, no job
      landing.style.display = "none"; jobFields.style.display = "none";
      contractorPanel.style.display = "flex";
      contractorLogo.src = c.logoDataUrl || state.companyLogoDataUrl || "";
      return;
    }

    // Job selected
    landing.style.display = "none"; contractorPanel.style.display = "none"; jobFields.style.display = "block"; jobActions.style.display = "block";

    // Fields
    $("job-name").value = j?.name || "";

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
        pushNote(j, `Crew updated: ${j.crew.join(", ")}`);
        markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString(); toast("Crew updated");
      });
      const txt = document.createElement("span"); txt.textContent = name;
      wrap.appendChild(cb); wrap.appendChild(txt); crewBox.appendChild(wrap);
    });

    const list = $("notes-list"); list.innerHTML = "";
    (j.notes || []).map(coerceNote).forEach(n => {
      const item = document.createElement("div"); item.className = "note-item";
      const d = document.createElement("div"); d.className = "note-date"; d.textContent = n.d || ymd();
      const body = document.createElement("div"); body.textContent = n.text || String(n);
      item.appendChild(d); item.appendChild(body); list.appendChild(item);
    });

    $("job-updated").textContent = j?.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";
  }

  function renderAll() {
    showView(state.ui.view);
    renderContractors();
    renderTabs();
    renderPanel();
    status("Ready");
  }

  function markUpdated(job) { job.updatedAt = new Date().toISOString(); }
  function pushNote(job, text) {
    job.notes = job.notes || [];
    job.notes.push({ d: ymd(), text });
  }

  const save = debounce(async () => {
    status("Saving…");
    const payload = { ...state, version: 10 };
    try {
      const res = await API.save(payload);
      status(res.local ? "Saved locally (offline)" : "Saved");
    } catch (e) {
      status("Error saving (stored locally)");
    }
  }, 300);

  function wire() {
    statusEl = $("status");

    $("to-settings").addEventListener("click", () => { renderSettings(); showView("settings"); });
    $("to-main").addEventListener("click", () => { showView("main"); });

    $("save-settings").addEventListener("click", () => {
      const roster = $("roster-input").value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const stages = $("stages-input").value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      if (roster.length) state.roster = roster;
      if (stages.length) state.stages = stages;
      // Refresh stage colors for new/removed stages
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
      const c = { id: uuid(), name: "New Contractor", logoDataUrl: "", jobs: [] };
      state.contractors.unshift(c);
      state.ui.selectedContractorId = c.id;
      state.ui.selectedJobId = null;
      save(); renderAll();
      toast("Contractor added");
    });

    $("add-job").addEventListener("click", () => {
      const c = currentContractor(); if (!c) { alert("Open a contractor first."); return; }
      const j = { id: uuid(), name: "New Job", stage: state.stages[0] || "", crew: [], notes: [], archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      // initial dated creation note
      pushNote(j, "Created");
      c.jobs.unshift(j);
      state.ui.selectedJobId = j.id;
      renderTabs(); renderPanel(); save();
      toast("Job created");
    });

    $("archive-job").addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
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

    $("job-name").addEventListener("blur", (e) => {
      const j = currentJob(); if (!j) return;
      const val = e.target.value.trim();
      if (val && val !== j.name) {
        pushNote(j, `Job renamed: "${j.name}" → "${val}"`);
        j.name = val;
        markUpdated(j); save(); renderTabs(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
      }
    });
    $("job-name").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });

    $("job-stage").addEventListener("change", e => {
      const j = currentJob(); if (!j) return;
      j.stage = e.target.value;
      pushNote(j, `Stage changed to ${j.stage}`);
      markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString(); renderTabs(); toast("Stage updated");
    });

    $("add-note").addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
      const txt = $("new-note").value.trim(); if (!txt) return;
      pushNote(j, txt); $("new-note").value = "";
      markUpdated(j); save(); renderPanel(); toast("Note added");
    });

    $("refresh-btn").addEventListener("click", async () => {
      const data = await API.load();
      if (data) { state = { ...state, ...data, ui: { ...state.ui, ...(state.ui || {}) } }; }
      renderAll();
      toast("Reloaded");
    });
  }

  async function boot() {
    status("Loading…");
    const data = await API.load();
    if (data) state = { ...state, ...data };
    state.ui.selectedContractorId ??= null; state.ui.selectedJobId = null;
    renderAll();
  }

  window.addEventListener("DOMContentLoaded", () => { statusEl = $("status"); wire(); boot(); });
})();