"use strict";

/* =========================================================
   HOCKEY MANAGER
   Alpha 0.2 – Matchmotor 2.0
   ========================================================= */

/* =========================================================
   DATA
   ========================================================= */

const PLAYERS = [
  ["Felix Sandström","MV",78,74,78,76,79],
  ["Olof Glifford","MV",73,71,75,72,74],

  ["Andreas Borgman","B",81,78,80,84,83],
  ["Niklas Hansson","B",80,79,82,81,77],
  ["Olle Alsing","B",78,76,80,79,75],
  ["Santeri Hatakka","B",77,72,77,81,82],
  ["Malte Gustafsson","B",72,70,74,72,71],
  ["Hugo Fransson","B",71,69,72,73,70],

  ["Jonathan Ang","HF",83,85,82,75,78],
  ["Lukas Rousek","HF",82,82,85,74,76],
  ["Riley Woods","VF",81,84,78,72,80],
  ["Aleksi Heponiemi","C",81,79,86,74,72],
  ["Justin Kloos","C",80,80,82,75,76],
  ["Noah Philp","C",80,78,79,80,82],
  ["Jan Mysak","C",79,81,78,72,77],
  ["Oskar Stål Lyrenäs","VF",78,79,76,71,76],
  ["Linus Lindström","C",77,75,78,78,75],
  ["Nikola Pasic","HF",76,77,75,70,74],
  ["Martin Johnsen","VF",72,74,70,68,72],
  ["Victor Laz","HF",70,72,68,67,73]
].map((p,id)=>({
  id,
  name:p[0],
  pos:p[1],
  overall:p[2],

  shooting:p[3],
  passing:p[4],
  defense:p[5],
  physical:p[6],

  goals:0,
  assists:0,
  shots:0,
  pim:0,

  fatigue:0,
  form:0,
  morale:70
}));


