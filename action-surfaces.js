'use strict';
// Shared presentation for every action dialog. Domain modules still own the
// selected identity, form fields, decisions, cancellation and focus return.
function actionSurfaceHeader({id,title,kicker,close,label='Stäng dialog',person=null}){
 return `<header class="as-heading"><div class="as-heading-copy"><span class="as-eyebrow">${trainingSafe(kicker)}</span><h2 id="${trainingSafe(id)}">${trainingSafe(title)}</h2>${person?`<p class="as-person-line">${trainingSafe(person.name)} <span>· ${trainingSafe(person.pos)} · ${person.age} år</span></p>`:''}</div><button type="button" class="as-close" aria-label="${trainingSafe(label)}" onclick="${trainingSafe(close)}"><span aria-hidden="true">×</span></button></header>`;
}
