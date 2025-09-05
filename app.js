/* app.js v3.1 */
(function(){
  const $ = (id) => document.getElementById(id);
  let statusEl;

  // Error banner
  const errbar = $("errbar");
  window.addEventListener("error", (e) => {
    if (!errbar) return;
    errbar.style.display = "block";
    errbar.textContent = "Script error: " + (e.message || e.error || e.filename);
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (!errbar) return;
    errbar.style.display = "block";
    errbar.textContent = "Promise error: " + (e.reason && e.reason.message ? e.reason.message : String(e.reason));
  });

  const uuid = () => Math.random().toString(36).slice(2, 10);
  const debounce = (fn, ms=400) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };

  const palette = ["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#f472b6","#f59e0b","#22d3ee"];
  const stageColor = (stage, stages) => {
    const i = Math.max(0, stages.indexOf(stage));
    return palette[i % palette.length];
  };

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
    roster: ["Alice","Bob","Chris","Dee"],
    stages: ["Bid","Rough-in","Trim","Complete"],
    contractors: [
      { id: uuid(), name: "Acme Mechanical", jobs: [
        { id: uuid(), name: "101 - 123 Main St", stage: "Rough-in", crew: ["Alice","Bob"], notes: [
          { id: uuid(), text: "Job created. Stage: Rough-in. Crew: Alice, Bob", ts: new Date().toISOString() },
          { id: uuid(), text: "Ducts delivered. Rough inspection Fri.", ts: new Date().toISOString() }
        ], archived: false, updatedAt: new Date().toISOString() }
      ]}
    ],
    ui: { selectedContractorId: null, selectedJobId: null, showArchived: false, view: "main" } // start with no contractor selected
  };

  function status(msg) { if (statusEl) statusEl.textContent = msg; }
  function toast(msg, ms=1800) {
    const wrap = $("toast-wrap");
    if (!wrap) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
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
      const el = document.createElement("div");
      el.className = "contractor" + (c.id === state.ui.selectedContractorId ? " active" : "");
      const input = document.createElement("input");
      input.value = c.name;
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.target.blur(); } });
      input.addEventListener("blur", (e) => {
        const val = e.target.value.trim() || "Untitled Contractor";
        if (val !== c.name) { c.name = val; save(); }
      });

      const openBtn = document.createElement("button");
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => {
        state.ui.selectedContractorId = c.id;
        // Do NOT auto-pick a job yet; show tabs only, wait for click (per request)
        state.ui.selectedJobId = null;
        renderAll();
      });

      const delBtn = document.createElement("button");
      delBtn.className = "danger";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        if (!confirm("Delete contractor and all jobs?")) return;
        state.contractors = state.contractors.filter(x => x.id !== c.id);
        if (state.ui.selectedContractorId === c.id) {
          state.ui.selectedContractorId = null;
          state.ui.selectedJobId = null;
        }
        save(); renderAll(); toast("Contractor deleted");
      });

      el.appendChild(input);
      el.appendChild(openBtn);
      el.appendChild(delBtn);
      list.appendChild(el);
    });
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
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = stageColor(j.stage, state.stages);

      const label = document.createElement("span");
      label.className = "label";
      label.textContent = j.name || "Untitled Job";

      el.appendChild(dot);
      el.appendChild(label);

      if (j.archived) {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = " Archived";
        el.appendChild(pill);
      }

      el.addEventListener("click", () => {
        state.ui.selectedJobId = j.id;
        renderAll();
      });
      tabs.appendChild(el);
    });
  }

  function renderJobFields() {
    const j = currentJob();
    const placeholder = $("placeholder");
    const jobFields = $("job-fields");

    if (!currentContractor()) {
      placeholder.style.display = "flex";
      jobFields.style.display = "none";
      return;
    }

    // Contractor open, but no job selected yet
    if (!j) {
      placeholder.style.display = "flex";
      placeholder.textContent = "Select a job tab above, or create one with + Job.";
      jobFields.style.display = "none";
      return;
    }

    // Show fields
    placeholder.style.display = "none";
    jobFields.style.display = "block";

    $("job-name").value = j?.name || "";

    // Stage
    const stageSel = $("job-stage");
    stageSel.innerHTML = "";
    state.stages.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s; opt.textContent = s; stageSel.appendChild(opt);
    });
    if (j?.stage) stageSel.value = j.stage;

    // Crew chips
    const crewBox = $("crew-box");
    crewBox.innerHTML = "";
    const crewSet = new Set(j?.crew || []);
    state.roster.forEach(name => {
      const id = "crew-" + name.replace(/\s+/g, "_");
      const wrap = document.createElement("label");
      wrap.className = "chip";
      wrap.style.display = "inline-flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "6px";

      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.id = id; cb.value = name;
      cb.checked = crewSet.has(name);
      cb.addEventListener("change", () => {
        if (!j) return;
        if (cb.checked) { if (!j.crew.includes(name)) j.crew.push(name); }
        else { j.crew = j.crew.filter(x => x !== name); }
        markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
        toast("Crew updated");
      });

      const txt = document.createElement("span"); txt.textContent = name;
      wrap.appendChild(cb); wrap.appendChild(txt);
      crewBox.appendChild(wrap);
    });

    // Notes list
    const list = $("notes-list");
    list.innerHTML = "";
    const notes = (j?.notes || []).slice().sort((a,b) => new Date(b.ts) - new Date(a.ts));
    notes.forEach(n => {
      const item = document.createElement("div");
      item.className = "note-item";
      const d = document.createElement("div");
      d.className = "note-date";
      d.textContent = new Date(n.ts).toLocaleString();
      const body = document.createElement("div");
      body.textContent = n.text;
      item.appendChild(d); item.appendChild(body);
      list.appendChild(item);
    });

    $("job-updated").textContent = j?.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";

    // Settings textareas (on settings view only)
    $("roster-input").value = state.roster.join("\n");
    $("stages-input").value = state.stages.join("\n");
  }

  function renderAll() {
    showView(state.ui.view);
    renderContractors();
    renderTabs();
    renderJobFields();
    $("show-archived").checked = !!state.ui.showArchived;
    status("Ready");
  }

  function markUpdated(job) { job.updatedAt = new Date().toISOString(); }

  const save = debounce(async () => {
    status("Saving…");
    const payload = { roster: state.roster, stages: state.stages, contractors: state.contractors, version: 7 };
    try {
      const res = await API.save(payload);
      status(res.local ? "Saved locally (offline)" : "Saved");
    } catch (e) {
      status("Error saving (stored locally)");
    }
  }, 300);

  function wire() {
    statusEl = $("status");

    $("to-settings").addEventListener("click", () => { showView("settings"); });
    $("to-main").addEventListener("click", () => { showView("main"); });

    $("add-contractor").addEventListener("click", () => {
      const c = { id: uuid(), name: "New Contractor", jobs: [] };
      state.contractors.unshift(c);
      state.ui.selectedContractorId = c.id;
      state.ui.selectedJobId = null;
      save(); renderAll();
      toast("Contractor added");
    });

    $("add-job").addEventListener("click", () => {
      const c = currentContractor(); if (!c) { alert("Open a contractor first."); return; }
      const j = { id: uuid(), name: "New Job", stage: state.stages[0] || "", crew: [], notes: [], archived: false, updatedAt: new Date().toISOString() };
      // initial note for creation
      const initText = `Job created. Stage: ${j.stage}${j.crew.length ? `. Crew: ${j.crew.join(", ")}` : ""}`;
      j.notes.push({ id: uuid(), text: initText, ts: new Date().toISOString() });

      c.jobs.unshift(j);
      state.ui.selectedJobId = j.id;
      renderTabs(); renderJobFields(); save();
      toast("Job created");
    });

    $("archive-job").addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
      j.archived = !j.archived; markUpdated(j); save(); renderAll();
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
      if (val !== j.name) {
        j.name = val;
        markUpdated(j); save(); renderTabs(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
      }
    });
    $("job-name").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });

    $("job-stage").addEventListener("change", e => {
      const j = currentJob(); if (!j) return;
      j.stage = e.target.value;
      // append stage-change note
      j.notes = j.notes || [];
      j.notes.push({ id: uuid(), text: `Stage changed to ${j.stage}`, ts: new Date().toISOString() });
      markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
      renderTabs(); // update tab color
      toast("Stage updated");
    });

    $("add-note").addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
      const txt = $("new-note").value.trim();
      if (!txt) return;
      j.notes = j.notes || [];
      j.notes.push({ id: uuid(), text: txt, ts: new Date().toISOString() });
      $("new-note").value = "";
      markUpdated(j); save(); renderJobFields();
      toast("Note added");
    });

    $("save-settings").addEventListener("click", () => {
      const roster = $("roster-input").value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const stages = $("stages-input").value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      state.roster = roster.length ? roster : state.roster;
      state.stages = stages.length ? stages : state.stages;
      save(); renderJobFields(); renderTabs(); toast("Settings saved");
    });

    $("show-archived").addEventListener("change", e => { state.ui.showArchived = !!e.target.checked; renderTabs(); });

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
    // On boot, do NOT auto select contractor/job
    state.ui.selectedContractorId ??= null;
    state.ui.selectedJobId = null;
    renderAll();
  }

  window.addEventListener("DOMContentLoaded", () => {
    statusEl = $("status");
    wire();
    boot();
  });
})();