const TEAM_DATA = [
  ["HV71",79,"balanced"],
  ["Brynäs IF",80,"attack"],
  ["Djurgårdens IF",78,"attack"],
  ["Färjestad BK",83,"attack"],
  ["Frölunda HC",82,"pressure"],
  ["Linköping HC",76,"balanced"],
  ["Luleå Hockey",82,"defense"],
  ["Malmö Redhawks",75,"physical"],
  ["Rögle BK",80,"pressure"],
  ["Skellefteå AIK",82,"attack"],
  ["Timrå IK",79,"balanced"],
  ["Växjö Lakers",81,"defense"],
  ["Örebro Hockey",77,"physical"],
  ["Björklöven",73,"attack"]
];
const TEAM_ROSTERS = {

  'Björklöven': {
    G: [
      'Frans Tuohimaa',
      'Lassi Lehtinen'
    ],
    D: [
      'Marcus Björk',
      'Linus Cronholm',
      'Anton Malmström',
      'Topi Niemelä',
      'Lucas Ekeståhl Jonsson',
      'Alfred Barklund',
      'Tarmo Reunanen',
      'Josiah Didier'
    ],
    F: [
      'Fredrik Forsberg',
      'Philip Hemmyr',
      'Gustaf Kangas',
      'Lenni Killinen',
      'Albin Lundin',
      'Marcus Nilsson',
      'Bruno Osmanis',
      'Axel Ottosson',
      'Gustav Possler',
      'Oscar Tellström',
      'Lucas Wallmark',
      'Joel Mustonen',
      'Chris DiDomenico',
      'Tristen Robins',
      'Emil Alba',
      'Phil Di Giuseppe',
      'Robin Kovacs'
    ]
  },

  'Brynäs IF': {
    G: [
      'Erik Källgren',
      'Magnus Chrona'
    ],
    D: [
      'Axel Andersson',
      'Simon Bertilsson',
      'Christian Djoos',
      'Robert Hägg',
      'Johannes Kinnvall',
      'Mattias Norlinder',
      'Victor Hedin Raftheim',
      'Aron Dahlqvist',
      'Victor Johansson',
      'Axel Rindell'
    ],
    F: [
      'Kieffer Bellows',
      'Nicklas Bäckström',
      'Axel Jonsson Fjällby',
      'Johan Larsson',
      'Oskar Lindblom',
      'Anton Rödin',
      'Jakob Silfverberg',
      'Bobby Trivigno',
      'Linus Ölund',
      'Leo Sundqvist',
      'Gustav Hillström',
      'Charlie Forslund',
      'Milton Gästrin',
      'Jaret Anderson-Dolan',
      'Julien Gauthier'
    ]
  },

  'Djurgårdens IF': {
    G: [
      'Magnus Hellberg',
      'Daniel Marmenlind',
      'Hugo Hävelid'
    ],
    D: [
      'Gustav Lindström',
      'Jesper Pettersson',
      'Hugo Blixt',
      'Philip Holm',
      'Colby Sissons',
      'Lucas Carlsson',
      'Liam Pettersson',
      'Nikolas Brouillard'
    ],
    F: [
      'David Blomgren',
      'Albin Grewe',
      'Charles Hudon',
      'Jacob Josefson',
      'Mathias Emilio Pettersen',
      'Håvard Salsten',
      'Joe Snively',
      'Lukas Vejdemo',
      'Noel Gunler',
      'Sebastian Hartmann',
      'Theo Stockselius',
      'Nils Åman',
      'Marcus Krüger'
    ]
  },

  'Frölunda HC': {
    G: [
      'Lars Johansson',
      'Tobias Normann'
    ],
    D: [
      'Henrik Tömmernes',
      'Christian Folin',
      'Tom Nilsson',
      'Samuel Johannesson',
      'Linus Högberg',
      'Filip Hasa',
      'Isac Heens',
      'Stefan Milosevic'
    ],
    F: [
      'Filip Cederqvist',
      'Max Friberg',
      'Noah Hasa',
      'Nicklas Lasu',
      'Max Lindholm',
      'Jacob Peterson',
      'Erik Thorell',
      'Max Westergård',
      'Mads Kongsbak Klyvö',
      'Liam Dower Nilsson',
      'Patrik Puistola',
      'Oskar Olausson',
      'Samuel Fagemo',
      'Linus Nässén'
    ]
  },

  'Färjestad BK': {
    G: [
      'Emil Larmi',
      'Melker Thelin'
    ],
    D: [
      'Axel Bergkvist',
      'Gabriel Carlsson',
      'Magnus Nygren',
      'Adam Ollas Mattsson',
      'Filip Roos',
      'Albert Wikman',
      'Noel Fransén'
    ],
    F: [
      'Christoffer Jansson',
      'Linus Johansson',
      'Viktor Lodin',
      'Joakim Nygård',
      'Oskar Steen',
      'Marian Studenic',
      'Radim Zohorna',
      'Per Åslund',
      'Jack Berglund',
      'Mikkel Öby Olsen',
      'Victor Ejdsell',
      'Sebastian Cederle',
      'Marcus Johansson'
    ]
  },
  'HV71': {
    G: [
      'Felix Sandström',
      'Olof Glifford',
      'Herman Liv'
    ],
    D: [
      'Olle Alsing',
      'Andreas Borgman',
      'Hugo Fransson',
      'Niklas Hansson',
      'Santeri Hatakka',
      'Lucas Lagerberg',
      'Karl Annborn',
      'Malte Gustafsson'
    ],
    F: [
      'Jonathan Ang',
      'Hampus Eriksson',
      'Aleksi Heponiemi',
      'Martin Johnsen',
      'Justin Kloos',
      'Victor Laz',
      'Linus Lindström',
      'William Ignberg Nilsson',
      'Nikola Pasic',
      'Lukas Rousek',
      'Oskar Stål Lyrenäs',
      'Riley Woods',
      'Jan Mysak'
    ]
  },

  'Linköping HC': {
    G: [
      'Waltteri Ignatjew',
      'Marcus Högberg'
    ],
    D: [
      'Oscar Fantenberg',
      'Mikko Kokkonen',
      'Theodor Lennström',
      'David Bernhardt',
      'Max Martin',
      'Felix Öhrqvist',
      'Zach Giuttari',
      'Linus Hultström'
    ],
    F: [
      'Christoffer Ehn',
      'Remi Elie',
      'Adam Hofbauer',
      'Fredrik Karlström',
      'Loke Krantz',
      'Ludvig Larsson',
      'Zion Nybeck',
      'Johan Södergran',
      'Jakub Vrana',
      'Oscar Holmertz',
      'Milton Carpenhammar',
      'Arvid Degerstedt',
      'Brendan Shinnimin',
      'Cooper Marody',
      'Tim Söderlund',
      'Johan Johnsson',
      'Samu Tuomaala'
    ]
  },

  'Luleå Hockey': {
    G: [
      'Joel Lassinantti',
      'Matteus Ward',
      'Isak Sörqvist'
    ],
    D: [
      'Erik Gustafsson',
      'Oscar Engsund',
      'Oskari Laaksonen',
      'Otto Leskinen',
      'Jesper Sellgren',
      'Pontus Själin',
      'William Håkansson',
      'Oliwer Sjöström'
    ],
    F: [
      'Pontus Andreasson',
      'Mathias Bromé',
      'Filip Eriksson',
      'David Granberg',
      'Isac Hedqvist',
      'Jakob Ihs Wozniak',
      'Caper Juustovaara Karlsson',
      'Anton Levtchi',
      'Markus Nurmi',
      "Brian O'Neill",
      'Ben Tardif',
      'Isac Brännström',
      'Joona Koppanen',
      'Valtteri Puustinen'
    ]
  },

  'Malmö Redhawks': {
    G: [
      'Oskar Blomgren',
      'Marek Langhamer'
    ],
    D: [
      'Seth Barton',
      'Johan Ivarsson',
      'Patrik Norén',
      'Eemil Viro',
      'Felix Carell',
      'Elia Pedrotti',
      'Martin Schreiber',
      'Peter DiLiberatore',
      'Jonathan Myrenberg',
      'Oliwer Kaski',
      'Klas Dahlbeck'
    ],
    F: [
      'Thomas Berg-Paulsen',
      'Filip Björkman',
      'Robin Hanzl',
      'Fredrik Händemark',
      'Janne Kuokkanen',
      'Isac Nilsson',
      'Lauri Pajuniemi',
      'Carl Persson',
      'Axel Sundberg',
      'Petter Vesterheim',
      'William von Barnekow',
      'Viktor Olofsson',
      'Kalle Hemström',
      'Isac Born',
      'Hugo Pettersson',
      'Oscar Eklind'
    ]
  },

  'Rögle BK': {
    G: [
      'Arvid Holm',
      'Calle Clang',
      'Axel Nyman'
    ],
    D: [
      'Mark Friedman',
      'Calvin de Haan',
      'Filip Johansson',
      'Calle Själin',
      'Axel Kumlin',
      'Ludvig Claesson',
      'Nate Clurman',
      'Paul LaDue'
    ],
    F: [
      'Anton Bengtsson',
      'Leon Bristedt',
      'Dennis Everberg',
      'Fredrik Olofsson',
      'Linus Sandin',
      'Isac Solberg',
      'Albin Sundsvik',
      'Daniel Zaar',
      'Simon Zether',
      'Lubos Horky',
      'Joel Kellman',
      'Karson Kuhlman',
      'Oskar Jellvik'
    ]
  },
     'Skellefteå AIK': {
    G: [
      'Linus Söderström',
      'Gustaf Lindvall'
    ],
    D: [
      'Jonathan Pudas',
      'Axel Sandin Pellikka',
      'Arvid Lundberg',
      'Elias Salomonsson',
      'Anton Olsson',
      'Petter Granberg',
      'Måns Forsfjäll',
      'Vili Saarijärvi'
    ],
    F: [
      'Oscar Lindberg',
      'Rickard Hugg',
      'Pär Lindholm',
      'Andreas Johnson',
      'Jonathan Johnson',
      'Max Lindholm',
      'Michael Brandsegg-Nygård',
      'Oskar Nilsson',
      'Filip Sandberg',
      'Linus Lindström',
      'Albin Sundsvik',
      'Melker Karlsson',
      'Viktor Arvidsson'
    ]
  },

  'Timrå IK': {
    G: [
      'Jacob Johansson',
      'Mio Blom'
    ],
    D: [
      'Joonas Lyytinen',
      'Elmeri Eronen',
      'Jakob Ragnarsson',
      'Per Svensson',
      'Joey LaLeggia',
      'Adam Ollas Mattsson',
      'Ludvig Claesson',
      'Anton Strålman'
    ],
    F: [
      'Anton Lander',
      'Jonathan Dahlén',
      'Sebastian Hartmann',
      'Filip Hållander',
      'Oliver Kapanen',
      'Robin Alvarez',
      'Erik Walli Walterholm',
      'Emil Pettersson',
      'Viktor Lodin',
      'Linus Omark',
      'Isac Lundeström',
      'Albin Lundin',
      'Oscar Pettersson'
    ]
  },

  'Växjö Lakers': {
    G: [
      'Adam Åhman',
      'Emil Larmi'
    ],
    D: [
      'Joel Persson',
      'Gabriel Carlsson',
      'Ludvig Nilsson',
      'Eric Martinsson',
      'Dylan McIlrath',
      'Brian Cooper',
      'Victor Sjöholm',
      'Noah Östlund'
    ],
    F: [
      'Robert Rosén',
      'Kalle Kossila',
      'Dylan McLaughlin',
      'Manuel Ågren',
      'Marcus Sylvegård',
      'Eemeli Suomi',
      'Ludvig Nilsson',
      'Noah Östlund',
      'Dennis Rasmussen',
      'Pontus Holmberg',
      'Peter Cehlarik',
      'Lucas Elvenes',
      'Emil Forslund'
    ]
  },

  'Örebro Hockey': {
    G: [
      'Jonas Arntzen',
      'Jhonas Enroth'
    ],
    D: [
      'Robin Norell',
      'Marcus Hardegård',
      'Philip Holm',
      'Kristian Näkyvä',
      'Rasmus Rissanen',
      'Samuel Johannesson',
      'David Quenneville',
      'William Wikman'
    ],
    F: [
      'Patrik Puistola',
      'Patrik Karlkvist',
      'Robert Leino',
      'Glenn Gustafsson',
      'Filip Berglund',
      'Emil Larsson',
      'Ludvig Larsson',
      'William Wikman',
      'Elias Ekström',
      'Noel Nordh',
      'Nick Ebert',
      'Mathias Bromé',
      'Rodrigo Abols'
    ]
  }

};
function getTeamRoster(teamName) {
  return TEAM_ROSTERS[teamName] || {
    G: [],
    D: [],
    F: []
  };
}

function getRandomOpponentForward(teamName) {
  const roster = getTeamRoster(teamName);

  if (!roster.F.length) {
    return teamName;
  }

  return roster.F[
    Math.floor(Math.random() * roster.F.length)
  ];
}

function getRandomOpponentDefense(teamName) {
  const roster = getTeamRoster(teamName);

  if (!roster.D.length) {
    return teamName;
  }

  return roster.D[
    Math.floor(Math.random() * roster.D.length)
  ];
}

function getRandomOpponentSkater(teamName) {
  const roster = getTeamRoster(teamName);

  const players = [
    ...roster.D,
    ...roster.F
  ];

  if (!players.length) {
    return teamName;
  }

  return players[
    Math.floor(Math.random() * players.length)
  ];
}

function getOpponentGoalie(teamName) {
  const roster = getTeamRoster(teamName);

  if (!roster.G.length) {
    return teamName;
  }

  return roster.G[0];
}
/* =========================================================
   NY KARRIÄR
   ========================================================= */

