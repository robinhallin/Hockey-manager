# Utvisningar: en sammanhängande förbättringsetapp

## Verklig kod och avgränsning

Granskningen utgick från `beb4f2e` och den befintliga JavaScript-implementationen.

| Förlopp | Befintlig implementation |
| --- | --- |
| Spelarbeslut och fast matchsteg | `match-simulation.js`: `StudioHockey.Match.decide`, `step` |
| Karriärmatch, formationer och matchbokföring | `career-match.js`: `CareerBroadcastMatch`, `studioStep`, `studioMirror` |
| Större och personliga straff | `match-engine-3.js`: `giveMajorPenalty`, `giveMisconduct` |
| Matchhändelser och sammanställning | `match-world-events.js`: `MatchEventStream`, `studioRecordShot` |
| Rapport och ligastatistik | `analysis.js`: `analysisEvent`, `finishAnalysis`; `league-statistics.js`: `leagueTrackEvent`, `leagueCommitLive` |
| Dagsövergång | `calendar.js`: `calendarContinue`, `calendarStep` |
| Träningens förväntade och faktiska följder | `training-decisions.js`: `trainingTeamProjection`; `training.js` |
| Rekryteringsbeslut och genomförande | `recruitment.js`: `resolveRecruitDeal`, `transferRecruitPlayer` |
| Motståndarnas matcher | `rivals.js`: `rivalSimulate` |
| Profilbesök och återgång | `interface.js`: `deskOpenPlayer`, `deskBack`; `player-references.js` |
| Normalisering och sparning | `script.js`: `normalizeCareerState`, `save`; `career-match.js`: `validateSpatialMatchSave` |

Denna etapp prioriterar utvisningar eftersom granskningen hittade motstridiga fakta och matchpåverkan i samma förlopp. Kalender, rekrytering och hela AI-modellen skrivs inte om här.

## Fel som rättats

- Den naturliga straffsituationen skickade spelarens namn. Mottagaren valde första namngivna spelare eller första utespelare som reserv. Nu skickas och används spelar-ID. En tvetydig äldre namnhänvisning avvisas utan händelse eller slumptalsdragning.
- Fem- och tiominutersstraff hade separat logik. Karriärspelaren kunde få rätt antal minuter medan analys, liga eller händelseström registrerade två minuter eller saknade händelsen. Alla tre strafftyper går nu genom samma godkända straffpost.
- Personliga straff tog en av de två platserna i straffklockornas kö och behandlades som numerärt underläge av vissa konsumenter. Nu löper deras egen klocka utan att ändra lagets numerär, PP/BP-bedömning eller tillfälliga numerär vid förlängning.
- Ett mål kunde avsluta en köad tvåminutare bakom två femminutare. Nu väljs först de pågående numerära straffen, därefter de som får avslutas vid mål.
- Händelseströmmen räknade övergången till powerplay men tappade ytterligare möjligheter vid fem mot tre och när ett köat straff började. Dessa registreras nu vid samma regelövergång som motorn använder.

## Gemensam kedja

`StudioHockey.penaltyOffender` identifierar individen. `penaltyRecord` beskriver straffet utan gränssnitt, lagring eller egna slumptalsdragningar. `CareerBroadcastMatch.addPenalty` genomför straffet och ändrar formation och klocka. `studioRecordPenalty` för samma accepterade post vidare till händelseström, analys och ligastatistik. Samma post bestämmer namnreferens, antal minuter och straffbeskrivning i matchloggen.

Varje nytt straff får ett matchlokalt ID, ett sekvensnummer och `version: 1`. Upprepad observation av samma straff ändrar inte statistiken. Den befintliga spärren mot dubbelbokföring av avslutade matcher används fortsatt.

Numerär beräknas gemensamt även i träningens matchpåverkan, coachens PP/BP-val, motståndarnas val och analysen. Presentationen väljer inte regelutfall. Inga nya huvudflikar eller obligatoriska avbrott har införts.

## Sparning och historik

Straffpost, kvarvarande tid, köordning och sekvensnummer följer den befintliga serialiseringen av matchmotorn. Slumpgeneratorns befintliga tillstånd bevaras. Nya poster valideras mot typ, varaktighet, flaggor, spelar-ID och sekvens.

Äldre pågående poster utan postversion läses fortsatt med sin registrerade återstående tid. Inga gamla matchhändelser eller minuter skrivs om och ingen historik hittas på för att fylla luckor. Detta är en bakåtkompatibel utökning av matchposten, inte en återställning av karriärformatet.

## Faktisk verifiering

`penalty-integrity.test.cjs` passerar lokalt. Det täcker båda lagen och 2/5/10 minuter, samma namn på två spelare, avvisade ID:n, överlappande och köade straff, personligt straff i förlängning, länkar till rätt profil, oförändrad paus och RNG vid profilbesök, dubbelregistrering, ny laddning i separat testmiljö, export/import, äldre poster och avvisning av skadade nya poster.

De befintliga `match-engine-3`, `match-world-events`, `career-match-rules` och `match-mode-rules`-testfilerna passerar också lokalt. Fullständig CI redovisas i pull requesten efter körning.

`scripts/check-penalty-parity.cjs` körde **12 hela karriärmatcher: tre oberoende slumpfrön i fyra visningslägen**. Detaljerna finns i `qa/penalty-parity.json`.

| Slumpfrö | Resultat | Skott | Straff | Utvisningsminuter | PP-möjligheter | PP-mål |
| --- | --- | --- | --- | --- | --- | --- |
| 710031 | 4–6 | 22–43 | 5 | 8–2 | 1–4 | 0–3 |
| 711138 | 3–2 | 27–37 | 8 | 8–8 | 4–4 | 1–1 |
| 712245 | 2–3 | 27–40 | 4 | 6–2 | 1–3 | 1–0 |

Varje rad gav identiska resultat, skott, hela händelseströmmen, analys, matchstatistik, istid, energi och slutligt RNG-tillstånd i full, extended, highlights och commentary. Instruktionerna ändrades till försiktigare fysisk nivå vid 600 sekunder och lägre tempo vid 1200 sekunder. Highlights och commentary exporterades och importerades även vid 900 sekunder. Upprepad matchbokföring efter avslut och laddning ändrade inte den sparade ligastatistiken eller rapportarkivet.

Testmiljön stänger av nya skador och övriga ligamatcher för att isolera jämförelsen. Naturliga spelarbeslut, straff, ork, AI-coaching, förlängning, straffläggning och karriärbokföring är aktiva. Läge och uppspelningshastighet läses via produktionsfunktionerna; detta är automatiserad simulering, inte mätning av bildfrekvens eller visuell provspelning.

## Kvarstående begränsningar

- Tre oberoende matcher räcker inte för slutsatser om målbalans, hemmafördel eller optimal taktik. De tolv körningarna bevisar inte spelglädje.
- Ingen visuell provspelning av denna etapp har genomförts. Headless-testerna bekräftar handlingar och genererade länkar, inte skärmens läsbarhet eller musinteraktion.
- Projektets befintliga förenklade 2/5/10-modell behålls. Detta är inte ett införande eller en verifiering av hela SHL:s eller IIHF:s disciplinregelverk, kvittningsregler eller kombinerade straff.
- Äldre historiska rapporter med felaktigt registrerade minuter rättas inte genom gissning.
- Bakgrundsmatcher har fortfarande sin befintliga separata modell. Denna paritetskörning gäller de fyra visningslägena för karriärens egen match.
- Hela spelkärnans separation från globala karriärdata är inte färdig. Här har en konkret regel- och bokföringskedja samlats och verifierats.
