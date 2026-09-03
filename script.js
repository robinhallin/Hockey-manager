"use strict";

/* =========================================================
   HOCKEY MANAGER
   Alpha 0.2 – Matchmotor 2.0
   ========================================================= */

/* =========================================================
   DATA
   ========================================================= */

const PLAYERS = [

  ["Felix Sandström","MV",78,74,78,76,79,29,"SWE",2,1650000,8500000],
  ["Olof Glifford","MV",73,71,75,72,74,20,"SWE",3,650000,3500000],

  ["Andreas Borgman","B",81,78,80,84,83,31,"SWE",3,2200000,12500000],
  ["Niklas Hansson","B",80,79,82,81,77,31,"SWE",2,2050000,10500000],
  ["Olle Alsing","B",78,76,80,79,75,30,"SWE",2,1750000,8000000],
  ["Santeri Hatakka","B",77,72,77,81,82,25,"FIN",2,1450000,7500000],
  ["Malte Gustafsson","B",72,70,74,72,71,22,"SWE",3,750000,4200000],
  ["Hugo Fransson","B",71,69,72,73,70,21,"SWE",3,650000,3800000],

  ["Jonathan Ang","HF",83,85,82,75,78,28,"CAN",2,2600000,15000000],
  ["Lukas Rousek","HF",82,82,85,74,76,27,"CZE",2,2400000,14000000],
  ["Riley Woods","VF",81,84,78,72,80,28,"CAN",2,2200000,12500000],
  ["Aleksi Heponiemi","C",81,79,86,74,72,27,"FIN",2,2250000,13000000],
  ["Justin Kloos","C",80,80,82,75,76,32,"USA",1,2000000,9000000],
  ["Noah Philp","C",80,78,79,80,82,26,"CAN",2,2100000,11500000],
  ["Jan Mysak","C",79,81,78,72,77,24,"CZE",3,1700000,10000000],
  ["Oskar Stål Lyrenäs","VF",78,79,76,71,76,27,"SWE",2,1550000,8000000],
  ["Linus Lindström","C",77,75,78,78,75,27,"SWE",2,1500000,7500000],
  ["Nikola Pasic","HF",76,77,75,70,74,24,"SWE",2,1300000,6500000],
  ["Martin Johnsen","VF",72,74,70,68,72,21,"NOR",3,700000,4000000],
  ["Victor Laz","HF",70,72,68,67,73,20,"SWE",3,600000,3200000]

].map((p,id)=>({

  id,

  name:p[0],
  pos:p[1],
  overall:p[2],

  shooting:p[3],
  passing:p[4],
  defense:p[5],
  physical:p[6],

  age:p[7],
  nationality:p[8],
  contractYears:p[9],
  salary:p[10],
  value:p[11],

  goals:0,
  assists:0,
  shots:0,
  pim:0,

  fatigue:0,
  form:0,
  morale:70,
     
transferListed:false,
askingPrice:null
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
const CLUB_DATA = Object.fromEntries(
  TEAM_DATA.map(team => {

    const name = team[0];
    const strength = team[1];
    const style = team[2];

    return [
      name,
      {
        name,
        strength,
        style,

        reputation: strength,

        budget:
          Math.round(
            (8000000 + strength * 120000)
          ),

        wageBudget:
          Math.round(
            (6500000 + strength * 90000)
          ),

        fans:
          Math.round(
            3500 + strength * 55
          ),

        boardExpectation:
          strength >= 82
            ? "Slåss om guldet"
            : strength >= 79
              ? "Slutspel"
              : strength >= 76
                ? "Play-in"
                : "Undvik botten"
      }
    ];

  })
);
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

    managerClub:"HV71",

    page:"home",

    round:1,
    schedule:createSchedule(),
    morale:72,

    money:14500000,

    fans:6500,

    tactic:"balanced",

    roster:PLAYERS.map(p=>({...p})),

clubRosters: createClubRosters(),

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
function managerClub(){

  return state.managerClub || "HV71";

}


function managerRoster(){

  const clubName =
    managerClub();

  if(
    state.clubRosters &&
    state.clubRosters[clubName]
  ){
    return state.clubRosters[clubName];
  }

  return state.roster || [];

}
function syncManagerRoster(){

  const clubName = managerClub();

  if(
    state.clubRosters &&
    state.clubRosters[clubName]
  ){
    state.roster =
      state.clubRosters[clubName];
  }

}
function getClub(clubName = managerClub()){

  return CLUB_DATA[clubName] || null;

}
function createClubRosters(){

  const clubRosters = {};

  Object.entries(TEAM_ROSTERS).forEach(
    ([clubName, roster]) => {

      /*
        HV71 har redan vår detaljerade PLAYERS-databas.
        Den använder vi direkt.
      */
      if(clubName === "HV71"){

        clubRosters[clubName] =
          PLAYERS.map(
            player => ({
              ...player,
              club: clubName
            })
          );

        return;
      }


      /*
        Övriga klubbar byggs tills vidare från
        deras befintliga TEAM_ROSTERS.
      */

      const players = [];

      const addPlayers =
        (names, position) => {

          (names || []).forEach(
            (name,index) => {

              const club =
                getClub(clubName);

              const baseOverall =
                club?.strength || 75;

              let variation = 0;

              for(
                let i=0;
                i<name.length;
                i++
              ){
                variation +=
                  name.charCodeAt(i);
              }

              variation =
                (variation % 7) - 3;

              const overall =
                Math.max(
                  68,
                  Math.min(
                    85,
                    baseOverall + variation
                  )
                );


              players.push({

                id:
                  `${clubName}-${position}-${index}`,

                name,

                club:
                  clubName,

                pos:
                  position,

                overall,

                shooting:
                  overall,

                passing:
                  overall,

                defense:
                  overall,

                physical:
                  overall,

                age:
                  25,

                nationality:
                  "SWE",

                potential:
                  Math.min(
                    88,
                    overall + 3
                  ),

                contractYears:
                  2,

                salary:
                  Math.round(
                    600000 +
                    Math.max(
                      0,
                      overall - 70
                    ) * 120000
                  ),

                value:
                  Math.round(
                    2500000 +
                    Math.max(
                      0,
                      overall - 70
                    ) * 850000
                  ),

                goals:0,
                assists:0,
                shots:0,
                pim:0,

                fatigue:0,
                form:0,
                morale:70,

                transferListed:false,
                askingPrice:null

              });

            }
          );

        };


      addPlayers(
        roster.G,
        "MV"
      );

      addPlayers(
        roster.D,
        "B"
      );

      addPlayers(
        roster.F,
        "F"
      );


      clubRosters[clubName] =
        players;

    }
  );


  return clubRosters;

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
  !state.clubRosters ||
  Object.keys(state.clubRosters).length === 0
){
  state.clubRosters = createClubRosters();
}
if(
  !state.managerClub
){
  state.managerClub = "HV71";
}
syncManagerRoster();
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

return managerRoster().filter(
    p=>p.pos!=="MV" && p.pos!=="B"
  );

}


function defenders(){

return managerRoster().filter(
    p=>p.pos==="B"
  );

}


function goalies(){

return managerRoster().filter(
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

  if(m.period === 4){
    overtimeStep();
    return;
  }
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

  const hvPlayer =
    weightedPlayer("center");

  const oppPlayer =
    getRandomOpponentForward(m.opponent);

  const hvWins=
    Math.random()<.51;

  if(hvWins){

    m.faceoffsHV++;

    addEvent(
      `${hvPlayer.name} vinner tekningen mot ${oppPlayer}.`
    );

  }else{

    m.faceoffsOpp++;

    addEvent(
      `${oppPlayer} vinner tekningen mot ${hvPlayer.name}.`
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

  const m = state.live;

  addEvent(
    "Straffläggning börjar.",
    "period"
  );

  let hvGoals = 0;
  let oppGoals = 0;

  let hvTaken = 0;
  let oppTaken = 0;

  // Första 5 straffarna per lag
  for(let i = 1; i <= 5; i++){

    const hvScores = Math.random() < 0.52;
    hvTaken++;

    if(hvScores){
      hvGoals++;

      addEvent(
        `HV71 straff ${i}: MÅL!`,
        "goal"
      );
    }else{
      addEvent(
        `HV71 straff ${i}: miss.`,
        "chance"
      );
    }

    // Motståndaren kan inte längre komma ikapp
    const oppRemaining = 5 - oppTaken;

    if(hvGoals > oppGoals + oppRemaining){
      break;
    }

    const oppScores = Math.random() < 0.48;
    oppTaken++;

    if(oppScores){
      oppGoals++;

      addEvent(
        `${m.opponent} straff ${i}: MÅL!`,
        "goal"
      );
    }else{
      addEvent(
        `${m.opponent} straff ${i}: miss.`,
        "chance"
      );
    }

    // HV71 kan inte längre komma ikapp
    const hvRemaining = 5 - hvTaken;

    if(oppGoals > hvGoals + hvRemaining){
      break;
    }
  }

  // Sudden death om lika efter grundomgången
  let suddenRound = 1;

  while(hvGoals === oppGoals){

    addEvent(
      `Sudden death-straffar, omgång ${suddenRound}.`,
      "period"
    );

    const hvScores = Math.random() < 0.52;

    if(hvScores){
      hvGoals++;

      addEvent(
        "HV71: MÅL!",
        "goal"
      );
    }else{
      addEvent(
        "HV71: miss.",
        "chance"
      );
    }

    const oppScores = Math.random() < 0.48;

    if(oppScores){
      oppGoals++;

      addEvent(
        `${m.opponent}: MÅL!`,
        "goal"
      );
    }else{
      addEvent(
        `${m.opponent}: miss.`,
        "chance"
      );
    }

    suddenRound++;
  }

  if(hvGoals > oppGoals){

    m.hv++;

    addEvent(
      `HV71 vinner straffläggningen ${hvGoals}-${oppGoals}.`,
      "goal"
    );

  }else{

    m.opp++;

    addEvent(
      `${m.opponent} vinner straffläggningen ${oppGoals}-${hvGoals}.`,
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


const hv =
  team(
    managerClub()
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
    `${managerClub()} ${m.hv}–${m.opp} ${m.opponent}`
  );


state.news.unshift(
  hvWin
    ? `${managerClub()} besegrade ${m.opponent} med ${m.hv}-${m.opp}.`
    : `${managerClub()} föll mot ${m.opponent} med ${m.hv}-${m.opp}.`
);


  state.money+=
    Math.round(
      state.fans*220
    )-
    300000;

const hvGames = state.schedule.filter(
  game => game.home === managerClub() || game.away === managerClub()
);

const scheduleGame = hvGames[state.round - 1];

if (scheduleGame) {
  scheduleGame.played = true;

if(game.home === managerClub()){
    scheduleGame.homeGoals = m.hv;
    scheduleGame.awayGoals = m.opp;
  } else {
    scheduleGame.homeGoals = m.opp;
    scheduleGame.awayGoals = m.hv;
  }
}

simulateOtherGames();

state.round++;


managerRoster().forEach(
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

const clubName = managerClub();

   const roster = managerRoster();

const clubGames = state.schedule.filter(
  game => game.home === clubName || game.away === clubName
);
  const nextGame =
    clubGames.find(game => !game.played);

  const playedGames =
    clubGames
      .filter(game => game.played)
      .slice(-5)
      .reverse();

  const upcomingGames =
    clubGames
      .filter(game => !game.played)
      .slice(0, 4);

const topPlayers =
  [...roster]
      .sort(
        (a,b) =>
          ((b.goals || 0) + (b.assists || 0)) -
          ((a.goals || 0) + (a.assists || 0))
      )
      .slice(0,5);

  const avgMorale =
    roster.length
      ? Math.round(
          roster.reduce(
            (sum,p) => sum + (p.morale || 70),
            0
          ) / roster.length
        )
      : state.morale || 70;

  const avgFatigue =
    roster.length
      ? Math.round(
          roster.reduce(
            (sum,p) => sum + (p.fatigue || 0),
            0
          ) / roster.length
        )
      : 0;


  let nextOpponent = "Ingen match";

  let nextPlace = "";

  if(nextGame){

const isHome =
  nextGame.home === clubName;

    nextOpponent =
      isHome
        ? nextGame.away
        : nextGame.home;

    nextPlace =
      isHome
        ? "Hemma"
        : "Borta";

  }


  const latestResult =
    playedGames.length
      ? playedGames[0]
      : null;


  const resultText = game => {

    if(!game){
      return "Ingen match spelad";
    }

    return `${game.home} ${game.homeGoals}–${game.awayGoals} ${game.away}`;

  };


  const upcomingHTML =
    upcomingGames.length
      ? upcomingGames.map(game => {

          const isHome =
           game.home === clubName

          const opponent =
            isHome
              ? game.away
              : game.home;

          return `
            <div class="overview-fixture">

              <div class="fixture-round">
                Omgång ${game.round}
              </div>

              <div class="fixture-main">

                <strong>
                  ${opponent}
                </strong>

                <span>
                  ${isHome ? "Hemma" : "Borta"}
                </span>

              </div>

              <button
                class="overview-small-button"
                onclick="
                  state.page='schedule';
                  render();
                "
              >
                ›
              </button>

            </div>
          `;

        }).join("")
      : `
          <div class="overview-empty">
            Inga kommande matcher
          </div>
        `;


  const resultsHTML =
    playedGames.length
      ? playedGames.map(game => {

          const hvHome =
           game.home === clubName

          const hvGoals =
            hvHome
              ? game.homeGoals
              : game.awayGoals;

          const oppGoals =
            hvHome
              ? game.awayGoals
              : game.homeGoals;

          const opponent =
            hvHome
              ? game.away
              : game.home;

          const resultClass =
            hvGoals > oppGoals
              ? "win"
              : hvGoals < oppGoals
                ? "loss"
                : "draw";

          return `
            <div class="overview-result">

              <span class="result-dot ${resultClass}">
              </span>

              <div>

                <strong>
                  ${opponent}
                </strong>

                <span>
                  ${hvHome ? "Hemma" : "Borta"}
                </span>

              </div>

              <b>
                ${hvGoals}–${oppGoals}
              </b>

            </div>
          `;

        }).join("")
      : `
          <div class="overview-empty">
            Ingen match spelad ännu
          </div>
        `;


  const playersHTML =
    topPlayers.map((player,index) => {

      const points =
        (player.goals || 0) +
        (player.assists || 0);

      return `
        <div class="overview-player">

          <div class="player-rank">
            ${index + 1}
          </div>

          <div class="player-info">

            <strong>
              ${player.name}
            </strong>

            <span>
              ${player.pos}
            </span>

          </div>

          <div class="player-points">

            <b>
              ${points}
            </b>

            <span>
              P
            </span>

          </div>

        </div>
      `;

    }).join("");


  const newsHTML =
    state.news && state.news.length
      ? state.news
          .slice(0,5)
          .map((news,index) => `

            <div class="overview-news-item">

              <div class="news-marker">
                ${index === 0 ? "!" : "•"}
              </div>

              <span>
                ${news}
              </span>

            </div>

          `).join("")
      : `
          <div class="overview-empty">
            Inga nya meddelanden
          </div>
        `;


  return `

    <div class="overview-page">


      <!-- RUBRIK -->

      <div class="overview-heading">

        <div>

          <span class="overview-kicker">
            MANAGERÖVERSIKT
          </span>

          <h1>
          ${clubName}
          </h1>

          <p>
            Säsong 2026/27 · Omgång ${state.round}
          </p>

        </div>


        <div class="overview-heading-status">

          <span>
            Lagmoral
          </span>

          <strong>
            ${avgMorale}%
          </strong>

        </div>

      </div>



      <!-- HUVUDGRID -->

      <div class="overview-layout">


        <!-- VÄNSTER / MITTEN -->

        <div class="overview-main-column">


          <!-- NÄSTA MATCH -->

          <section class="dashboard-panel next-match-panel">

            <div class="panel-header">

              <div>

                <span class="panel-label">
                  NÄSTA MATCH
                </span>

                <h2>
                  Omgång ${nextGame ? nextGame.round : state.round}
                </h2>

              </div>

              <span class="match-location">
                ${nextPlace}
              </span>

            </div>


            <div class="next-match-teams">

              <div class="next-team">

                <div class="team-badge hv-badge">
                  HV
                </div>

                <strong>
                ${clubName}
                </strong>

              </div>


              <div class="versus">

                <span>
                  VS
                </span>

              </div>


              <div class="next-team">

                <div class="team-badge opponent-badge">
                  ${nextOpponent.substring(0,2).toUpperCase()}
                </div>

                <strong>
                  ${nextOpponent}
                </strong>

              </div>

            </div>


            <div class="next-match-actions">

              <button
                class="btn"
                onclick="
                  state.page='match';
                  render();
                "
              >
                Till match
              </button>

              <button
                class="btn secondary"
                onclick="
                  state.page='lines';
                  render();
                "
              >
                Se kedjor
              </button>

            </div>

          </section>



          <!-- STATUS -->

          <div class="overview-stats-row">

            <div class="overview-stat-card">

              <span>
                LAGMORAL
              </span>

              <strong>
                ${avgMorale}%
              </strong>

              <small>
                ${avgMorale >= 75 ? "Bra stämning" : "Kan förbättras"}
              </small>

            </div>


            <div class="overview-stat-card">

              <span>
                TRÖTTHET
              </span>

              <strong>
                ${avgFatigue}%
              </strong>

              <small>
                Truppsnitt
              </small>

            </div>


            <div class="overview-stat-card">

              <span>
                EKONOMI
              </span>

              <strong>
            money(state.money)
              </strong>

              <small>
                Klubbkassa
              </small>

            </div>


            <div class="overview-stat-card">

              <span>
                SUPPORTERS
              </span>

              <strong>
                ${state.fans || 0}
              </strong>

              <small>
                Registrerade
              </small>

            </div>

          </div>



          <!-- NYHETER -->

          <section class="dashboard-panel">

            <div class="panel-header">

              <div>

                <span class="panel-label">
                  INKORG
                </span>

                <h2>
                  Senaste nytt
                </h2>

              </div>

              <button
                class="overview-link-button"
                onclick="
                  state.page='news';
                  render();
                "
              >
                Visa alla
              </button>

            </div>

            <div class="overview-news-list">
              ${newsHTML}
            </div>

          </section>



          <!-- SENASTE RESULTAT -->

          <section class="dashboard-panel">

            <div class="panel-header">

              <div>

                <span class="panel-label">
                  FORM
                </span>

                <h2>
                  Senaste matcher
                </h2>

              </div>

              <span class="latest-result">
                ${resultText(latestResult)}
              </span>

            </div>

            <div class="overview-results">
              ${resultsHTML}
            </div>

          </section>

        </div>



        <!-- HÖGERKOLUMN -->

        <aside class="overview-side-column">


          <!-- KOMMANDE -->

          <section class="dashboard-panel">

            <div class="panel-header">

              <div>

                <span class="panel-label">
                  SPELSCHEMA
                </span>

                <h2>
                  Kommande
                </h2>

              </div>

            </div>

            <div>
              ${upcomingHTML}
            </div>

          </section>



          <!-- POÄNGLIGA -->

          <section class="dashboard-panel">

            <div class="panel-header">

              <div>

                <span class="panel-label">
                ${clubName}
                </span>

                <h2>
                  Poängliga
                </h2>

              </div>

              <button
                class="overview-link-button"
                onclick="
                  state.page='squad';
                  render();
                "
              >
                Trupp
              </button>

            </div>

            <div class="overview-player-list">
              ${playersHTML}
            </div>

          </section>



          <!-- SNABBVAL -->

          <section class="dashboard-panel">

            <div class="panel-header">

              <div>

                <span class="panel-label">
                  MANAGER
                </span>

                <h2>
                  Snabbval
                </h2>

              </div>

            </div>


            <div class="quick-actions">

              <button
                onclick="
                  state.page='squad';
                  render();
                "
              >
                <span>♟</span>
                Trupp
              </button>


              <button
                onclick="
                  state.page='lines';
                  render();
                "
              >
                <span>☷</span>
                Kedjor
              </button>


              <button
                onclick="
                  state.page='table';
                  render();
                "
              >
                <span>▥</span>
                SHL
              </button>


              <button
                onclick="
                  state.page='match';
                  render();
                "
              >
                <span>◆</span>
                Match
              </button>
<button
  onclick="
    state.page='clubSelect';
    render();
  "
>
  <span>◆</span>
  Välj klubb
</button>
            </div>

          </section>


        </aside>

      </div>

    </div>

  `;

}


/* =========================================================
   TRUPP
   ========================================================= */

function squadView(){

const players =
  [...managerRoster()]
      .sort((a,b)=>{
        const order = { MV:0, B:1, C:2, VF:3, HF:4 };

        return (
          (order[a.pos] ?? 9) -
          (order[b.pos] ?? 9)
        ) || b.overall - a.overall;
      });

  const goalies =
    players.filter(p=>p.pos==="MV").length;

  const defendersCount =
    players.filter(p=>p.pos==="B").length;

  const forwardsCount =
    players.filter(
      p=>p.pos!=="MV" && p.pos!=="B"
    ).length;

  const avgOverall =
    Math.round(
      players.reduce(
        (sum,p)=>sum+p.overall,
        0
      ) / players.length
    );

  const rows =
    players.map(p=>{

      const points =
        (p.goals || 0) +
        (p.assists || 0);

      const condition =
        Math.max(
          0,
          Math.round(
            100 - (p.fatigue || 0)
          )
        );

      const conditionClass =
        condition >= 80
          ? "good"
          : condition >= 55
            ? "medium"
            : "bad";

      return `
        <div
          class="squad-row"
          onclick="
            state.selectedPlayer=${p.id};
            state.page='player';
            render();
          "
        >

          <div class="squad-player-main">

            <div class="squad-position">
              ${p.pos}
            </div>

            <div class="squad-player-name">

              <strong>
                ${p.name}
              </strong>

              <span>
                ${p.pos === "MV"
                  ? "Målvakt"
                  : p.pos === "B"
                    ? "Back"
                    : "Forward"
                }
              </span>

            </div>

          </div>


          <div class="squad-cell">
            <strong>
              ${p.overall}
            </strong>

            <span>
              OVR
            </span>
          </div>


          <div class="squad-cell">
            <strong>
              ${p.goals || 0}
            </strong>

            <span>
              Mål
            </span>
          </div>


          <div class="squad-cell">
            <strong>
              ${p.assists || 0}
            </strong>

            <span>
              Assist
            </span>
          </div>


          <div class="squad-cell">
            <strong>
              ${points}
            </strong>

            <span>
              Poäng
            </span>
          </div>


          <div class="squad-cell">

            <div class="condition-value ${conditionClass}">
              ${condition}%
            </div>

            <span>
              Kondition
            </span>

          </div>


          <div class="squad-arrow">
            ›
          </div>

        </div>
      `;

    }).join("");


  return `

    <div class="squad-page">


      <div class="page-heading">

        <div>

          <span class="overview-kicker">
            LAG
          </span>

          <h1>
            HV71 – Trupp
          </h1>

          <p>
            Säsong 2026/27
          </p>

        </div>

      </div>


      <div class="squad-summary">

        <div class="overview-stat-card">

          <span>
            SPELARE
          </span>

          <strong>
            ${players.length}
          </strong>

          <small>
            A-lag
          </small>

        </div>


        <div class="overview-stat-card">

          <span>
            MÅLVAKTER
          </span>

          <strong>
            ${goalies}
          </strong>

          <small>
            I truppen
          </small>

        </div>


        <div class="overview-stat-card">

          <span>
            BACKAR
          </span>

          <strong>
            ${defendersCount}
          </strong>

          <small>
            I truppen
          </small>

        </div>


        <div class="overview-stat-card">

          <span>
            FORWARDS
          </span>

          <strong>
            ${forwardsCount}
          </strong>

          <small>
            I truppen
          </small>

        </div>


        <div class="overview-stat-card">

          <span>
            SNITT OVR
          </span>

          <strong>
            ${avgOverall}
          </strong>

          <small>
            Lagstyrka
          </small>

        </div>

      </div>


      <section class="dashboard-panel squad-panel">

        <div class="panel-header">

          <div>

            <span class="panel-label">
              SPELARTRUPP
            </span>

            <h2>
              A-lag
            </h2>

          </div>

          <button
            class="overview-link-button"
            onclick="
              state.page='lines';
              render();
            "
          >
            Visa kedjor
          </button>

        </div>


        <div class="squad-table-header">

          <div>
            Spelare
          </div>

          <div>
            OVR
          </div>

          <div>
            Mål
          </div>

          <div>
            Assist
          </div>

          <div>
            Poäng
          </div>

          <div>
            Kondition
          </div>

          <div>
          </div>

        </div>


        <div class="squad-list">
          ${rows}
        </div>

      </section>

    </div>

  `;

}
function toggleTransferStatus(playerId){

  const player =
    state.roster.find(
      p => p.id === playerId
    );

  if(!player){
    return;
  }

  player.transferListed =
    !player.transferListed;

  if(player.transferListed){

    player.askingPrice =
      player.value;

    state.news.unshift(
      `${player.name} har placerats på transferlistan.`
    );

  }else{

    player.askingPrice = null;

    state.news.unshift(
      `${player.name} har tagits bort från transferlistan.`
    );

  }

  save();
  render();
}
function playerView(){

  const player =
    state.roster.find(
      p => p.id === state.selectedPlayer
    );

  if(!player){
    return `
      <section class="card">
        <h2>Spelare hittades inte</h2>

        <button
          class="btn"
          onclick="
            state.page='squad';
            render();
          "
        >
          Tillbaka till truppen
        </button>
      </section>
    `;
  }

  const points =
    (player.goals || 0) +
    (player.assists || 0);

  const condition =
    Math.max(
      0,
      Math.round(
        100 - (player.fatigue || 0)
      )
    );

  const positionName =
    player.pos === "MV"
      ? "Målvakt"
      : player.pos === "B"
        ? "Back"
        : player.pos === "C"
          ? "Center"
          : player.pos === "VF"
            ? "Vänsterforward"
            : player.pos === "HF"
              ? "Högerforward"
              : "Forward";

  const nationalityNames = {
    SWE:"Sverige",
    FIN:"Finland",
    CAN:"Kanada",
    CZE:"Tjeckien",
    USA:"USA",
    NOR:"Norge"
  };

  const nationality =
    nationalityNames[player.nationality]
    || player.nationality
    || "-";

  const role =
    player.overall >= 82
      ? "Nyckelspelare"
      : player.overall >= 79
        ? "Ordinarie"
        : player.overall >= 75
          ? "Rotation"
          : "Breddspelare";

  const formatCurrency = value =>
    `${Math.round(value || 0).toLocaleString("sv-SE")} kr`;

  return `

    <div class="player-page">

      <button
        class="player-back-button"
        onclick="
          state.page='squad';
          render();
        "
      >
        ← Tillbaka till truppen
      </button>


      <section class="player-hero player-hero-expanded">

        <div class="player-identity">

          <div class="player-number">
            ${player.pos}
          </div>

          <div>

            <span class="overview-kicker">
              HV71
            </span>

            <h1>
              ${player.name}
            </h1>

            <div class="player-meta-line">
              <span>${positionName}</span>
              <span>•</span>
              <span>${player.age} år</span>
              <span>•</span>
              <span>${nationality}</span>
            </div>

            <div class="player-role-badge">
              ${role}
            </div>
${
  player.transferListed
    ? `
      <div class="player-transfer-badge">
        TRANSFERLISTAD
      </div>
    `
    : ""
}
          </div>

        </div>


        <div class="player-hero-right">

          <div class="player-contract-mini">

            <div>
              <span>Kontrakt</span>
              <strong>${player.contractYears} år</strong>
            </div>

            <div>
              <span>Lön</span>
              <strong>${formatCurrency(player.salary)}</strong>
            </div>

            <div>
              <span>Marknadsvärde</span>
              <strong>${formatCurrency(player.value)}</strong>
            </div>

          </div>


          <div class="player-overall">

            <span>
              OVR
            </span>

            <strong>
              ${player.overall}
            </strong>

          </div>

        </div>

      </section>


      <div class="player-dashboard">


        <section class="dashboard-panel">

          <div class="panel-header">

            <div>

              <span class="panel-label">
                SPELARATTRIBUT
              </span>

              <h2>
                Egenskaper
              </h2>

            </div>

          </div>


          <div class="player-attributes">

            <div class="player-attribute">
              <span>Skott</span>
              <strong>${player.shooting ?? "-"}</strong>
            </div>

            <div class="player-attribute">
              <span>Passningar</span>
              <strong>${player.passing ?? "-"}</strong>
            </div>

            <div class="player-attribute">
              <span>Försvar</span>
              <strong>${player.defense ?? "-"}</strong>
            </div>

            <div class="player-attribute">
              <span>Fysik</span>
              <strong>${player.physical ?? "-"}</strong>
            </div>

          </div>

        </section>


        <section class="dashboard-panel">

          <div class="panel-header">

            <div>

              <span class="panel-label">
                KONTRAKT
              </span>

              <h2>
                Klubbstatus
              </h2>

            </div>

          </div>


          <div class="player-contract-grid">

            <div>
              <span>Roll</span>
              <strong>${role}</strong>
            </div>

            <div>
              <span>Kontrakt kvar</span>
              <strong>${player.contractYears} år</strong>
            </div>

            <div>
              <span>Årslön</span>
              <strong>${formatCurrency(player.salary)}</strong>
            </div>

            <div>
              <span>Marknadsvärde</span>
              <strong>${formatCurrency(player.value)}</strong>
            </div>
${
  player.transferListed
    ? `
      <div>
        <span>Begärt pris</span>
        <strong>
          ${formatCurrency(player.askingPrice)}
        </strong>
      </div>
    `
    : ""
}
          </div>


          <div class="player-actions">

            <button class="btn secondary">
              Kontrakt
            </button>

<button
  class="btn secondary"
  onclick="toggleTransferStatus(${player.id})"
>
  ${
    player.transferListed
      ? "Ta bort från transferlista"
      : "Transferlista spelaren"
  }
</button>

            <button class="btn secondary">
              Historik
            </button>

          </div>

        </section>


        <section class="dashboard-panel">

          <div class="panel-header">

            <div>

              <span class="panel-label">
                SÄSONG 2026/27
              </span>

              <h2>
                Statistik
              </h2>

            </div>

          </div>


          <div class="player-stats-grid">

            <div>
              <span>Matcher</span>
              <strong>${player.games || 0}</strong>
            </div>

            <div>
              <span>Mål</span>
              <strong>${player.goals || 0}</strong>
            </div>

            <div>
              <span>Assist</span>
              <strong>${player.assists || 0}</strong>
            </div>

            <div>
              <span>Poäng</span>
              <strong>${points}</strong>
            </div>

            <div>
              <span>Skott</span>
              <strong>${player.shots || 0}</strong>
            </div>

            <div>
              <span>Utvisningsminuter</span>
              <strong>${player.pim || 0}</strong>
            </div>

          </div>

        </section>


        <section class="dashboard-panel">

          <div class="panel-header">

            <div>

              <span class="panel-label">
                STATUS
              </span>

              <h2>
                Form & fysisk status
              </h2>

            </div>

          </div>


          <div class="player-status-grid">

            <div>
              <span>Kondition</span>
              <strong>${condition}%</strong>
            </div>

            <div>
              <span>Form</span>
              <strong>${player.form || 0}</strong>
            </div>

            <div>
              <span>Moral</span>
              <strong>${player.morale || 70}</strong>
            </div>

          </div>

        </section>


      </div>

    </div>

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
function getTransferMarketPlayers(){

  const myClub =
    managerClub();

  const players = [];

  Object.entries(
    state.clubRosters || {}
  ).forEach(
    ([clubName, roster]) => {

      if(clubName === myClub){
        return;
      }

      (roster || []).forEach(player => {

        players.push({
          ...player,
          team: clubName
        });

      });

    }
  );

  return players.sort(
    (a,b) =>
      b.overall - a.overall
  );

}
function getPlayerClub(playerId){

  for(const [clubName, roster] of Object.entries(state.clubRosters || {})){

    if(roster.some(player => player.id === playerId)){
      return clubName;
    }

  }

  return null;

}


function findPlayerAnywhere(playerId){

  for(const roster of Object.values(state.clubRosters || {})){

    const player =
      roster.find(p => p.id === playerId);

    if(player){
      return player;
    }

  }

  return null;

}


function calculateTransferPrice(player){

  if(!player){
    return 0;
  }

  const baseValue =
    player.value || 1000000;

  const contractMultiplier =
    1 + ((player.contractYears || 1) * 0.08);

  const potentialBonus =
    Math.max(
      0,
      (player.potential || player.overall) -
      player.overall
    ) * 0.04;

  return Math.round(
    baseValue *
    contractMultiplier *
    (1 + potentialBonus)
  );

}


function submitTransferBid(playerId, amount){

  const player =
    findPlayerAnywhere(playerId);

  if(!player){
    return;
  }

  const sellingClub =
    getPlayerClub(playerId);

  const buyingClub =
    managerClub();

  if(
    !sellingClub ||
    sellingClub === buyingClub
  ){
    return;
  }

  amount =
    Math.round(Number(amount) || 0);

  const askingPrice =
    player.askingPrice ||
    calculateTransferPrice(player);

  if(amount <= 0){
    return;
  }

  if(amount > state.money){

    state.news.unshift(
      `Budet på ${player.name} kunde inte läggas. Klubben saknar pengar.`
    );

    save();
    render();
    return;
  }

  const acceptanceLimit =
    askingPrice * 0.92;

  if(amount >= acceptanceLimit){

    completeTransfer(
      playerId,
      sellingClub,
      buyingClub,
      amount
    );

    return;
  }

  state.news.unshift(
    `${sellingClub} avslog budet på ${player.name}.`
  );

  save();
  render();

}


function completeTransfer(
  playerId,
  sellingClub,
  buyingClub,
  amount
){

  const sellingRoster =
    state.clubRosters[sellingClub];

  const playerIndex =
    sellingRoster.findIndex(
      player => player.id === playerId
    );

  if(playerIndex === -1){
    return;
  }

  const [player] =
    sellingRoster.splice(playerIndex,1);

  player.club =
    buyingClub;

  player.transferListed =
    false;

  player.askingPrice =
    null;

  player.morale =
    Math.max(
      70,
      player.morale || 70
    );

  state.clubRosters[buyingClub].push(player);

  if(buyingClub === managerClub()){

    state.money -= amount;

  }

  state.news.unshift(
    `${buyingClub} värvade ${player.name} från ${sellingClub} för ${amount.toLocaleString("sv-SE")} kr.`
  );

  syncManagerRoster();

  save();
  render();

}
function transfersView(){
const marketPlayers = getTransferMarketPlayers();

const selectedPosition =
  state.transferPosition || "ALL";

const selectedTeam =
  state.transferTeam || "ALL";

const selectedMinOverall =
  Number(state.transferMinOverall || 0);


const filteredMarketPlayers =
  marketPlayers.filter(player => {

    if(
      selectedPosition !== "ALL" &&
      player.pos !== selectedPosition
    ){
      return false;
    }

    if(
      selectedTeam !== "ALL" &&
      player.team !== selectedTeam
    ){
      return false;
    }

    if(
      player.overall < selectedMinOverall
    ){
      return false;
    }

    return true;

  });
  const listedPlayers =
    state.roster.filter(
      p => p.transferListed
    );

  const listedHTML =
    listedPlayers.length
      ? listedPlayers.map(player => `
          <div
            class="transfer-player-row"
            onclick="
              state.selectedPlayer=${player.id};
              state.page='player';
              render();
            "
          >

            <div>
              <strong>
                ${player.name}
              </strong>

              <span>
                ${player.pos} · OVR ${player.overall}
              </span>
            </div>

            <div>
              <span>
                Marknadsvärde
              </span>

              <strong>
                ${Math.round(player.value || 0).toLocaleString("sv-SE")} kr
              </strong>
            </div>

            <div>
              <span>
                Begärt pris
              </span>

              <strong>
                ${Math.round(player.askingPrice || 0).toLocaleString("sv-SE")} kr
              </strong>
            </div>

            <div class="transfer-row-arrow">
              ›
            </div>

          </div>
        `).join("")
      : `
          <div class="transfer-empty">
            Inga spelare är transferlistade.
          </div>
        `;

  return `

    <div class="transfers-page">

      <div class="page-heading">

        <div>

          <span class="overview-kicker">
            SPORT
          </span>

          <h1>
            Transfers
          </h1>

          <p>
            Hantera försäljningar och bevaka transfermarknaden.
          </p>

        </div>

      </div>


      <div class="transfer-grid">


        <section class="dashboard-panel">

          <div class="panel-header">

            <div>

              <span class="panel-label">
                HV71
              </span>

              <h2>
                Mina transferlistade
              </h2>

            </div>

          </div>

          <div class="transfer-player-list">
            ${listedHTML}
          </div>

        </section>


<section class="dashboard-panel">

  <div class="panel-header">

    <div>

      <span class="panel-label">
        MARKNAD
      </span>

      <h2>
        Transfermarknad
      </h2>

    </div>

  </div>
<div class="transfer-filters">

  <div class="transfer-filter">

    <label>
      Position
    </label>

    <select
      onchange="
        state.transferPosition=this.value;
        render();
      "
    >

      <option
        value="ALL"
        ${selectedPosition==="ALL" ? "selected" : ""}
      >
        Alla positioner
      </option>

      <option
        value="MV"
        ${selectedPosition==="MV" ? "selected" : ""}
      >
        Målvakter
      </option>

      <option
        value="B"
        ${selectedPosition==="B" ? "selected" : ""}
      >
        Backar
      </option>

      <option
        value="F"
        ${selectedPosition==="F" ? "selected" : ""}
      >
        Forwards
      </option>

    </select>

  </div>


  <div class="transfer-filter">

    <label>
      Lag
    </label>

    <select
      onchange="
        state.transferTeam=this.value;
        render();
      "
    >

      <option
        value="ALL"
        ${selectedTeam==="ALL" ? "selected" : ""}
      >
        Alla lag
      </option>

      ${
        Object.keys(TEAM_ROSTERS)
          .filter(team => team !== "HV71")
          .sort()
          .map(team => `
            <option
              value="${team}"
              ${selectedTeam===team ? "selected" : ""}
            >
              ${team}
            </option>
          `)
          .join("")
      }

    </select>

  </div>


  <div class="transfer-filter">

    <label>
      Minsta OVR
    </label>

    <select
      onchange="
        state.transferMinOverall=Number(this.value);
        render();
      "
    >

      <option
        value="0"
        ${selectedMinOverall===0 ? "selected" : ""}
      >
        Alla
      </option>

      <option
        value="70"
        ${selectedMinOverall===70 ? "selected" : ""}
      >
        70+
      </option>

      <option
        value="75"
        ${selectedMinOverall===75 ? "selected" : ""}
      >
        75+
      </option>

      <option
        value="80"
        ${selectedMinOverall===80 ? "selected" : ""}
      >
        80+
      </option>

      <option
        value="83"
        ${selectedMinOverall===83 ? "selected" : ""}
      >
        83+
      </option>

    </select>

  </div>

</div>
  <div class="transfer-market-list">

    ${
      filteredMarketPlayers
        .slice(0,30)
        .map(player => `
        <div
  class="market-player-row"
  onclick="
    state.selectedMarketPlayer='${player.id}';
    state.page='marketPlayer';
    render();
  "
>

            <div>
              <strong>
                ${player.name}
              </strong>

              <span>
                ${player.team}
              </span>
            </div>

            <div>
              <span>
                Position
              </span>

              <strong>
                ${player.pos}
              </strong>
            </div>

            <div>
              <span>
                OVR
              </span>

              <strong>
                ${player.overall}
              </strong>
            </div>

            <div>
              <span>
                Värde
              </span>

              <strong>
                ${Math.round(player.value).toLocaleString("sv-SE")} kr
              </strong>
            </div>

          </div>
        `)
        .join("")
    }

  </div>

</section>


      </div>

    </div>

  `;

}
function marketPlayerView(){

  const marketPlayers =
    getTransferMarketPlayers();

  const player =
    marketPlayers.find(
      p => p.id === state.selectedMarketPlayer
    );

  if(!player){

    return `
      <section class="card">

        <h2>
          Spelare hittades inte
        </h2>

        <button
          class="btn"
          onclick="
            state.page='transfers';
            render();
          "
        >
          Tillbaka till Transfers
        </button>

      </section>
    `;

  }


  return `

    <div class="player-page">

      <button
        class="player-back-button"
        onclick="
          state.page='transfers';
          render();
        "
      >
        ← Tillbaka till Transfers
      </button>


      <section class="player-hero player-hero-expanded">

        <div class="player-identity">

          <div class="player-number">
            ${player.pos}
          </div>

          <div>

            <span class="overview-kicker">
              ${player.team}
            </span>

            <h1>
              ${player.name}
            </h1>

            <div class="player-meta-line">
              <span>${player.pos}</span>
              <span>•</span>
              <span>${player.team}</span>
            </div>

            <div class="player-role-badge">
              EXTERN SPELARE
            </div>

          </div>

        </div>


        <div class="player-hero-right">

          <div class="player-contract-mini">

            <div>
              <span>Klubb</span>
              <strong>${player.team}</strong>
            </div>

            <div>
              <span>Marknadsvärde</span>
              <strong>
                ${Math.round(player.value).toLocaleString("sv-SE")} kr
              </strong>
            </div>

            <div>
              <span>Status</span>
              <strong>Under bevakning</strong>
            </div>

          </div>


          <div class="player-overall">

            <span>
              OVR
            </span>

            <strong>
              ${player.overall}
            </strong>

          </div>

        </div>

      </section>


      <div class="player-dashboard">


        <section class="dashboard-panel">

          <div class="panel-header">

            <div>

              <span class="panel-label">
                SPELARINFO
              </span>

              <h2>
                Översikt
              </h2>

            </div>

          </div>


          <div class="player-contract-grid">

            <div>
              <span>Namn</span>
              <strong>${player.name}</strong>
            </div>

            <div>
              <span>Lag</span>
              <strong>${player.team}</strong>
            </div>

            <div>
              <span>Position</span>
              <strong>${player.pos}</strong>
            </div>

            <div>
              <span>OVR</span>
              <strong>${player.overall}</strong>
            </div>

            <div>
              <span>Marknadsvärde</span>
              <strong>
                ${Math.round(player.value).toLocaleString("sv-SE")} kr
              </strong>
            </div>

          </div>

        </section>


        <section class="dashboard-panel">

          <div class="panel-header">

            <div>

              <span class="panel-label">
                TRANSFER
              </span>

              <h2>
                Åtgärder
              </h2>

            </div>

          </div>


          <div class="player-actions">
          ${
  state.transferBidPlayer === player.id
    ? `
      <div class="transfer-bid-box">

        <div>
          <span>Rekommenderat bud</span>
          <strong>
            ${calculateTransferPrice(player).toLocaleString("sv-SE")} kr
          </strong>
        </div>

        <input
          type="number"
          value="${state.transferBidAmount || calculateTransferPrice(player)}"
          oninput="
            state.transferBidAmount=Number(this.value);
          "
        >

        <div class="transfer-bid-actions">

          <button
            class="btn"
            onclick="
              submitTransferBid(
                '${player.id}',
                state.transferBidAmount
              );
              state.transferBidPlayer=null;
            "
          >
            Skicka bud
          </button>

          <button
            class="btn secondary"
            onclick="
              state.transferBidPlayer=null;
              render();
            "
          >
            Avbryt
          </button>

        </div>

      </div>
    `
    : ""
}

<button
  class="btn"
  onclick="
    state.transferBidPlayer='${player.id}';
    state.transferBidAmount=calculateTransferPrice(
      findPlayerAnywhere('${player.id}')
    );
    render();
  "
>
  Lägg bud
</button>

            <button
              class="btn secondary"
            >
              Scouta spelaren
            </button>

            <button
              class="btn secondary"
              onclick="
                state.page='transfers';
                render();
              "
            >
              Tillbaka
            </button>

          </div>

        </section>


      </div>

    </div>

  `;

}
function startCareerWithClub(clubName){

  if(
    !clubName ||
    !CLUB_DATA[clubName]
  ){
    return;
  }

  const freshState = newState();

  freshState.managerClub = clubName;

  freshState.roster =
    freshState.clubRosters[clubName]
      .map(player => ({
        ...player
      }));

  freshState.money =
    CLUB_DATA[clubName].budget;

  freshState.fans =
    CLUB_DATA[clubName].fans;

  freshState.news = [
    `Välkommen som huvudtränare för ${clubName}.`,
    `Styrelsens förväntan: ${CLUB_DATA[clubName].boardExpectation}.`
  ];

  freshState.page = "home";

  state = freshState;

  syncManagerRoster();

  save();
  render();

}
function clubSelectView(){

  const clubs =
    Object.values(CLUB_DATA)
      .sort(
        (a,b) =>
          b.reputation - a.reputation
      );

  const clubCards =
    clubs.map(club => {

      const roster =
        state.clubRosters?.[club.name] || [];

      return `

        <div class="club-select-card">

          <div class="club-select-badge">
            ${club.name.substring(0,2).toUpperCase()}
          </div>

          <div class="club-select-info">

            <h2>
              ${club.name}
            </h2>

            <span>
              SHL
            </span>

          </div>


          <div class="club-select-stats">

            <div>
              <span>Styrka</span>
              <strong>${club.strength}</strong>
            </div>

            <div>
              <span>Spelare</span>
              <strong>${roster.length}</strong>
            </div>

            <div>
              <span>Budget</span>
              <strong>
                ${Math.round(club.budget).toLocaleString("sv-SE")} kr
              </strong>
            </div>

            <div>
              <span>Styrelsens krav</span>
              <strong>
                ${club.boardExpectation}
              </strong>
            </div>

          </div>


          <button
            class="btn secondary"
            onclick="
              state.selectedClub='${club.name}';
              render();
            "
          >
            ${
              state.selectedClub === club.name
                ? "Valt lag"
                : "Välj lag"
            }
          </button>

        </div>

      `;

    }).join("");


  return `

    <div class="club-select-page">

      <div class="page-heading">

        <div>

          <span class="overview-kicker">
            NY KARRIÄR
          </span>

          <h1>
            Välj klubb
          </h1>

          <p>
            Välj vilket SHL-lag du vill leda under säsongen 2026/27.
          </p>

        </div>

      </div>


      <div class="club-select-grid">
        ${clubCards}
      </div>


      ${
        state.selectedClub
          ? `
            <div class="club-select-footer">

              <div>

                <span>
                  Vald klubb
                </span>

                <strong>
                  ${state.selectedClub}
                </strong>

              </div>

<button
  class="btn"
  onclick="
    startCareerWithClub(state.selectedClub);
  "
>
  Starta karriär med ${state.selectedClub}
</button>

            </div>
          `
          : ""
      }

    </div>

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
   
state.page==="clubSelect"
   
  ? clubSelectView()

: state.page==="home"

  ? homeView()

  : state.page==="squad"

  ? squadView()
   
: state.page==="player"
   
  ? playerView()
   
   : state.page==="transfers"
   
  ? transfersView()

   : state.page==="marketPlayer"
   
  ? marketPlayerView()
   
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
 "[data-page]"
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
"[data-page]"
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
