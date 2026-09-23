# Spelarunderlag – SHL och Hockeyallsvenskan 2026/27

Startdatum **23 september 2026**, säsong **2026/27**. Modellversion
`se-evidence-2`, databasversion `se-2026-09-23-rosters1`, granskad
**23 september 2026**. Den tidigare 7-septemberdatabasen ersätts endast
för nya karriärer. Septemberövergångar backdateras inte.

709 verkliga spelare i de 28 starttrupperna, sex verkliga frispelare,
fyra spelare utanför de svenska starttrupperna och en pensionerad spelare
har stabila identiteter. 36 spelare har lagts till, nio befintliga spelare
flyttats mellan svenska trupper på lån och sju andra avgångar/statusändringar
registrerats. De tre utgående lånen ingår bland dessa sju.

[Truppuppdateringen](ROSTER_UPDATE_2026-09-23.md) och
[ändringsunderlaget](data/roster-update-2026-09-23.json) beskriver källor,
datum, motstridiga listor och kvarstående luckor.

46 fysiska profiler har rättats: Almtunas och Moras vikter hade importerats
i pund som kilogram, och längderna saknades. Korrigeringarna är ID-bundna,
har enhetsangivelser och kräver att ursprunglig identitet och värde stämmer.

16 officiella förbundstabeller från 2024/25 och 2025/26 kompletterar
264 statistikposter för 157 spelare, inklusive en av frispelarna.
Övriga tvåsäsongsuppgifter återanvänds från den dokumenterade startdatabasen.
Komplett täckning, avvisade matchningar och begränsningar finns i
[data/player-evidence-coverage.json](data/player-evidence-coverage.json).

## Verifierade trupper

Antalen avser den **aktiva spelklubben** den 23 september, inklusive
inlånade spelare. Utlånade tillkommer när de återvänder till ägarklubben.
Juniorer som uttryckligen finns i A-truppens publicerade lista ingår.
Vi fyller inte ut lagen med påhittade verkliga personer. Separata
juniorlag och framtida ungdomsintag i spelet är fortfarande fiktiva.