function newState(){

  return {

    version:"0.2",

    page:"home",

    round:1,
    schedule:createSchedule(),
    morale:72,

    money:14500000,

    fans:6500,

    tactic:"balanced",

    roster:PLAYERS.map(p=>({...p})),

    history:[],

    news:[
      "Välkommen till HV71.",
      "Styrelsens mål är att nå slutspel."
    ],

    live:null,

    teams:TEAM_DATA.map(t=>({

      name:t[0],

      strength:t[1],

      style:t[2],

      gp:0,

      w:0,

      otw:0,

      otl:0,

      l:0,

      gf:0,

      ga:0,

      pts:0

    }))

  };

}
function createSchedule(){

  const teams = TEAM_DATA.map(t => t[0]);
  const games = [];

  let roundNumber = 1;

  for(let cycle = 0; cycle < 4; cycle++){

    const rotating = [...teams];

    for(let r = 0; r < teams.length - 1; r++){

      for(let i = 0; i < teams.length / 2; i++){

        const teamA = rotating[i];
        const teamB = rotating[rotating.length - 1 - i];

        const reverseHome =
          (r + cycle) % 2 === 1;

        games.push({
          round: roundNumber,
          home: reverseHome ? teamB : teamA,
          away: reverseHome ? teamA : teamB,
          played: false,
          homeGoals: null,
          awayGoals: null
        });

      }

      const lastTeam = rotating.pop();
      rotating.splice(1, 0, lastTeam);

      roundNumber++;
    }

  }

  return games;
}
function simulateOtherGames(){



 state.schedule
  .filter(game => game.round === state.round)
  .forEach(game => {

    if(game.played) return;

   if(game.home === "HV71" || game.away === "HV71") return;

    const homeTeam = team(game.home);
    const awayTeam = team(game.away);

    if(!homeTeam || !awayTeam) return;

    const homeStrength = homeTeam.strength + 2;
    const awayStrength = awayTeam.strength;

    let homeGoals = 0;
    let awayGoals = 0;

    for(let i = 0; i < 8; i++){

      if(Math.random() < homeStrength / 420){
        homeGoals++;
      }

      if(Math.random() < awayStrength / 420){
        awayGoals++;
      }

    }
    const overtime = homeGoals === awayGoals;
    if(homeGoals === awayGoals){

      if(Math.random() < homeStrength / (homeStrength + awayStrength)){
        homeGoals++;
      }else{
        awayGoals++;
      }

    }

    game.homeGoals = homeGoals;
    game.awayGoals = awayGoals;
    game.played = true;
game.overtime = overtime;

homeTeam.gp++;
awayTeam.gp++;

homeTeam.gf += homeGoals;
homeTeam.ga += awayGoals;

awayTeam.gf += awayGoals;
awayTeam.ga += homeGoals;

if(overtime){

  if(homeGoals > awayGoals){
    homeTeam.otw++;
    homeTeam.pts += 2;

    awayTeam.otl++;
    awayTeam.pts += 1;
  }else{
    awayTeam.otw++;
    awayTeam.pts += 2;

    homeTeam.otl++;
    homeTeam.pts += 1;
  }

}else{

  if(homeGoals > awayGoals){
    homeTeam.w++;
    homeTeam.pts += 3;

    awayTeam.l++;
  }else{
    awayTeam.w++;
    awayTeam.pts += 3;

    homeTeam.l++;
  }

}
  });

}
/* =========================================================
   LADDA / SPARA
   ========================================================= */

let state;

try{

  const saved=
    JSON.parse(
      localStorage.getItem("hockey_manager_alpha02")
    );

  state=
    saved &&
    saved.version==="0.2"
    ? saved
    : newState();

}catch{

  state=newState();

}
if(
  !Array.isArray(state.schedule) ||
  state.schedule.length === 0 ||
  state.schedule.some(game => typeof game.round !== "number")
){
  state.schedule = createSchedule();
}

function save(){

  localStorage.setItem(
    "hockey_manager_alpha02",
    JSON.stringify(state)
  );

}


/* =========================================================
   HJÄLPFUNKTIONER
   ========================================================= */

function team(name){

  return state.teams.find(
    t=>t.name===name
  );

}


function opponent(){

    const hvGames = state.schedule.filter(
        game => game.home === "HV71" || game.away === "HV71"
    );

    const game = hvGames[state.round - 1];

    if(!game){
        return "Ingen match";
    }

    return game.home === "HV71"
        ? game.away
        : game.home;
}

function money(n){

  return new Intl.NumberFormat(
    "sv-SE"
  ).format(
    Math.round(n)
  )+" kr";

}


function forwards(){

  return state.roster.filter(
    p=>p.pos!=="MV" && p.pos!=="B"
  );

}


function defenders(){

  return state.roster.filter(
    p=>p.pos==="B"
  );

}


function goalies(){

  return state.roster.filter(
    p=>p.pos==="MV"
  );

}

function effectiveRating(p,type="attack"){

  const base =
    type==="shot"
    ? p.shooting
    : type==="pass"
    ? p.passing
    : type==="defense"
    ? p.defense
    : p.overall;

  const fatiguePenalty =
    Math.min(25, p.fatigue * 0.22);

  return Math.max(
    40,
    base - fatiguePenalty
  );
}
function weightedPlayer(type="attack"){

  let list;

  if(state.live){

    const onIce = [
      ...currentLinePlayers(),
      ...currentDefensePlayers()
    ];

    list =
      type==="defense"
      ? currentDefensePlayers()
      : onIce.filter(p=>p.pos!=="MV");

  }else{

    list =
      type==="defense"
      ? defenders()
      : forwards();

  }

  if(!list || !list.length){

    list =
      type==="defense"
      ? defenders()
      : forwards();

  }

  let total = 0;

list.forEach(p=>{

  total += effectiveRating(p,type);

});

  let random =
    Math.random()*total;

  for(const p of list){

    random -= effectiveRating(p,type);

    if(random<=0)
      return p;

  }

  return list[0];

}


function randomGoalie(){

  return goalies()
    .slice()
    .sort(
      (a,b)=>b.overall-a.overall
    )[0];

}


function gameTime(){

  const m=state.live;

  if(!m)
    return "0:00";

  return (
    m.minute+
    ":"+
    String(
      m.second
    ).padStart(2,"0")
  );

}


/* =========================================================
   MATCHHÄNDELSER
   ========================================================= */

function addEvent(
  text,
  type="chance"
){

  if(!state.live)
    return;

  state.live.events.unshift({

    period:
      state.live.period,

    time:
      gameTime(),

    text,

    type

  });

  state.live.events=
    state.live.events.slice(
      0,
      120
    );

}


/* =========================================================
   MATCHSTART
   ========================================================= */

function createMatch(){

  const opp=opponent();

  state.live={

    opponent:opp,

    period:1,

    minute:0,

    second:0,

    hv:0,

    opp:0,

    shotsHV:0,

    shotsOpp:0,

    chancesHV:0,

    chancesOpp:0,

    possessionHV:50,

    faceoffsHV:0,

    faceoffsOpp:0,

    hitsHV:0,

    hitsOpp:0,

    blocksHV:0,

    blocksOpp:0,

    ppHV:0,

    ppOpp:0,

    ppGoalsHV:0,

    ppGoalsOpp:0,

    penaltiesHV:[],

    penaltiesOpp:[],

    momentum:50,

    running:false,

    finished:false,

    overtime:false,

    timeoutUsed:false,

    goaliePulled:false,

    aiGoaliePulled:false,

    events:[],

    speed:1,

    shiftCounter:0,
currentLine:0,
currentDefensePair:0,
shiftSeconds:0,
    homePressure:0,

    awayPressure:0

  };

  addEvent(
    "Nedsläpp i Husqvarna Garden.",
    "chance"
  );

  save();

  render();

}


/* =========================================================
   MATCHKLOCKA
   ========================================================= */

let matchTimer=null;


function startMatch(){

  if(!state.live)
    createMatch();

  if(
    state.live.finished
  )
    return;

  state.live.running=true;

  save();

  render();

  clearTimeout(
    matchTimer
  );

  scheduleTick();

}


function pauseMatch(){

  if(!state.live)
    return;

  state.live.running=false;

  clearTimeout(
    matchTimer
  );

  save();

  render();

}


function scheduleTick(){

  const m=state.live;

  if(
    !m ||
    !m.running ||
    m.finished
  )
    return;

  const delay=
    m.speed===3
    ? 300
    : m.speed===2
    ? 700
    : 1400;

  matchTimer=
    setTimeout(
      ()=>{

        liveStep();

        scheduleTick();

      },
      delay
    );

}


