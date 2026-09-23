'use strict';
// Offer drafts are player- and club-specific. They never reserve money or change a contract.
function renewalDraftValues(p,n=state.contractNegotiation){
 return p.renewalDraft?.club===managerClub()?p.renewalDraft:{salary:n?.salaryDemand??p.salary,years:n?.years??p.contractYears,role:n?.role??p.promisedRole};
}
function renewalDraftEdit(id){
 const p=managerRoster().find(p=>samePlayerId(p.id,id)),n=state.contractNegotiation;
 if(!p||!n||!samePlayerId(n.playerId,p.id))return;
 p.renewalDraft={club:managerClub(),salary:String(document.getElementById('renewalSalary').value),years:String(document.getElementById('renewalYears').value),role:String(document.getElementById('renewalRole').value)};
 const output=document.getElementById('renewalPreview');if(output)output.textContent=renewalDecisionText(p,p.renewalDraft);
 queueInterfaceSave();
}
function renewalDecisionText(p,draft=renewalDraftValues(p)){
 const salary=Math.round(Number(draft.salary)),years=Number(draft.years),role=draft.role;
 if(!Number.isFinite(salary)||salary<=0||!Number.isInteger(years)||years<1||years>5||!SQUAD_ROLES.includes(role))return 'Ange giltig årslön, 1–5 avtalsår och roll. Utkastet är inte ett erbjudande.';
 const b=managerCommitmentPreview(p,0,salary,years,{renewal:true}),terms=rolePromiseTerms(p,role),issue=managerCommitmentIssue(p,0,salary,years,{renewal:true});
 return `Om spelaren accepterar ersätts nuvarande villkor direkt. Ny lön: ${money(salary)}/år (${b.change>=0?'+':''}${money(b.change)}/år). Avtalsåtagande: ${money(b.total)} över ${years} år; lönen betalas löpande, inte som engångskostnad. Löneutrymme i år: ${money(b.wageAfter)}. Nästa säsong: ${money(b.futureAfter)}. Pågående bud och kända åtaganden ingår; framtida budgetökningar antas inte. ${terms?`Rollöfte: minst ${terms.minutes} minuter i ${terms.required} av ${terms.total} tillgängliga tävlingsmatcher.`:'Rollen ger inget särskilt introduktionslöfte.'} ${p.recruitmentPromise&&!p.recruitmentPromise.resolved?'Det befintliga introduktionslöftet arkiveras som ersatt vid ett accepterat nytt avtal. ':''}${issue||'Förslaget ryms i dagens budgetberäkning. Spelaren kan fortfarande avböja.'}`;
}
function rolePromiseProgress(q){
 if(q.resolved)return q.result||'Avslutat';
 const rule=rolePromiseRule(q),left=Math.max(0,rule.total-(q.games||0)),need=Math.max(0,rule.required-(q.qualified||0));
 if(!need)return 'Istidsmålet är nått. Formell uppföljning efter hela perioden.';
 if(need>left)return `Målet kan inte längre nås under perioden. Uppföljningen sker efter ${left} återstående matcher.`;
 return `${need} av ${left} återstående tillgängliga matcher behöver minst ${rule.minutes} minuter.`;
}
function rolePromisePlayerView(p){
 const rows=lockerPromises().filter(x=>x.p&&samePlayerId(x.p.id,p.id)&&!x.q.resolved);
 if(!rows.length)return '';
 return `<section class="fm-panel"><h2>Aktiva istidslöften</h2>${rows.map(({q,source})=>`<p><strong>${trainingSafe(source)}</strong><br>${trainingSafe(rolePromiseProgress(q))}</p>${rolePromiseEvidence(q)}`).join('')}<button class="desk-link" onclick="squadOpenPlace(${trainingSafe(JSON.stringify(p.id))})">Bedöm spelarens plats i laget →</button><p>Medicinskt ursäktade matcher räknas inte. Att visa underlaget ändrar inte löftet eller spelarens reaktion.</p></section>`;
}
