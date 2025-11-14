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
  const ymd = (d = new Date()) => d.toISOString().slice(0,10);

  function status(msg){
    if (!statusEl) statusEl = $("status");
    if (statusEl) statusEl.textContent = msg || "";
  }

  const STORAGE_KEY = "contractor-hub-v3";
  const API = {
    async load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        console.error("Load error", e);
        return null;
      }
    },
    async save(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return { local: true };
      } catch (e) {
        console.error("Save error", e);
        return { local: true, error: String(e) };
      }
    }
  };

  let state = {
    contractors: [],
    jobs: [],
    ui: {
      view: "main",
      selectedContractorId: null,
      selectedJobId: null,
      filterStage: "active",
      search: "",
      sort: "updatedAt-desc",
      lastLogId: null
    },
    logs: []
  };

  function log(type, payload) {
    const entry = {
      id: uuid(),
      t: new Date().toISOString(),
      type,
      ...payload
    };
    state.logs.push(entry);
    const list = $("log-list");
    if (list) {
      const li = document.createElement("div");
      li.className = "log-item";
      li.textContent = `[${new Date(entry.t).toLocaleTimeString()}] ${type}: ${JSON.stringify(payload)}`;
      list.prepend(li);
      const items = list.querySelectorAll(".log-item");
      if (items.length > 500) items[items.length-1].remove();
    }
  }

  function findContractor(id){
    return state.contractors.find(c => c.id === id);
  }
  function findJob(jobId){
    return state.jobs.find(j => j.id === jobId);
  }
  function currentJob(){
    const id = state.ui.selectedJobId;
    if (!id) return null;
    return findJob(id);
  }

  function ensureJobFields(job){
    if (!job) return;
    job.id = job.id || uuid();
    job.createdAt = job.createdAt || new Date().toISOString();
    job.updatedAt = job.updatedAt || job.createdAt;
    job.name = job.name || "";
    job.address = job.address || "";
    job.stage = job.stage || "lead";
    job.po = job.po || "";
    job.crew = job.crew || [];
    job.notes = job.notes || [];
    job.initComplete = job.initComplete || false;
    return job;
  }

  function ensureContractorFields(c){
    if (!c) return;
    c.id = c.id || uuid();
    c.name = c.name || "";
    c.phone = c.phone || "";
    c.email = c.email || "";
    c.company = c.company || "";
    return c;
  }

  function finishInit(){
    (state.jobs || []).forEach(ensureJobFields);
    (state.contractors || []).forEach(ensureContractorFields);
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
      status(res.local ? "Saved (no network)" : "Saved");
    } catch (e) {
      console.error("Save error", e);
      status("Save error");
    }
  }, 800);

  function renderContractors(){
    const list = $("contractor-list");
    if (!list) return;
    list.innerHTML = "";
    const q = ($("contractor-search")?.value || "").trim().toLowerCase();
    let arr = state.contractors.slice();
    if (q){
      arr = arr.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
      );
    }
    arr.forEach(c => {
      const item = document.createElement("div");
      item.className = "contractor-item";
      if (state.ui.selectedContractorId === c.id) item.classList.add("selected");
      const name = document.createElement("div");
      name.className = "contractor-name";
      name.textContent = c.name || "(unnamed)";
      const meta = document.createElement("div");
      meta.className = "contractor-meta";
      const span1 = document.createElement("span");
      span1.textContent = c.company || "";
      const span2 = document.createElement("span");
      span2.textContent = c.phone || "";
      meta.appendChild(span1); meta.appendChild(span2);
      item.appendChild(name); item.appendChild(meta);
      item.addEventListener("click", () => {
        state.ui.selectedContractorId = c.id;
        renderContractorDetail();
      });
      list.appendChild(item);
    });
  }

  function renderContractorDetail(){
    const panel = $("contractor-detail");
    if (!panel) return;
    const c = findContractor(state.ui.selectedContractorId);
    if (!c){
      panel.innerHTML = `<div class="empty">Select a contractor.</div>`;
      return;
    }
    ensureContractorFields(c);
    $("c-name").value = c.name || "";
    $("c-company").value = c.company || "";
    $("c-phone").value = c.phone || "";
    $("c-email").value = c.email || "";
  }

  function inlineFmt(x) {
    x = x.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    x = x.replace(/\*(.+?)\*/g, '<em>$1</em>');
    x = x.replace(/__(.+?)__/g, '<u>$1</u>');
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;"
    }[c] || c));
  }

  function buildPrintSheet(job, idx) {
    const el = $("print-sheet"); if (!el) return;
    const title = escapeHtml(job.name || "Job");
    const crew = (job.crew || []).join(", ");
    const meta = [
      job.stage ? "Stage: " + escapeHtml(job.stage) : null,
      job.po ? "PO: " + escapeHtml(job.po) : null,
      crew ? "Crew: " + escapeHtml(crew) : null,
      job.address ? "Address: " + escapeHtml(job.address) : null
    ].filter(Boolean).join(" • ");
    let notes = job.notes || [];
    if (typeof idx === "number" && idx >= 0 && idx < notes.length) notes = [notes[idx]];
    const body = notes.map(n => {
      const inner = n.html ? sanitizeHtml(n.html) : formatMarkdownLite(n.text || "").replace(/\n/g,"<br>");
      return `<div class="print-note"><div class="print-date">${escapeHtml(n.d||"")}</div><div class="print-body">${inner}</div></div>`;
    }).join("");
    el.innerHTML = `<div class="print-head"><div class="print-title">${title}</div><div class="print-meta">${meta}</div></div>` + body;
  }

  function renderAll() {
    showView(state.ui.view);
    renderContractors();
    renderTabs();
    renderPanel();
    status("Ready");
  }

  function markInitComplete(job){
    if (!job.initComplete) {
      job.initComplete = true;
      log("job-init", { jobId: job.id });
    }
  }

  function showView(view){
    state.ui.view = view;
    ["main-view","contractors-view","settings-view"].forEach(id=>{
      const el = $(id);
      if (el) el.classList.toggle("hidden", id !== view + "-view");
    });
    document.querySelectorAll(".nav-btn").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function renderTabs(){
    const j = currentJob();
    const main = $("job-main");
    const notesTab = $("job-notes-tab");
    const notesList = $("notes-list");
    const crewBox = $("job-crew");
    if (!j){
      if (main) main.classList.add("disabled");
      if (notesTab) notesTab.classList.add("disabled");
      if (notesList) notesList.innerHTML = "";
      if (crewBox) crewBox.innerHTML = "";
      return;
    }
    ensureJobFields(j);
    if (main) {
      main.classList.remove("disabled");
      $("job-name").value = j.name || "";
      $("job-address").value = j.address || "";
      $("job-stage").value = j.stage || "lead";
      $("job-po").value = j.po || "";
      $("job-updated").textContent = j.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";
    }
    const names = Array.from(document.querySelectorAll("[data-crew-name]")).map(el => el.textContent.trim()).filter(Boolean);
    const crewSet = new Set(j.crew || []);
    if (crewBox) {
      crewBox.innerHTML = "";
      names.forEach(name => {
        const wrap = document.createElement("label");
        wrap.className = "crew-pill";
        const cb = document.createElement("input");
        cb.type = "checkbox";
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
    }

    const pb = $("print-job"); if (pb) { pb.textContent = "Email/Print"; }
    const list = $("notes-list"); list.innerHTML = "";
    (j.notes || []).forEach((n, i) => {
      const obj = typeof n === "string" ? { d: ymd(), text: n } : n;
      const item = document.createElement("div"); item.className = "note-item";
      const d = document.createElement("div"); d.className = "note-date"; d.textContent = obj.d || ymd();
      const body = document.createElement("div"); body.className = "note-text"; body.innerHTML = obj.html ? sanitizeHtml(obj.html) : formatMarkdownLite(obj.text || String(n));
      item.appendChild(d); item.appendChild(body);
      list.appendChild(item);
    });
    $("job-updated").textContent = j?.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";$("job-updated").title = j?.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";
  }

  function renderArchives() {
    const list = $("archive-list"); const count = $("archive-count");
    if (!list) return;
    const q = ($("archive-search")?.value || "").trim().toLowerCase();
    list.innerHTML = "";
    let jobs = state.jobs.filter(j => j.stage === "archived");
    if (q){
      jobs = jobs.filter(j =>
        (j.name || "").toLowerCase().includes(q) ||
        (j.address || "").toLowerCase().includes(q) ||
        (j.po || "").toLowerCase().includes(q)
      );
    }
    count && (count.textContent = jobs.length);
    jobs.forEach(job => {
      const li = document.createElement("div"); li.className = "archive-item";
      const name = document.createElement("div"); name.className = "arch-name"; name.textContent = job.name || "(unnamed)";
      const meta = document.createElement("div"); meta.className = "arch-meta";
      const span1 = document.createElement("span"); span1.textContent = job.address || "";
      const span2 = document.createElement("span"); span2.textContent = job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "";
      meta.appendChild(span1); meta.appendChild(span2);
      li.appendChild(name); li.appendChild(meta);
      li.addEventListener("click", () => {
        job.stage = "lead";
        markUpdated(job); save(); renderArchives(); renderTabs();
      });
      list.appendChild(li);
    });
  }

  function renderJobs(){
    const list = $("job-list");
    if (!list) return;
    list.innerHTML = "";
    let jobs = state.jobs.slice().filter(j => j.stage !== "archived");
    const q = ($("job-search")?.value || "").trim().toLowerCase();
    const stageFilter = $("job-filter")?.value || "active";
    if (stageFilter === "active") {
      jobs = jobs.filter(j => j.stage !== "done");
    } else if (stageFilter === "done") {
      jobs = jobs.filter(j => j.stage === "done");
    }
    if (q){
      jobs = jobs.filter(j =>
        (j.name || "").toLowerCase().includes(q) ||
        (j.address || "").toLowerCase().includes(q) ||
        (j.po || "").toLowerCase().includes(q)
      );
    }
    const sortSel = $("job-sort")?.value || "updatedAt-desc";
    const [field, dir] = sortSel.split("-");
    jobs.sort((a,b) => {
      let av = a[field] || "";
      let bv = b[field] || "";
      if (field.endsWith("At")){
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    jobs.forEach(job => {
      ensureJobFields(job);
      const item = document.createElement("div");
      item.className = "job-item";
      if (state.ui.selectedJobId === job.id) item.classList.add("selected");
      const title = document.createElement("div");
      title.className = "job-title";
      title.textContent = job.name || "(unnamed job)";
      const meta = document.createElement("div");
      meta.className = "job-meta";
      const stage = document.createElement("span"); stage.className = "job-stage"; stage.textContent = job.stage || "";
      const addr = document.createElement("span"); addr.className = "job-addr"; addr.textContent = job.address || "";
      const upd = document.createElement("span"); upd.className = "job-updated"; upd.textContent = job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : "";
      meta.appendChild(stage); meta.appendChild(addr); meta.appendChild(upd);
      item.appendChild(title); item.appendChild(meta);
      item.addEventListener("click", () => {
        state.ui.selectedJobId = job.id;
        showView("main");
        renderTabs();
      });
      list.appendChild(item);
    });
  }

  function renderPanel(){
    const j = currentJob();
    const wrap = $("job-panel");
    if (!wrap) return;
    if (!j){
      wrap.classList.add("disabled");
      $("job-main").classList.add("disabled");
      $("note-panel").classList.add("disabled");
      $("crew-panel").classList.add("disabled");
      $("print-panel").classList.add("disabled");
      $("job-selected-label").textContent = "No job selected";
      $("job-updated").textContent = "—";
      return;
    }
    wrap.classList.remove("disabled");
    $("job-main").classList.remove("disabled");
    $("note-panel").classList.remove("disabled");
    $("crew-panel").classList.remove("disabled");
    $("print-panel").classList.remove("disabled");
    $("job-selected-label").textContent = j.name || "(unnamed job)";
    $("job-updated").textContent = j.updatedAt ? new Date(j.updatedAt).toLocaleString() : "—";
    renderTabs();
  }

  function init() {
    const navBtns = document.querySelectorAll(".nav-btn");
    navBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        showView(view);
      });
    });

    $("new-contractor")?.addEventListener("click", () => {
      const c = ensureContractorFields({ id: uuid(), name: "New Contact" });
      state.contractors.push(c);
      state.ui.selectedContractorId = c.id;
      log("contractor-new", { id: c.id });
      save(); renderContractors(); renderContractorDetail();
    });
    $("del-contractor")?.addEventListener("click", () => {
      const id = state.ui.selectedContractorId;
      if (!id) return;
      if (!confirm("Delete this contractor?")) return;
      state.contractors = state.contractors.filter(c => c.id !== id);
      log("contractor-del", { id });
      state.ui.selectedContractorId = null;
      save(); renderContractors(); renderContractorDetail();
    });

    ["c-name","c-company","c-phone","c-email"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", debounce(() => {
        const c = findContractor(state.ui.selectedContractorId);
        if (!c) return;
        c[id.split("-")[1]] = el.value;
        ensureContractorFields(c);
        log("contractor-edit", { id: c.id, field: id.split("-")[1], value: el.value });
        save(); renderContractors();
      }, 400));
    });

    $("job-filter")?.addEventListener("change", () => { renderJobs(); });
    $("job-sort")?.addEventListener("change", () => { renderJobs(); });
    $("job-search")?.addEventListener("input", debounce(() => { renderJobs(); }, 200));
    $("contractor-search")?.addEventListener("input", debounce(() => { renderContractors(); }, 200));

    $("new-job")?.addEventListener("click", () => {
      const j = ensureJobFields({
        id: uuid(),
        name: "New Job",
        stage: "lead",
        notes: [],
        crew: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      state.jobs.unshift(j);
      state.ui.selectedJobId = j.id;
      markInitComplete(j);
      log("job-new", { jobId: j.id });
      save(); renderJobs(); renderPanel();
    });

    $("archive-job")?.addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
      if (!confirm("Archive this job?")) return;
      j.stage = "archived";
      markUpdated(j);
      log("job-archive", { jobId: j.id });
      save(); renderJobs(); renderArchives(); renderPanel();
    });

    $("delete-job")?.addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
      if (!confirm("Delete this job permanently?")) return;
      state.jobs = state.jobs.filter(x => x.id !== j.id);
      log("job-delete", { jobId: j.id });
      state.ui.selectedJobId = null;
      save(); renderJobs(); renderPanel();
    });

    $("job-name").addEventListener("input", debounce(() => {
      const j = currentJob(); if (!j) return;
      j.name = $("job-name").value;
      if (!j.initComplete) j.initComplete = true;
      markUpdated(j); log("job-edit", { jobId: j.id, field: "name", value: j.name });
      save(); renderJobs(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
    }, 400));
    $("job-address").addEventListener("input", debounce(() => {
      const j = currentJob(); if (!j) return;
      j.address = $("job-address").value;
      markUpdated(j); log("job-edit", { jobId: j.id, field: "address", value: j.address });
      save(); renderJobs(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
    }, 400));
    $("job-address").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });

    $("job-stage").addEventListener("change", e => {
      const j = currentJob(); if (!j) return;
      const newStage = e.target.value;
      const prev = j.stage;
      j.stage = newStage;
      if (j.initComplete && newStage !== prev) pushNote(j, `Stage changed to ${j.stage}`);
      markUpdated(j); save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString(); renderTabs(); if (j.initComplete) toast("Stage updated");
    });

    $("job-po").addEventListener("input", debounce(() => {
      const j = currentJob(); if (!j) return;
      j.po = $("job-po").value;
      markUpdated(j); log("job-edit", { jobId: j.id, field: "po", value: j.po });
      save(); $("job-updated").textContent = new Date(j.updatedAt).toLocaleString();
    }, 400));

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

    $("print-job")?.addEventListener("click", () => {
      const j = currentJob(); if (!j) return;
      buildPrintSheet(j);
      window.print();
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
    if (headerInput){
      headerInput.addEventListener("input", debounce(() => {
        const q = headerInput.value.trim().toLowerCase();
        $("job-search").value = q;
        renderJobs();
      }, 250));
    }

    // Notes editor behavior
    const editor = $("new-note-editor");
    if (editor){
      editor.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey){
          e.preventDefault();
          document.execCommand("insertHTML", false, "<br>");
        }
      });
      editor.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
      });
    }

    // Backup / restore
    $("backup-btn")?.addEventListener("click", async () => {
      const json = JSON.stringify(state, null, 2);
      const ta = $("backup-output");
      ta.value = json;
      ta.focus();
      ta.select();
      document.execCommand("copy");
      toast("Backup JSON copied");
    });
    $("restore-btn")?.addEventListener("click", () => {
      const raw = $("backup-input").value.trim();
      if (!raw) return;
      if (!confirm("Replace current data with this backup?")) return;
      try {
        const obj = JSON.parse(raw);
        state = { ...state, ...obj, ui: { ...state.ui, ...(obj.ui || {}) } };
        finishInit();
        save();
        renderAll();
        toast("Restore complete");
      } catch (e) {
        alert("Invalid JSON");
      }
    });

    // Auto backup schedule
    (function(){
      const schedInput = $("backup-schedule");
      const nextEl = $("next-backup-status");
      async function loadSchedule(){
        try {
          const raw = localStorage.getItem("contractor-hub-backup-schedule");
          if (!raw) return null;
          return JSON.parse(raw);
        } catch { return null; }
      }
      async function saveSchedule(sched){
        try {
          localStorage.setItem("contractor-hub-backup-schedule", JSON.stringify(sched));
        } catch {}
      }
      function computeNext(cron){
        if (!cron) return null;
        const now = new Date();
        const d = new Date(now.getTime() + 24*60*60*1000);
        return d;
      }
      async function initSched(){
        try {
          const sched = await loadSchedule();
          if (sched && sched.cron){
            schedInput.value = sched.cron;
            const next = computeNext(sched.cron);
            if (next && nextEl){
              const txt = next.toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              });
              nextEl.textContent = `Next auto backup: ${txt}`;
            }
          } else {
            nextEl.textContent = "Next auto backup: not scheduled yet";
          }
        } catch {
          nextEl.textContent = "Next auto backup: unavailable";
        }
      }
      $("backup-schedule-btn")?.addEventListener("click", async () => {
        const cron = schedInput.value.trim();
        await saveSchedule({ cron });
        const next = computeNext(cron);
        if (next && nextEl){
          const txt = next.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
          nextEl.textContent = `Next auto backup: ${txt}`;
        } else {
          nextEl.textContent = "Next auto backup: not scheduled yet";
        }
      });
      initSched();
    })();

    // Initial load
    (async () => {
      const data = await API.load();
      if (data) {
        state = { ...state, ...data, ui: { ...state.ui, ...(data.ui || {}) } };
      }
      finishInit();
      renderJobs();
      renderContractors();
      renderArchives();
      renderPanel();
      showView(state.ui.view || "main");
      status("Ready");
    })();
  }

  function toast(msg){
    const el = $("toast"); if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

// --- Note images (Dropbox/URL → inline) — SAFE VERSION ---
(function(){
  const NOTES_ROOT_ID = 'notes-list'; // change if your container uses a different id
  let obs = null;
  let isRendering = false;

  // Convert any Dropbox share link to a direct file URL
  function normalizeImageURL(url){
    try{
      const u = new URL(String(url).trim());

      // Rewrite only dropbox.com hosts
      if (u.hostname.endsWith('dropbox.com')) {
        // Newer format uses /scl/fi/<id>/<file>; map it to /s/<id>/<file>
        u.pathname = u.pathname.replace(/^\/scl\/fi\//, '/s/');

        // Or older /s/ already fine; set dl=1 to force file
        u.searchParams.set('dl', '1');

        return u.toString();
      }

      // Already dl.dropboxusercontent.com or another host
      return u.toString();
    } catch {
      return url;
    }
  }

  // Detect if a URL likely points to an image
  function isLikelyImageURL(url){
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
  }

  // Convert a text node's content into text + image/app links
  function renderNoteContentInto(el, text){
    el.textContent = '';
    const parts = String(text).split(/(\s+)/); // preserve spaces
    for (const part of parts){
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); continue; }

      const looksURL = /^https?:\/\/\S+$/i.test(part);
      if (looksURL && isLikelyImageURL(part)){
        const src = normalizeImageURL(part);
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'image';
        img.loading = 'lazy';
        img.className = 'note-img';

        // If it still can't load, fall back to a clickable link
        img.onerror = () => {
          const a = document.createElement('a');
          a.href = part; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = part;
          img.replaceWith(a);
        };

        el.appendChild(img);
      } else if (looksURL){
        const a = document.createElement('a');
        a.href = part; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = part;
        el.appendChild(a);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    }
  }


  function enhanceNoteHtmlUrls(el){
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }
    textNodes.forEach(node => {
      const parent = node.parentNode;
      if (!parent) return;
      const text = node.textContent || "";
      const parts = text.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        const looksURL = /^https?:\/\/\S+$/i.test(part);
        if (looksURL && isLikelyImageURL(part)) {
          const src = normalizeImageURL(part);
          const img = document.createElement('img');
          img.src = src;
          img.alt = 'image';
          img.loading = 'lazy';
          img.className = 'note-img';
          img.onerror = () => {
            const a = document.createElement('a');
            a.href = part; a.target = '_blank'; a.rel = 'noopener';
            a.textContent = part;
            img.replaceWith(a);
          };
          frag.appendChild(img);
        } else if (looksURL) {
          const a = document.createElement('a');
          a.href = part; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = part;
          frag.appendChild(a);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
      parent.replaceChild(frag, node);
    });
  }

  function processNotes(){
    const root = document.getElementById(NOTES_ROOT_ID);
    if (!root) return;

    isRendering = true; // prevent observer loop
    try{
      root.querySelectorAll('.note-item .note-text, .note-text').forEach(el=>{
        if (el.dataset.noteImgProcessed === '1') return; // only once

        const existingHtml = el.innerHTML || '';
        if (/(<(ul|ol|li|br|p)[\s>])/i.test(existingHtml)) {
          // Note already has HTML structure (lists, paragraphs, etc.) — keep it
          // and only enhance URLs inside without flattening formatting.
          enhanceNoteHtmlUrls(el);
        } else {
          // Plain-text note, keep previous behavior
          const raw = el.textContent || '';
          el.dataset.noteRaw = raw;
          renderNoteContentInto(el, raw);
        }

        el.dataset.noteImgProcessed = '1';
      });
    } finally {
      isRendering = false;
    }
  }

  function startObserver(){
    const root = document.getElementById(NOTES_ROOT_ID);
    if (!root || obs) return;
    obs = new MutationObserver((muts)=>{
      if (isRendering) return;
      // react only when rows are added; debounce to next tick
      let added = false;
      for (const m of muts){
        if (m.addedNodes && m.addedNodes.length) { added = true; break; }
      }
      if (added) setTimeout(processNotes, 0);
    });
    obs.observe(root, { childList:true, subtree:true });
  }

  function init(){
    processNotes();
    startObserver();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  // Manual hook if needed elsewhere
  window.refreshNoteImages = processNotes;
})();


