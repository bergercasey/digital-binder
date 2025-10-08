// note-photo-token.js (Step 1)
// Adds a 'Photo (token)' button that inserts a harmless placeholder token into the editor.
(function(){
  const ed = document.getElementById('new-note-editor');
  const tb = document.getElementById('wysiwyg-toolbar') || document.getElementById('note-toolbar') || (ed && ed.previousElementSibling);
  if (!ed || !tb) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  btn.textContent = '📷 Photo (token)';
  btn.style.marginLeft = '6px';
  tb.appendChild(btn);

  function insertToken() {
    const token = ' [[PHOTO]] ';
    ed.focus();
    try {
      if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, token);
        return;
      }
    } catch(_) {}
    ed.textContent += token;
  }
  btn.addEventListener('click', insertToken);
})();