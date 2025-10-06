// hide-build-banner.js
(function(){
  function removeBanner(){
    var removed = false;
    var selectors = [
      '#build','#build-tag','#build-badge','#build-info','#app-build','#app-version',
      '.build','.build-info','.build-badge','.version-badge','.app-build','.app-version',
      '.top-banner','.banner','.version','.build-label'
    ];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        if (el && el.parentNode){ el.parentNode.removeChild(el); removed = true; }
      });
    });
    var headerSelectors = ['header','.topbar','#topbar','.app-header','.header','.page-header'];
    headerSelectors.forEach(function(hsel){
      document.querySelectorAll(hsel).forEach(function(h){
        Array.from(h.children||[]).forEach(function(ch){
          var t = (ch.textContent||'').trim().toLowerCase();
          if (/\bbuild\b|\bversion\b/.test(t) || /digital\s*binder/.test(t)){
            ch.remove(); removed = true;
          }
        });
      });
    });
    var first = document.body && document.body.firstElementChild;
    if (first){
      var t = (first.textContent||'').trim().toLowerCase();
      if (t && (/(^|\s)(build|version)\s/.test(t) || /digital\s*binder/.test(t))){
        first.remove(); removed = true;
      }
    }
    return removed;
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', removeBanner);
  } else {
    removeBanner();
  }
})();