| Liga | Klubb | MV | Backar | Forwards | Totalt | Truppkälla |
|---|---|---:|---:|---:|---:|---|
| SHL | Björklöven | 2 | 8 | 15 | 25 | [2026/27](https://www.eliteprospects.com/team/15/if-bjorkloven) |
| SHL | Brynäs IF | 2 | 8 | 14 | 24 | [2026/27](https://www.eliteprospects.com/team/2/brynas-if) |
| SHL | Djurgårdens IF | 2 | 8 | 15 | 25 | [2026/27](https://www.eliteprospects.com/team/3/djurgardens-if) |
| SHL | Frölunda HC | 3 | 8 | 15 | 26 | [2026/27](https://www.eliteprospects.com/team/12/frolunda-hc) |
| SHL | Färjestad BK | 3 | 8 | 13 | 24 | [2026/27](https://www.eliteprospects.com/team/4/farjestad-bk) |
| SHL | HV71 | 3 | 9 | 16 | 28 | [2026/27](https://www.eliteprospects.com/team/5/hv71) |
| SHL | Linköping HC | 3 | 10 | 16 | 29 | [2026/27](https://www.eliteprospects.com/team/6/linkoping-hc) |
| SHL | Luleå HF | 2 | 7 | 13 | 22 | [2026/27](https://www.eliteprospects.com/team/7/lulea-hf) |
| SHL | Malmö Redhawks | 2 | 9 | 14 | 25 | [2026/27](https://www.eliteprospects.com/team/8/malmo-redhawks) |
| SHL | Rögle BK | 2 | 8 | 17 | 27 | [2026/27](https://www.eliteprospects.com/team/32/rogle-bk) |
| SHL | Skellefteå AIK | 4 | 10 | 16 | 30 | [2026/27](https://www.eliteprospects.com/team/22/skelleftea-aik) |
| SHL | Timrå IK | 3 | 7 | 15 | 25 | [2026/27](https://www.eliteprospects.com/team/11/timra-ik) |
| SHL | Växjö Lakers | 3 | 8 | 15 | 26 | [2026/27](https://www.eliteprospects.com/team/339/vaxjo-lakers-hc) |
| SHL | Örebro Hockey | 2 | 9 | 15 | 26 | [2026/27](https://www.eliteprospects.com/team/36/orebro-hk) |
| HA | AIK | 3 | 9 | 14 | 26 | [2026/27](https://www.eliteprospects.com/team/1/aik) |
| HA | Almtuna IS | 2 | 7 | 14 | 23 | [2026/27](https://www.eliteprospects.com/team/13/almtuna-is) |
| HA | BIK Karlskoga | 2 | 7 | 16 | 25 | [2026/27](https://www.eliteprospects.com/team/25/bik-karlskoga) |
| HA | IK Oskarshamn | 2 | 8 | 14 | 24 | [2026/27](https://www.eliteprospects.com/team/31/ik-oskarshamn) |
| HA | Kalmar HC | 2 | 9 | 15 | 26 | [2026/27](https://www.eliteprospects.com/team/778/kalmar-hc) |
| HA | Leksands IF | 3 | 7 | 15 | 25 | [2026/27](https://www.eliteprospects.com/team/28/leksands-if) |
| HA | MoDo Hockey | 2 | 8 | 15 | 25 | [2026/27](https://www.eliteprospects.com/team/9/modo-hockey) |
| HA | Mora IK | 2 | 9 | 17 | 28 | [2026/27](https://www.eliteprospects.com/team/29/mora-ik) |
| HA | Nybro Vikings | 2 | 8 | 13 | 23 | [2026/27](https://www.eliteprospects.com/team/335/nybro-vikings-if) |
| HA | Södertälje SK | 2 | 8 | 14 | 24 | [2026/27](https://www.eliteprospects.com/team/10/sodertalje-sk) |
| HA | Vimmerby HC | 2 | 7 | 14 | 23 | [2026/27](https://www.eliteprospects.com/team/498/vimmerby-hc) |
| HA | Visby/Roma | 2 | 8 | 14 | 24 | [2026/27](https://www.eliteprospects.com/team/1226/visby-roma) |
| HA | Västerås IK | 2 | 9 | 14 | 25 | [2026/27](https://www.eliteprospects.com/team/308/vasteras-ik) |
| HA | Östersunds IK | 3 | 8 | 15 | 26 | [2026/27](https://www.eliteprospects.com/team/1595/ostersunds-ik) |

HV71 har nu 28 spelare. Markuss Komuls och Pavol Regenda ingår,
liksom junioren Alexander Proos. Proos saknar verifierad matchstatistik
och fysiska mått i underlaget; profilen visar detta och använder en
osäker neutral startbedömning.

Nathan Staios listas som provspelare i Leksand och ingår inte i den
kontrakterade truppen. Edvin Hammarlund förekom i både Almtunas och
Örebros listor. Örebros och Almtunas egna besked fastställer spelklubb,
ägarklubb och slutdatum. Han finns endast en gång i spelet.
Spelar-ID från källan, inte namnlikhet, identifierar en person. Den äldre
SHL-databasens Anton Olsson (född 2003) ingår inte i dessa aktuella
SHL-trupper; Västerås Anton Olsson (2006) är en annan person.

## Kontroll mot officiella källor

- [Svenska Ishockeyförbundets SHL-poängliga 2025/26](https://stats.swehockey.se/Players/Statistics/ScoringLeaders/18263):
  Jonathan Ang 52 matcher, 21 mål och 25 assist. Spelarprofilens 38
  utvisningsminuter hålls skilda från plus/minus −10.
- [Officiella SHL-målvaktsstatistiken](https://stats.swehockey.se/Players/Statistics/LeadingGoaliesSVS/18263):
  Tobias Normann 24 matcher, 92,34 procent. Nu används även de officiella 522 skotten och 482 räddningarna;
  andelen beräknas från dessa observerade heltal.
- [Hockeyallsvenskans officiella poängliga 2025/26](https://stats.swehockey.se/Players/Statistics/ScoringLeaders/18266):
  Scott Pooley 51 matcher, 27 mål och 32 assist; Eero Teräväinen
  52 matcher, 15 mål och 23 assist. Kontrollen finns även i föregående underlag.
- [Örebro om Hammarlunds lån](https://www.orebrohockey.se/article/cnyatix-3afc1/view)
  och [Almtunas kontraktsbesked](https://www.almtuna.com/article/mtxatiw-1bc61/view):
  Almtuna äger avtalet, Örebro lånar spelaren till september månads slut.
- [Visby/Romas besked om Isak Jonsson](https://visbyroma.se/visby-roma-lanar-in-isak-jonsson-under-forsasongen/)
  kompletteras med [daterad rapport om augusti–september](https://hockeysverige.se/hockeyallsvenskan/visby-roma-lanar-isak-jonsson-hockeyallsvenskan-aewnq4s29ywP/).
- [Svenska Ishockeyförbundets regelböcker](https://www.swehockey.se/domare/information/ladda-ned-regelboken/):
  regel 5.1 i 2026/27 års regelbok anger högst 20 utespelare och två
  målvakter i matchtruppen. Det används som spelets uttagningsgräns.

## Hur attribut och potential bedöms

`player-evidence-model.js` är en ren, deterministisk startmodell.
`allsvenskan.js` använder den när en ny spelare skapas; laddning av en
befintlig spelare räknar inte om förmåga, potential, kontrakt eller historia.
Skalan är fortfarande 1–20, och samma attribut går till matchmotor,
träning, roller och AI. Personalens stjärnor jämförs med den egna truppen;
de är ingen separat matchbonus och visar aldrig utvecklingens privata tak.

- Senaste avslutade säsongen viktas fullt, föregående hälften, tillsammans
  med faktiskt matchantal. Detta är en transparent försiktighetsregel,
  inte en statistiskt kalibrerad universell ligaöversättning. Senare
  säsonger får inte påverka starten. Liganivåerna i `HA_LEAGUE_LEVEL`
  behålls som uttryckliga spelantaganden.
- Mål och assist per match stödjer avslut respektive passningar. Tolv
  referensmatcher dämpar små stickprov. Klubbbyten inom samma liga/säsong
  summeras **före** utjämning, så samma produktion inte krymps två gånger.
  Matchantal är en approximation av användning; utespelarnas faktiska
  istid och PP/PK-roller saknas. Inga falska värden per 60 minuter skapas.
- Poäng höjer inte längre vision/puckkontroll automatiskt. Vikt höjer inte
  styrka eller tacklingar. Utvisningsminuter sänker inte automatiskt
  personlig disciplin; minor/major och sammanhang saknas. Dessa egenskaper
  har fortsatt osäkra positions- och ligareferenser, vilket anges i profilen.
- Förbundets registrerade tekningar påverkar tekningsattributet. Resultatet
  utjämnas mot 50 procent över 200 referenstekningar. Saknad tekningsdata
  är inte noll prestation. Topplistor täcker endast en del av spelarna.
- Målvakter har en separat modell. Registrerade räddningar/skott används
  när de finns. En grundreferens motsvarar 600 skott vid 90 procent;
  utan skottvolym används en försiktigare proxy om 30 matcher, aldrig
  påhittade skott. Säsongerna sammanvägs, och utfallet påverkar främst
  reflexer och i mindre grad positionering. Räddningsprocent används
  **inte** som bevis för returkontroll, plock/stöt, rörelseteknik eller kyla.
  Skottkvalitet och lagförsvar är fortfarande okända störfaktorer.
- Potentialens centrala scenario använder åldersmarginal, observerad
  tävlingsnivå och nivåförändring mellan två säsonger med minst 15 matcher
  vardera. Små underlag ger bredare låg-/högscenarier, inte negativa
  personligheter. Scenarierna är modellantaganden, inte utlovade framtida
  betyg eller sannolikheter. Den centrala marginalen används av befintlig
  sparad utvecklingslogik; attributspecifika tak och utvecklingstakt
  fortsätter vara individuella och deterministiska.
- Scoutrapporten fryser sitt potentialunderlag vid observationen. En dold
  attribut- eller potentialändring efteråt avslöjas inte före ny observation.
  Bättre scouting tar inte bort databasens inneboende osäkerhet. Egna
  attribut visas exakt enligt spelmodellen, inte som verklighetsfacit.
- Nya verkliga spelare får neutral, uttryckligen obestämd personlighet.
  Gamla sparade personligheter och redan inträffade reaktioner behålls.

Löner, marknadsvärden, form och humör är fortsatt speluppskattningar.
Publicerade kontraktsslut ger garanterade år utan optionsår. Okända
kontraktslängder använder en säsong som deklarerat spelantagande. Exakta
avtal, ledarskapsomdömen eller scoutingtexter har inte konstruerats.

## Reproducerbar datakedja

1. `allsvenskan-data.js` och `WORLD_START_FREE` innehåller daterade rådata.
   Ändringar dokumenteras med ID, födelsedatum och källa i truppuppdateringen.
2. `data/player-fact-corrections.json` innehåller motiverade, daterade
   enhetskorrigeringar, identitetsvillkor och källor.
3. `data/player-stat-observations.json` innehåller faktaceller från
   offentliga förbundstabeller, inte hela kopierade webbsidor.
4. `python scripts/import-swedish-observations.py /sökväg/till/html`
   läser tabellerna från lokala HTML-filer. Grundserie kontrolleras;
   säsongsväljarens länkar kan annars råka leda till kval/slutspel.
5. `node scripts/build-player-evidence.cjs` normaliserar, kontrollerar
   identiteter och producerar `player-evidence-data.js` samt täckningsrapport.
   Namn används endast för kandidatsökning. Även historisk klubb, liga,
   säsong, position och matchantal måste stämma; där mål/assist eller
   räddningsprocent finns krävs samma statistikfingeravtryck. Tvetydiga
   poster avvisas. Slutresultatet binds till befintligt ID och födelsedatum.
6. `node scripts/build-player-evidence.cjs --check` verifierar identisk
   generering utan skrivningar. Inga liveanrop görs när spelet startas.

Nya sparningar lagrar metodidentifieraren 3 och potentialens låg-/höggränser
kompakt. Metodidentifieraren 2 behåller sitt historiska startdatum 7 september.
Källstatistik, individuella utvecklingstak och karriärhistorik bevaras.
Sparfilsformatet är oförändrat; den befintliga förlustfria komprimeringen
hanterar större karriärer. Kvottestet prövar faktisk lagring och återläsning,
inte bara storleken på en okomprimerad export.

Alla 28 truppsidor har kontrollerats. Senare daterade klubbesked prioriteras
vid konflikt. Melvin Nilssons återkallelse gäller före BIK:s äldre listning.
Brynäsforwarden Leo Sundqvist och Skellefteåbacken med samma namn är olika
personer med olika ID och födelsedatum. Nathan Staios provspel och
Elliot Ekefjärds lån för en enstaka match blir inga påhittade säsongsavtal.

Juniorer som listas i seniortrupperna omfattas av samma modell. Verifierad
statistik saknas för Alexander Proos och Johannes Neumann; uppgifterna
lämnas tomma. Hela verkliga akademitrupper har inte importerats; spelets
separata juniorlag är fortfarande fiktiva.

## Registrerade lån

| Spelare | Återgångsklubb | Spelklubb | Sista lånedag i spelet | Källa |
|---|---|---|---|---|
| Martin Schreiber | Malmö Redhawks | AIK | 2027-05-15 * | [Underlag](https://www.malmoredhawks.com/article/89yatl5-33nad/view) |
| Bruno Osmanis | Björklöven | Almtuna IS | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/695039/bruno-osmanis) |
| Charlie Forslund | Brynäs IF | Almtuna IS | 2027-05-15 * | [Underlag](https://www.brynas.se/article/i71atlc-1ekad/view) |
| Hugo Hävelid | Djurgårdens IF | Almtuna IS | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/578759/hugo-havelid) |
| Leo Sundqvist | Brynäs IF | Almtuna IS | 2027-05-15 * | [Underlag](https://www.brynas.se/article/i71atlc-1ekad/view) |
| Måns Goos | Färjestad BK | BIK Karlskoga | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/867379/mans-goos) |
| Oscar Holmertz | Linköping HC | BIK Karlskoga | 2027-05-15 | [Underlag](https://www.lhc.eu/article/q90atlc-30c01/view) |
| Milton Gästrin | St. Louis Blues | Brynäs IF | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/797476/milton-gastrin) |
| Theo Stockselius | Calgary Flames | Djurgårdens IF | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/689913/theo-stockselius) |
| Jack Berglund | Philadelphia Flyers | Färjestad BK | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/714281/jack-berglund) |
| Malte Gustafsson | New York Islanders | HV71 | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/886275/malte-gustafsson) |
| Axel Elofsson | Örebro Hockey | IK Oskarshamn | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/876777/axel-elofsson) |
| Axel Nyman | Rögle BK | IK Oskarshamn | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/730701/axel-nyman) |
| Olle Karlsson | Växjö Lakers | IK Oskarshamn | 2027-05-15 | [Underlag](https://www.ikoskarshamn.se/article/ffyatli-2egc1/view) |
| Jakob Ihs-Wozniak | Luleå HF | Kalmar HC | 2027-05-15 * | [Underlag](https://www.luleahockey.se/article/7hbatle-30c4d/view) |
| Viktor Klingsell | Skellefteå AIK | Kalmar HC | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/802841/viktor-klingsell) |
| Viktor Olofsson | Malmö Redhawks | Karlskrona HK | 2027-05-15 * | [Underlag](https://www.malmoredhawks.com/article/w8zatl6-33nad/view) |
| Lukas Nikolaj Pettersen-Finckenhagen | Almtuna IS | Lindlövens IF | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/transfer/2026/09/16/lukas-nikolaj-pettersen-finckenhagen-in-a-loan-to-lindlovens-if/649866) |
| Elton Hermansson | Los Angeles Kings | MoDo Hockey | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/859984/elton-hermansson) |
| Mikkel Eriksen | Färjestad BK | Mora IK | 2027-05-15 * | [Underlag](https://www.farjestadbk.se/article/bm2atlr-23h01/view) |
| Victor Hedin Raftheim | Brynäs IF | Mora IK | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/861251/victor-hedin-raftheim) |
| Aron Dahlqvist | Brynäs IF | Nybro Vikings | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/805267/aron-dahlqvist) |
| Kalle Hemström | Malmö Redhawks | Nybro Vikings | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/856708/kalle-hemstrom) |
| Tinus Luc Koblar | Toronto Maple Leafs | Rögle BK | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/882367/tinus-luc-koblar) |
| Felix Carell | Malmö Redhawks | Södertälje SK | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/756647/felix-carell) |
| William Håkansson | Luleå HF (kontrakt: Carolina Hurricanes) | Södertälje SK | 2027-05-15 * | [Underlag](https://www.luleahockey.se/article/p1fatlg-30c4d/view) |
| Eddie Genborg | Detroit Red Wings | Timrå IK | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/794303/eddie-genborg) |
| Gustaf Kangas | Björklöven | Vimmerby HC | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/717086/gustaf-kangas) |
| Isak Sörqvist | Luleå HF | Vimmerby HC | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/874937/isak-sorqvist) |
| Ludvig Andersson | Örebro Hockey | Vimmerby HC | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/903911/ludvig-andersson) |
| Isak Jonsson | Lindlövens IF | Visby/Roma | 2026-09-30 | [Underlag](https://visbyroma.se/visby-roma-lanar-in-isak-jonsson-under-forsasongen/) |
| Daniel Meyer | Almtuna IS | Wings HC | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/team/13/almtuna-is/transfers) |
| Edvin Hammarlund | Almtuna IS | Örebro Hockey | 2026-09-30 | [Underlag](https://www.orebrohockey.se/article/cnyatix-3afc1/view) |
| Leo Sundqvist | Skellefteå AIK | Östersunds IK | 2027-05-15 * | [Underlag](https://www.eliteprospects.com/player/648366/leo-sundqvist) |
| Simon Carlsson | AIK | Östersunds IK | 2026-10-17 * | [Underlag](https://www.ostersundik.com/article/xvwatlg-55c5i1/view) |

\* Exakt lånetid är inte fastställd i det insamlade offentliga underlaget.
Spelet använder säsongens slut den 15 maj, utom Simon Carlssons
minst en månad långa lån där 17 oktober används som sista lånedag.
Alla initiala lån har en
antagen löneandel på 100 % för mottagaren, inte ett påstående om avtalet.
NHL-rättigheter utan signerat avtal likställs inte med ägande: exempelvis
ägs Måns Goos av Färjestad och Viktor Klingsell av Skellefteå i lånesystemet.

## Matchtrupp och lån i spelet

- 12 forwards, 6 backar, 2 valfria extra utespelare och 2 målvakter.
  Matchtruppen låses vid första start. Skadade och spelare utanför den
  kan inte sättas in. Extra spelare väljs under Kedjor och används vid
  coachbyten eller som ersättare vid skada. AI-lagen har samma maximala bänk.
- Lånecentralen finns under Rekrytering och nås även från bänkpanelen
  och spelarprofiler. Välj riktig SHL/HA-klubb, fyra/åtta veckor eller
  säsongen ut, samt 0–100 % av lönen för mottagaren. Klubbens behov och
  löneutrymme kontrolleras; en viss istid eller startplats garanteras inte.
- En spelare finns bara i mottagarens aktiva trupp. Ägarklubben finns i
  låneavtalet. Lön räknas en gång med avtalad fördelning, ursprungligt
  kontrakt behålls, och mottagarens matchmotor väljer spelaren utifrån
  konkurrens, form, trötthet och hälsa.
- Ligamatcher/slutspel, istid och poäng följs från samma matchrader som
  ligastatistiken. Utlånade får mottagarklubbens träning och verkliga
  matchutveckling. De räknas inte samtidigt i ägarklubbens träning eller
  det äldre systemet med fiktiva juniorutvecklingslån.
- Lån kan avslutas mellan matcher, löper ut dagen efter sista avtalsdagen
  och återställs innan nästa säsongs kontraktsbehandling. Skador, attribut,
  kontrakt och historik följer spelaren hem. Inlånade kan inte säljas,
  lånas vidare eller få sitt ägaravtal ändrat av mottagaren.
- Vid återgång till en klubb utanför de 28 spelbara klubbarna bevaras
  spelaren som externt ägd. NHL och Hockeyettan får inga fiktiva matchresultat
  och spelaren blir inte en gratis kontraktslös värvning.

## Sparningar och verifiering

Nya karriärer får den daterade databasen. Äldre karriärer behåller sina
spelare, värvningar, träning och kontrakt. Nya lån och bänkval fungerar
även där. Truppsidan visar hur man granskar en ny karriär utan att först
ersätta den gamla; befintligt flöde bevarar den föregående karriären.

`roster-depth.test.cjs` kontrollerar 709 unika truppidentiteter, källtäckning,
attributunderlag, samtliga 28 uttagningar, spärr mot spelare utanför
matchtruppen, skadors ersättare, målvaktslån med riktiga HA-matchrader,
lönefördelning, utveckling, återkallelse, externt ägande och sparfiler.
Övriga testsviter täcker matchmotor, transferförhandlingar, säsongsskifte
med båda ligorna och äldre sparningar. Webbläsartestning med bildgranskning
ingår inte i denna kontroll.
