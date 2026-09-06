"use strict";
const MatchBroadcastRenderer = (() => {
  function draw(canvas,frame,before,t=1,options={}){
    const ctx=canvas.getContext('2d');if(!ctx||!frame)return;
    const names={LW:'VF',C:'C',RW:'HF',LD:'VB',RD:'HB',G:'MV',X:'EX'};
    const teams=options.teams||[{name:'HV71',code:'HV',primary:'#175c9c',color:'#f0cd52'},{name:'Färjestad',code:'FBK',primary:'#216950',color:'#e3dfc6'}];
    const selected=options.selected;
    const W=1200,H=650,pad=44,scale=(W-pad*2)/60,top=(H-30*scale)/2;
    const rect=canvas.getBoundingClientRect(),displayScale=Math.max(.1,Math.min(rect.width/W,rect.height/H));
    const actorRadius=Math.max(12,6/displayScale),nameSize=Math.max(21,12/displayScale),smallScreen=rect.width<500;
    const xy=p=>({x:pad+p.x*scale,y:top+p.y*scale});
    const mix=(p,q)=>q?{...p,x:q.x+(p.x-q.x)*t,y:q.y+(p.y-q.y)*t}:p;
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#c7d8e3';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.beginPath();ctx.roundRect(pad-10,top-10,60*scale+20,30*scale+20,86);ctx.fillStyle='#f0f6f8';ctx.fill();ctx.lineWidth=9;ctx.strokeStyle='#9ab0bf';ctx.stroke();ctx.clip();
    ctx.fillStyle='#e4eef3';ctx.fillRect(pad,top,20*scale,30*scale);ctx.fillRect(pad+40*scale,top,20*scale,30*scale);
    const line=(x,c,width)=>{ctx.beginPath();ctx.moveTo(pad+x*scale,top);ctx.lineTo(pad+x*scale,top+30*scale);ctx.strokeStyle=c;ctx.lineWidth=width;ctx.stroke();};
    line(20,'#437ba6',6);line(40,'#437ba6',6);line(30,'#c7636c',3);line(3.5,'#c7636c',2);line(56.5,'#c7636c',2);
    const circle=(x,y,r,color,width=2)=>{ctx.beginPath();ctx.arc(pad+x*scale,top+y*scale,r*scale,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    circle(30,15,4.5,'#4e7e9c',2.5);
    for(const x of [13,47])for(const y of [9,21]){circle(x,y,4.5,'#c7898d');ctx.beginPath();ctx.arc(pad+x*scale,top+y*scale,3.5,0,Math.PI*2);ctx.fillStyle='#ba5e66';ctx.fill();}
    for(const side of [0,1]){
      const g=xy(StudioHockey.progress(side,0)===0?{x:3.5,y:15}:{x:56.5,y:15});
      ctx.beginPath();ctx.arc(g.x,g.y,1.8*scale,side===0?-Math.PI/2:Math.PI/2,side===0?Math.PI/2:Math.PI*1.5);ctx.closePath();ctx.fillStyle='#b7d9e8';ctx.fill();ctx.strokeStyle='#c46c72';ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle='#a84a54';ctx.lineWidth=4;ctx.strokeRect(g.x+(side===0?-22:0),g.y-18,22,36);
    }
    ctx.fillStyle='#a8beca';ctx.font='700 35px system-ui';ctx.textAlign='center';ctx.fillText(options.arena||'MATCHSÄNDNING',W/2,H/2+12);ctx.restore();
    // Bench gates make controlled changes readable instead of teleporting a whole formation.
    for(const [x,label,color] of [[27,teams[0].code,teams[0].primary],[33,teams[1].code,teams[1].primary]]){const p=xy({x,y:0});ctx.fillStyle=color;ctx.fillRect(p.x-29,top-18,58,16);ctx.font='700 13px system-ui';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(label,p.x,top-6);}
    const actors=frame.actors.map(a=>mix(a,before?.actors.find(b=>a.id===b.id)));
    const puck=mix(frame.puck,before?.puck);
    const visibleNames=new Set([frame.carrier,selected]);
    if(frame.flight){ctx.beginPath();const f=xy(frame.flight.start),end=xy(puck);ctx.moveTo(f.x,f.y);ctx.lineTo(end.x,end.y);ctx.lineWidth=frame.flight.kind==='shot'?4:2;ctx.strokeStyle=frame.flight.kind==='shot'?'#ba5e58aa':'#213f6070';ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);}
    for(const a of actors){
      const p=xy(a),hasPuck=a.id===frame.carrier;
      if(hasPuck){ctx.beginPath();ctx.arc(p.x,p.y,actorRadius+6,0,Math.PI*2);ctx.fillStyle=a.side===0?'#e6c74c55':'#73b49c55';ctx.fill();}
      ctx.shadowColor='#17395435';ctx.shadowBlur=7;ctx.shadowOffsetY=3;
      ctx.beginPath();if(a.role==='G')ctx.roundRect(p.x-actorRadius*.8,p.y-actorRadius,actorRadius*1.6,actorRadius*2,5);else ctx.arc(p.x,p.y,actorRadius,0,Math.PI*2);
      ctx.fillStyle=teams[a.side].primary;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      ctx.lineWidth=2.5;ctx.strokeStyle=teams[a.side].color;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='700 15px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';if(!smallScreen)ctx.fillText(names[a.role],p.x,p.y+.5);
      const dir=Math.atan2(a.vy||0,(a.vx||0)+(a.side===0?.01:-.01));
      ctx.beginPath();ctx.moveTo(p.x+Math.cos(dir)*11,p.y+Math.sin(dir)*11);ctx.lineTo(p.x+Math.cos(dir)*22,p.y+Math.sin(dir)*22);ctx.strokeStyle='#263e50';ctx.lineWidth=2;ctx.stroke();
      if(visibleNames.has(a.id)){
        const text=a.name.split(' ').slice(-1)[0];ctx.font='600 '+nameSize+'px system-ui';const width=ctx.measureText(text).width+15,labelHeight=nameSize+10;
        const lx=Math.max(5,Math.min(W-width-5,p.x-width/2)),ly=p.y>H-85?p.y-actorRadius-labelHeight-6:p.y+actorRadius+7;
        ctx.fillStyle=a.side===0?'#0d345aed':'#164331ed';ctx.beginPath();ctx.roundRect(lx,ly,width,labelHeight,4);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(text,lx+width/2,ly+labelHeight/2);
      }
    }
    const pp=xy(puck);ctx.beginPath();ctx.arc(pp.x+(frame.carrier?actorRadius*.8:0),pp.y+(frame.carrier?actorRadius*.5:0),Math.max(5.7,2.8/displayScale),0,Math.PI*2);ctx.fillStyle='#071426';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#fff';ctx.stroke();
    ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.font='600 15px system-ui';ctx.fillStyle='#426174';ctx.fillText(teams[0].name+' anfaller åt höger',pad,H-8);
    if(frame.phase==='stoppage'&&frame.eventType==='goal'){
      ctx.fillStyle='#082443e8';ctx.beginPath();ctx.roundRect(W/2-125,H/2-56,250,100,10);ctx.fill();ctx.fillStyle='#f3d25d';ctx.textAlign='center';ctx.font='800 54px system-ui';ctx.fillText('MÅL',W/2,H/2+13);
    }
  }
  return {draw};
})();
