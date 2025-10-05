
// email-font-tweak.js
// Increases font size in the Email overlay inputs and the "Save to favorites" label.
(function(){
  function inject(){
    if (document.getElementById('ep-font-tweaks')) return;
    var st = document.createElement('style');
    st.id = 'ep-font-tweaks';
    st.textContent = [
      '#ep-mail-body input[type="email"], #ep-mail-body input[type="text"]{ font-size:16px !important; line-height:1.35 !important; }',
      '#ep-mail-body label.row{ font-size:16px !important; }'
    ].join('\n');
    document.head.appendChild(st);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
