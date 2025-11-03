# Rescue + Network Save Hardening (build3)
- Updated Netlify functions (`save.js`, `load.js`) for concurrency safety and empty-write guard
- Added `/rescue.html` + `rescue.js`
- Ensured `@netlify/blobs` dep and `netlify.toml`

After deploy:
1) Open `/rescue.html`
2) Backup localStorage (top section)
3) Fetch server JSON
4) Restore the best backup to server (uses high serverVersion to win)
