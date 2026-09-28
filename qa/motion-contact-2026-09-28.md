# Rörelse, puckkontakt och tidsstyrning – 28 september 2026

Detta är en redovisning av ändringar i det befintliga spelet. Den är inte ett
godkännande av hela beställningens animations- eller hockeykvalitet.

## Granskad utgångspunkt

`main` var `4944a6f`. Den senaste befintliga utvecklingen låg i PR 269,
`feature/3d-broadcast-upgrade`, commit `5b8001230d94d18df142ebd03bd4d45ca3298849`.
Arbetet fortsätter ovanpå den versionen. Befintlig JavaScript/Three.js/Electron-
stack, karriäradaptrar, spelaridentiteter och sparformat behålls. Inga ligor,
installationspaket eller separat matchprototyp har tillkommit.

Koden hade redan fasta simuleringssteg om 100 ms, fysiskt svepta puckkontakter,
avbrytbar skottförberedelse, målvaktsbeslut, lagroller, byten, 15-ledade skinnade
spelarmodeller och Three.js-rendering. Det var inte korrekt att behandla allt
detta som färdigt enbart därför att tidigare tester passerade.

De konkreta svagheterna i den granskade koden var:

- Benanimationen och registrerad skridskokontakt använde olika åkkurvor.
- Konstant fart gav nästan ingen drivande benrörelse; positiv acceleration var
  i praktiken villkoret för att ta skär.
- Handledsskottets förberedelse kunde lyfta klubbladet från den kontrollerade
  pucken. Förberedelsens angivna längd slutade mellan de faktiska beslutsticken.
- Sparade reprisbilder kom var 200:e ms. Korta skott och kontakter kunde försvinna
  mellan bilderna; linjär puckinterpolation kunde gena över en sargstuds.
- Reprissökning antog alltid 200 ms mellan bilder. Resultattavlan kunde samtidigt
  visa den pågående matchens senare tid och numerära läge.
- Den vanliga uppspelningsklockan kastade bort tid över 100 ms per bildruta.
  Även avrundning i ackumulatorn gav en skillnad på ett tick mellan bildfrekvenser.
- Hjälm/huvud hade överdrivna proportioner. Rörelsekurvorna och karaktärernas
  formgivning är fortfarande tydligt stiliserade.

## Faktiska ändringar

**Tidsstyrning och gemensamt tillstånd.** Ackumulatorn behåller förfluten tid vid
vanliga renderingshack och kör samma fasta steg med befintlig arbetsbudget.
Ett extremt enskilt avbrott begränsas till en sekund; dold flik pausar matchen.
Flyttalsgränsen vid ett helt tick har korrigerats.

**Skridskor.** Simuleringen registrerar en åkfas från verklig förflyttning,
hastighet, kroppslängd och energi. Samma författade kurva styr ben, iskontakt,
skärriktning och fotens återföring. Konstant fart får fortsatta skär; avtagande
fart kan ge glid. Översteg, baklängesåkning och bromsning använder samma blandade
fas. Fotleden får pitch under återföringen. Befintlig separat överkropp och
tvåbens-IK behålls.

**Klubba och puck.** Handledsskott laddar kroppen med bladet vid pucken;
slagskott behåller sin bakåtsving. Förberedelsen slutar vid det tick där skottet
faktiskt kan släppas. Puckens verkliga mellanliggande kontaktpunkter och
kontakttider registreras, inklusive uppdelade styrningar och återstående rörelse
efter sargträff. Interpolation följer denna bana. Mottagning byter puckförare
vid den registrerade händelsen; en annan spelares samtidiga kontakt kan inte
utlösa bytet. Effekter och befintligt händelsestyrt ljud får kontakttiden.

**Repriser och tavla.** Inspelning sker varje simuleringssteg, med tidsbegränsat
minne. Repriser och coachklipp söker efter verkliga tidsstämplar; äldre 200 ms-
inspelningar fungerar också. Coachklipp behåller sin begränsade lagringsbudget.
Resultat, periodtid och numerärt läge hämtas från den bild som faktiskt visas.
Ett interpolerat mål och en avslutad utvisning visas först efter målhändelsen.

