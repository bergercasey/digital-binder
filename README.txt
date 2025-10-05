
Per-account Favorites (v2) + Delete button

- Stronger username detection (globals, DOM, storage, cookies). Best practice: set either
    window.FAVS_USER_ID = "<username>";
  or
    <body data-username="<username>">
- Delete a favorite (🗑️) inline.
- One-time migration imports old localStorage "ep_favorites" into the current user bucket and clears it.

Wire-up:
1) Keep Build25 functions on Netlify.
2) Include this after your email scripts:
   <script src="emailprint-preview.js"></script>
   <script src="email-favs-per-user.v2.js"></script>
