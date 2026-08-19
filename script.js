"use strict";

const PLAYERS = [
  ["Felix Sandström","MV",78],
  ["Olof Glifford","MV",73],
  ["Andreas Borgman","B",81],
  ["Niklas Hansson","B",80],
  ["Olle Alsing","B",78],
  ["Santeri Hatakka","B",77],
  ["Malte Gustafsson","B",72],
  ["Jonathan Ang","HF",83],
  ["Lukas Rousek","HF",82],
  ["Riley Woods","VF",81],
  ["Aleksi Heponiemi","C",81],
  ["Justin Kloos","C",80],
  ["Noah Philp","C",80],
  ["Jan Mysak","C",79],
  ["Oskar Stål Lyrenäs","VF",78],
  ["Linus Lindström","C",77],
  ["Nikola Pasic","HF",76],
  ["Martin Johnsen","VF",72]
].map((p,id)=>({
  id,
  name:p[0],
  pos:p[1],
  overall:p[2],
  goals:0,
  assists:0
}));

const TEAM_NAMES = [
  "HV71",
  "Brynäs IF",
  "Djurgårdens IF",
  "Färjestad BK",
  "Frölunda HC",
  "Linköping HC",
  "Luleå Hockey",
  "Malmö Redhawks",
  "Rögle BK",
  "Skellefteå AIK",
  "Timrå IK",
  "Växjö Lakers",
  "Örebro Hockey",
  "Björklöven"
];

function newState(){
  return {
    version:"0.1",
    page:"home",
    round:1,
    morale:72,
    money:14500000,
    fans:6500,
    roster:PLAYERS.map(p=>({...p})),
    history:[],
    live:null,
    teams:TEAM_NAMES.map((name,i)=>({
      name,
      gp:0,
      w:0,
      l:0,
      gf:0,
      ga:0,
      pts:0,
      strength:72 + ((i*5)%10)
    }))
  };
}

let state;

try{
  state=JSON.parse(localStorage.getItem("hockey_manager_alpha01"));
  if(!state || state.version!=="0.1") state=newState();
}catch{
  state=newState();
}

function save(){
  localStorage.setItem("hockey_manager_alpha01",JSON.stringify(state));
}

function team(name){
  return state.teams.find(t=>t.name===name);
}

function opponent(){
  const others=TEAM_NAMES.filter(x=>x!=="HV71");
  return others[(state.round-1)%others.length];
}

function randomPlayer(){
  const players=state.roster.filter(p=>p.pos!=="MV");
  const total=players.reduce((s,p)=>s+p.overall,0);
  let r=Math.random()*total;

  for(const p of players){
    r-=p.overall;
    if(r<=0) return p;
  }

  return players[0];
}

function homeView(){

  const hv=team("HV71");

  return `
  <section class="card hero">
    <span class="pill">Säsong 2026/27 • Omgång ${state.round}</span>
    <h2>HV71</h2>
    <p class="muted">
      Nästa match mot <b>${opponent()}</b>.
    </p>
    <button class="btn" onclick="state.page='match';render()">
      Till nästa match
    </button>
  </section>

  <div class="grid">
    <div class="stat">
      <b>${hv.pts}</b>
      <span>Poäng</span>
    </div>

    <div class="stat">
      <b>${hv.gp}</b>
      <span>Matcher</span>
    </div>

    <div class="stat">
      <b>${state.morale}%</b>
      <span>Moral</span>
    </div>

    <div class="stat">
      <b>${state.fans}</b>
      <span>Supportrar</span>
    </div>
  </div>

  <section class="card">
    <h3>Senaste resultat</h3>

    ${
      state.history.length
      ? state.history.slice(0,5).map(x=>`
        <div class="row">
          <span>${x}</span>
        </div>
      `).join("")
      : `<p class="muted">Ingen match spelad ännu.</p>`
    }
  </section>

  <section class="card">
    <h3>Klubbkassa</h3>
    <h2>${state.money.toLocaleString("sv-SE")} kr</h2>
  </section>
  `;
}

