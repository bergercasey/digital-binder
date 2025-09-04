/* app.js: all logic moved here to avoid inline-script CSP issues */
(function(){
  const $ = (id) => document.getElementById(id);
  let statusEl;

  // Visible error banner for any JS error
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
        { id: uuid(), name: "123 Main St", stage: "Rough-in", crew: ["Alice","Bob"], notes: "Ducts delivered. Rough inspection Fri.", archived: false, updatedAt: new Date().toISOString() }
      ]}
    ],
    ui: { selectedContractorId: null, selectedJobId: null, showArchived: false }
  };

  function status(msg) { if (statusEl) statusEl.textContent = msg; }
  function toast(msg, ms=1800) {
    const wrap = $("toast-wrap");
    if (!wrap) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
      t.style.transition = "all 220ms ease";
    }, ms);
    setTimeout(() => wrap.removeChild(t), ms + 260);
  }

  function currentContractor() { return state.contractors.find(c => c.id === state.ui.selectedContractorId) || null; }
  function currentJob() { const c = currentContractor(); if (!c) return null; return c.jobs.find(j => j.id === state.ui.selectedJobId) || null; }

  function renderContractors() {
    const list = $("contractor-list");
    list.innerHTML = "";
    const count = state.contractors.length;
    $("contractor-count").textContent = count === 1 ? "1 contractor" : count + " contractors";

    state.contractors.forEach(c => {
      const el = document.createElement("div");
      el.className = "contractor" + (c.id === state.ui.selectedContractorId ? " active" : "");
      el.innerHTML = `
        <input value="${c.name}" />
        <button data-act="select">Open</button>
        <button class="danger" data-act="remove">✕</button>
      `;
      el.querySelector("input").addEventListener("input", debounce(e => {
        c.name = e.target.value.trim() || "Untitled Contractor";
        save();
        renderContractors();
        renderTabs();
      }));
      el.querySelector('[data-act="select"]').addEventListener("click", () => {
        state.ui.selectedContractorId = c.id;
        const first = c.jobs.find(j => !j.archived) || c.jobs[0];
        state.ui.selectedJobId = first ? first.id : null;
        renderAll();
      });
      el.querySelector('[data-act="remove"]').addEventListener("click", () => {
        if (!confirm("Delete contractor and all jobs?")) return;
        state.contractors = state.contractors.filter(x => x.id !== c.id);
        if (state.ui.selectedContractorId === c.id) {
          state.ui.selectedContractorId = state.contractors[0]?.id || null;
          state.ui.selectedJobId = state.contractors[0]?.jobs[0]?.id || null;
        }
        save(); renderAll();
        toast("Contractor deleted");
      });
      list.appendChild(el);
    });
  }

  function renderTabs() {
    const c = currentContractor();
    const tabs = $("job-tabs");
    tabs.innerHTML = "";
    if (!c) return;

    const jobs = c.jobs.filter(j => state.ui.showArchived ? true : !j.archived);
    jobs.forEach(j => {
      const el = document.createElement("div");
      el.className = "tab" + (j.id === state.ui.selectedJobId ? " active" : "");
      el.innerHTML = `
        <span>${j.name || "Untitled Job"}</span>
        ${j.archived ? '<span class="pill">Archived</span>' : ""}
      `;
      el.addEventListener("click", () => { state.ui.selectedJobId = j.id; renderAll(); });
      tabs.appendChild(el);
    });
  }

  function renderJobFields() {
    const j = currentJob();
    $("job-name").value = j?.name || "";
    $("job-notes").value = j?.notes || "";
    $("job-updated").textContent = j?.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";

    const stageSel = $("job-stage");
    stageSel.innerHTML = "";
    state.stages.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s; opt.textContent = s; stageSel.appendChild(opt);
    });
    if (j?.stage) stageSel.value = j.stage;

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
      cb.type = "checkbox";
      cb.id = id; cb.value = name;
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

    $("roster-input").value = state.roster.join("\n");
    $("stages-input").value = state.stages.join("\n");
  }

  function renderAll() {
    renderContractors();
    renderTabs();
    renderJobFields();
    $("show-archived").checked = !!state.ui.showArchived;
    status("Ready");
  }

  function markUpdated(job) { job.updatedAt = new Date().toISOString(); }

  const save = debounce(async () => {
    status("Saving…");
    const payload = { roster: state.roster, stages: state.stages, contractors: state.contractors, version: 5 };
    try {
      const res = await API.save(payload);
      status(res.local ? "Saved locally (offline)" : "Saved");
    } catch (e) {
      status("Error saving (stored locally)");
    }
  }, 300);

  function wire() {
    statusEl = $("status");

    $("add-contractor").addEventListener("click", () => {
      const c = { id: uuid(), name: "New Contractor", jobs: [] };
      state.contractors.unshift(c);
      state.ui.selectedContractorId = c.id;
      state.ui.selectedJobId = null;
      save(); renderAll();
      toast("Contractor added");
    });

    $("add-job").addEventListener("click", () => {
      const c = currentContractor(); if (!c) { alert("Add a contractor first."); return; }
      const j = { id: uuid(), name: "New Job", stage: state.stages[0] || "", crew: [], notes: "", archived: false, updatedAt: new Date().toISOString() };
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
      state.ui.selectedJobId = c.jobs[0]?.id || null;
      save(); renderAll();
      toast("Job deleted");
    });

    $("duplicate-job").addEventListener("click", () => {
      const c = currentContractor(); const j = currentJob(); if (!c || !j) return;
      const copy = JSON.parse(JSON.stringify(j));
      copy.id = uuid(); copy.name = j.name + " (copy)"; markUpdated(copy);
      c.jobs.splice( (c.jobs.findIndex(x => x.id === j.id) + 1), 0, copy );
      state.ui.selectedJobId = copy.id;
      save(); renderAll();
      toast("Job duplicated");
    });

    $("job-name").addEventListener("input", debounce(e => {
      const j = currentJob(); if (!j) return; j.name = e.target.value; markUpdated(j); save(); renderTabs(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
    }));
    $("job-notes").addEventListener("input", debounce(e => {
      const j = currentJob(); if (!j) return; j.notes = e.target.value; markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
    }));
    $("job-stage").addEventListener("change", e => {
      const j = currentJob(); if (!j) return; j.stage = e.target.value; markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
      toast("Stage updated");
    });

    $("save-settings").addEventListener("click", () => {
      const roster = $("roster-input").value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const stages = $("stages-input").value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      if (roster.length) state.roster = roster;
      if (stages.length) state.stages = stages;
      save(); renderJobFields(); toast("Settings saved");
    });

    $("show-archived").addEventListener("change", e => { state.ui.showArchived = !!e.target.checked; renderTabs(); });

    $("refresh-btn").addEventListener("click", async () => {
      const data = await API.load();
      if (data) { state = { ...state, ...data, ui: state.ui || {} }; }
      state.ui.selectedContractorId ??= state.contractors[0]?.id || null;
      state.ui.selectedJobId ??= state.contractors[0]?.jobs[0]?.id || null;
      renderAll();
      toast("Reloaded");
    });

    $("settings-btn").addEventListener("click", () => {
      document.getElementById("settings-section").scrollIntoView({ behavior: "smooth", block: "start" });
      toast("Settings");
    });
  }

  async function boot() {
    status("Loading…");
    const data = await API.load();
    if (data) state = { ...state, ...data };
    state.ui.selectedContractorId = state.contractors[0]?.id || null;
    state.ui.selectedJobId = state.contractors[0]?.jobs[0]?.id || null;
    renderAll();
  }

  window.addEventListener("DOMContentLoaded", () => {
    statusEl = $("status");
    wire();
    boot();
  });
})();