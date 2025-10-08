// === BEGIN: deep payload sanitizer for save ===
function epDeepStripDataImages(value){
  try{
    const seen = new WeakSet();
    function walk(v){
      if (v && typeof v === 'object'){
        if (seen.has(v)) return v;
        seen.add(v);
        if (Array.isArray(v)){
          for (let i=0;i<v.length;i++) v[i] = walk(v[i]);
        } else {
          for (const k in v) if (Object.prototype.hasOwnProperty.call(v,k)){
            v[k] = walk(v[k]);
          }
        }
        return v;
      } else if (typeof v === 'string'){
        return v.replace(/\sdata-full="[^"]*"/g, '').replace(/data:image[^"']+/g, '');
      } else {
        return v;
      }
    }
    return walk(JSON.parse(JSON.stringify(value)));
  }catch(_){ return value; }
}

(function(){
  try{
    const _save = API && API.save;
    if (typeof _save === 'function'){
      API.save = async function(data){
        if (typeof epEnsureFullUrls === 'function') data = await epEnsureFullUrls(data);
        data = epDeepStripDataImages(data);
        if (typeof epPrepareForSavePayload === 'function') data = epPrepareForSavePayload(data);
        return _save.call(API, data);
      }
    }
  }catch(_){}
})();
// === END: deep payload sanitizer for save ===