function squadView(){

  return `
  <section class="card">
    <h2>HV71</h2>
    <p class="muted">Spelartrupp</p>

    ${state.roster
      .slice()
      .sort((a,b)=>b.overall-a.overall)
      .map(p=>`
        <div class="player">
          <span class="pos">${p.pos}</span>

          <div class="player-info">
            <b>${p.name}</b>
            <small>
              ${p.goals} mål • ${p.assists} assist
            </small>
          </div>

          <span class="rating">${p.overall}</span>
        </div>
      `).join("")
    }
  </section>
  `;
}

function createMatch(){

  state.live={
    opponent:opponent(),
    period:1,
    minute:0,
    second:0,
    hv:0,
    opp:0,
    shotsHV:0,
    shotsOpp:0,
    momentum:50,
    running:false,
    finished:false,
    events:[]
  };

  addEvent("Nedsläpp i Husqvarna Garden.");

  save();
  render();
}

function timeText(){

  const m=state.live;

  return `${m.minute}:${String(m.second).padStart(2,"0")}`;
}

function addEvent(text,type="chance"){

  state.live.events.unshift({
    time:timeText(),
    text,
    type
  });

  state.live.events=state.live.events.slice(0,80);
}

let timer=null;

function startMatch(){

  if(!state.live) createMatch();

  state.live.running=true;

  save();
  render();

  clearTimeout(timer);
  nextTick();
}

function pauseMatch(){

  if(!state.live) return;

  state.live.running=false;

  clearTimeout(timer);

  save();
  render();
}

function nextTick(){

  const m=state.live;

  if(!m || !m.running || m.finished) return;

  timer=setTimeout(()=>{

    liveStep();

    nextTick();

  },650);
}

function liveStep(){

  const m=state.live;

  if(!m || !m.running) return;

  m.second+=8;

  while(m.second>=60){
    m.second-=60;
    m.minute++;
  }

  if(m.minute>=20){

    if(m.period<3){

      addEvent(`Period ${m.period} är slut.`);

      m.period++;
      m.minute=0;
      m.second=0;
      m.running=false;

      save();
      render();

      return;

    }else{

      finishMatch();
      return;
    }
  }

  const hvPower=79 + (m.momentum-50)/12;
  const oppPower=team(m.opponent).strength + (50-m.momentum)/12;

  const hvChance=hvPower/(hvPower+oppPower);

  if(Math.random()<0.25){

    const hvAttack=Math.random()<hvChance;

    if(hvAttack){

      m.shotsHV++;

      const scorer=randomPlayer();

      if(Math.random()<0.105){

        m.hv++;

        scorer.goals++;

        addEvent(
          `MÅL HV71! ${scorer.name} gör ${m.hv}–${m.opp}.`,
          "goal"
        );

        m.momentum=Math.min(80,m.momentum+8);

      }else if(Math.random()<0.32){

        addEvent(`HV71 skapar en farlig målchans genom ${scorer.name}.`);

        m.momentum=Math.min(80,m.momentum+3);

      }else{

        addEvent(`${scorer.name} skjuter – räddning.`);
      }

    }else{

      m.shotsOpp++;

      if(Math.random()<0.105){

        m.opp++;

        addEvent(
          `MÅL ${m.opponent}! Ställningen är ${m.hv}–${m.opp}.`,
          "goal"
        );

        m.momentum=Math.max(20,m.momentum-8);

      }else if(Math.random()<0.32){

        addEvent(`${m.opponent} skapar en riktigt farlig chans.`);

        m.momentum=Math.max(20,m.momentum-3);

      }else{

        addEvent(`${m.opponent} skjuter – HV71-målvakten räddar.`);
      }
    }
  }

  save();
  render();
}

