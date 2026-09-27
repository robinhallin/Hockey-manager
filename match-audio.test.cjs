'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function mixer(){
 const nodes=[];
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
 const node=()=>{const n={gain:param(),frequency:param(),pan:param(),Q:param(),connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};nodes.push(n);return n;};
 class AudioContext{constructor(){this.currentTime=0;this.sampleRate=1000;this.state='suspended';this.destination={};}async resume(){this.state='running';}createGain(){return node();}createBuffer(){return {getChannelData:()=>new Float32Array(2000)};}createBufferSource(){return node();}createBiquadFilter(){return node();}createStereoPanner(){return node();}createOscillator(){return node();}}
 const c=vm.createContext({AudioContext});vm.runInContext(fs.readFileSync('match-audio.js','utf8'),c);return {audio:vm.runInContext('MatchAudio',c),nodes};
}
const frame=(wall,effects=[])=>({wall,time:wall,phase:'attack',puck:{x:30,y:15},actors:[{role:'C',vx:3,vy:0}],effects});
const event=(id,at,kind='stick',side=0)=>({id,at,kind,side,x:45,y:15,strength:1});
test('audio waits for activation, plays an observed contact once and silences all voices at pause',async()=>{
 const {audio,nodes}=mixer(),options={source:{},active:true,volume:.35};
 audio.update(frame(1,[event(1,1)]),options);assert.equal(audio.diagnostics().played,0);assert.equal(nodes.length,0);
 await audio.unlock();audio.update(frame(1),options);const next=frame(1.2,[event(1,1.1)]),snapshot=JSON.stringify(next);
 audio.update(next,options);assert.equal(audio.diagnostics().played,1);assert.equal(audio.diagnostics().lastKind,'stick');
 for(let i=0;i<20;i++)audio.update(next,options);assert.equal(audio.diagnostics().played,1);assert.equal(JSON.stringify(next),snapshot);
 audio.update(next,{...options,active:false});assert.equal(audio.diagnostics().active,false);assert.equal(audio.diagnostics().voices,0);
 audio.update(frame(1.4,[event(1,1.1)]),options);assert.equal(audio.diagnostics().played,1,'resume never repeats the old contact');
});
test('hidden skips, muted frames, replay entry and rewind cannot queue a burst of stale sounds',async()=>{
 const {audio}=mixer(),source={},options={source,active:true,volume:.35};await audio.unlock();audio.update(frame(0),options);
 audio.update(frame(.2,[event(1,.1,'board')]),options);assert.equal(audio.diagnostics().played,1);
 audio.update(frame(20,[event(2,18,'goal')]),options);assert.equal(audio.diagnostics().played,1);
 audio.update(frame(20.2,[event(3,20.1,'save')]),{...options,volume:0});assert.equal(audio.diagnostics().active,false);
 audio.update(frame(20.4,[event(3,20.1,'save')]),options);assert.equal(audio.diagnostics().played,1);
 const replay={};audio.update(frame(3,[event(4,3,'goal')]),{...options,source:replay});assert.equal(audio.diagnostics().played,1);
 audio.update(frame(3.2,[event(5,3.1,'save')]),{...options,source:replay});assert.equal(audio.diagnostics().played,2);
 audio.update(frame(3),{...options,source:replay});assert.equal(audio.diagnostics().played,2);
 audio.update(frame(3.2,[event(5,3.1,'save')]),{...options,source:replay});assert.equal(audio.diagnostics().played,3,'a deliberate replay may replay its actual event');
});
test('match sound preferences survive save/load without altering the live simulation or replay',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();studioReplayState={frames:[studioFrame(studioEngine())],elapsed:0};");
 const before=app.run('JSON.stringify([state.live,studioReplayState])');app.run('studioAudioVolume(.65);studioToggleAudio();');
 assert.equal(app.run('JSON.stringify([state.live,studioReplayState])'),before);assert.equal(app.run('studioAudioPreferences().muted'),true);
 const restored=boot(app.storage.value);assert.equal(restored.run('studioAudioPreferences().volume'),.65);assert.equal(restored.run('studioAudioPreferences().muted'),true);
 app.run('studioToggleAudio()');assert.equal(app.run('studioAudioPreferences().muted'),false);assert.equal(app.run('studioAudioPreferences().volume'),.65);
});
