"use strict";
function clubCrest(name,size=''){
 const path=CLUB_CRESTS[name],label=trainingSafe(name||'Okänd klubb');
 const code=String(name||'?').split(/\s+/).map(s=>s[0]).join('').slice(0,3).toUpperCase();
 return `<span class="club-crest ${trainingSafe(size)}" role="img" aria-label="${label}">${path?`<img src="${path}" alt="" width="80" height="80" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="club-crest-fallback" hidden>${trainingSafe(code)}</span>`:`<span class="club-crest-fallback">${trainingSafe(code)}</span>`}</span>`;
}