function finishMatch(){

  const m=state.live;

  m.running=false;

  if(m.hv===m.opp){

    if(Math.random()<0.52){

      m.hv++;

      addEvent("HV71 avgör efter förlängning!","goal");

    }else{

      m.opp++;

      addEvent(`${m.opponent} avgör efter förlängning.`,"goal");
    }
  }

  const win=m.hv>m.opp;

  const hv=team("HV71");
  const op=team(m.opponent);

  hv.gp++;
  op.gp++;

  hv.gf+=m.hv;
  hv.ga+=m.opp;

  op.gf+=m.opp;
  op.ga+=m.hv;

  if(win){

    hv.w++;
    hv.pts+=3;

    op.l++;

    state.morale=Math.min(100,state.morale+4);
    state.fans+=75;

  }else{

    op.w++;
    op.pts+=3;

    hv.l++;

    state.morale=Math.max(30,state.morale-4);
  }

  state.history.unshift(
    `HV71 ${m.hv}–${m.opp} ${m.opponent}`
  );

  state.round++;

  state.money+=Math.round(state.fans*220)-300000;

  m.finished=true;

  save();

  setTimeout(()=>{
    state.live=null;
    save();
    render();
  },1500);

  render();
}

function matchView(){

  const m=state.live;

  if(!m){

    return `
    <section class="card">

      <h2>Nästa match</h2>

      <div class="scoreboard">

        <div>
          <b>HV71</b>
        </div>

        <div class="score">–</div>

        <div>
          <b>${opponent()}</b>
        </div>

      </div>

      <br>

      <button class="btn" onclick="createMatch()">
        Starta match
      </button>

    </section>
    `;
  }

  const progress=
    (((m.period-1)*20)+m.minute+(m.second/60))/60*100;

  return `
  <section class="card">

    <div class="scoreboard">

      <div>
        <b>HV71</b>
      </div>

      <div class="score">
        ${m.hv}–${m.opp}
      </div>

      <div>
        <b>${m.opponent}</b>
      </div>

    </div>

    <div class="clock">
      Period ${m.period} • ${timeText()}
    </div>

    <div class="livebar">
      <span style="width:${progress}%"></span>
    </div>

    <br>

    <div class="grid">

      <div class="stat">
        <b>${m.shotsHV}–${m.shotsOpp}</b>
        <span>Skott</span>
      </div>

      <div class="stat">
        <b>${Math.round(m.momentum)}%</b>
        <span>HV71 momentum</span>
      </div>

    </div>

    <div class="controls">

      ${
        m.running
        ? `<button class="btn" onclick="pauseMatch()">Pausa</button>`
        : `<button class="btn" onclick="startMatch()">Fortsätt</button>`
      }

      <button class="btn secondary"
        onclick="
        state.live.momentum=Math.min(80,state.live.momentum+6);
        addEvent('HV71 tar timeout.');
        pauseMatch();
        ">
        Timeout
      </button>

    </div>

  </section>

  <section class="card">

    <h3>Matchhändelser</h3>

    <div class="log">

      ${
        m.events.map(e=>`
          <div class="${e.type}">
            ${e.time} – ${e.text}
          </div>
        `).join("")
      }

    </div>

  </section>
  `;
}

function tableView(){

  const sorted=state.teams
    .slice()
    .sort((a,b)=>
      b.pts-a.pts ||
      (b.gf-b.ga)-(a.gf-a.ga)
    );

  return `
  <section class="card">

    <h2>SHL</h2>

    <table>

      <thead>
        <tr>
          <th>#</th>
          <th>Lag</th>
          <th>M</th>
          <th>+/-</th>
          <th>P</th>
        </tr>
      </thead>

      <tbody>

        ${
          sorted.map((t,i)=>`
            <tr class="${t.name==="HV71"?"me":""}">
              <td>${i+1}</td>
              <td>${t.name}</td>
              <td>${t.gp}</td>
              <td>${t.gf-t.ga}</td>
              <td><b>${t.pts}</b></td>
            </tr>
          `).join("")
        }

      </tbody>

    </table>

  </section>
  `;
}

function render(){

  document.getElementById("content").innerHTML=
    state.page==="home"
    ? homeView()
    : state.page==="squad"
    ? squadView()
    : state.page==="match"
    ? matchView()
    : tableView();

  document.querySelectorAll(".nav button").forEach(btn=>{

    btn.classList.toggle(
      "active",
      btn.dataset.page===state.page
    );

  });
}

document.querySelectorAll(".nav button").forEach(btn=>{

  btn.addEventListener("click",()=>{

    state.page=btn.dataset.page;

    render();

  });

});

save();
render();
