# Rekrytering och aktiv spelarmarknad

Implementerad och kontrollerad 23 september 2026 för spelets säsong 2026/27.

## Orsakerna till problemen

AI använde samma kandidaturval som managerns spelarsökning. Det urvalet tog uttryckligen bort den egna klubben. Dessutom uteslöt lånesökningen managerns klubb. Resultatet blev att AI kunde ha behov och pengar utan att nå fram till ett bud på managerns spelare.

Den befintliga rättningen som skiljer faktisk bemanning från rollkvalitet har bevarats. Tidigare kunde kvalitetskrav få en tillgänglig spelare att försvinna ur behovsbedömningen. Nu använder även AI samma underlag för antal, frånvaro, återkommande lån och säkrade spelare nästa säsong. Klubbar kan fortfarande göra olika sportsliga kvalitetsbedömningar.

## Ändrat beteende

- **Truppbehov:** antal, spelklarhet, rollkvalitet och nästa säsong hålls isär. Korta skador ger intern lösning när täckningen räcker. Junioralternativ, kontraktsslut, återkommande lån och klara nyförvärv visas. Tre tillräckligt bra, tillgängliga målvakter ger ett täckt behov och ett förslag att överväga utlåning.
- **Scouting:** ett uppdrag kan ange spelartyp, tänkt plats, högsta årslön, ålder, tidshorisont och ansvarig scout. Upp till tre kandidater föreslås. Uppdragets kriterier följer med till rapporten, som visar rollpassning och om kostnadsintervallet ryms i budgeten. Befintliga daterade observationer, osäkerhetsintervall, potentialbedömningar och jämförelser är kvar. Kandidater kan bevakas, kontaktas eller väljas bort och senare omprövas.
- **AI-marknad:** den fullständiga kandidatlistan omfattar managerns trupp, kontraktslösa spelare och kontrakterade akademispelare från 18 år. AI observerar kandidater, sparar intresse och prioriterar faktiska behov. Klubbarna fortsätter göra affärer med varandra under kontroller av ekonomi, rollöften och trupputrymme.
- **Inkommande affärer:** både lån och köp har avsändare, sportsligt motiv, roll, villkor, svarstid och historik. En olistad spelare kan få bud. Ett motbud bearbetas av köparen efter två kalenderdagar. Köparen kan godta eller ändra lånevillkor eller dra sig ur. Accepterad klubböverenskommelse väntar därefter på spelarbeslut och slutkontroll. Ingen spelare flyttas eller betalning görs vid det första godkännandet.
- **Beslut och konkurrens:** tillgänglig för lån, tillgänglig för övergång och vill helst behålla påverkar urvalet. Avslag ger inte automatiskt missnöje. Samma klubb avvaktar normalt 21 dagar efter ett avslutat ärende; ändrad marknadsstatus kan öppna ett nytt försök. När en affär genomförs stängs konkurrerande ärenden. Även transaktionsfunktionerna kräver managerns godkännande för egna spelare.
- **Lån:** ägande skiljs från aktiv klubbtillhörighet. Start, återkomst, löneandel, roll, återkallelse och registreringsform sparas. Matcher, istid, prestation och belastning följer spelaren. Mottagarklubben och spelaren prövar rollen, och budgeten räknar även andra pågående affärer. Återkomst sker en gång på avtalat datum.
- **Ekonomi:** kontraktslösa spelare, köp under kontrakt, lån och framtida avtal använder skilda flöden. Den generella köpeskillingen baseras nu på årslön, återstående avtalstid och ålder, i stället för det tidigare höga spelvärdet. Inkommande bud visar kronor, årslön, löneandel och totalt avtalsåtagande. Inga bonusar är avtalade i dessa standardbud. Befintliga uttryckliga utgångspriser bevaras.
- **Överblick:** Rekrytering samlar behov, scoutuppdrag, kandidater, intresse, inkommande bud, utgående bud och aktiva lån. Aviseringar öppnar rätt ärende. Spelarnamn i kandidat- och affärslistorna öppnar profilen; en separat åtgärd öppnar bedömningen eller ärendet. Status och vem som väntar på svar kommer från samma sparade ärende.

## Regler och avgränsningar

