// Concurrency-safe client helpers (merge into your app)

export function debounce(fn, wait=300) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

export const Status = (() => {
  const el = () => document.querySelector('[data-status]');
  return {
    set(msg){ const n = el(); if(n) n.textContent = msg; },
    ok(){ this.set('Saved'); },
    saving(){ this.set('Saving…'); },
    stale(){ this.set('Newer data on server — not saved'); },
    error(){ this.set('Save failed'); },
    loading(){ this.set('Loading…'); }
  };
})();

export const API = {
  async load() {
    const res = await fetch('/.netlify/functions/load', { cache: 'no-store' });
    if (!res.ok) throw new Error('load failed');
    return await res.json();
  },
  async save(doc) {
    const res = await fetch('/.netlify/functions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(doc)
    });
    const data = await res.json().catch(()=>({}));
    return { status: res.status, ...data };
  }
};

// Example state container; adapt to your schema
export const state = {
  serverVersion: 0,
  version: 1,
  notes: '',
  crews: [],
  settings: {},
};

export async function boot(loadInto) {
  try {
    Status.loading();
    const data = await API.load();
    if (data) Object.assign(state, data); // keep serverVersion
    if (typeof loadInto === 'function') loadInto(state);
    Status.set('Loaded');
  } catch (e) {
    console.error(e);
    Status.set('Load error');
  }
}

export const save = debounce(async (getLatest) => {
  try {
    Status.saving();
    if (typeof getLatest === 'function') Object.assign(state, getLatest());
    const res = await API.save(state);
    if (res.status === 200 && res.ok) {
      if (typeof res.serverVersion === 'number') state.serverVersion = res.serverVersion;
      Status.ok();
    } else if (res.status === 409 || res.reason === 'stale') {
      console.warn('Stale write refused', res);
      Status.stale();
      // TODO: Present merge/reload UI using res.serverData if you pipe it through the save result
      alert('Your tab is behind another save. Please reload to pull the latest before editing.');
    } else {
      Status.error();
    }
  } catch (e) {
    console.error(e);
    Status.error();
  }
}, 300);
