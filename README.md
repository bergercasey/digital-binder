# Binder — Email/Print Integration (GitHub Ready)

This repo is flattened so you can push it directly to GitHub.

## What’s included
- `index.html` at the **root**
- `email-print-addon/emailPrint.js` auto-injected next to your **Delete Selection** button
- Preview with **Name (bold), Address, Current stage, Crew**, then **selected notes** as a bulleted list
- Print popup that **auto-closes** after printing
- Email uses the **same preview** (HTML via `window.env.EMAIL_API_URL`, otherwise `mailto:` fallback)

## Optional: wire your email backend
Add before `</body>` (or in a small `<script>` block):
```html
<script>
  window.env = {
    EMAIL_API_URL: "https://your-netlify-function/send-email",
    DEFAULT_TO: "you@yourdomain.com"
  };
</script>
```

## Selectors (override only if needed)
```html
<script>
  window.EMAIL_PRINT_CONFIG = {
    deleteButtonSelector: 'button#deleteSelected',
    selectedNoteCheckboxSelector: 'input[type=checkbox][data-role="log-select"]:checked'
  };
</script>
```
