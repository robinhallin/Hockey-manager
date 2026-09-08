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
            (25000000 + strength * 400000)
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

function getRandomOpponentForward(teamName){return rivalRandomSkater(teamName,'forward');}
function getRandomOpponentDefense(teamName){return rivalRandomSkater(teamName,'defense');}
function getRandomOpponentSkater(teamName){return rivalRandomSkater(teamName);}

/* =========================================================
   NY KARRIÄR
   ========================================================= */

registerLeagueClubs();

function newState(){

return {

    version:"0.2",

    careerStarted:false,

    managerClub:"HV71",

    page:"home",

    round:1,
    schedule:createSchedule(),
    morale:72,

    money:14500000,

    fans:6500,

    tactic:"balanced",

    tacticalPlan:{
      forecheck:"balanced",
      tempo:"normal",
      physicality:"balanced",
      lineUsage:"balanced"
    },

    roster:PLAYERS.map(p=>({...p})),

clubRosters: createClubRosters(),
playerDatabaseVersion: ALLSVENSKAN_DATABASE.version,

   transferOffers: [],

transferNegotiation: null,

contractNegotiation: null,

    history:[],

    news:[
      "Välkommen till HV71.",
      "Styrelsens mål är att nå slutspel."
    ],

    live:null,

    teams:leagueTeamRows().map(t=>({

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

const SQUAD_ROLES = [
  "Breddspelare",
  "Rotation",
  "Ordinarie",
  "Nyckelspelare"
];

function ensureManagementData(){

  Object.entries(state.clubRosters || {}).forEach(([clubName,roster]) => {

    const clubStrength = getClub(clubName)?.strength || 75;

    roster.forEach(player => {
      if(!player.potential){
        const ageBonus = player.age <= 21 ? 7 : player.age <= 24 ? 4 : player.age <= 27 ? 2 : 0;
        player.potential = Math.min(90, player.overall + ageBonus);
      }

      if(!player.squadRole){
        player.squadRole = player.overall >= clubStrength + 2
          ? "Nyckelspelare"
          : player.overall >= clubStrength - 1
            ? "Ordinarie"
            : player.overall >= clubStrength - 4
              ? "Rotation"
              : "Breddspelare";
      }

      if(!player.promisedRole) player.promisedRole = player.squadRole;
      if(player.recruitmentPromise&&['Breddspelare','Rotation'].includes(player.promisedRole))delete player.recruitmentPromise;
      if(typeof player.happiness !== "number") player.happiness = player.morale || 70;
      if(!player.developmentFocus) player.developmentFocus = "Balanserad";
      if(typeof player.developmentProgress !== "number") player.developmentProgress = 0;
      if(typeof player.games !== "number") player.games = 0;
    });
  });

}

function annualWageCost(){
  return loanWageCost(managerClub())+(state.juniors?.roster||[]).filter(p=>p.academy.seniorContract).reduce((sum,p)=>sum+(p.salary||0),0);
}

function wageBudget(){
  return (state.season?.phase==="preseason"?state.season.nextWageLimit:null) || state.boardPlan?.offer?.wageLimit || getClub()?.wageBudget || 35000000;
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


  for(const [name,,,strength] of ALLSVENSKAN_CLUBS)if(!clubRosters[name])clubRosters[name]=leagueRoster(name,strength);
  return haRemoveStartingDuplicates(clubRosters);

}
function createSchedule(membership=leagueInitial()){
  const groups=['SHL','HA'].map(id=>Object.keys(membership).filter(name=>membership[name]===id));
  return groups.flatMap(teams=>createLeagueSchedule(teams));
}
function createLeagueSchedule(teams){
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
 for(const game of state.schedule.filter(g=>g.round===state.round&&!g.played&&!g.seriesId&&g.home!==managerClub()&&g.away!==managerClub()))leagueBackground(game);
}
/* =========================================================
   LADDA / SPARA
   ========================================================= */

let state;

try{

  const saved=
    careerRead(
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
if(
  !Array.isArray(state.transferOffers)
){
  state.transferOffers = [];
}

if(
  !("transferNegotiation" in state)
){
  state.transferNegotiation = null;
}
if(typeof state.careerStarted!=="boolean")state.careerStarted=true;
if(state.live)state.live.running=false;
syncManagerRoster();
ensureManagementData();
if(!state.tacticalPlan){
  state.tacticalPlan={forecheck:"balanced",tempo:"normal",physicality:"balanced",lineUsage:"balanced"};
}
if(
  !Array.isArray(state.schedule) ||
  state.schedule.length === 0 ||
  state.schedule.some(game => typeof game.round !== "number")
){
  state.schedule = createSchedule();
}

let careerSaveError=false,careerSaveErrorCode="";
function renderSaveStatus(){
 const root=document.getElementById("save-status-root");if(!root)return;
 const detail=careerSaveErrorCode==='SecurityError'?'Webbläsaren blockerar lagring för spelet.':['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(careerSaveErrorCode)?'Webbläsarens sparutrymme räcker inte, även med komprimering.':'Karriären kunde inte sparas i webbläsaren.';
 root.innerHTML=careerSaveError?'<aside class="save-status-warning" role="alert"><strong>'+detail+'</strong><span>Matchen kan fortsätta, men ladda inte om eller stäng spelet innan du har laddat ner en sparfil.</span><button onclick="downloadCareer()">Ladda ner sparfil</button><button onclick="save()">Försök spara igen</button></aside>':'';
}
function save({normalize=true}={}){
  if(normalize){
  haRepairClubIdentity(state);
  ensureSeason();
  ensureAssessmentData();
  ensureLeagues();
  ensureLeagueStatistics();
  ensureLoans();
  ensureRecruitment();
  ensurePlayerWorld();
  ensureLocker();
  ensureMedical();
  ensureAnalysis();
  ensureCalendar();
  ensureTrainingData();
  ensureJuniors();
  ensureRivals();
  ensureRink();
  ensureClub();
  ensureManager();

  for(const roster of [...Object.values(state.clubRosters||{}),state.playerWorld?.freeAgents||[],state.juniors?.roster||[]])for(const p of roster)ensureDevelopment(p);

  }
  try{
    careerStore("hockey_manager_alpha02",JSON.stringify(state));
    careerSaveError=false;careerSaveErrorCode="";
  }catch(error){
    // A blocked/full store must never interrupt controls or the next match tick.
    // The previous saved career stays intact; the current state remains exportable.
    careerSaveError=true;careerSaveErrorCode=error?.name||"";
  }
  renderSaveStatus();
  return !careerSaveError;

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
    if(state.calendar?.active){const f=state.calendar.friendlies.find(f=>f.id===state.calendar.active);if(f)return f.opponent;}
    if(state.season && state.season.phase!=="regular"){const g=currentSeasonFixture();return g?(g.home===managerClub()?g.away:g.home):"Ingen match";}

    const clubName = managerClub();
    const clubGames = state.schedule.filter(
        game => game.home === clubName || game.away === clubName
    );

    const game = clubGames.find(game => !game.played);

    if(!game){
        return "Ingen match";
    }

    return game.home === clubName
        ? game.away
        : game.home;
}

function samePlayerId(a,b){

  if(a===b)return true;const x=String(a),y=String(b),aliases=state?.playerIdentityAliases;return (aliases?.[x]||x)===(aliases?.[y]||y);

}

function selectPlayer(playerId){

  deskOpenPlayer(playerId);

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

  const base = matchAttributeRating(p,type);

  const fatiguePenalty =
    Math.min(25, p.fatigue * 0.22);

  return Math.max(
    40,
    base + playerMoraleBonus(p) - fatiguePenalty - matchEnergyPenalty(p) - (p.health?.injury?3:0)
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

    if(!list.length) list=onIce;

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

  list=list.filter(medicalAvailable);
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
  if(studioActive())return studioKeeper(0);
  ensureLines();
  const selected=playerById(state.lines.goalie);
  if(selected?.pos==="MV"&&medicalAvailable(selected)) return selected;
  return goalies().filter(medicalAvailable)
    .slice()
    .sort(
      (a,b)=>matchAttributeRating(b)-matchAttributeRating(a)
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

  if(state.live.running&&['goal','penalty'].includes(type)&&matchPreferences()[type])state.live.autoPauseWanted=type;
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
  if(!managerCanPlay())return;
  if(state.season.phase==='preseason'&&!state.calendar?.active){state.page='calendar';save();render();return;}
  if(!calendarToMatch()){state.page='calendar';save();render();return;}
  if(!medicalMatchReady()){state.page="medical";render();return;}
  if(opponent()==="Ingen match"){state.page="season";render();return;}

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
rotationIndex:0,
currentLine:0,
currentDefensePair:0,
shiftSeconds:0,
    homePressure:0,

    awayPressure:0

  };

  studioCreate();

  addEvent(
    `Nedsläpp mellan ${managerClub()} och ${opp}.`,
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
    !state.live || state.live.finished
  )
    return;

  if(!medicalMatchReady()){state.page="medical";save();render();return;}
  if(medicalPending()){medicalDecisionOpen();return;}
  depthLock();
  lockTrainingForMatch();
  markSocialPeriodStarted();
  state.live.running=true;state.live.pauseReason='';delete state.live.autoPauseWanted;
  if(studioActive())studioRestartClock();

  save();

  render();

  clearTimeout(
    matchTimer
  );

  scheduleTick();

}


function pauseMatch(reason="Du pausade matchen."){

  if(!state.live)
    return;

  state.live.running=false;
  state.live.pauseReason=reason;

  clearTimeout(
    matchTimer
  );

  save();

  render();

}


function scheduleTick(){
  if(matchApplyAutoPause()){save();render();return;}
  if(studioActive()){if(state.live.running&&!state.live.finished)matchTimer=setTimeout(studioPulse,50);return;}

  const m=state.live;

  if(
    !m ||
    !m.running ||
    m.finished
  )
    return;

  const delay=rinkDelay();

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
 if(!state.live||![1,2,3,4].includes(Number(value)))return;
 state.live.speed=Number(value);if(studioActive())studioRestartClock();clearTimeout(matchTimer);save();render();scheduleTick();
}


/* =========================================================
   MATCHMOTOR
   ========================================================= */

function liveStep(){
  if(studioActive())return studioStep();

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

  const seconds=Math.min(6,1200-(m.minute*60+m.second));

  trackIceTime(Math.min(seconds,1200-(m.minute*60+m.second)));

  m.second+=seconds;
m.shiftSeconds += seconds;

if(m.shiftSeconds >= matchShiftLength()){

  rotateUnits();

}
  while(
    m.second>=60
  ){

    m.second-=60;

    m.minute++;

  }


  if(m.medicalPauseWanted){m.medicalPauseWanted=false;pauseMatch('Spelarbesked måste hanteras.');return;}
  /* ---------- UTVISNINGAR ---------- */

  tickPenalties(seconds);


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

      matchRecover(180,`period:${m.period}`);
      m.period++;

      m.minute=0;

      m.second=0;

      matchPeriodPause();

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
  rinkStep();


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
  dangerous,
  context=null
){

  const m=state.live;
  ensureAnalysis();

  m.shotsHV++;

  shooter.shots++;


  const opponentGoalie=rivalLiveKeeper();
  const goalieStrength=opponentGoalie?rivalLiveRating(opponentGoalie,"goalie"):40;
  const emptyOpponentNet=m.aiGoaliePulled||!opponentGoalie;


  let goalChance=
    dangerous
    ? .18
    : .075;


  goalChance+=
    (
      effectiveRating(shooter,"shot")-75
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


  goalChance-=(goalieStrength-75)/600;
  if(emptyOpponentNet)goalChance=.58;


  const location=context?.location||shotLocation(dangerous);
  goalChance=Math.max(.01,Math.min(.95,goalChance*location.factor*(context && !emptyOpponentNet ? 0.52 : 1)));
  const result=Math.random();
  recordAnalysisShot('own',shooter.name,shooter.id,dangerous,location,goalChance,result,context&&emptyOpponentNet&&result>=goalChance?'wide':null);
  if(context&&emptyOpponentNet&&result>=goalChance){addEvent(`${shooter.name} skjuter utanför det tomma målet.`,'shot');return;}


  if(
    result<
    goalChance
  ){

    goalHV(
      shooter,context
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
      !context?.suppressRebound&&Math.random()<.22
    ){

      const rebound=
        weightedPlayer(
          "shot"
        );

      m.shotsHV++;

      rebound.shots++;

      const reboundLocation=shotLocation(true);
      const reboundChance=.18*reboundLocation.factor;
      const reboundResult=Math.random();
      recordAnalysisShot('own',rebound.name,rebound.id,true,reboundLocation,reboundChance,reboundResult,reboundResult<reboundChance?'goal':'save');
      if(reboundResult<reboundChance){

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
  `${opponentShooter} kommer fri mot ${managerClub()}-målet!`,
  "bigChance"
);

    opponentShot(
      true,opponentShooter
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
  shooterName = getRandomOpponentForward(state.live.opponent),
  context=null
){

  const m=state.live;
  ensureAnalysis();

  m.shotsOpp++;


  const goalie=
    randomGoalie();


  let goalChance=
    dangerous
    ? .17
    : .07;


  goalChance+=
    (
      rivalLiveRating((state.clubRosters[m.opponent]||[]).find(p=>p.name===shooterName),"shot")-78
    )/550;


  goalChance-=
    (
      effectiveRating(goalie,"goalie")-75
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


  const location=context?.location||shotLocation(dangerous);
  goalChance=Math.max(.01,Math.min(.95,goalChance*location.factor*(context && !m.goaliePulled ? 0.52 : 1)));
  const result=Math.random();
  recordAnalysisShot('opponent',shooterName,null,dangerous,location,goalChance,result,context&&m.goaliePulled&&result>=goalChance?'wide':null);
  if(context&&m.goaliePulled&&result>=goalChance){addEvent(`${shooterName} skjuter utanför det tomma målet.`,'shot');return;}


  if(
    result<
    goalChance
  ){

  goalOpponent(shooterName,context);

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
  scorer,context=null
){

  const m=state.live;

  m.hv++;

  scorer.goals++;
  analysisEvent("goal","own",`${scorer.name}: ${m.hv}–${m.opp}`,scorer.id);


  const possibleAssists=
    [...currentLinePlayers(),...currentDefensePlayers()].filter(
      p=>medicalAvailable(p)&&p.id!==scorer.id&&(!context||samePlayerId(p.id,context.assistId))
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
    analysisAssist(assist);

  }


  addEvent(
    `MÅÅÅL ${managerClub()}! ${scorer.name} gör ${m.hv}–${m.opp}!`,
    "goal"
  );


  if(
    m.penaltiesOpp.length>
    m.penaltiesHV.length
  ){

    m.ppGoalsHV++;
    m.penaltiesOpp.shift();

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

function goalOpponent(scorerName,context=null){

  const m=state.live;

  m.opp++;
  const scorer=(state.clubRosters[m.opponent]||[]).find(p=>p.name===scorerName);
  analysisEvent("goal","opponent",`${scorerName}: ${m.hv}–${m.opp}`,scorer?.id);
  if(context?.assistId!=null&&!samePlayerId(context.assistId,scorer?.id))leagueTrackEvent("assist","opponent",context.assistId);


addEvent(
  `MÅL ${m.opponent}! ${scorerName} gör ${m.hv}-${m.opp}!`,
  "goal"
);


  if(
    m.penaltiesHV.length>
    m.penaltiesOpp.length
  ){

    m.ppGoalsOpp++;
    m.penaltiesHV.shift();

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
    currentLinePlayers().find(p=>p.pos==="C") || weightedPlayer("faceoff");

  const oppPlayer =
    getRandomOpponentForward(m.opponent);

  const hvWins=
    Math.random()<attrClamp(.5+(effectiveRating(hvPlayer,"faceoff")-team(m.opponent).strength)/100,.2,.8);

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
    Math.random()<attrClamp(.5+(currentLinePlayers().reduce((n,p)=>n+ensurePlayerAttributes(p).checking,0)/Math.max(1,currentLinePlayers().length)-12)/60,.3,.7);


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
    Math.random()<attrClamp((
      state.tacticalPlan?.physicality==="hard" ? .62 :
      state.tacticalPlan?.physicality==="safe" ? .38 : .5
    )+(12-currentLinePlayers().reduce((n,p)=>n+ensurePlayerAttributes(p).discipline,0)/Math.max(1,currentLinePlayers().length))/80,.2,.8);


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
    analysisEvent("penalty","own",`${player.name}, 2 min ${penalty}`,player.id);

    addEvent(
      `UTVISNING ${managerClub()}: ${player.name}, 2 min ${penalty}.`,
      "penalty"
    );

}else{

    const playerName =
        getRandomOpponentSkater(m.opponent);

    m.penaltiesOpp.push(
        120
    );

    m.ppHV++;
    analysisEvent("penalty","opponent",`${playerName}, 2 min ${penalty}`,(state.clubRosters[m.opponent]||[]).find(p=>p.name===playerName)?.id);

    addEvent(
        `UTVISNING ${m.opponent}: ${playerName}, 2 min ${penalty}.`,
        "penalty"
    );

}

}


/* =========================================================
   UTVISNINGSTID
   ========================================================= */

function tickPenalties(secondsOverride=null){

  const m=state.live;

  const tick=Number.isFinite(secondsOverride)?secondsOverride:
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

    `${managerClub()} försöker etablera spel genom mittzon.`,

    `${m.opponent} tvingas börja om i egen zon.`,

    `${managerClub()} forecheckar högt.`,

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

  const roster = state.live ? [...currentLinePlayers(),...currentDefensePlayers()] : managerRoster().filter(p=>p.pos!=="MV");

  let power=
    roster.reduce(
      (
        sum,
        p
      )=>sum+(effectiveRating(p,"attack")+effectiveRating(p,"defense"))/2,
      0
    )/
    roster.length;


  power+=
    state.morale/40;


  if(
    state.tactic===
    "attack"
  ){

    power+=2;

  }

  if(state.tacticalPlan?.forecheck==="aggressive") power+=1;
  if(state.tacticalPlan?.tempo==="high") power+=0.8;
  if(state.tacticalPlan?.tempo==="low") power-=0.4;

  if(
    state.tactic===
    "defense"
  ){

    power-=1;

  }


  return power + trainingMatchBonus() + lockerMatchBonus();

}


function calculateOpponentPower(
  opponentTeam
){

  const roster=(state.clubRosters[opponentTeam.name]||[]).filter(p=>p.pos!=="MV");
  let power=roster.length?roster.reduce((n,p)=>n+(matchAttributeRating(p,"attack")+matchAttributeRating(p,"defense"))/2,0)/roster.length:opponentTeam.strength;


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

function updateFatigue(seconds=0,ownPlayers=[],otherPlayers=[]){
 const m=state.live;if(!m||m.finished||!Number.isFinite(seconds)||seconds<=0)return;
 if(!m.energy)m.energy={version:1,players:{},breaks:[]};
 if(m.rink&&!m.rink.oppFatigue)m.rink.oppFatigue={};
 for(const [side,roster,onIce] of [['own',managerRoster(),ownPlayers],['opponent',state.clubRosters[m.opponent]||[],otherPlayers]]){
  const ids=new Set(onIce.map(p=>String(p.id))),tempo=side==='own'?state.tacticalPlan.tempo:m.aiTeam?.tempo;
  const load=readinessLoad(tempo,side==='own'?state.tacticalPlan.forecheck:m.aiTeam?.forecheck,side==='own'?state.tacticalPlan.physicality:'normal');
  for(const p of roster){
   const id=String(p.id),stamina=p.pos==='MV'?10:(p.attributes?.stamina??ensurePlayerAttributes(p).stamina??10);
   const e=m.energy.players[id]||(m.energy.players[id]={level:readinessCeiling((p.fatigue||0)+(side==='opponent'?(m.rink?.oppFatigue?.[id]||0):0)),shift:0,seconds:0});
   const active=ids.has(id),used=active?Math.max(0,Math.min(seconds,side==='own'?medicalLimit(p)-(m.iceTime?.[id]||0):seconds)):0;
   if(used>0){
    e.level=readinessEnergy(e.level,used,true,stamina,p.pos==='MV',load,hockeySpecial(side)==='pk',studioActive()?studioEffort(side,p.id):1);e.shift+=used;e.seconds+=used;
    const longLoad=readinessWork(used,stamina,p.pos==='MV',load);
    if(side==='own')p.fatigue=Math.min(100,(p.fatigue||0)+longLoad);
    else if(m.rink)m.rink.oppFatigue[id]=Math.min(100,(m.rink.oppFatigue[id]||0)+longLoad);
   }else e.shift=0;
   const bench=seconds-used,fatigue=(p.fatigue||0)+(side==='opponent'?(m.rink?.oppFatigue?.[id]||0):0);
   if(bench>0){
    // Recover the short burst of match energy faster when depleted, tapering near
    // a full tank. Long-term workload still limits the ceiling; stamina matters.
    e.level=studioActive()?readinessEnergy(e.level,bench,false,stamina,p.pos==='MV',load,false,1,readinessCeiling(fatigue)):readinessRecover(e.level,bench,stamina,readinessCeiling(fatigue));
   }
  }
 }
}


/* =========================================================
   AI
   ========================================================= */

function aiDecisions(){
  rivalLiveDecision();
  if(hockeyChangeBlocked("opponent"))return;

  const m=
    state.live;

  if(!m)
    return;


  if(m.aiGoaliePulled&&(m.opp>=m.hv||m.hv-m.opp>2)){m.aiGoaliePulled=false;addEvent(`${m.opponent} sätter tillbaka målvakten.`,'strategy');}
  if(
    m.period===3 &&
    m.minute>=17 &&
    m.opp<m.hv && m.hv-m.opp<=2 &&
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
    !m || m.finished ||
    m.timeoutUsed
  )
    return;


  m.timeoutUsed=true;

  m.running=false;m.pauseReason='Timeout.';

  m.momentum=
    Math.min(
      75,
      m.momentum+7
    );


  matchRecover(30,'timeout');

  addEvent(
    `${managerClub()} tar timeout. Spelarna får återhämta sig.`,
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
  if(studioActive())return studioRequestGoalie();
  if(!hockeyAllowChange())return;

  const m=
    state.live;

  if(!m||m.finished)
    return;


  m.goaliePulled=
    !m.goaliePulled;


  addEvent(
    m.goaliePulled
    ? `${managerClub()} tar ut målvakten!`
    : `${managerClub()} sätter tillbaka målvakten.`,
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
  if(!["attack","balanced","defense"].includes(tactic))return;
  if(state.live?.running)pauseMatch();

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
      `${managerClub()} ändrar taktik till ${labels[tactic]}.`,
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


  matchRecover(60,'before-overtime');
  m.overtime=true;
  m.goaliePulled=false;m.aiGoaliePulled=false;

  m.period=4;

  m.minute=0;

  m.second=0;

  matchPeriodPause();


  save();

  render();

}


/* =========================================================
   FÖRLÄNGNINGSSTEG
   ========================================================= */

function overtimeStep(){
 const m=state.live;if(!m||!m.running||m.finished)return;
 const limit=isPlayoffMatch()?1200:300,seconds=Math.max(0,Math.min(6,limit-m.minute*60-m.second));
 trackIceTime(seconds);tickPenalties(seconds);m.shiftSeconds+=seconds;
 if(m.shiftSeconds>=matchShiftLength())rotateUnits();
 const elapsed=m.minute*60+m.second+seconds;m.minute=Math.floor(elapsed/60);m.second=elapsed%60;
 if(m.medicalPauseWanted){m.medicalPauseWanted=false;pauseMatch('Spelarbesked måste hanteras.');return;}
 if(elapsed>=limit){
  if(isPlayoffMatch()){matchRecover(180,`ot:${m.overtimePeriods||1}`);m.minute=0;m.second=0;matchPeriodPause();m.overtimePeriods=(m.overtimePeriods||1)+1;addEvent('Ny förlängningsperiod – nästa mål avgör.','period');save();render();return;}
  shootout();return;
 }
 rinkStep();
 if(m.hv!==m.opp){finishMatch(true);return;}
 save();render();
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
        `${managerClub()} straff ${i}: MÅL!`,
        "goal"
      );
    }else{
      addEvent(
        `${managerClub()} straff ${i}: miss.`,
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
        `${managerClub()}: MÅL!`,
        "goal"
      );
    }else{
      addEvent(
        `${managerClub()}: miss.`,
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

  m.analysisShootout=true;
  analysisEvent("decider",hvGoals>oppGoals?"own":"opponent",`Straffläggning: ${hvGoals}–${oppGoals}`);
  if(hvGoals > oppGoals){

    m.hv++;

    addEvent(
      `${managerClub()} vinner straffläggningen ${hvGoals}-${oppGoals}.`,
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

  if(state.live?.friendly){calendarFinishFriendly();return;}
  if(isPlayoffMatch()){finishPlayoffMatch();return;}
  const m=state.live;
  if(!m||m.finished)return;
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

  updateSquadAfterMatch(hvWin);
  recordBoardMatch();


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


  clubSettleMatch();

const scheduleGame = state.schedule.find(
  game =>
    game.round === state.round &&
    (game.home === managerClub() || game.away === managerClub())
);

if (scheduleGame) {
  scheduleGame.played = true;
  scheduleGame.overtime=Boolean(overtime);

if(scheduleGame.home === managerClub()){
    scheduleGame.homeGoals = m.hv;
    scheduleGame.awayGoals = m.opp;
  } else {
    scheduleGame.homeGoals = m.opp;
    scheduleGame.awayGoals = m.hv;
  }
}

function updateSquadAfterMatch(won){

  ensureLines();

  const dressedIds = [
    ...state.lines.forwards,
    ...state.lines.defense,
    state.lines.goalie
  ];

  managerRoster().forEach(player => {
    const dressed = dressedIds.some(id => samePlayerId(id,player.id));
    const promisedRank = SQUAD_ROLES.indexOf(player.promisedRole);
    const actualRank = SQUAD_ROLES.indexOf(player.squadRole);

    if(dressed||(state.live.iceTime?.[player.id]||0)>0) player.games = (player.games || 0) + 1;

    const moodChange = (won ? 1 : -1) + (promisedRank > actualRank ? -2 : 0);
    player.happiness = Math.max(20,Math.min(100,player.happiness + moodChange));
    player.morale = Math.max(20,Math.min(100,(player.morale || 70) + (won ? 1 : -1)));

    grantMatchDevelopment(player,state.live?.iceTime?.[player.id]||0);

  });

}

simulateOtherGames();
afterTrainingMatch();

state.round++;
calendarAfterFixture();


  save();

  render();

}


/* =========================================================
   HEMSIDAN
   ========================================================= */

function homeView(){return managerDeskView();}

/* TRUPP */
function squadView(){return squadWorkspaceView();}
function legacySquadView(){
 depthSelection();

const players =
  [...managerRoster()]
      .sort((a,b)=>{
        const order = { MV:0, B:1, C:2, VF:3, HF:4 };

        return (
          (order[a.pos] ?? 9) -
          (order[b.pos] ?? 9)
        ) || a.name.localeCompare(b.name,"sv");
      });

  const goalies =
    players.filter(p=>p.pos==="MV").length;

  const defendersCount =
    players.filter(p=>p.pos==="B").length;

  const forwardsCount =
    players.filter(
      p=>p.pos!=="MV" && p.pos!=="B"
    ).length;

  const wageCost = annualWageCost();
  const availableWages = wageBudget() - wageCost;
  const expiringContracts = players.filter(contractNeedsDecision);
  const unhappyPlayers = players.filter(player => player.happiness < 60);

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
          class="squad-row" role="button" tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectPlayer('${p.id}')}"
          onclick="selectPlayer('${p.id}')"
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
                ${lineupPlayerPlace(p)}${playerLoan(p)?" · Inlånad":""}
              </span>

            </div>

          </div>


          <div class="squad-cell squad-grades"><div><small>Förmåga</small>${assessmentBadge(p)}</div><div><small>Potential</small>${assessmentBadge(p,true)}</div></div>


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

    <div class="squad-page">${rosterDatabaseNotice()}


      <div class="page-heading">

        <div>

          <span class="overview-kicker">
            LAG
          </span>

          <h1>
            Trupp
          </h1>

          <p>
            Säsong ${seasonLabel()}
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



        </div>


        <div class="squad-table-header">

          <div>
            Spelare
          </div>

          <div>
            Bedömning
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
<details class="desk-fold" id="squad-contracts" data-desk-fold="contracts" ${deskFolds.contracts?'open':''} ontoggle="deskFolds.contracts=this.open"><summary>Kontrakt och löner · ${expiringContracts.length} utgående avtal</summary>      <section class="dashboard-panel squad-management-panel">
        <div class="panel-header">
          <div>
            <span class="panel-label">TRUPPLANERING</span>
            <h2>Kontrakt och löner</h2>
          </div>
          <strong class="${availableWages < 0 ? "budget-negative" : "budget-positive"}">
            ${availableWages >= 0 ? "+" : ""}${money(availableWages)} kvar
          </strong>
        </div>

        <div class="management-summary-grid">
          <div><span>Lönekostnad</span><strong>${money(wageCost)}</strong></div>
          <div><span>Lönebudget</span><strong>${money(wageBudget())}</strong></div>
          <div><span>Utgående avtal</span><strong>${expiringContracts.length}</strong></div>
          <div><span>Missnöjda spelare</span><strong>${unhappyPlayers.length}</strong></div>
        </div>

        ${expiringContracts.length ? `
          <div class="squad-alert-list">
            ${expiringContracts.map(player => `
              <button onclick="selectPlayer('${player.id}')">
                <span><b>${player.name}</b><small>${player.squadRole}</small></span>
                <strong>Avtal: ${player.contractYears} år ›</strong>
              </button>
            `).join("")}
          </div>
        ` : `<p class="muted">Inga kontrakt löper ut efter säsongen.</p>`}
      </section></details>

    </div>

  `;

}
function toggleTransferStatus(playerId){

  const player =
    managerRoster().find(
      p => samePlayerId(p.id, playerId)
    );

  if(!player||playerLoan(player)){
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

function contractNeedsDecision(p){return p.contractYears<=1&&!p.futureContract&&!playerLoan(p);}
function renewalWishes(p){
 const w=recruitPlayerWishes(p),trust=p.social?.trust??60;
 return {...w,salary:Math.round(p.salary*(p.contractYears<=1?1.10:1.04)*(trust<40?1.10:trust>=80?.97:1)/10000)*10000,role:p.age>=34&&p.social?.lastMinutes!==null&&p.social?.lastMinutes<10?'Rotation':p.promisedRole||p.squadRole};
}
function openContractNegotiation(playerId){
 profileWorkspace.tab="contract";
 const reason=deskActionReason("openContractNegotiation",playerId);if(reason)return deskActionFeedback(reason);
 const p=managerRoster().find(p=>samePlayerId(p.id,playerId));if(!p||playerLoan(p)||loanLocked())return;
 const w=renewalWishes(p),paused=p.renewalPausedUntil&&p.renewalPausedUntil>state.calendar.date;
 state.contractNegotiation={playerId:p.id,salaryDemand:w.salary,years:Math.max(w.minYears,Math.min(3,w.maxYears)),role:w.role,attempts:p.renewalAttempts||0,message:paused?`Agenten vill avvakta till ${calText(p.renewalPausedUntil)} efter de senaste avslagen.`:`Spelaren söker ${w.minYears}–${w.maxYears} år, ${w.role.toLowerCase()} och omkring ${money(w.salary)}/år. Förtroendet påverkar lönekravet.`};save();render();
}
function cancelContractNegotiation(){state.contractNegotiation=null;save();render();}
function submitContractRenewal(playerId,salary,years,role){
 const n=state.contractNegotiation,p=managerRoster().find(p=>samePlayerId(p.id,playerId));
 if(!n||!p||!samePlayerId(n.playerId,playerId)||playerLoan(p)||loanLocked())return;
 const w=renewalWishes(p);salary=Math.round(Number(salary));years=Number(years);
 const fail=message=>{n.message=message;save();render();};
 if(p.futureContract)return fail('Spelaren har redan ett bindande avtal med nästa klubb.');
 if(p.renewalPausedUntil&&p.renewalPausedUntil>state.calendar.date)return fail(`Diskussionen kan återupptas ${calText(p.renewalPausedUntil)}.`);
 if(!Number.isFinite(salary)||salary<=0||!Number.isInteger(years)||years<1||years>5||!SQUAD_ROLES.includes(role))return fail('Ange giltig årslön, kontraktslängd och roll.');
 const reserve=state.recruitment.deals.filter(d=>d.status==='pending'&&d.kind!=='future').reduce((v,d)=>v+d.salary,0)+loanReserved(managerClub());
 if(annualWageCost()-p.salary+salary+reserve>wageBudget())return fail('Lönebudgeten räcker inte när pågående transfer- och lånebud räknas med.');
 let reason=salary<w.salary?`Motbud: ${money(w.salary)}/år.`:years<w.minYears||years>w.maxYears?`Spelaren vill ha ${w.minYears}–${w.maxYears} år, med hänsyn till sin ålder och trygghet.`:SQUAD_ROLES.indexOf(role)<SQUAD_ROLES.indexOf(w.role)?`Spelaren vill ha rollen ${w.role.toLowerCase()}.`:'';
 if(reason){p.renewalAttempts=(p.renewalAttempts||0)+1;n.attempts=p.renewalAttempts;n.salaryDemand=w.salary;
  if(p.renewalAttempts>=3){p.renewalPausedUntil=calAdd(state.calendar.date,7);p.renewalAttempts=0;if(p.social)p.social.trust=trainingClamp(p.social.trust-2);reason+=` Tre avslag: agenten pausar till ${calText(p.renewalPausedUntil)}.`;}
  return fail(reason);
 }
 Object.assign(p,{salary,contractYears:years,promisedRole:role,squadRole:role,renewalAttempts:0,renewalPausedUntil:null,happiness:trainingClamp(p.happiness+5),morale:trainingClamp((p.morale||70)+3)});
 if(SQUAD_ROLES.indexOf(role)>=SQUAD_ROLES.indexOf('Ordinarie'))p.recruitmentPromise={role,minutes:p.pos==='MV'?30:role==='Nyckelspelare'?15:12,games:0,qualified:0,resolved:false};
 else delete p.recruitmentPromise;
 state.news.unshift(`${p.name} har förlängt med ${managerClub()} i ${years} år.`);managerMessage(`renewal:${p.id}:${state.calendar.date}`,`${p.name} förlänger`,`${years} år · ${money(salary)}/år · ${role}. Den utlovade rollen följs upp mot laguttagningen.`,'Sportchef',{link:'squad'});
 state.contractNegotiation=null;save();render();
}

function setDevelopmentFocus(playerId,focus){

  const player = managerRoster().find(p => samePlayerId(p.id,playerId));
  if(!player || !validPlayerFocus(player,focus)) return;
  player.developmentFocus = focus;
  state.news.unshift(`${player.name} tränar nu med fokus på ${focus.toLowerCase()}.`);
  save();
  render();

}
function playerView(){

  const player =
    managerRoster().find(
      p => samePlayerId(p.id, state.selectedPlayer)
    );

  if(!player){
    return `
      <section class="card">
        <h2>Spelare hittades inte</h2>

        <button
          class="btn"
          onclick="
            deskBack('squad');
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

  const role = player.squadRole;

  const negotiation = state.contractNegotiation &&
    samePlayerId(state.contractNegotiation.playerId,player.id)
      ? state.contractNegotiation
      : null;

  const formatCurrency = value =>
    `${Math.round(value || 0).toLocaleString("sv-SE")} kr`;

  const r=playerAssessment(player),tab=profileWorkspace.tab;
  return `<article class="fm-profile"><header class="fm-profile-header"><button class="fm-back" onclick="deskBack('squad')" aria-label="Tillbaka till föregående vy">←</button><div class="fm-player-mark">${player.pos}</div><div><small>${trainingSafe(managerClub())} · ${positionName}</small><h1>${trainingSafe(player.name)}</h1><p>${player.age} år · ${nationality} · ${role}</p></div><div class="fm-profile-rating"><small>Förmåga / potential</small><div>${assessmentBadge(player)} / ${assessmentBadge(player,true)}</div></div></header>
  <nav class="fm-tabs" aria-label="Spelarprofil">${[['overview','Översikt'],['contract','Kontrakt & övergång'],['development','Utveckling & hälsa'],['report','Rapport & historik']].map(([key,label])=>`<button aria-pressed="${tab===key}" onclick="profileWorkspace.tab='${key}';render()">${label}</button>`).join('')}</nav>
  ${tab==='contract'?`        <section class="dashboard-panel">

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
              <span>Utlovad roll</span>
              <strong>${player.promisedRole}</strong>
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

            <button class="btn secondary" onclick="openContractNegotiation('${player.id}')">
              Förhandla kontrakt
            </button>

<button
  class="btn secondary"
  onclick="toggleTransferStatus('${player.id}')"
>
  ${
    player.transferListed
      ? "Ta bort från transferlista"
      : "Transferlista spelaren"
  }
</button>

          </div>

          ${negotiation ? `
            <div class="contract-negotiation-box">
              <div class="contract-negotiation-head">
                <div>
                  <span class="panel-label">FÖRHANDLING</span>
                  <h3>Nytt kontrakt</h3>
                </div>
                <span>Försök ${negotiation.attempts + 1} av 3</span>
              </div>

              <p class="contract-message">${negotiation.message}</p>

              <div class="contract-form-grid">
                <label>
                  Årslön
                  <input id="renewalSalary" type="number" step="10000" value="${negotiation.salaryDemand}">
                  <small>Krav: ${formatCurrency(negotiation.salaryDemand)}</small>
                </label>

                <label>
                  Kontraktslängd
                  <select id="renewalYears">
                    ${[1,2,3,4,5].map(year => `<option value="${year}" ${year===negotiation.years ? "selected" : ""}>${year} år</option>`).join("")}
                  </select>
                </label>

                <label>
                  Utlovad roll
                  <select id="renewalRole">
                    ${SQUAD_ROLES.map(item => `<option value="${item}" ${item===negotiation.role ? "selected" : ""}>${item}</option>`).join("")}
                  </select>
                </label>
              </div>

              <div class="player-actions">
                <button class="btn" onclick="submitContractRenewal(
                  '${player.id}',
                  document.getElementById('renewalSalary').value,
                  document.getElementById('renewalYears').value,
                  document.getElementById('renewalRole').value
                )">Lämna erbjudande</button>
                <button class="btn secondary" onclick="cancelContractNegotiation()">Avbryt</button>
              </div>
            </div>
          ` : ""}

        </section>


${loanPlayerPanel(player)}`:tab==='development'?`<div class="fm-profile-details">${trainingPlayerPanel(player)}${medicalPlayerPanel(player)}${lockerPlayerPanel(player)}</div>`:tab==='report'?`${assessmentPanel(player)}${storiesPlayerPanel(player)}`:`
  <div class="fm-profile-main"><section class="fm-panel fm-role-panel"><h2>Position & roll</h2><div class="fm-position-map"><span class="${['VF','F'].includes(player.pos)?'active':''}">VF</span><span class="${['C','F'].includes(player.pos)?'active':''}">C</span><span class="${['HF','F'].includes(player.pos)?'active':''}">HF</span><span class="${player.pos==='B'?'active':''}">VB</span><span class="${player.pos==='B'?'active':''}">HB</span><span class="${player.pos==='MV'?'active':''}">MV</span></div><p>${lineupPlayerPlace(player)}</p>${r.roles.map(x=>`<div class="fm-role-row"><b>${x.name}</b><span>${x.value>=14?'Styrka':x.value>=11?'Användbar':'Utvecklingsbehov'}</span></div>`).join('')}</section>
  ${desktopAttributes(player)}<aside class="fm-panel fm-report-summary"><h2>Tränarens bedömning</h2><p>${trainingSafe(r.staff.name)}</p><strong>${r.roles[0].name}</strong><p>${medicalAvailable(player)?'Tillgänglig för uttagning':'Ej tillgänglig för uttagning'}</p><dl><dt>Startenergi</dt><dd>${Math.round(readinessCeiling(player.fatigue))}%</dd><dt>Slitage</dt><dd>${Math.round(player.fatigue||0)} / 100</dd><dt>Moral</dt><dd>${Math.round(player.morale??70)} / 100</dd><dt>Form</dt><dd>${player.form||0}</dd></dl><button class="fm-link" onclick="profileWorkspace.tab='report';render()">Fullständig rapport →</button></aside></div>
  <div class="fm-profile-bottom"><section class="fm-panel"><h2>Kontrakt</h2><dl><dt>Årslön</dt><dd>${formatCurrency(player.salary)}</dd><dt>Återstår</dt><dd>${player.contractYears} år</dd><dt>Utlovad roll</dt><dd>${player.promisedRole}</dd><dt>Marknadsvärde</dt><dd>${formatCurrency(player.value)}</dd></dl><button class="fm-link" onclick="profileWorkspace.tab='contract';render()">Hantera kontrakt →</button></section><section class="fm-panel"><h2>Utveckling & välmående</h2><dl><dt>Träningsfokus</dt><dd>${trainingSafe(player.developmentFocus||'Individuell plan')}</dd><dt>Trivsel</dt><dd>${Math.round(player.happiness??70)}%</dd><dt>Roll i truppen</dt><dd>${role}</dd></dl><button class="fm-link" onclick="profileWorkspace.tab='development';render()">Träning, samtal & hälsa →</button></section><section class="fm-panel"><h2>Säsong ${seasonLabel()}</h2><table class="fm-stats"><thead><tr><th>Matcher</th><th>Mål</th><th>Assist</th><th>Poäng</th><th>Skott</th><th>Utv.</th></tr></thead><tbody><tr>${[player.games,player.goals,player.assists,points,player.shots,player.pim].map(n=>`<td>${n||0}</td>`).join('')}</tr></tbody></table></section></div>`}</article>`;
}
/* =========================================================
   KEDJOR
   ========================================================= */

function ensureLines(){

  if(state.lines){repairMedicalLines();return;}

  const fw = forwards().filter(medicalAvailable)
    .slice()
    .sort((a,b)=>a.name.localeCompare(b.name,"sv"));

  const d = defenders().filter(medicalAvailable)
    .slice()
    .sort((a,b)=>a.name.localeCompare(b.name,"sv"));

  const g = goalies().filter(medicalAvailable)
    .slice()
    .sort((a,b)=>a.name.localeCompare(b.name,"sv"));

  state.lines = {
    forwards: fw.slice(0,12).map(p=>p.id),
    defense: d.slice(0,6).map(p=>p.id),
    goalie: g[0]?.id ?? null
  };

  save();
}


function playerById(id){

  return managerRoster().find(
    p=>samePlayerId(p.id,id)
  );

}


function lineOptions(players, selectedId){

  return (selectedId===null?'<option value="">Vakant</option>':'')+players.map(p=>`
    <option
      value="${p.id}"
      ${samePlayerId(p.id,selectedId) ? "selected" : ""}
      ${medicalAvailable(p)?"":"disabled"}
    >
      ${p.name} • ${assessmentShort(p)} ${medicalAvailable(p)?"":"· Ej tillgänglig"}
    </option>
  `).join("");

}


function changeLinePlayer(type,index,newId){
 if(!hockeyAllowChange()||!['forwards','defense'].includes(type)||!Number.isInteger(index)||index<0||index>=(type==='forwards'?12:6))return;
 const p=playerById(newId);if(!medicalAvailable(p)||p.pos==='MV')return;
 if(state.live?.running)pauseMatch();ensureLines();
 const old=state.lines[type][index];
 for(const key of ['forwards','defense']){const other=state.lines[key].findIndex(id=>samePlayerId(id,p.id));if(other>=0){state.lines[key][other]=old;break;}}
 state.lines[type][index]=p.id;save();render();
}


function changeGoalie(id){
  if(!hockeyAllowChange())return;
  if(!medicalAvailable(playerById(id))||playerById(id).pos!=="MV")return;

  ensureLines();

  state.lines.goalie=id;

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
      (sum,p)=>sum+(effectiveRating(p,"attack")+effectiveRating(p,"defense"))/2,
      0
    )/players.length
  );

}

function currentLinePlayers(){
  if(studioActive())return studioPlayers(0,false).filter(p=>!(studioEngine().accountingActors||studioEngine().actors).some(a=>a.side===0&&samePlayerId(a.player.id,p.id)&&["LD","RD"].includes(a.role)));

  ensureLines();

  if(!state.live) return [];

  const special=specialUnitOnIce();
  if(special) return rinkExtraForward(special.filter(p=>p.pos!=="B"),special);

  const start =
    state.live.currentLine * 3;

  return rinkExtraForward(medicalUnit(state.lines.forwards.slice(start,start+3).map(playerById).filter(Boolean),3,"F"));
}


function currentDefensePlayers(){
  if(studioActive())return studioPlayers(0,false).filter(p=>(studioEngine().accountingActors||studioEngine().actors).some(a=>a.side===0&&samePlayerId(a.player.id,p.id)&&["LD","RD"].includes(a.role)));

  ensureLines();

  if(!state.live) return [];

  const special=specialUnitOnIce();
  if(special) return special.filter(p=>p.pos==="B");

  const start =
    state.live.currentDefensePair * 2;

  return medicalUnit(state.lines.defense.slice(start,start+2).map(playerById).filter(Boolean),2,"B");
}


function rotateUnits(){

  const m = state.live;

  if(!m||hockeyChangeBlocked()) return;

  m.shiftSeconds = 0;

  const usage = state.tacticalPlan?.lineUsage || "balanced";
  const patterns = {
    balanced:[0,1,2,3],
    topHeavy:[0,1,0,2,0,1,3],
    rollFour:[0,1,2,3]
  };
  const pattern = patterns[usage] || patterns.balanced;
  m.rotationIndex = ((m.rotationIndex || 0) + 1) % pattern.length;
  m.currentLine = pattern[m.rotationIndex];

  m.currentDefensePair =
    (m.currentDefensePair + 1) % 3;
}
function linesView(){return lineupBoardView();}

function matchView(){return matchCentreView();}

function tableView(){return leagueStandingsView();}

function gamesForRound(round){

  return state.schedule
    .filter(game => game.round === round && leagueOf(game.home)===leagueOf())
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
  game.home === managerClub() || game.away === managerClub();

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
        ${leagueName()} • ${games.length} matcher
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

  const clubName = managerClub();
  const hvGames = state.schedule
    .filter(game => game.home === clubName || game.away === clubName)
    .sort((a,b) => a.round - b.round);

  const rows = hvGames.map(game => {

    const isHome = game.home === clubName;

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

      <h2>${clubName} – Spelschema</h2>

      <p class="muted">
        Säsong ${seasonLabel()} • 52 omgångar
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

  players.push(...(state.playerWorld?.freeAgents||[]).map(p=>({...p,team:WORLD_FREE})));
  return players.sort(
    (a,b) =>
      a.name.localeCompare(b.name,"sv")
  );

}
function getPlayerClub(playerId){

  for(const [clubName, roster] of Object.entries(state.clubRosters || {})){

    if(roster.some(player => samePlayerId(player.id, playerId))){
      return clubName;
    }

  }

  return state.playerWorld?.freeAgents.some(p=>samePlayerId(p.id,playerId))?WORLD_FREE:null;

}


function findPlayerAnywhere(playerId){

  for(const roster of Object.values(state.clubRosters || {})){

    const player =
      roster.find(p => samePlayerId(p.id, playerId));

    if(player){
      return player;
    }

  }

  return state.playerWorld?.freeAgents.find(p=>samePlayerId(p.id,playerId))||null;

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


function submitTransferBid(playerId,amount){
  state.selectedMarketPlayer=playerId;state.page='marketPlayer';
  const p=findPlayerAnywhere(playerId);if(!p)return;
  state.transferNegotiation={playerId,transferFee:Number(amount)||recruitFee(p),salaryDemand:recruitPlayerWishes(p).salary};
  save();render();
}
function submitContractOffer(playerId,salary,years){
  const p=findPlayerAnywhere(playerId),n=state.transferNegotiation;if(!p||!n||!samePlayerId(n.playerId,playerId))return;
  submitRecruitOffer(playerId,n.transferFee,salary,years,recruitPlayerWishes(p).role);
}
function transfersView(){return recruitmentView();}
function marketPlayerView(){return recruitmentPlayerView();}

function startCareerWithClub(clubName){

  if(
    !clubName ||
    !CLUB_DATA[clubName]
  ){
    return;
  }

  const freshState = careerDraft || newState();
  const offer = careerOffer(clubName,freshState.clubRosters);

  freshState.managerClub = clubName;
  freshState.seedFreeAgents = true;

  freshState.roster =
    freshState.clubRosters[clubName]
      .map(player => ({
        ...player
      }));

  freshState.money =
    offer.cash;

  freshState.fans =
    CLUB_DATA[clubName].fans;

  freshState.news = [
    `Välkommen som huvudtränare för ${clubName}.`,
    `Styrelsens uppdrag: topp ${offer.place}, talangutveckling och ekonomisk disciplin. Öppna Styrelse för att följa målen.`
  ];

  freshState.page = "home";

  state = freshState;
  state.careerStarted=true;
  careerDraft=null;
  careerScreen=null;
  initializeBoardPlan(offer);

  syncManagerRoster();
  ensureManagementData();

  save();
  render();

}
function clubSelectView(){return careerClubSelectView();}
/* =========================================================
   RENDER
   ========================================================= */

function tacticsView(){
 return desktopTacticsView();
}
function legacyTacticsView(){
  const plan=state.tacticalPlan;
  const select=(key,options)=>`<select onchange="setTacticalSetting('${key}',this.value)">${options.map(([value,label])=>`<option value="${value}" ${plan[key]===value?"selected":""}>${label}</option>`).join("")}</select>`;
  return `<div class="tactics-page"><div class="page-heading"><div><span class="overview-kicker">MATCHPLAN</span><h1>Taktik</h1><p>Din matchplan påverkar lagstyrka, risk och hur kedjorna används.</p></div></div>
  <div class="tactics-grid">
    <section class="dashboard-panel"><div class="panel-header"><div><span class="panel-label">GRUNDIDÉ</span><h2>Spelsätt</h2></div></div>
      <div class="tactic-choice-grid">${[["attack","Offensiv","Fler spelare framåt"],["balanced","Balanserad","Kontrollerat tvåvägsspel"],["defense","Defensiv","Skydda mitten"]].map(([v,l,d])=>`<button class="tactic-choice ${state.tactic===v?"active":""}" onclick="setTactic('${v}')"><b>${l}</b><span>${d}</span></button>`).join("")}</div>
    </section>
    <section class="dashboard-panel"><div class="panel-header"><div><span class="panel-label">DETALJER</span><h2>Lagorder</h2></div></div>
      <div class="tactical-orders">
        <label><span>Spelidé<small>Valet ställer också in forecheck. Anpassa detaljerna efteråt.</small></span><select onchange="hockeySetStyle(this.value)">${Object.entries(HOCKEY_STYLES).map(([v,l])=>`<option value="${v}" ${hockeyStyle("own")===v?"selected":""}>${l}</option>`).join("")}</select></label>
        <label><span>Forecheck<small>Hög press ger fler chanser men kostar ork.</small></span>${select("forecheck",[["passive","Avvaktande"],["balanced","Balanserad"],["aggressive","Aggressiv"]])}</label>
        <label><span>Tempo<small>Högt tempo ökar både tryck och trötthet.</small></span>${select("tempo",[["low","Lågt"],["normal","Normalt"],["high","Högt"]])}</label>
        <label><span>Fysisk nivå<small>Mer fysik ger tacklingar men riskerar utvisningar.</small></span>${select("physicality",[["safe","Disciplinerat"],["balanced","Balanserat"],["hard","Hårt"]])}</label>
        <label><span>Kedjeanvändning<small>Toppning stärker laget men sliter på stjärnorna.</small></span>${select("lineUsage",[["rollFour","Rulla fyra"],["balanced","Balanserad"],["topHeavy","Toppa laget"]])}</label>
      </div>
    </section>
  </div></div>`;

}

function setTacticalSetting(key,value){
  const allowed={forecheck:["passive","balanced","aggressive"],tempo:["low","normal","high"],physicality:["safe","balanced","hard"],lineUsage:["rollFour","balanced","topHeavy"]};
  if(!allowed[key]?.includes(value)) return;
  state.tacticalPlan[key]=value;
  save();render();
}

function newsView(){return feedbackNewsView();}


function financeView(){return clubFinanceView();}

function placeholderView(title){

  return `
    <section class="card">
      <h2>${title}</h2>
      <p class="muted">Den här delen byggs i en kommande uppdatering.</p>
    </section>
  `;

}

function continueGame(){calendarContinue();}

function render(){
  ensureSeason();
  ensureAssessmentData();
  ensureLeagues();
  ensureLeagueStatistics();
  ensureLoans();
  ensureRecruitment();
  ensurePlayerWorld();
  ensureLocker();
  ensureMedical();
  ensureAnalysis();
  ensureCalendar();
  ensureTrainingData();
  ensureJuniors();
  ensureRivals();
  ensureRink();
  ensureClub();
  ensureManager();
  ensureStories();
  if(!managerEmployed()&&!careerScreen)state.page="manager";
  applyCareerShell();

  const content=
    document.getElementById(
      "content"
    );


const pageHTML=
careerScreen === "files" ? saveSettingsView()
: careerScreen === "menu" ? careerMenuView()
: careerScreen === "select" ? careerClubSelectView()
: careerScreen === "review" ? careerReviewView()
: state.page==="clubSelect"
   
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

: state.page==="opponents"
? rivalsView()

: state.page==="stories"
? storiesView()

: state.page==="match"

? matchView()

: state.page==="specialTeams"

? specialTeamsView()

: state.page==="leagueStats"
? leagueStatisticsView()

: state.page==="table"

? tableView()

: state.page==="tactics"

? tacticsView()

: state.page==="staffReview"
? staffReviewView()
: state.page==="news"

? newsView()

: state.page==="leagues"
? leaguesView()

: state.page==="manager"
? managerView()

: state.page==="staff"
? clubStaffView()

: state.page==="finance"

? financeView()

: state.page==="season"

? seasonView()

: state.page==="training"

? trainingView()

: state.page==="inbox"

? inboxView()

: state.page==="medical"

? medicalView()

: state.page==="locker"

? lockerView()

: state.page==="scouting"

? scoutingView()

: state.page==="juniors"
? juniorsView()

: state.page==="statistics"

? statisticsView()

: state.page==="board"

? boardView()

: state.page==="calendar"
? calendarView()
: state.page==="settings"

? saveSettingsView()

: homeView();

  content.innerHTML=deskFrame(pageHTML);
  deskEnhanceButtons(content);

  const clubName = managerClub();
  const club = getClub(clubName);
  const sectionNames = {
    medical:"MEDICINSKT TEAM", locker:"OMKLÄDNINGSRUM", season:"SÄSONG", training:"TRÄNING", inbox:"INKORG", home:"ÖVERSIKT", squad:"TRUPP", lines:"KEDJOR", match:"MATCH",
    table:leagueName(), tactics:"TAKTIK", transfers:"REKRYTERING", scouting:"SCOUTING",
    leagues:"LIGAVÄRLDEN", manager:"MIN KARRIÄR", staff:"PERSONAL", statistics:"STATISTIK", finance:"EKONOMI", board:"STYRELSE", news:"NYHETER",
    calendar:"KALENDER", settings:"SPARFILER & INSTÄLLNINGAR", clubSelect:"VÄLJ KLUBB"
  };

  const section = document.querySelector(".current-section");
  const topClub = document.querySelector(".manager-club");
  const badge = document.querySelector(".club-badge");
  const clubInfoName = document.querySelector(".club-info strong");
  const clubInfoLeague = document.querySelector(".club-info span");

  const seasonText=document.querySelector(".season-info strong");if(seasonText)seasonText.textContent=seasonLabel();
  const unread=document.getElementById("inboxCount");
  if(unread)unread.textContent=state.training?.messages.filter(m=>!m.read).length||"";
  if(section) section.textContent = sectionNames[state.page] || "HOCKEY MANAGER";
  if(topClub) topClub.textContent = clubName;
  if(badge){badge.textContent=careerIdentity(clubName).code;if(badge.style){badge.style.background=careerIdentity(clubName).color;badge.style.color="#0c1720";}}
  if(clubInfoName) clubInfoName.textContent = clubName;
  if(clubInfoLeague) clubInfoLeague.textContent = club ? leagueName() : "";




  deskRefreshShell();
  medicalRenderDecision();
  renderSaveStatus();
  if(studioActive()&&state.page==="match")studioMount();

}


/* =========================================================
   NAVIGATION
   ========================================================= */

const continueButton =
  document.getElementById("continueGame");

if(continueButton){
  continueButton.addEventListener("click", continueGame);
}


/* =========================================================
   START
   ========================================================= */

save();

render();