function setSpeed(value){

  if(!state.live)
    return;

  state.live.speed=
    Number(value);

  save();

  render();

}


/* =========================================================
   MATCHMOTOR
   ========================================================= */

function liveStep(){

  const m=state.live;

  if(
    !m ||
    !m.running ||
    m.finished
  )
    return;


  /* ---------- TID ---------- */

  const seconds=
    m.speed===3
    ? 15
    : m.speed===2
    ? 10
    : 6;

  m.second+=seconds;
m.shiftSeconds += seconds;

if(m.shiftSeconds >= 45){

  rotateUnits();

}
  while(
    m.second>=60
  ){

    m.second-=60;

    m.minute++;

  }


  /* ---------- UTVISNINGAR ---------- */

  tickPenalties();


  /* ---------- AI ---------- */

  aiDecisions();


  /* ---------- PERIOD SLUT ---------- */

  if(
    m.minute>=20
  ){

    if(
      m.period<3
    ){

      addEvent(
        `Period ${m.period} är slut.`,
        "period"
      );

      m.period++;

      m.minute=0;

      m.second=0;

      m.running=false;

      m.momentum=
        50+
        ((m.hv-m.opp)*2);

      save();

      render();

      return;

    }


    if(
      m.period===3
    ){

      if(
        m.hv===m.opp
      ){

        startOvertime();

        return;

      }

      finishMatch(false);

      return;

    }

  }


  /* ---------- MATCHHÄNDELSE ---------- */

  m.shiftCounter++;

  const eventRoll=
    Math.random();


  if(
    eventRoll<0.08
  ){

    simulateFaceoff();

  }

  else if(
    eventRoll<0.15
  ){

    simulateHit();

  }

  else if(
    eventRoll<0.18
  ){

    simulatePenalty();

  }

  else if(
    eventRoll<0.52
  ){

    simulateAttack();

  }

  else if(
    eventRoll<0.57
  ){

    simulateNeutralPlay();

  }


  updateFatigue();

  save();

  render();

}


/* =========================================================
   ANFALL
   ========================================================= */

function simulateAttack(){

  const m=state.live;

  const hvTeamPower=
    calculateHVPower();

  const opponentTeam=
    team(
      m.opponent
    );

  const opponentPower=
    calculateOpponentPower(
      opponentTeam
    );


  let hvProbability=
    hvTeamPower/
    (
      hvTeamPower+
      opponentPower
    );


  /* momentum */

  hvProbability+=
    (
      m.momentum-50
    )/500;


  /* powerplay */

  if(
    m.penaltiesOpp.length>
    m.penaltiesHV.length
  ){

    hvProbability+=0.08;

  }

  if(
    m.penaltiesHV.length>
    m.penaltiesOpp.length
  ){

    hvProbability-=0.08;

  }


  hvProbability=
    Math.max(
      .28,
      Math.min(
        .72,
        hvProbability
      )
    );


  const hvAttack=
    Math.random()<
    hvProbability;


  if(hvAttack){

    hvAttackSequence();

  }else{

    opponentAttackSequence();

  }

}


/* =========================================================
   HV71-ANFALL
   ========================================================= */

function hvAttackSequence(){

  const m=state.live;

  const carrier=
    weightedPlayer(
      "attack"
    );

  const passer=
    weightedPlayer(
      "pass"
    );

  const shooter=
    weightedPlayer(
      "shot"
    );


  const sequence=
    Math.random();


  if(
    sequence<0.18
  ){

    addEvent(
      `${carrier.name} vinner pucken och driver in i offensiv zon.`
    );

  }

  else if(
    sequence<0.35
  ){

    addEvent(
      `${passer.name} hittar ${shooter.name} med en fin passning.`
    );

  }

  else if(
    sequence<0.46
  ){

    m.chancesHV++;

    addEvent(
      `${shooter.name} kommer fri framför mål!`,
      "bigChance"
    );

    hvShot(
      shooter,
      true
    );

    return;

  }

  else{

    hvShot(
      shooter,
      false
    );

    return;

  }


  m.momentum=
    Math.min(
      80,
      m.momentum+1
    );

}


/* =========================================================
   HV71-SKOTT
   ========================================================= */

function hvShot(
  shooter,
  dangerous
){

  const m=state.live;

  m.shotsHV++;

  shooter.shots++;


  const goalieStrength=
    team(
      m.opponent
    ).strength;


  let goalChance=
    dangerous
    ? .18
    : .075;


  goalChance+=
    (
      shooter.shooting-75
    )/500;


  if(
    m.penaltiesOpp.length>
    m.penaltiesHV.length
  ){

    goalChance+=.035;

  }


  if(
    m.goaliePulled
  ){

    goalChance+=.015;

  }


  if(
    goalieStrength>81
  ){

    goalChance-=.01;

  }


  const result=
    Math.random();


  if(
    result<
    goalChance
  ){

    goalHV(
      shooter
    );

  }

  else if(
    result<
    goalChance+.12
  ){

    addEvent(
      `${shooter.name} träffar stolpen!`,
      "bigChance"
    );

    m.momentum=
      Math.min(
        80,
        m.momentum+4
      );

  }

  else if(
    result<
    goalChance+.28
  ){

    addEvent(
      `${shooter.name} skjuter – målvakten lämnar retur!`,
      "shot"
    );

    if(
      Math.random()<.22
    ){

      const rebound=
        weightedPlayer(
          "shot"
        );

      m.shotsHV++;

      rebound.shots++;

      if(
        Math.random()<.18
      ){

        goalHV(
          rebound
        );

      }else{

        addEvent(
          `${rebound.name} får returen men målvakten räddar.`,
          "shot"
        );

      }

    }

  }

  else{

    addEvent(
      `${shooter.name} skjuter – räddning.`,
      "shot"
    );

  }

}


/* =========================================================
   MOTSTÅNDARANFALL
   ========================================================= */

function opponentAttackSequence(){

  const m=state.live;
const opponentPlayer = getRandomOpponentSkater(m.opponent);
  const roll=
    Math.random();


  if(
    roll<.18
  ){

addEvent(
  `${opponentPlayer} driver upp pucken och ${m.opponent} etablerar anfall.`
);

  }

  else if(
    roll<.36
  ){

addEvent(
  `${opponentPlayer} kommer med fart genom mittzon.`
);

  }

  else if(
    roll<.46
  ){

    m.chancesOpp++;

const opponentShooter = getRandomOpponentForward(m.opponent);

addEvent(
  `${opponentShooter} kommer fri mot HV71-målet!`,
  "bigChance"
);

    opponentShot(
      true
    );

    return;

  }

  else{

    opponentShot(
      false
    );

    return;

  }


  m.momentum=
    Math.max(
      20,
      m.momentum-1
    );

}


/* =========================================================
   MOTSTÅNDARSKOTT
   ========================================================= */

function opponentShot(
  dangerous,
  shooterName = getRandomOpponentForward(state.live.opponent)
){

  const m=state.live;

  m.shotsOpp++;


  const goalie=
    randomGoalie();


  let goalChance=
    dangerous
    ? .17
    : .07;


  goalChance+=
    (
      team(m.opponent)
      .strength-78
    )/550;


  goalChance-=
    (
      goalie.overall-75
    )/600;


  if(
    m.penaltiesHV.length>
    m.penaltiesOpp.length
  ){

    goalChance+=.035;

  }


  if(
    m.goaliePulled
  ){

    goalChance=.58;

  }


  const result=
    Math.random();


  if(
    result<
    goalChance
  ){

  goalOpponent(shooterName);

  }

  else if(
    result<
    goalChance+.12
  ){

addEvent(
  `${shooterName} träffar ramen!`,
  "bigChance"
);

    m.momentum=
      Math.max(
        20,
        m.momentum-4
      );

  }

  else if(
    result<
    goalChance+.28
  ){

    addEvent(
      `${goalie.name} räddar men lämnar retur.`,
      "shot"
    );

  }

  else{

addEvent(
  `${shooterName} skjuter – ${goalie.name} räddar.`,
  "shot"
);

  }

}


