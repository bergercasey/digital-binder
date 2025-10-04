
# Email/Print Add-on v6 (Hook-based)

**What’s different**  
No more DOM scraping. Your app provides a tiny hook with the exact data and the add‑on renders it. The floating Email/Print button only appears when you’re on a job page.

## Install (drop-in)
1) Copy the **`email-print-addon/`** folder to your repo (same level as `index.html`).
2) Add this *before* the script (the hook tells us when a job is open and what to show). Tweak selectors if needed:
```html
<script>
  window.BinderEmailPrint = {
    isJobPage() {
      return !!document.querySelector('.detail-header'); // return true only when a job tab is open
    },
    getContext() {
      const name    = document.querySelector('.detail-header h1')?.textContent?.trim() || '';
      const address = document.querySelector('.detail-header a[href*="maps"]')?.textContent?.trim() || '';
      const stage   = (document.querySelector('[data-badge-stage]')?.textContent || '').replace(/^\s*Stage:\s*/i,'').trim();
      const crew    = (document.querySelector('[data-badge-crew]')?.textContent || '').replace(/^\s*Crew:\s*/i,'').trim();
      const notes = Array.from(document.querySelectorAll('.log-entry input[type="checkbox"]:checked')).map(cb => {
        const row = cb.closest('.log-entry');
        const txt = row?.querySelector('.content, textarea, pre, p')?.textContent?.trim() || row?.textContent?.trim() || '';
        return txt;
      }).filter(Boolean);
      return { name, address, stage, crew, notes };
    }
  };
</script>
```

3) Then include the add-on script (near the bottom, before `</body>`):
```html
<script src="email-print-addon/emailPrint.js?v=6"></script>
```

### Optional fallback (if you don’t want to provide the hook yet)
```html
<script>
  window.EMAIL_PRINT_CONFIG = {
    fixedNameSelector:  '.detail-header h1',
    fixedAddressSelector: '.detail-header a[href*="maps"]',
    fixedStageSelector:  '[data-badge-stage]',
    fixedCrewSelector:   '[data-badge-crew]',
    noteCheckboxSelector: '.log-entry input[type="checkbox"]:checked',
    notesTextSelectors: ['.content','textarea','pre','p']
  };
</script>
```

### Notes
- Close works via ✕, ESC, or clicking the backdrop. 
- Print uses a hidden iframe (no blank tabs), then auto-cleans.
- Email uses `mailto:` by default; you can wire an API inside the script if you have one.
