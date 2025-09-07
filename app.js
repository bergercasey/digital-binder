
// Simple Binder app using Netlify Functions (no login, no IDs)
const statusEl = document.getElementById('status');
const listEl = document.getElementById('contractorList');
const rosterEl = document.getElementById('roster');
const stagesEl = document.getElementById('stages');
const logEl = document.getElementById('log');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');

let binder = {
  contractors: [
    { name: "Copper Ridge" },
    { name: "Dakota Custom Homes" },
    { name: "Diversity Homes" },
    { name: "Epic Built" },
    { name: "Hallmark Homes" },
    { name: "Knutson Homes" },
    { name: "Mark Fleck" },
    { name: "ND Construction" },
    { name: "Northwest Contracting" },
    { name: "Sunrise Builders" }
  ],
  roster: ["Alice", "Bob", "Chris", "Dee"],
  stages: ["Bid", "Rough-in", "Trim", "Complete"],
  logoDataUrl: ""
};

const log = (msg) => {
  const line = `[${new Date().toLocaleString()}] ${msg}`;
  logEl.textContent = `${line}\n` + logEl.textContent;
  console.log(line);
};

const ui = {
  renderContractors() {
    listEl.innerHTML = "";
    binder.contractors.forEach((c, idx) => {
      const li = document.createElement('li');
      li.textContent = c.name || `Contractor ${idx+1}`;
      li.addEventListener('dblclick', () => {
        const newName = prompt("Rename contractor:", c.name || "");
        if (newName != null) {
          c.name = newName.trim();
          ui.renderContractors();
          log(`Renamed contractor to "${c.name}"`);
          saveDebounced();
        }
      });
      listEl.appendChild(li);
    });
  },
  renderSettings() {
    rosterEl.value = (binder.roster || []).join("\n");
    stagesEl.value = (binder.stages || []).join("\n");
    if (binder.logoDataUrl) {
      logoPreview.src = binder.logoDataUrl;
      logoPreview.style.display = "block";
    } else {
      logoPreview.removeAttribute('src');
      logoPreview.style.display = "none";
    }
  }
};

// Event hooks
document.getElementById('addContractor').addEventListener('click', () => {
  binder.contractors.push({ name: "New Contractor" });
  ui.renderContractors();
  log("Added contractor");
  saveDebounced();
});
document.getElementById('addJob').addEventListener('click', () => {
  alert("Job UI to be added later (this build focuses on login-free saving).");
});
document.getElementById('reload').addEventListener('click', () => {
  load();
});
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(binder, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = "binder-export.json"; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  binder = JSON.parse(text);
  ui.renderContractors(); ui.renderSettings();
  log("Imported binder JSON");
  saveDebounced();
});
document.getElementById('saveNow').addEventListener('click', () => save(true));
rosterEl.addEventListener('input', () => { binder.roster = rosterEl.value.split('\n').map(s=>s.trim()).filter(Boolean); saveDebounced(); });
stagesEl.addEventListener('input', () => { binder.stages = stagesEl.value.split('\n').map(s=>s.trim()).filter(Boolean); saveDebounced(); });
logoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    binder.logoDataUrl = reader.result;
    ui.renderSettings();
    log("Updated company logo");
    saveDebounced();
  };
  reader.readAsDataURL(file);
});

let saveTimer = null;
function saveDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
}

async function load() {
  status("Loading…");
  try {
    const res = await fetch('/.netlify/functions/get-binder');
    if (!res.ok) throw new Error(`GET failed ${res.status}`);
    const data = await res.json();
    if (data && typeof data === 'object') binder = data;
    ui.renderContractors(); ui.renderSettings();
    status("Ready");
    log("Loaded binder from Netlify");
  } catch (err) {
    console.error(err);
    status("Offline (using local data)");
    log("Load failed — using local defaults");
    ui.renderContractors(); ui.renderSettings();
  }
}

async function save(showToast=false) {
  status("Saving…");
  try {
    const res = await fetch('/.netlify/functions/save-binder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(binder)
    });
    if (!res.ok) throw new Error(`POST failed ${res.status}`);
    status("Saved");
    if (showToast) alert("Saved!");
    log("Saved binder to Netlify");
  } catch (err) {
    console.error(err);
    status("Save error");
    log("Save failed");
  }
}

function status(text) { statusEl.textContent = text; }

// boot
load();