/* =========================================================
   MÅL HV71
   ========================================================= */

function goalHV(
  scorer
){

  const m=state.live;

  m.hv++;

  scorer.goals++;


  const possibleAssists=
    forwards().filter(
      p=>p.id!==scorer.id
    );


  if(
    possibleAssists.length
  ){

    const assist=
      possibleAssists[
        Math.floor(
          Math.random()*
          possibleAssists.length
        )
      ];

    assist.assists++;

  }


  addEvent(
    `MÅÅÅL HV71! ${scorer.name} gör ${m.hv}–${m.opp}!`,
    "goal"
  );


  if(
    m.penaltiesOpp.length>
    m.penaltiesHV.length
  ){

    m.ppGoalsHV++;

  }


  m.momentum=
    Math.min(
      85,
      m.momentum+9
    );

}


/* =========================================================
   MÅL MOTSTÅNDARE
   ========================================================= */

function goalOpponent(scorerName){

  const m=state.live;

  m.opp++;


addEvent(
  `MÅL ${m.opponent}! ${scorerName} gör ${m.hv}-${m.opp}!`,
  "goal"
);


  if(
    m.penaltiesHV.length>
    m.penaltiesOpp.length
  ){

    m.ppGoalsOpp++;

  }


  m.momentum=
    Math.max(
      15,
      m.momentum-9
    );

}


/* =========================================================
   TEKNING
   ========================================================= */

function simulateFaceoff(){

  const m=state.live;

  const hvWins=
    Math.random()<.51;


  if(hvWins){

    m.faceoffsHV++;

    addEvent(
      "HV71 vinner tekningen."
    );

  }else{

    m.faceoffsOpp++;

    addEvent(
      `${m.opponent} vinner tekningen.`
    );

  }

}


/* =========================================================
   TACKLING
   ========================================================= */

function simulateHit(){

  const m=state.live;


  const hvHit=
    Math.random()<.52;


  if(hvHit){

    m.hitsHV++;

    const hitter=
      weightedPlayer(
        "defense"
      );

    addEvent(
      `${hitter.name} delar ut en tung tackling.`,
      "hit"
    );

    m.momentum=
      Math.min(
        80,
        m.momentum+2
      );

}else{

  const hitterName =
    getRandomOpponentSkater(m.opponent);

  m.hitsOpp++;

  addEvent(
    `${hitterName} sätter in en hård tackling för ${m.opponent}.`,
    "hit"
  );

  m.momentum=
    Math.max(
      20,
      m.momentum-2
    );

}

}


/* =========================================================
   UTVISNINGAR
   ========================================================= */

const PENALTIES=[
  "Hooking",
  "Tripping",
  "Slashing",
  "Interference",
  "Holding",
  "Roughing"
];


function simulatePenalty(){

  const m=state.live;


  const hvPenalty=
    Math.random()<.5;


  const penalty=
    PENALTIES[
      Math.floor(
        Math.random()*
        PENALTIES.length
      )
    ];


  if(hvPenalty){

    const player=
      weightedPlayer();

    player.pim+=2;

    m.penaltiesHV.push(
      120
    );

    m.ppOpp++;

    addEvent(
      `UTVISNING HV71: ${player.name}, 2 min ${penalty}.`,
      "penalty"
    );

}else{

    const playerName =
        getRandomOpponentSkater(m.opponent);

    m.penaltiesOpp.push(
        120
    );

    m.ppHV++;

    addEvent(
        `UTVISNING ${m.opponent}: ${playerName}, 2 min ${penalty}.`,
        "penalty"
    );

}

}


/* =========================================================
   UTVISNINGSTID
   ========================================================= */

function tickPenalties(){

  const m=state.live;

  const tick=
    m.speed===3
    ? 15
    : m.speed===2
    ? 10
    : 6;


  m.penaltiesHV=
    m.penaltiesHV
    .map(x=>x-tick)
    .filter(x=>x>0);


  m.penaltiesOpp=
    m.penaltiesOpp
    .map(x=>x-tick)
    .filter(x=>x>0);

}


/* =========================================================
   NEUTRALT SPEL
   ========================================================= */

function simulateNeutralPlay(){

  const m=state.live;

  const texts=[

    "Spelet böljar fram och tillbaka.",

    "HV71 försöker etablera spel genom mittzon.",

    `${m.opponent} tvingas börja om i egen zon.`,

    "HV71 forecheckar högt.",

    "Lagen byter chanser med varandra."

  ];

  addEvent(
    texts[
      Math.floor(
        Math.random()*
        texts.length
      )
    ]
  );

}


/* =========================================================
   LAGSTYRKA
   ========================================================= */

function calculateHVPower(){

  let power=
    state.roster.reduce(
      (
        sum,
        p
      )=>sum+p.overall,
      0
    )/
    state.roster.length;


  power+=
    state.morale/40;


  if(
    state.tactic===
    "attack"
  ){

    power+=2;

  }

  if(
    state.tactic===
    "defense"
  ){

    power-=1;

  }


  return power;

}


function calculateOpponentPower(
  opponentTeam
){

  let power=
    opponentTeam.strength;


  const m=
    state.live;


  if(
    m &&
    m.period===3
  ){

    if(
      m.opp<m.hv
    ){

      power+=2;

    }

  }


  return power;

}


/* =========================================================
   TRÖTTHET
   ========================================================= */

function updateFatigue(){

  const onIce = [
    ...currentLinePlayers(),
    ...currentDefensePlayers()
  ];

  state.roster.forEach(p => {

    if(p.pos === "MV") return;

    const isOnIce = onIce.some(player => player.id === p.id);

    if(isOnIce){
      // Spelare på isen blir tröttare
      p.fatigue = Math.min(
        100,
        p.fatigue + 1.2
      );
    } else {
      // Spelare på bänken återhämtar sig
      p.fatigue = Math.max(
        0,
        p.fatigue - 0.8
      );
    }

  });

}


/* =========================================================
   AI
   ========================================================= */

function aiDecisions(){

  const m=
    state.live;

  if(!m)
    return;


  if(
    m.period===3 &&
    m.minute>=17 &&
    m.opp<m.hv &&
    !m.aiGoaliePulled
  ){

    m.aiGoaliePulled=true;

    addEvent(
      `${m.opponent} tar ut målvakten!`,
      "strategy"
    );

  }

}


/* =========================================================
   TIMEOUT
   ========================================================= */

function useTimeout(){

  const m=
    state.live;

  if(
    !m ||
    m.timeoutUsed
  )
    return;


  m.timeoutUsed=true;

  m.running=false;

  m.momentum=
    Math.min(
      75,
      m.momentum+7
    );


  state.roster.forEach(
    p=>{

      p.fatigue=
        Math.max(
          0,
          p.fatigue-8
        );

    }
  );


  addEvent(
    "HV71 tar timeout. Spelarna får återhämta sig.",
    "strategy"
  );


  clearTimeout(
    matchTimer
  );

  save();

  render();

}


/* =========================================================
   TA UT MÅLVAKT
   ========================================================= */

function toggleGoalie(){

  const m=
    state.live;

  if(!m)
    return;


  m.goaliePulled=
    !m.goaliePulled;


  addEvent(
    m.goaliePulled
    ? "HV71 tar ut målvakten!"
    : "HV71 sätter tillbaka målvakten.",
    "strategy"
  );


  save();

  render();

}


/* =========================================================
   TAKTIK
   ========================================================= */

function setTactic(
  tactic
){

  state.tactic=
    tactic;


  if(
    state.live
  ){

    const labels={

      attack:"offensiv",

      balanced:"balanserad",

      defense:"defensiv"

    };


    addEvent(
      `HV71 ändrar taktik till ${labels[tactic]}.`,
      "strategy"
    );

  }


  save();

  render();

}


/* =========================================================
   FÖRLÄNGNING
   ========================================================= */

function startOvertime(){

  const m=
    state.live;


  addEvent(
    "Ordinarie tid är slut. Förlängning väntar.",
    "period"
  );


  m.overtime=true;

  m.period=4;

  m.minute=0;

  m.second=0;

  m.running=false;


  save();

  render();

}


