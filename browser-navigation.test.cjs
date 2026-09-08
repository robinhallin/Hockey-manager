const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const listeners={},entries=[];let index=-1;
const history={
 replaceState(data){if(index<0)index=0;entries[index]=structuredClone(data);},
 pushState(data){entries.splice(++index);entries[index]=structuredClone(data);},
 back(){if(index>0){index--;listeners.popstate({state:structuredClone(entries[index])});}},
 forward(){if(index+1<entries.length){index++;listeners.popstate({state:structuredClone(entries[index])});}}
};
const window={history,scrollY:0,scrollTo({top}){this.scrollY=top;},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(event,fn)=>listeners[event]=fn};
const a=boot(null,{window}),r=a.run;
r(`startCareerWithClub('HV71');deskNavigate('transfers','search');setRecruitFilter('query','a');document.getElementById('content').scrollTop=310;globalThis.candidate=recruitCandidates()[0];recruitOpen(candidate.id);`);
history.back();assert.equal(r('state.page'),'transfers');assert.equal(r('state.recruitment.tab'),'search');assert.equal(r('recruitFilters().query'),'a');assert.equal(r('document.getElementById("content").scrollTop'),310);
history.forward();assert.equal(r('state.page'),'marketPlayer');assert.equal(r('state.selectedMarketPlayer'),r('candidate.id'));
r('deskBack()');assert.equal(r('state.page'),'transfers');
r(`deskNavigate('squad');deskNavigate('lines')`);history.back();assert.equal(r('state.page'),'squad');
r(`state.calendar.date=calendarTarget();startMatch();deskNavigate('match');`);history.back();assert.equal(r('state.live.running'),false,'browser back pauses live fixture');
const old=structuredClone(entries[index]);r("startCareerWithClub('AIK');deskNavigate('home')");listeners.popstate({state:old});assert.equal(r('managerClub()'),'AIK');assert.equal(r('state.page'),'home','stale history cannot resurrect another career');
console.log('PASS: browser back/forward, player origin, filters/scroll, branching, live pause and career isolation.');
