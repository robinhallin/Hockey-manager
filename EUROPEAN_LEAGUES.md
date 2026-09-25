# Europeiska ligor – förberedelse för spelbara karriärer

Utgångspunkt: `main` vid `f947114`, säsong 2026/27, kontrollerat 25 september 2026.

Detta är första implementationen av databasen, importkedjan och schemastödet.
**De tre nya ligorna är ännu inte valbara eller spelbara i karriärläget.** Målet
är fullständiga klubbuppdrag med samma spelmotor som SHL och HA. Ingen alternativ
förenklad matchmotor har införts. Svenska karriärer behåller sina klubbar,
spelare, kontrakt, matchordning och sparformat.

## Levererat

| Liga | Stabila klubb-ID:n | Källposter för spelare | Attributförhandsbedömningar | Hämtade klubbmärken |
| --- | ---: | ---: | ---: | ---: |
| Tipsport extraliga, Tjeckien | 14 | 0 | 0 | 0 av 14 |
| National League, Schweiz | 14 | 413 | 352 | 14 av 14 |
| Liiga, Finland | 17 | 515 | 399 | 17 av 17 |

`data/europe/catalog.json` innehåller ligor, länder, valutor, klubbar, alias,
källor, bildkällor och kända säsongsregler. ID:n är separata från sponsornamn.
Tjeckiska klubbnamn är manuellt avlästa från Hokej.cz och APK LH. Schweiziska
och finska identiteter kommer från ligornas offentliga webb-API:er.

För samtliga 45 klubbmärken är en officiell bildkälla identifierad. De 31
nedladdade bilderna ligger lokalt och behöver ingen nätanslutning i spelet.
APK LH:s 14 tjeckiska bildadresser gav HTTP 403 vid filhämtningen; inga
ersättningsbilder har lagts in. `permission: not-assessed` beskriver endast
att detta förberedelsepaket inte innehåller någon separat licensbedömning.

`competition-format.js` genererar balanserade hemma/borta-scheman och hanterar
viloomgångar utan spökklubbar. Den används redan av `createLeagueSchedule()`:
svensk matchordning och objektformat är oförändrade. Den separata
datumfunktionen kan generera scheman med respektive ligas egen tidslinje.
Datumfunktionerna är ännu inte anslutna till karriärens dagliga simulering.

Exempel som fungerar direkt i Node:

```js
const format = require('./competition-format.js');
const catalog = require('./data/europe/catalog.json');
const league = catalog.leagues.find(l => l.id === 'FI_LIIGA');
const clubs = catalog.clubs.filter(c => c.league === league.id).map(c => c.id);
const games = format.schedule(league, clubs, '2026-27');
// 544 matcher, 64 per klubb, 32 hemma/32 borta, 68 lokala omgångar.
const due = format.due(games, '2026-09-15');
const next = format.next(games, clubs[0], '2026-09-15');
```

## Verkliga uppgifter och spelbedömningar

Råkällor sparas förlustfritt gzip-komprimerade under `data/europe/raw/`. `sources.json` lagrar URL,
säsong, kontrolltidpunkt och SHA-256. Byggkommandot stoppar om en fil inte längre
matchar sin dokumenterade källa. Inga nätanrop görs vid bygge eller provspelning.

`players.json.gz` är en **stagingdatabas**, inte färdiga starttrupper. En spelares
förekomst i en liga/statistiklista bevisar inte kontraktsägare, lånestatus eller
aktuell registrering. Dessa uppgifter förblir okända. Schweiziska nationaliteter
saknas i den hämtade listan och fylls inte med SUI. Forwardposition anges som F
när underlaget inte skiljer center från ytterforward. Fyra poster saknar även
huvudposition; de får inga attributhärledningar.

Attributbedömningar för 751 spelare använder den befintliga
`player-evidence-model.js`, samma 1–20-skala och potentialintervall som
svenska startdatabasen. Underlaget omfattar inhemsk grundseriestatistik för
2024/25 och 2025/26, kopplat med respektive källas spelar-ID. Pågående
2026/27-resultat används inte för attribut. Målvakters faktiska spelade matcher
skiljs från matcher där de enbart var ombytta. För finska målvakter härleds
skott emot ur räddningar + insläppta mål; denna härledning sparas uttryckligen.

Attributen är märkta `uncalibrated-europe-preview`, med underlag och osäkerhet
per attribut. Statistik kan ge stöd för exempelvis avslut och tekningar men
mäter inte personlighet, teknik eller potential direkt. Importen ger ingen
bedömning när historisk statistik eller position saknas. Spelare som kommit
från andra ligor behöver kompletterande statistik innan kalibrering. Löner,
marknadsvärden, kontraktslängder, arenor och klubbekonomi har inte hittats på.

`identity-review.json` flaggar två möjliga träffar mot svenska startdatabasen.
Namn + födelsedatum är en granskningssignal, aldrig ett automatiskt ID-byte.
Kontroll mot Nordamerika, kontraktslösa, andra europeiska källor och äldre
sparfilers alias återstår. Historiska statistik-ID:n från en källa kopplas
inte direkt till en annan källas nummer.

## Säsongsskillnader som integrationen måste behålla

| Liga | Grundserie 2026/27 | Kända skillnader |
| --- | --- | --- |
| Tjeckien | 14 lag, 52 matcher/lag | Fyra direkt till kvartsfinal. Lag 5–12 spelar bäst av fem. Därefter bäst av sju. Lag 14 kvalar mot Maxa ligas vinnare. |
| Schweiz | 14 lag, 52 matcher/lag | Sex direkt till kvartsfinal. Lag 7–10 spelar play-in med hemma/borta och sammanlagt resultat, inte SHL:s bäst av tre. |
| Finland | 17 lag, 64 matcher/lag | Ojämnt lagantal. Säsongsomläggningen inför 2027/28 behöver särskild hantering. |