/* =========================================================
   FÖRLÄNGNINGSSTEG
   ========================================================= */

function overtimeStep(){

  const m=
    state.live;

  if(
    !m ||
    !m.running
  )
    return;


  m.second+=8;


  while(
    m.second>=60
  ){

    m.second-=60;

    m.minute++;

  }


  simulateAttack();


  if(
    m.hv!==m.opp
  ){

    finishMatch(true);

    return;

  }


  if(
    m.minute>=5
  ){

    shootout();

  }

}


/* =========================================================
   STRAFFAR
   ========================================================= */

function shootout(){

  const m=
    state.live;


  addEvent(
    "Straffläggning börjar.",
    "period"
  );


  const hvWin=
    Math.random()<.52;


  if(hvWin){

    m.hv++;

    addEvent(
      "HV71 avgör på straffar!",
      "goal"
    );

  }else{

    m.opp++;

    addEvent(
      `${m.opponent} avgör på straffar.`,
      "goal"
    );

  }


  finishMatch(true);

}


/* =========================================================
   MATCHSLUT
   ========================================================= */

function finishMatch(
  overtime
){

  const m=
    state.live;


  m.running=false;

  m.finished=true;


  clearTimeout(
    matchTimer
  );


  const hv=
    team(
      "HV71"
    );

  const opp=
    team(
      m.opponent
    );


  hv.gp++;

  opp.gp++;


  hv.gf+=
    m.hv;

  hv.ga+=
    m.opp;


  opp.gf+=
    m.opp;

  opp.ga+=
    m.hv;


  const hvWin=
    m.hv>m.opp;


  if(
    overtime
  ){

    if(hvWin){

      hv.otw++;

      hv.pts+=2;

      opp.otl++;

      opp.pts+=1;

    }else{

      opp.otw++;

      opp.pts+=2;

      hv.otl++;

      hv.pts+=1;

    }

  }else{

    if(hvWin){

      hv.w++;

      hv.pts+=3;

      opp.l++;

    }else{

      opp.w++;

      opp.pts+=3;

      hv.l++;

    }

  }


  if(hvWin){

    state.morale=
      Math.min(
        100,
        state.morale+4
      );

    state.fans+=
      75;

  }else{

    state.morale=
      Math.max(
        30,
        state.morale-4
      );

  }


  state.history.unshift(
    `HV71 ${m.hv}–${m.opp} ${m.opponent}`
  );


  state.news.unshift(
    hvWin
    ? `HV71 besegrade ${m.opponent} med ${m.hv}–${m.opp}.`
    : `HV71 föll mot ${m.opponent} med ${m.hv}–${m.opp}.`
  );


  state.money+=
    Math.round(
      state.fans*220
    )-
    300000;

  const hvGames = state.schedule.filter(
  game => game.home === "HV71" || game.away === "HV71"
);

const scheduleGame = hvGames[state.round - 1];

if (scheduleGame) {
  scheduleGame.played = true;

  if (scheduleGame.home === "HV71") {
    scheduleGame.homeGoals = m.hv;
    scheduleGame.awayGoals = m.opp;
  } else {
    scheduleGame.homeGoals = m.opp;
    scheduleGame.awayGoals = m.hv;
  }
}

simulateOtherGames();

state.round++;


  state.roster.forEach(
    p=>{

      p.fatigue=
        Math.max(
          0,
          p.fatigue-20
        );

    }
  );


  save();

  render();

}


/* =========================================================
   HEMSIDAN
   ========================================================= */

function homeView(){
   const hvGames = state.schedule.filter(
  game => game.home === "HV71" || game.away === "HV71"
);

const nextGame = hvGames[state.round - 1];

const isHome = nextGame && nextGame.home === "HV71";
const opponentName = nextGame
  ? (isHome ? nextGame.away : nextGame.home)
  : "Ingen match";
  const hv=
    team("HV71");


  return `

  <section class="card hero">

<span class="pill">
  Säsong 2026/27 • Omgång ${state.round} av 52
</span>

<h2>
  ${isHome ? "HV71" : opponentName}
  vs
  ${isHome ? opponentName : "HV71"}
</h2>

<p class="muted">
  ${isHome ? "Hemmamatch" : "Bortamatch"}
</p>

    <button
      class="btn"
      onclick="
      state.page='match';
      render();
      "
    >
      Till nästa match
    </button>
<button
  class="btn"
  onclick="
    state.page='schedule';
    render();
  "
>
  Spelschema
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
      ?
      state.history
      .slice(0,5)
      .map(
        x=>`
        <div class="row">
          <span>${x}</span>
        </div>
        `
      ).join("")
      :
      `
      <p class="muted">
        Ingen match spelad ännu.
      </p>
      `
    }

  </section>


  <section class="card">

    <h3>Nyheter</h3>

    ${
      state.news
      .slice(0,5)
      .map(
        n=>`
        <div class="row">
          <span>${n}</span>
        </div>
        `
      ).join("")
    }

  </section>


  <section class="card">

    <h3>Klubbkassa</h3>

    <h2>
      ${money(state.money)}
    </h2>

  </section>

  `;

}


/* =========================================================
   TRUPP
   ========================================================= */

function squadView(){

  return `

  <section class="card">

    <h2>HV71:s trupp</h2>

    <p class="muted">
      Kondition påverkas under matcherna.
    </p>


    ${
      state.roster
      .slice()
      .sort(
        (a,b)=>
        b.overall-a.overall
      )
      .map(
        p=>`

        <div class="player">

          <span class="pos">
            ${p.pos}
          </span>

          <div class="player-info">

            <b>
              ${p.name}
            </b>

            <small>
              ${p.goals} mål
              •
              ${p.assists} assist
              •
              Kondition ${Math.max(
                0,
                Math.round(
                  100-p.fatigue
                )
              )}%
            </small>

          </div>

          <span class="rating">
            ${p.overall}
          </span>

        </div>

        `
      ).join("")
    }

  </section>

  `;

}

/* =========================================================
   KEDJOR
   ========================================================= */

function ensureLines(){

  if(state.lines) return;

  const fw = forwards()
    .slice()
    .sort((a,b)=>b.overall-a.overall);

  const d = defenders()
    .slice()
    .sort((a,b)=>b.overall-a.overall);

  const g = goalies()
    .slice()
    .sort((a,b)=>b.overall-a.overall);

  state.lines = {
    forwards: fw.slice(0,12).map(p=>p.id),
    defense: d.slice(0,6).map(p=>p.id),
    goalie: g[0]?.id ?? null
  };

  save();
}


function playerById(id){

  return state.roster.find(
    p=>p.id===Number(id)
  );

}


function lineOptions(players, selectedId){

  return players.map(p=>`
    <option
      value="${p.id}"
      ${p.id===selectedId ? "selected" : ""}
    >
      ${p.name} • ${p.overall}
    </option>
  `).join("");

}


function changeLinePlayer(type,index,newId){

  ensureLines();

  newId=Number(newId);

  const list=state.lines[type];

  const existingIndex=
    list.indexOf(newId);

  /*
     Om spelaren redan finns på en annan plats
     byter spelarna plats med varandra.
     Därmed kan samma spelare aldrig finnas
     i två kedjor samtidigt.
  */

  if(existingIndex!==-1){

    const oldId=list[index];

    list[index]=newId;

    list[existingIndex]=oldId;

  }else{

    list[index]=newId;

  }

  save();

  render();

}


function changeGoalie(id){

  ensureLines();

  state.lines.goalie=
    Number(id);

  save();

  render();

}


function lineAverage(ids){

  const players=
    ids
    .map(playerById)
    .filter(Boolean);

  if(!players.length)
    return 0;

  return Math.round(
    players.reduce(
      (sum,p)=>sum+p.overall,
      0
    )/players.length
  );

}

function currentLinePlayers(){

  ensureLines();

  if(!state.live) return [];

  const start =
    state.live.currentLine * 3;

  return state.lines.forwards
    .slice(start, start + 3)
    .map(playerById)
    .filter(Boolean);
}


