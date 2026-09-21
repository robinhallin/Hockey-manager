'use strict';
const assert=require('node:assert/strict');
const r=require('./headless-career.cjs').headlessCareer().run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();medicalExposure=()=>{};simulateOtherGames=()=>{};startMatch();pauseMatch();globalThis.initial=JSON.stringify(state);");
let baseline;
for(const mode of ['full','extended','highlights','commentary']){
 r(`state=JSON.parse(initial);state.live.rink.mode=${JSON.stringify(mode)};state.live.speed=4;globalThis.e=studioEngine();globalThis.steps=0;while(e.time<3600&&!state.live.finished&&steps++<100000){studioTrackHighlight(e,state.live);studioPlaybackRate(e,state.live);state.live.running=true;studioStep();}`);
 assert.ok(r('e.time>=3600'),'complete regulation');
 const result=r('JSON.stringify({score:e.score,stats:e.stats,shots:state.live.analysis.shots,ice:state.live.iceTime,energy:state.live.energy,rng:e.rng})');
 if(baseline)assert.ok(result===baseline,mode+' must preserve all shots, score, player energy and random stream');else baseline=result;
 console.log(JSON.stringify({mode,passed:true,score:JSON.parse(result).score}));
}
