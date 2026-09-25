// Read-only, reproducible queue for active real players in a fresh career.
// Does not imply coverage of inactive NHL/AHL research registries.
const {boot}=require('./career-test-fixture.cjs');
const app=boot(undefined,{production:true});
app.run("startCareerWithClub('HV71')");
const report=app.run(`(()=>{
 const pool=[...Object.values(state.clubRosters).flat(),...state.playerWorld.freeAgents];
 const players=[...new Map(pool.filter(p=>p.fictional===false).map(p=>[String(p.id),p])).values()];
 return {scope:'Active senior real players, fresh HV71 career',total:players.length,ready:players.filter(p=>playerPortraitRecord(p)).length,
 missing:players.filter(p=>!playerPortraitRecord(p)).map(p=>({id:p.id,name:p.name,club:getPlayerClub(p.id)})).sort((a,b)=>a.id.localeCompare(b.id))};
})()`);
console.log(JSON.stringify(report,null,2));