function currentDefensePlayers(){

  ensureLines();

  if(!state.live) return [];

  const start =
    state.live.currentDefensePair * 2;

  return state.lines.defense
    .slice(start, start + 2)
    .map(playerById)
    .filter(Boolean);
}


function rotateUnits(){

  const m = state.live;

  if(!m) return;

  m.shiftSeconds = 0;

  m.currentLine =
    (m.currentLine + 1) % 4;

  m.currentDefensePair =
    (m.currentDefensePair + 1) % 3;
}
function linesView(){

  ensureLines();

  const fw=forwards()
    .slice()
    .sort((a,b)=>b.overall-a.overall);

  const d=defenders()
    .slice()
    .sort((a,b)=>b.overall-a.overall);

  const g=goalies()
    .slice()
    .sort((a,b)=>b.overall-a.overall);


  let html=`

  <section class="card">

    <h2>Kedjor</h2>

    <p class="muted">
      Bygg dina fyra kedjor.
      En spelare kan bara finnas på en plats.
    </p>

  `;


  for(let line=0;line<4;line++){

    const start=line*3;

    const ids=
      state.lines.forwards.slice(
        start,
        start+3
      );

    html+=`

    <div class="line">

      <div class="section-title">

        <b>
          Kedja ${line+1}
        </b>

        <span class="pill">
          OVR ${lineAverage(ids)}
        </span>

      </div>

      <br>

      <select
        onchange="
        changeLinePlayer(
          'forwards',
          ${start},
          this.value
        )
        "
      >
        ${lineOptions(
          fw,
          state.lines.forwards[start]
        )}
      </select>

      <br><br>

      <select
        onchange="
        changeLinePlayer(
          'forwards',
          ${start+1},
          this.value
        )
        "
      >
        ${lineOptions(
          fw,
          state.lines.forwards[start+1]
        )}
      </select>

      <br><br>

      <select
        onchange="
        changeLinePlayer(
          'forwards',
          ${start+2},
          this.value
        )
        "
      >
        ${lineOptions(
          fw,
          state.lines.forwards[start+2]
        )}
      </select>

    </div>

    `;

  }


  html+=`

  </section>


  <section class="card">

    <h2>Backpar</h2>

  `;


  for(let pair=0;pair<3;pair++){

    const start=pair*2;

    const ids=
      state.lines.defense.slice(
        start,
        start+2
      );

    html+=`

    <div class="line">

      <div class="section-title">

        <b>
          Backpar ${pair+1}
        </b>

        <span class="pill">
          OVR ${lineAverage(ids)}
        </span>

      </div>

      <br>

      <select
        onchange="
        changeLinePlayer(
          'defense',
          ${start},
          this.value
        )
        "
      >
        ${lineOptions(
          d,
          state.lines.defense[start]
        )}
      </select>

      <br><br>

      <select
        onchange="
        changeLinePlayer(
          'defense',
          ${start+1},
          this.value
        )
        "
      >
        ${lineOptions(
          d,
          state.lines.defense[start+1]
        )}
      </select>

    </div>

    `;

  }


  html+=`

  </section>


  <section class="card">

    <h2>Startande målvakt</h2>

    <select
      onchange="
      changeGoalie(this.value)
      "
    >
      ${lineOptions(
        g,
        state.lines.goalie
      )}
    </select>

  </section>

  `;


  return html;

}
/* =========================================================
   MATCHVY
   ========================================================= */

function matchView(){

  const m=
    state.live;


  if(!m){

    return `

    <section class="card">

      <h2>Nästa match</h2>

      <div class="scoreboard">

        <div>
          <b>HV71</b>
        </div>

        <div class="score">
          –
        </div>

        <div>
          <b>${opponent()}</b>
        </div>

      </div>

      <br>

      <label>
        <span class="muted">
          Starttaktik
        </span>
      </label>

      <select
        onchange="
        setTactic(this.value)
        "
      >

        <option
          value="attack"
          ${
            state.tactic==="attack"
            ?"selected"
            :""
          }
        >
          Offensiv
        </option>

        <option
          value="balanced"
          ${
            state.tactic==="balanced"
            ?"selected"
            :""
          }
        >
          Balanserad
        </option>

        <option
          value="defense"
          ${
            state.tactic==="defense"
            ?"selected"
            :""
          }
        >
          Defensiv
        </option>

      </select>

      <br><br>

      <button
        class="btn"
        onclick="
        createMatch()
        "
      >
        Starta match
      </button>

    </section>

    `;

  }

const onIceForwards =
  currentLinePlayers();

const onIceDefense =
  currentDefensePlayers();
  const totalMinutes=
    m.period<=3
    ?
    (
      (m.period-1)*20+
      m.minute
    )
    :
    60+
    m.minute;


  const progress=
    m.period<=3
    ?
    Math.min(
      100,
      totalMinutes/60*100
    )
    :
    100;


  const powerplay=
    m.penaltiesOpp.length>
    m.penaltiesHV.length
    ?
    "HV71 PP"
    :
    m.penaltiesHV.length>
    m.penaltiesOpp.length
    ?
    `${m.opponent} PP`
    :
    "5 mot 5";


  return `

  <section class="card">
${!m.running && m.minute === 0 && m.second === 0 && m.period > 1 && !m.finished
  ? `
    <div class="card" style="
      text-align:center;
      margin-bottom:16px;
      border:2px solid #ffe600;
    ">
      <h2>🏒 PERIODPAUS</h2>

      <div class="muted">
        Period ${m.period - 1} slut
      </div>

      <h2 style="margin:12px 0;">
        HV71 ${m.hv}-${m.opp} ${m.opponent}
      </h2>

      <div style="margin-top:10px;">
        Nästa: Period ${m.period}
      </div>
    </div>
  `
  : ""
}
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

      ${
        m.period===4
        ?
        "Förlängning"
        :
        `Period ${m.period}`
      }

      •

      ${gameTime()}

    </div>


    <div class="livebar">

      <span
        style="
        width:${progress}%
        "
      ></span>

    </div>
<div class="line">

  <div class="section-title">

    <b>
      På isen
    </b>

    <span class="pill">
      Kedja ${m.currentLine + 1}
      •
      Backpar ${m.currentDefensePair + 1}
    </span>

  </div>

  <br>

  <div class="muted">
${onIceForwards.map(p=>`${p.name} (<span style="color:${p.fatigue >= 75 ? '#ff4d4d' : p.fatigue >= 45 ? '#ffb84d' : '#55cc77'}">${Math.round(p.fatigue)}% trött</span>)`).join(" • ")}
  </div>

  <div class="muted" style="margin-top:6px;">
${onIceDefense.map(p=>`${p.name} (<span style="color:${p.fatigue >= 75 ? '#ff4d4d' : p.fatigue >= 45 ? '#ffb84d' : '#55cc77'}">${Math.round(p.fatigue)}% trött</span>)`).join(" • ")}
</div>

    <br>


    <div class="grid">

      <div class="stat">

        <b>
          ${m.shotsHV}–${m.shotsOpp}
        </b>

        <span>
          Skott
        </span>

      </div>


      <div class="stat">

        <b>
          ${m.chancesHV}–${m.chancesOpp}
        </b>

        <span>
          Farliga chanser
        </span>

      </div>


      <div class="stat">

        <b>
          ${Math.round(m.momentum)}%
        </b>

        <span>
          HV71 momentum
        </span>

      </div>


      <div class="stat">

        <b>
          ${powerplay}
        </b>

        <span>
          Numerärt läge
        </span>

      </div>

    </div>


    <div class="grid">

      <div class="stat">

        <b>
          ${m.faceoffsHV}–${m.faceoffsOpp}
        </b>

        <span>
          Tekningar
        </span>

      </div>


      <div class="stat">

        <b>
          ${m.hitsHV}–${m.hitsOpp}
        </b>

        <span>
          Tacklingar
        </span>

      </div>


      <div class="stat">

        <b>
          ${m.ppGoalsHV}/${m.ppHV}
        </b>

        <span>
          HV71 PP
        </span>

      </div>


      <div class="stat">

        <b>
          ${m.ppGoalsOpp}/${m.ppOpp}
        </b>

        <span>
          Motstånd PP
        </span>

      </div>

    </div>


    <label>
      <span class="muted">
        Matchtaktik
      </span>
    </label>

    <select
      onchange="
      setTactic(this.value)
      "
    >

      <option
        value="attack"
        ${
          state.tactic==="attack"
          ?"selected"
          :""
        }
      >
        Offensiv
      </option>

      <option
        value="balanced"
        ${
          state.tactic==="balanced"
          ?"selected"
          :""
        }
      >
        Balanserad
      </option>

      <option
        value="defense"
        ${
          state.tactic==="defense"
          ?"selected"
          :""
        }
      >
        Defensiv
      </option>

    </select>


    <br><br>


    <label>
      <span class="muted">
        Matchhastighet
      </span>
    </label>

    <select
      onchange="
      setSpeed(this.value)
      "
    >

      <option
        value="1"
        ${
          m.speed===1
          ?"selected"
          :""
        }
      >
        Normal
      </option>

      <option
        value="2"
        ${
          m.speed===2
          ?"selected"
          :""
        }
      >
        Snabb
      </option>

      <option
        value="3"
        ${
          m.speed===3
          ?"selected"
          :""
        }
      >
        Mycket snabb
      </option>

    </select>


    <div class="controls">

      ${
        m.running
        ?
        `
        <button
          class="btn"
          onclick="
          pauseMatch()
          "
        >
          Pausa
        </button>
        `
        :
        `
        <button
          class="btn"
          onclick="
          startMatch()
          "
          ${
            m.finished
            ?"disabled"
            :""
          }
        >
         ${m.finished
  ? "Match slut"
  : !m.running && m.minute === 0 && m.second === 0 && m.period > 1
    ? `Starta period ${m.period}`
    : "Fortsätt"
}
        </button>
        `
      }


      <button
        class="btn secondary"
        onclick="
        useTimeout()
        "
        ${
          m.timeoutUsed
          ?"disabled"
          :""
        }
      >
        Timeout
      </button>


      <button
        class="btn secondary"
        onclick="
        toggleGoalie()
        "
      >
        ${
          m.goaliePulled
          ?
          "Sätt in målvakt"
          :
          "Ta ut målvakt"
        }
      </button>

    </div>

  </section>


  <section class="card">

    <h3>Matchhändelser</h3>

    <div class="log">

      ${
        m.events
        .map(
          e=>`

          <div
            class="${e.type}"
          >

            P${e.period}
            ${e.time}
            –
            ${e.text}

          </div>

          `
        ).join("")
      }

    </div>

  </section>


  ${
    m.finished
    ?
    `

    <section class="card">

      <h3>Matchen är slut</h3>

      <button
        class="btn"
        onclick="
        state.live=null;
        save();
        render();
        "
      >
        Fortsätt
      </button>

    </section>

    `
    :
    ""
  }

  `;

}