Finska schemats slutdatum 10 mars är **ett provisoriskt datum för generering**,
inte en verifierad uppgift om verkliga serien. Playoffformatet, omläggningen
2027/28 och regelpaketets övriga luckor är markerade i `rulesPending`.
Schweiziskt play-in och kval kräver ett fullständigt regelunderlag före aktivering.
Alla genererade matchdatum är simuleringar även när säsongens datumram är känd.
En regeldefinition från 2026/27 får inte automatiskt återanvändas för 2027/28.

## Nästa implementation i den befintliga koden

| Koppling | Filer/funktioner | Krav innan spelbar aktivering |
| --- | --- | --- |
| Klubbval och styrelse | `career.js`: `careerVisibleClubs`, `setCareerLeague`, `careerOffer`; `script.js`: `startCareerWithClub` | Ligaval med verkliga trupper, klubbmål, ekonomi och stab. Väljbar klubb kräver färdig databas. |
| Värld och identiteter | `leagues.js`: `leagueInitial`, `leagueOf`, `registerLeagueClubs`, `ensureLeagues`; `script.js`: `newState` | Gemensam spelarägare och stabila klubb-ID:n; SHL-fallback får inte användas för okända europeiska klubbar. |
| Datum och matcher | `calendar.js`: `calendarTarget`, `calendarStep`, `calendarContinue`; `script.js`: `simulateOtherGames` | Egen ligatakt och vilodagar. Skydda tränarens match från bakgrundssimulering. Identiska utfall i samma matchmotor oavsett visningsläge. |
| Slutspel | `leagues.js`: `leagueStartPlayoffs`, `leagueAdvanceCups`; `season.js` | Separata tillstånd för ligorna, korrekt schweiziskt sammanlagt resultat och lokala kval. En ligas final får inte avsluta övriga ligors säsong. |
| Rekrytering och ekonomi | `recruitment.js`, `roster-depth.js`, `club-ai.js`, `calendar.js`: `calendarWindowOpen` | Ligaanpassade transferfönster, lönenivåer, valutahantering, import-/registreringsregler och AI-konkurrens. |
| Säsongsbyte och sparning | `leagues.js`: `leagueApplyMovement`, `leagueReset`; `season.js`: `beginPreseason`; `career-storage.js` | Nationella upp-/nedflyttningar, finsk omläggning, historik och kompatibilitet med svenska sparfiler. |
| Presentation | `league-workspace.js`, `league-statistics.js`, `club-crests.js` | Ligorna ska visas i Världen, med klickbara spelare/klubbar och rätt ligastatistik. Samordna med pågående arbete på Världen-fliken. |

Starta med nya karriärer. Ingen automatisk utökning av äldre sparfiler ska göras
innan migrationsflödet kan bevara kontrakt, spelare som flyttat, statistik och
pågående matcher. Maxa liga och Swiss League ingår inte i detta datalager;
hanteringen av kvalmotståndare måste lösas uttryckligen.

## Arbetskommandon

```sh
npm run data:europe
npm run check:europe
python scripts/fetch-europe-evidence.py --output /tmp/hockey-europe-review
python scripts/fetch-europe-crests.py
```

Databygget skapar bara stagingdata och en mätbar statusrapport i
`data/europe/readiness.json`. Nedladdning av nya råkällor kräver en ny
granskningsmapp och ersätter inte kontrollerade källor. Efter källgranskning
uppdateras snapshot och manifest tillsammans, sedan körs databygget igen.
Varje liga har `targetMode: playable`, men rapporterar tills vidare
`playable: false` och en konkret lista över kvarvarande integrationssteg.

## Verifiering

`european-leagues.test.cjs` kontrollerar ligornas matchantal, samtliga
motståndarmöten, hemma/borta-balans, viloomgångar, datumflöde, ogiltiga säsonger,
ID-konflikter, målvaktsstatistik, attributgränser, reproducerbar import,
käll-/bildintegritet och oförändrad svensk sparfil efter omladdning.

Fullständig acceptans för spelbarhet återstår: starta en karriär i varje liga,
spela/simulera matcher, värva och låna över gränserna, fullfölj grundserie och
slutspel, byt säsong och ladda sparfilen igen. Först därefter öppnas ligan i
klubbvalet. Ny Windows-beta ingår inte i detta förberedelsepaket.

## Officiella källor

- [Tipsport extraliga – aktuella lag](https://www.hokej.cz/tipsport-extraliga)
- [APK LH – klubbar och bildkällor](https://apklh.cz/clubs)
- [APK LH – säsongsformat 2026/27](https://apklh.cz/article/na-kridlech-noveho-hlavniho-partnera-navraty-hvezd-i-jubileum-tipsport-extraliga-vstupuje-do-nove-sezony)
- [National League](https://www.nationalleague.ch/), offentliga `/api/teams` och `/api/player` för 2025–2027, se exakta URL:er i `sources.json`.
- [ZSC Lions – spelschema och format 2026/27](https://www.zsclions.ch/news/artikel/meisterschafts-spielplan-2026-27)
- [Liiga – spelarlista 2026/27](https://liiga.fi/fi/pelaajat/?kaudesta=2027&kauteen=2027&sarja=runkosarja), offentliga `/api/v2`-källor dokumenterade i `sources.json`.
- [Liiga – säsongen 2026/27](https://www.liiga.fi/en/news/liigan-ensi-kaudessa-riittaa-jannitettavaa-kova-panos-heti-syksysta-lahtien)
