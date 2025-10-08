
Trash-can for Favorites (localStorage only)

How to use:
1) Copy `email-fav-trash-addon.js` next to your other JS files (same folder as `emailprint-preview.js`).
2) In `index.html`, include it AFTER `emailprint-preview.js`, e.g.

   <script src="emailprint-preview.js"></script>
   <script src="email-fav-trash-addon.js"></script>

That's it. Your favorites still live in localStorage ("ep_favorites"). Each favorite now shows a 🗑️ button to remove it instantly.