Kontrollerad källa: [Svenska Ishockeyförbundets tävlingsbestämmelser 2026/2027](https://www.swehockey.se/media/hbzpznld/taevlingsbestaemmelser-2026-2027.pdf), framför allt § 4:4–4:5. För nationella övergångar i SHL/Hockeyallsvenskan används fönstret 16 maj–15 februari. Nya vanliga tidsbegränsade övergångar förutsätter kontrakt och avslutas senast 15 februari med automatisk återgång. Särskild dubbelregistrering har andra villkor och införs inte här.

Spelet modellerar inte hela förbundets registreringsprocess. Dispenser, internationell klarering, utbildningsersättning, särskild dubbelregistrering och förhandling om prestationsbonusar ingår inte i detta flöde. Generiska kontraktslängder och nästa säsongs anslutning vid spelets säsongsskifte behålls. Ekonomiska nivåer är spelantaganden, inte uppgifter om verkliga klubbars avtal. Befintliga sparade och förinlagda lån behåller sina avtalade datum och sin tidigare datumtolkning.

Akademivärvningar gäller kontrakterade spelare från 18 år. Akademispelare behöver flyttas till seniortruppen innan de kan lånas ut. Kriteriestyrda scoutuppdrag är avgränsade kandidatgrupper; de är inte en obegränsad sökning som automatiskt fyller på med nya namn. Marknadsstatus och intresse garanterar inte bud. Egen försäljning/utlåning är inte automatiskt delegerad.

## Verifiering

`active-market.test.cjs` använder spelets riktiga funktioner och kontrollerade trupper, ekonomier och observationer.

| Scenario | Kontrollerat resultat |
| --- | --- |
| Tre starka, tillgängliga målvakter | Ingen bemanningsbrist i manager- eller AI-bedömningen |
| Utgående målvaktskontrakt | Samstämmigt behov inför nästa säsong |
| AI behöver målvakt och har råd | Riktigt inkommande lånebud på managerns tredjealternativ |
| Attraktiv olistad spelare | Riktigt köpbud utan övergångslistning |
| Motbud | Daterat svar och uppdaterade villkor; ingen förtida övergång |
| Spelaren säger nej eller köparen saknar pengar | Oförändrad klubbtillhörighet och inga felaktiga betalningar |
| Två godkända köpare | En vinnare, en spelaridentitet och en ekonomisk transaktion |
| Framtida övergång | Nuvarande klubbtillhörighet bevaras; spelaren ansluter en gång vid säsongsskiftet |
| Lån | Lön fördelas rätt, spelade minuter sparas, automatisk återkomst sker en gång |
| Sparning och omladdning | Motbud, klubböverenskommelse, lånevillkor, statistik och scoutkriterier bevaras |
| Gamla köade AI-bud | Flyttas till managerns beslutskö och kan fortfarande exporteras/importeras |
| Otillåten direkttransaktion | Nekas utan managerns godkännande |

Befintliga kalender-, kontrakts-, truppåtagande- och lånetester kontrollerar bland annat konkurrerande framtida avtal, reserverad budget, säsongsskifte och gamla sparfiler. Långspelstester följer dessutom unika spelare, klubbekonomi och AI-affärer över flera säsonger.

`scripts/active-market-browser.cjs` klickar i den riktiga webbvyn: lånemotbud, svar, omladdning, godkännande, aktivt lån, spelarprofil och kriteriestyrt scoutuppdrag. Vyerna är kontrollerade i 1280 och 1440 pixlars bredd utan sidledes överflöde eller JavaScript-fel.

Verifieringsresultat: hela `npm test` kördes med 211 kontroller, varav 210 passerade direkt. Den enda felande kontrollen låg i `club-ai.test.cjs`: testet antog att tolv forwards var en bemanningsbrist. När den kontrollerade vakansen ändrats till elva forwards passerade omkörningen tillsammans med fyra närliggande testfiler. Senare riktade kontroller av marknadsflöde, avtal, behov och lån passerade också. Den utökade kontrollen av godkännande och gamla bud samt slutligt Chromium-klicktest passerade på den färdiga koden. `scripts/check-career-workflows.cjs` passerade med verklig värvning, matchdeltagande, rehabilitering och omladdning. Ingen full omkörning av hela sviten gjordes efter den sista kompatibilitetsrättningen.

Kör regressionerna med `npm test`. Klicktestet behöver Playwright och Chromium; `CHROMIUM_EXECUTABLE` kan ange en lokal Chromium-binär. Testbilder hamnar i `MARKET_SCREENSHOTS` eller `/tmp/hockey-market-ui`.

## Kodens ansvar

- `recruitment.js`: gemensamt behovsunderlag, klubbvillkor och övergångstransaktion.
- `club-ai.js` / `club-ai-market.js`: AI-planering, observationer, ekonomiska reservationer och marknadsbeslut.
- `market-workflow.js`: inkommande förhandlingar, intresse, spelarbeslut, slutkontroll och vanlig låneform.
- `scouting-briefs.js`: kriterieuppdrag och rapportens koppling till uppdraget.
- `roster-depth.js`: låneavtal, statistik, lönefördelning och återkomst.
- `recruitment-hub.js`: samlad rekryteringsvy med samma sparade ärenden som aviseringar och managerkontor.

Ändringarna är tillägg till befintliga sparstrukturer. Trupper, spelaridentiteter, sparade observationer och äldre avtal återskapas inte från grunddatabasen.