**Modeller och mätning.** Huvud, hjälm, visir och mask har proportionerats om
tillsammans, utan byte av rigg eller ökade vertexantal. Diagnostiken räknar även
p99, maximalt hack och antal bildrutor över 50/100 ms; långa hack filtreras inte
bort ur denna nya mätning.

## Tillgångar och användningsrätt

Modellerna skapas av `scripts/build-hockey-model.cjs`; åkkurvorna är projektets
egna i `match-broadcast-motion.js`. Inga externa modeller, motion capture-klipp
eller nya utrustningstexturer har importerats. Det finns ingen separat extern
modell-/animationslicens att uppfylla och ingen ny öppen licens tilldelas
projektets egna tillgångar. Three.js behåller MIT-licensen i
`assets/vendor/three-LICENSE.txt`. Befintliga klubbidentiteter är oförändrade.
Detaljer och reproduktionskommandon finns i `assets/models/README.md`.

Detta material ska beskrivas som egenbyggda, stiliserade tillgångar. En större
uppsättning artistgranskade grundanimationer, bättre axel/höftdeformation och
mer individuella målvaktsrörelser återstår som faktiskt produktionsarbete.

## Körning och visuell kontroll

En riktig karriärmatch HV71–Björklöven startades i det fullständiga spelet.
Samma sparade läge, spelar-ID:n, slumpgenerator och följande kamera användes
före/efter. Startläget hade matchtid 17,2 s, simulerad väggtid 19 s och RNG
2604275651. Den jämförbara inspelningen visar väggtid 40–64 s med två femmor
och målvakter. Ordinarie karriärmotor väljer allt spel; inga passningar,
avslut eller utfall är hårdkodade i inspelningsverktyget.

Sekvensen innehåller puckhämtning/uppspel, press och puckkamp, passningar,
anfall, tre avslut och en räddning med fortsatt spel. Före/efter hade samma
slutliga RNG, statistik och resultat. Avsluten vid matchtid 50,6 / 54,1 / 60,2 s
slutade utanför / räddning / utanför i båda versionerna.

Videofilerna visar 24 sekunder, 720 bildrutor, 30 fps och normal simulerad
rörelsehastighet. De har renderats bildruta för bildruta från inspelade
matchtillstånd och beskärts till rinkområdet. **De bevisar inte realtidsprestanda.**
De är utan ljud. Rörelsen granskades i tidsordnade bildruteföljder, inklusive
skridskor, skottförberedelse, puckbana och målvaktskontakt. Ingen mänsklig
bedömning av kontinuerlig videouppspelning eller ljudkvalitet har genomförts.

Det gick att inspektera den körande WebGL-versionen och dess inspelade bilder.
Båda jämförelsekörningarna hade 12 spelare, inga JavaScript-fel, WebGL-fel 0
och ingen sidskroll i 1920×1080. Resultattavlans senare korrigering kontrolleras
separat av tester och den avslutande körningen; rinkklippens rörelse berörs inte.

Reproducera med Node, Playwright, Chromium och ffmpeg:

```sh
node scripts/review-match-motion.cjs --save=/absolute/path/Hockey_Manager_teststart.json --out=/absolute/path/review
```

Verktyget stöder `--root`, `--playwright`, `--browser`, `--software`,
`--start`, `--seconds`, `--quality` och `--perf`. `--perf` kör den riktiga
uppspelningsklockan utan videoinspelning och sparar råa frametidsmått.

## Logik- och regressionskontroller

- Utgångspunktens 44 riktade tester för broadcast, rigg/målvakt, kontakt,
  lagspel och fysisk matchrörelse passerade före ändringarna.
- 38 tester för den nya kontaktkedjan, 3D-poser och taktiska repriser passerade
  efter ändringarna. De sex nya kontakt-/tidsstyrningstesterna kördes även om
  efter den sista korrigeringen av vilket puckförarbyte som ska visas.