/* =========================================================
   TABELL
   ========================================================= */

function tableView(){

  const sorted=
    state.teams
    .slice()
    .sort(
      (a,b)=>

      b.pts-a.pts

      ||

      (
        b.gf-b.ga
      )
      -
      (
        a.gf-a.ga
      )

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
          sorted
          .map(
            (t,i)=>`

            <tr
              class="${
                t.name==="HV71"
                ?"me"
                :""
              }"
            >

              <td>
                ${i+1}
              </td>

              <td>
                ${t.name}
              </td>

              <td>
                ${t.gp}
              </td>

              <td>
                ${t.gf-t.ga}
              </td>

              <td>
                <b>
                  ${t.pts}
                </b>
              </td>

            </tr>

            `
          ).join("")
        }

      </tbody>

    </table>

  </section>


  <section class="card">

    <h2>HV71:s poängliga</h2>

    ${
      state.roster
      .slice()
      .sort(
        (a,b)=>

        (
          b.goals+
          b.assists
        )

        -

        (
          a.goals+
          a.assists
        )
      )
      .slice(
        0,
        10
      )
      .map(
        (p,i)=>`

        <div class="row">

          <span>
            ${i+1}. ${p.name}
          </span>

          <b>
            ${p.goals}
            +
            ${p.assists}
            =
            ${
              p.goals+
              p.assists
            }
          </b>

        </div>

        `
      ).join("")
    }

  </section>

  `;

}
function gamesForRound(round){

  return state.schedule
    .filter(game => game.round === round)
    .sort((a,b) => a.home.localeCompare(b.home));

}
function roundView(){

  const round = state.selectedRound || state.round;

  const games = gamesForRound(round);

  const rows = games.map(game => {

    const result = game.played
      ? `${game.homeGoals} - ${game.awayGoals}`
      : "Ej spelad";

const isHVGame =
  game.home === "HV71" || game.away === "HV71";

return `
  <div
    class="card"
    style="
      margin-bottom:10px;
      ${isHVGame ? "border:2px solid #ffd400;" : ""}
    "
  >
    <b>
      ${isHVGame ? "★ " : ""}
      ${game.home} vs ${game.away}
    </b>

    <div style="margin-top:6px;">
      ${result}
    </div>
  </div>
`;
  }).join("");

  return `
    <section class="card">

      <h2>Omgång ${round}</h2>

      <p class="muted">
        SHL • 7 matcher
      </p>
<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">

  ${round > 1 ? `
    <button
      class="btn"
      onclick="
        state.selectedRound=${round - 1};
        render();
      "
    >
      ← Föregående omgång
    </button>
  ` : ""}

  ${round < 52 ? `
    <button
      class="btn"
      onclick="
        state.selectedRound=${round + 1};
        render();
      "
    >
      Nästa omgång →
    </button>
  ` : ""}

</div>
      <button
        class="btn"
        onclick="
          state.page='schedule';
          render();
        "
      >
        Tillbaka till spelschema
      </button>

    </section>

    <br>

    ${rows}
  `;
}
function scheduleView(){

  const hvGames = state.schedule
    .filter(game => game.home === "HV71" || game.away === "HV71")
    .sort((a,b) => a.round - b.round);

  const rows = hvGames.map(game => {

    const isHome = game.home === "HV71";

    const opponentName =
      isHome ? game.away : game.home;

    const place =
      isHome ? "Hemma" : "Borta";

    const result = game.played
      ? `${game.homeGoals} - ${game.awayGoals}`
      : "Ej spelad";

    return `
      <div class="card" style="margin-bottom:10px;">
        <b>Omgång ${game.round}</b>

        <div style="margin-top:6px;">
          ${game.home} vs ${game.away}
        </div>

        <div class="muted" style="margin-top:4px;">
          ${place} mot ${opponentName}
        </div>

        <div style="margin-top:6px;">
          ${result}
        </div>
        <button
  class="btn"
  style="margin-top:10px;"
  onclick="
    state.selectedRound=${game.round};
    state.page='round';
    render();
  "
>
  Visa hela omgången
</button>
      </div>
    `;
  }).join("");

  return `
    <section class="card">

      <h2>HV71 – Spelschema</h2>

      <p class="muted">
        Säsong 2026/27 • 52 omgångar
      </p>

      <button
        class="btn"
        onclick="
          state.page='home';
          render();
        "
      >
        Tillbaka
      </button>

    </section>

    <br>

    ${rows}
  `;
}
/* =========================================================
   RENDER
   ========================================================= */

function render(){

  const content=
    document.getElementById(
      "content"
    );


content.innerHTML=

  state.page==="home"

  ? homeView()

  : state.page==="squad"

  ? squadView()

  : state.page==="lines"

  ? linesView()

: state.page==="schedule"

? scheduleView()

: state.page==="round"

? roundView()

: state.page==="match"

? matchView()

: tableView();




  document
  .querySelectorAll(
    ".nav button"
  )
  .forEach(
    btn=>{

      btn.classList.toggle(

        "active",

        btn.dataset.page===
        state.page

      );

    }
  );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

document
.querySelectorAll(
  ".nav button"
)
.forEach(
  btn=>{

    btn.addEventListener(
      "click",
      ()=>{

        state.page=
          btn.dataset.page;

        render();

      }
    );

  }
);


/* =========================================================
   START
   ========================================================= */

save();

render();
