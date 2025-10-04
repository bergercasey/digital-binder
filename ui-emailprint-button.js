
// Floating Email/Print button — Step 1 (placement only)
// Does not change data or existing flows. Visible only when a job is open.
(function(){
  function createFAB(){
    if (document.getElementById('emailPrintFAB')) return;
    const btn = document.createElement('button');
    btn.id = 'emailPrintFAB';
    btn.type = 'button';
    btn.className = 'fab-ep';
    btn.setAttribute('aria-label','Email / Print');
    btn.textContent = 'Email / Print';
    btn.style.display = 'none'; // hidden until a job tab is active
    document.body.appendChild(btn);
    // Placeholder click (no-op for Step 1)
    btn.addEventListener('click', function(){ try { if (window._epOpenPreview) window._epOpenPreview(); } catch(_){ console.warn('Preview open failed'); } });
}

  function injectStyles(){
    if (document.getElementById('fab-ep-styles')) return;
    const st = document.createElement('style');
    st.id = 'fab-ep-styles';
    st.textContent = `
      #emailPrintFAB.fab-ep{
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        padding: 12px 16px;
        border-radius: 999px;
        font-weight: 600;
        border: 1px solid #dbeafe;
        background: #bfdbfe;
        color: #0b1220;
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        cursor: pointer;
      }
      #emailPrintFAB.fab-ep:active{ transform: translateY(1px); }
      @media print{
        #emailPrintFAB{ display: none !important; }
      }
    `;
    document.head.appendChild(st);
  }

  function jobOpen(){
    // Show when job fields panel is visible (display !== 'none')
    const jobFields = document.getElementById('job-fields');
    if (!jobFields) return false;
    const style = window.getComputedStyle(jobFields);
    return style && style.display !== 'none';
  }

  function updateFABVisibility(){
    const fab = document.getElementById('emailPrintFAB');
    if (!fab) return;
    fab.style.display = jobOpen() ? 'inline-flex' : 'none';
  }

  function setupObservers(){
    const jobFields = document.getElementById('job-fields');
    if (!jobFields) return;
    // Watch for show/hide changes
    const obs = new MutationObserver(updateFABVisibility);
    obs.observe(jobFields, { attributes: true, attributeFilter: ['style', 'class'] });
    // Also poll lightly as safety for app-driven state changes
    let lastState = null;
    setInterval(()=>{
      const isOpen = jobOpen();
      if (isOpen !== lastState){
        updateFABVisibility();
        lastState = isOpen;
      }
    }, 500);
  }

  function init(){
    injectStyles();
    createFAB();
    updateFABVisibility();
    setupObservers();
    // Safety: rebind click in case element is replaced
    setInterval(() => {
      const b = document.getElementById('emailPrintFAB');
      if (b && !b._epBound){ b._epBound = true; b.onclick = function(){ try{ if (window._epOpenPreview) window._epOpenPreview(); }catch(_){ } }; }
    }, 600);
    // On navigation (hashchange) also update
    window.addEventListener('hashchange', updateFABVisibility);
    document.addEventListener('visibilitychange', updateFABVisibility);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