- Kontrollerna omfattar verklig sargkontakttid, puckbanans studs, mottagning,
  fortsatt skridskoarbete i konstant fart, glid, stillastående fötter,
  sparning/återupptagning, ren rendering, samma 50 tick vid 20 respektive
  250 ms mellan bildrutor samt inspelad period/resultat/numerärt läge.
- Fyra kompletta spelade karriärmatcher med samma start och beslut kördes
  genom `scripts/check-playback-parity.cjs`: hel match, utökade höjdpunkter,
  höjdpunkter och kommentarer. Alla slutade 3–1 med identisk matchstatistik,
  skottbokföring, istid, energi och RNG. Detta avser den spelade matchens
  presentationslägen, inte ligans separata AI-bakgrundsmotor.
- Höjdpunktskontrollens gamla testdata hade samma väggtid i flera olika
  reprisbilder. De har fått stigande tidsstämplar och testet passerade vid
  omkörning. Windows-kontrollen söker nu efter faktiska kontakttider inom
  senaste simuleringssteget och spelar upp klippets tidsstämplade slutsekvens.

Testresultat är belägg för respektive logiskt kontrakt, inte för att
grundanimationerna håller slutlig visuell kvalitet. Aktuella automatiska
regressions- och Windows-körningar finns på
[PR 269](https://github.com/robinhallin/Hockey-manager/pull/269/checks).

## Uppmätt presentation

Testmiljö: Linux x86-64, AMD EPYC 9V74, 9 synliga virtuella processorer.
Chromium 153.0.8010.0 med ANGLE/SwiftShader **utan fysisk GPU**. Webbläsaren
begränsades till sex vCPU; andra regressionstester kördes samtidigt och gör
jämförelsen olämplig som kontrollerad prestandavinst. Viewport 1920×1080,
normal rinkcanvas 1886×736. Varje körning hade 10 s uppvärmning och 60 s mätning
utan videoinspelning. Samma karriärstart, kamera och 1× uppspelning användes.

| Körning | Bildrutor | Median ms | p95 ms | p99 ms | Max ms | Över 100 ms |
|---|---:|---:|---:|---:|---:|---:|
| Före, normal | 159 | 366,6 | 683,3 | 766,6 | 1049,9 | 146 |
| Efter, normal | 132 | 366,7 | 966,7 | 1333,3 | 1400,0 | 108 |
| Efter, låg | 250 | 233,3 | 466,6 | 766,7 | 1016,5 | 211 |

**60 fps är inte uppnått här och ingen relativ FPS-förbättring är visad.**
De långa pauserna är synliga, inte bortfiltrerade. Fasta matchregler fungerar
fortfarande, men denna maskin lämpar sig inte för smidig 3D-matchvisning.
Den korrigerade klockan hinner fler riktiga simuleringssteg under samma
väggtid; äldre versionens tappade tid får inte misstolkas som högre prestanda.
En separat mätning på dokumenterad Windows-maskin med GPU behövs.
Fullständiga mätdata finns i `qa/motion-contact-performance.json`.

## Statistisk kontroll

Det befintliga produktionsmotortestet körde 96 perioder med frön `i * 1107`,
en låst truppkälla och ordinarie motorpatchar. Det gav per lag och 60 minuter:
2,156 mål, 28,5 skott på mål, 56,594 skottförsök och 92,43 % räddningar.
Det är 96 perioder, **inte 96 kompletta karriärmatcher**.

SIF:s avslutade SHL-säsong 2025/26 ger 2,70 mål per lag och 60 minuter,
24,48 skott per lagmatch (17 820 skott / 728 lagmatcher) och 88,79 % räddningar.
Skottmåttens tidsbas är inte identisk eftersom referensen inkluderar förlängning.
Urvalet består inte heller av samma lagmix som en full SHL-säsong.

Skillnaden är ändå ett tydligt kvarvarande problem: testmotorn producerar fler
skott och lägre utdelning än referensen. Testets breda godkända spelintervall
är därför inte ett bevis för SHL-kalibrering. Inga slutresultat har tvingats fram
för att passa statistiken. Avslutstyper och utvisningar saknar i denna granskning
en fullständigt verifierad jämförbar ligareferens.

En separat före/efter-körning använde 24 perioder per version, samma frön
`i * 1107`, Match Engine 4 och managerkontroller utan karriärmodifierare:

| Version | Mål per lag/60 | Skott per lag/60 | Räddningar | Utvisningar per lag/60 |
|---|---:|---:|---:|---:|
| Före | 2,19 | 29,69 | 92,63 % | 2,38 |
| Efter | 2,13 | 29,63 | 92,83 % | 2,13 |

Det bekräftar att den statistiska avvikelsen fanns i utgångspunkten.
Det visar också att en ny motorversion kan ge andra utfall efter korrigerade
kontakttider och återhämtning. Kravet på identiska utfall gäller olika
presentationslägen inom samma motorversion. Jämförelsefilmens korta sekvens
hade däremot identiska utfall även mellan versionerna. Råa fördelningar av
bland annat avslutstyper finns i `qa/motion-contact-balance.json`.

## Återstående kvalitetsbrister

- Rörelse och modeller når ännu inte beställningens slutliga kvalitetsnivå.
  Bättre grundklipp, rikare riktningsövergångar och mer naturlig balans behövs.
- Alla typer av avslut och målvaktsrörelser är inte visuellt granskade i
  separata jämförbara sekvenser. Backhand och vissa specialräddningar är
  fortfarande förenklade. Returriktning innehåller sannolikhetsval och behöver
  starkare koppling till den träffade utrustningsdelen.
- Fullständigt regelgodkännande saknas. Offside använder fortfarande förenklad
  spelarposition i stället för båda skridskornas läge. Icing bedömer en förenklad
  puckjakt vid mållinjen. Regelprofilen är inte en fullständig hybridicingmodell.
- Jämförelsen mot Svenska Ishockeyförbundets publicerade ändring av regel 83
  för 2026/27 bekräftar vikten av klubbkontroll och båda skridskorna. Befintlig
  kod undantar puckföraren, men det räcker inte som full regelverifiering.
- Alla visuella lägen för den spelade matchen delar motorn. AI-matcher i
  bakgrunden har fortfarande en separat grövre motor; denna leverans gör dem
  inte till samma detaljerade matchsituation.
- Ingen dokumenterad Windows-dator med fysisk GPU har testats här. Långvarigt
  grafiskt spel under en hel match och 60 fps på målmaskin återstår.

Referenser kontrollerade 28 september 2026:

- [SIF: regelboken 2026/27 och ändring av regel 83](https://swehockey.se/domare/nyheter-foer-domare/regelbok-20262027-publicerad/)
- [SIF: spelregler 2026/27](https://pdf.mediahandler.se/pdf/Spelregler_for_ishockey_2026-2027/)
- [SIF: SHL 2025/26, skott och målvakter](https://stats.swehockey.se/Teams/Statistics/ScoringAndGoalkeeping/18263)

## Berörda system och filer

| System | Filer |
|---|---|
| Matchsteg, puckbana, kontakttid och inspelning | `match-simulation.js`, `match-rules-3.js` |
| Karriärens klocka, sparvalidering, repris och tavla | `career-match.js`, `match-coach-clips.js`, `match-engine-4.js` |
| Åkkurvor, IK-pose, skridskoleder och diagnostik | `match-broadcast-motion.js`, `match-3d.js`, `match-player-model.js`, `match-broadcast-scene.js` |
| Tillgångar | `scripts/build-hockey-model.cjs`, `match-player-asset.js`, `assets/models/hockey-uniform.gltf`, `assets/models/hockey-broadcast.gltf`, `assets/models/hockey-broadcast.js`, `assets/models/README.md` |
| Laddningsordning och befintlig isolerad testvy | `index.html`, `match-lab.html`, `match-lab.js` |
| Regressionskontroller och reproducerbar inspelning | `match-motion-contact.test.cjs`, `match-3d.test.cjs`, `match-tactical-replay.test.cjs`, `highlight-playback.test.cjs`, `desktop/match-3d-ui.cjs`, `scripts/review-match-motion.cjs` |
