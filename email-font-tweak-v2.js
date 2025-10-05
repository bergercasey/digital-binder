
// email-font-tweak-v2.js
// Bumps font sizes in the Email overlay so everything matches.
(function(){
  function inject(){
    if (document.getElementById('ep-font-tweaks-v2')) return;
    var st = document.createElement('style');
    st.id = 'ep-font-tweaks-v2';
    st.textContent = [
      '#ep-mail-body input[type="email"], #ep-mail-body input[type="text"]{ font-size:16px !important; line-height:1.35 !important; }',
      '#ep-mail-body label.row{ font-size:16px !important; }',
      '#ep-mail-favs label{ font-size:16px !important; }'
    ].join('\n');
    document.head.appendChild(st);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
