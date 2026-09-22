# Genomgång av Hockey Manager — 22 september 2026

Utgångspunkt: `e5b0e05` (PR #176). Genomgången följer den faktiska
skriptordningen i `index.html`. Äldre avsnitt i README och projektdokument
beskriver tidigare versioner och används inte som bevis för dagens beteende.

## Arbetslista

| Prioritet | Bekräftat problem | Berörda system | Verifiering |
| --- | --- | --- | --- |
| Kritisk | Startens automatiska sparning skriver över en oläsbar sparfil med en ny tom karriär. | Uppstart, lagring, felåterkoppling | Skadad JSON/komprimering, framtida version, blockerad lagring; originalet ska ligga kvar. |
| Hög | Byte till föregående karriär skriver aktiv sparning före säkerhetskopian. Ett fel i andra skrivningen lämnar olika karriärer i minnet och lagringen. | Huvudmeny, tidigare karriär, import | Fel vid respektive lagringssteg, lyckat byte och omladdning. |
| Hög | Omedelbara fleråriga bud kontrollerar bara årets budget och kan ta nästa års redan utlovade löneutrymme. Förlängningar och junioruppflyttningar har samma lucka. | Rekrytering, kontrakt, juniorer, ekonomi | Båda ordningarna av samtidiga åtaganden; eget bud räknas en gång; avslag ändrar inget. |
| Hög | Nordamerikanska lån missar vanliga köpbud eftersom äldre och nuvarande bud saknar `buyer`. | NHL/AHL, lån, rekrytering | Lån med reserverat löneutrymme och äldre budformat. |
| Medel | Träningsplan från en annan klubb tas bort men lämnar spelaren på obestämd vila. | Klubbyte, individuell träning, återgång | Verklig övergång och återgång efter lån; befintlig skadeprognos och utveckling bevaras. |
| Medel | Låneåterkomst rensade fem mot fem men lämnade speciallag och extra matchspelare till senare vy-/matchnormalisering. | Lån, special teams, matchregistrering | Återgång ska omedelbart ta bort spelarens ID från alla uttagningar. |
| Medel | Rekryteringsrubriken visar löneutrymme före bud, vilket kräver egen huvudräkning för verkligt handlingsutrymme. | Rekrytering, ekonomi | Samma aktuella och framtida reservationer i beslut och vyer. |
| Kontroll | Tidigare matchproblem, fullständiga resultatkedjor och flera säsonger. | Match, statistik, kalender, AI, ligor | Befintliga regressionssviter, visningsparitet, upprepade balansprov och tre karriärsäsonger. |
| Begränsning | Chromium saknas. Installationsförsök avbröts efter 45 sekunder utan nedladdning. | Visuell kontroll | Ingen layout eller animation betecknas som manuellt verifierad. |

## Systemkarta från koden

| Område | Faktisk väg / ägarskap | Avgränsning |
| --- | --- | --- |
| Start, klubbval, laddning | `career.js`, `script.js`, `career-storage.js`, `savefiles.js`; globalt karriärtillstånd, versionskontroll och komprimering. | Lokalt webbläsarsparande och exporterad JSON; ingen molnsynk. |
| Navigation och vyer | `interface.js` registrerar huvudområden; `*-workspace.js` använder samma tillstånd. Tillbakahistorik hör till karriärinstansen. | Presentationstillstånd ska inte bli en andra affärsmodell. |
| Kontor, inkorg, beslut | `manager-office-2.js`, `decision-support.js`, `training.js`; obligatoriska beslut stoppar nästa dag. | Råd är regelbaserade bedömningar. |
| Kalender och Fortsätt | Den aktiva `calendarContinue` finns i `day-j20-integration.js`; `day-transition.js` skyddar huvudknappen; `calendarStep` behandlar världshändelser. | Dagsöversikten bygger på händelser, utan konstgjord väntan. |
| Trupp, profil, taktik | `script.js`, `squad-workspace.js`, `desktop-workspace.js`, `coaching.js`, `roster-depth.js`. | Matchtrupp låses vid start; medicinska och regelbaserade bytesbegränsningar gäller. |
| Träning, rehab, utveckling | `training-planning.js`, `training-responsibility.js`, `training.js`, `medical.js`, `attributes.js`. | Attribut är speluppskattningar; prognoser och skaderisk är förenklade regler. |
| Relationer och roller | `locker.js`, `locker-relationships.js`, `role-promises.js`, `squad-planning.js`. | Faktisk istid och medicinsk frånvaro används; rollbyte innebär inte automatiskt ändrad lön. |
| Scouting och rekrytering | `scouting-system.js`, `attributes.js`, `recruitment.js`, `recruitment-hub.js`, `calendar.js`. | Dold faktisk förmåga skiljs från observationer och personalbedömning. |
| Lån och spelaridentitet | `roster-depth.js`, `north-america.js`; ett spelarobjekt på en aktiv plats, separat ägar- och låneliggare. | Nordamerika har eget kontrakts- och placeringsflöde. |
| Ekonomi, personal, styrelse | `club.js`, `club-workspace.js`, `career.js`, `manager-career-pressure.js`. | Förenklad matchfördelad årsbudget; ingen fullständig insolvensmodell. |
| Spelad match | `StudioHockey` → `CareerBroadcastMatch` → produktionspatchar i faktisk laddningsordning. | Fast simuleringssteg 0,1 s; visningshastighet hanteras separat. |
| Bakgrundsmatcher | `rivals.js`, `match-world-2.js`, `match-world-events.js`. | Delade attribut-, beredskaps-, skott- och taktikregler; grövre 20-sekundsmodell, inte identiska skridskobanor. |
| Resultat och analys | `analysis.js`, `league-statistics.js`, `leagues.js`; slutregistrering och `statsRecorded` skyddar mot dubbelräkning. | Historiska rapporter utan underlag kompletteras inte med påhittade händelser. |
| AI och säsongsskifte | `club-ai*.js`, `season.js`, `player-world.js`, `leagues.js`. | Förhandlingar, truppbehov, pensioner, kontrakt och ligabyte; utländska marknadsklubbar är enklare. |
| Juniorer, landslag, NHL/AHL | `junior-world.js`, `j20-calendar.js`, `international-juniors.js`, `nhl-draft.js`, `north-america-seasons.js`. | Genererade spelare och uppskattade egenskaper hålls åtskilda från källbelagda identiteter. |

## Verifiering

Automatiserade flöden finns i `scripts/check-career-workflows.cjs` och rått
sammanställt resultat i `qa/career-integrity-audit.json`:

- **A:** Ny karriär genom klubbval och jobberbjudande, sparad taktik, 40 kalenderdagar,
  full ligamatch, rapport och tabell, därefter verklig omladdning i en ny VM.
- **B:** Truppbehov → scoutuppdrag → daterad observation och agentkontakt →
  spelarjämförelse → avtal → exakt lönekostnad och en spelaridentitet → faktisk
  matchistid för Oula Palve (cirka 19 minuter i denna körning).
- **C:** Framkallad tvådagarsskada → ersättning i uppställningen → individuell
  vila och daterad återgång → rehabilitering och uppföljning i inkorgen.
- **D:** Tre kompletta bakgrundssäsonger, 2026–2028, inklusive slutspel,
  kontraktsbeslut, lån, AI, ligabyte, nästa schema och sparning/omladdning.
  Vid sista kontrollpunkten inför 2029/30 hade alla 28 svenska klubbar
  minst två målvakter, sex backar och tolv forwards.
  Samma kontroll kördes både på utgångsversionen och efter budgetändringarna.
  Skriptet använder riktiga jobb- och kontraktsbeslut; det stänger endast av
  rendering och varje enskild klicksparning under långtidskörningen.
- **E:** Samma fullständiga match avslutad i `full`, `extended`, `highlights`
  och `commentary`. Exakt samma resultat (2–5 i denna körning), skott,
  händelser, energi, istid, ligastatistik och tabell. Rapporter och tabeller
  överlever omladdning. Upprepad slutregistrering ändrar inget. Medicinska
  händelser och övriga ligamatcher är aktiva i detta test.

Oförändrad utgångsversion passerade hela `npm test`: 180 rapporterade
testfall/grupper, noll fel (cirka 21 minuter).

Tre nya regressionstestfiler omfattar sju testfall/grupper. Spar- och
träningsregressionerna reproducerar fel på oförändrad `main`. De omfattar
skadad JSON, tom sparning, inkompletta grunddata, framtida version,
komprimeringsfel, lagringsfel, import, äldre bud utan köparfält, samtidiga
åtaganden, juniorer, AHL-lån, klubbyte och upprepad avtalsregistrering.
Efter ändringarna passerade dessutom de nya regressionerna och riktade
befintliga spar-, karriär-, kalender-, rekryterings-, junior- och
Nordamerikasviter. Inga befintliga krav sänks.

Alla 28 registrerade huvudvyer öppnades i headless-fixturen utan undantag
eller synliga `NaN`/`undefined`. Tom spelarsökning kontrollerades.
Uppmätt generering av sidornas HTML var 1–31 ms i denna körning; mätningen
inkluderar inte webbläsarens layout, målning eller lagringskvot. Ingen
prestandaoptimering gjordes utifrån denna begränsade mätning.
89 produktionsskript syntaxkontrollerades. Entrypointens 134 lokala
skript-, stil- och typsnittsreferenser kunde hämtas via HTTP.

Matchmotorns befintliga tester för puckbromsning, sargstudsar, höjdpunktstempo,
zoninträden, försvarsarbete, regler, deterministisk återupptagning och
prestationsbokföring ingår i den breda regressionen. Även 96-perioders
balansprov och separat 24-perioders styrkeprov ingår; en enskild match används
inte som balansbevis. Detta paket ändrar inte matchfysik eller balansvärden.

## Genomförda ändringar och kvarstående gränser

- Ursprunglig oläsbar sparning skyddas från autosave och kan laddas ner för
  återställning. Fel visas med konkreta vägar vidare. Ett uttryckligt val av
  ny karriär eller import kan ersätta den.
- Byte/import skriver säkerhetskopian före aktiv sparning och återställer
  den vid misslyckad huvudskrivning. Om även återställningen blockeras visas
  det uttryckligen; den aktiva sparningen ersätts inte av en misslyckad skrivning.
- Samma budgetberäkning styr köp, motbud, slutregistrering, förlängningar,
  junioravtal och AHL-lån. Eget väntande bud räknas en gång. Årets och nästa
  års verkliga handlingsutrymme visas i befintliga ekonomi-/rekryteringsvyer.
- Klubbyte återställer klubbens träningsinstruktioner; spelarens attribut,
  slitage och rehabilitering behålls. Gamla främmande återgångsplaner kan inte
  längre låsa spelaren i vila. Låneåterkomst reparerar hela matchuttagningen.
- Karriärflödeskontrollen läggs till som ett eget CI-jobb, utöver befintliga
  16 testgrupper och balanskontrollen.

**Visuell granskning/manuell provspelning:** inte genomförd. Chromium saknas
här och installationsförsöket gav ingen fungerande webbläsare. Genererad HTML
är inte bevis för fungerande pixelmått, kontrast eller animation. Dessa
kvaliteter behöver fortfarande granskas i en riktig webbläsare.

**Simuleringens räckvidd:** bakgrundsmotorn delar centrala regler med den
spelade matchen men har grövre tidsupplösning och saknar skridskobanor.
Exakt utfallsparitet är verifierad mellan visningslägen för samma spelade
match, inte mellan dessa två olika tidsmodeller. Långtidstestet visar
konsistens och genomförbarhet, inte att hela ekonomin eller alla taktiker
är realistiskt kalibrerade. Någon ny kontroll av verkliga trupper mot
externa källor har inte genomförts; befintlig källproveniens och identiteter
kontrolleras av databastesterna. Spelet betecknas inte som felfritt.


## Ändrade filer

- Sparflödet: `career-storage.js`, `career.js`, `savefiles.js`, `script.js`.
- Budget och återkoppling: `recruitment.js`, `calendar.js`, `juniors.js`,
  `north-america.js`, `recruitment-hub.js`, `club-workspace.js`.
- Klubbyte och uttagning: `training-planning.js`, `roster-depth.js` samt
  övergångsanropen i ovanstående rekryterings-/lånemoduler.
- Regressionsskydd: `career-save-integrity.test.cjs`,
  `manager-budget-integrity.test.cjs`, `training-transfer-integrity.test.cjs`,
  `scripts/check-career-workflows.cjs`, de två befintliga testfixturerna och
  `.github/workflows/test.yml`.
- Cacheversioner och dokumentation: `index.html`, `README.md`, denna rapport
  och `qa/career-integrity-audit.json`.
