# Hockey Manager: dator först, en sammanhängande klubbvärld

Beslutad riktning 8 september 2026: Football Managers filosofi och ambitionsnivå,
anpassad till ishockey. Spelet ska kännas som ett managerspel för dator även i
webbläsaren. Stor skärm, mus, tangentbord, informationsrika arbetsytor och
jämförbara tabeller styr utvecklingen. Mobilanpassning är senare arbete och får
inte begränsa grundsystem eller datorvyer.

Djup mäts i begripliga samband och beslut med kostnader och följder över tid,
inte antal knappar, isolerade bonusar eller slumpmässiga notiser. Bevara
fungerande mekanik och sparningar. Ändra en avgränsad grund i taget och testa
kontrafaktiskt: samma situation, ett förändrat beslut, mätbar relevant effekt.

## Kodgranskning: nuläge och luckor

Granskningen följer beräknings- och uppdateringsvägar i koden. Den är inte en
fullständig balanskalibrering eller ett påstående om att spelet nått FM-djup.

| System | Faktiskt kopplat idag | Lucka / nästa kvalitetskrav |
| --- | --- | --- |
| Attribut och match | career-match.js använder individuella attribut, energi, positionsvana, moral och taktik. rivals.js använder attribut i bakgrundsmatchens händelser. | Olika trötthetsberäkningar och olika detaljnivå mellan motorerna. Gemensamma påverkansregler och mätbar balans behövs innan fler bonusar. |
| Samspel | team-dynamics.js sparar gemensam istid och parresultat. | Före detta steg tränade locker.js ett separat kemimått; AI-par fick resultat från lagets slutresultat. Åtgärdas i grundsteg 1 nedan. |
| Träning | training.js kopplar fokus, tränare, ork och deltagande till attributarbete och taktisk förtrogenhet. attributes.js har bestående individuella utvecklingstak. | AI-träningen har färre planeringsval. Belastning, träningsmiljö och matchkrav behöver jämföras över längre tidsperioder. |
| Form och moral | rivals.js väger aiForm i uttagning; moral påverkar mentala matchattribut; tidigare insatser finns i spelaruppföljningen. | Form är inte ett enhetligt, rollanpassat beslutsunderlag för alla spelare. Skilj observerad prestation från självförtroende och fysisk beredskap; undvik dubbel belöning för mål. |
| Kontrakt och istid | Löften följs upp, faktisk istid registreras, missnöje påverkar AI-affärer och förlängningar. | Egna spelarreaktioner och AI-reaktioner har olika uppföljningsregler (locker.js, club-ai.js). Gemensamma regler och synliga förväntningar behövs. |
| Klubb-AI | Behov, budgetreservationer, avtalslängd, akademi, låneåterkomster och konkurrerande bud finns. Tränare reagerar på motstånd och matchläge. | Svenska klubbar är mer utvecklade än utländska marknadsklubbar. AI behöver prövas på långsiktig truppkvalitet och ekonomi, inte enbart att säsonger går att slutföra. |
| Scouting | Observationer, kunskapsosäkerhet, personal och rollbehov hänger ihop i attributes.js och recruitment.js. | Avvikelsen mellan förhandsbedömning och faktisk rollnytta behöver följas konsekvent efter värvning. |
| Juniorer | Individuella tak, träning, mentorskap, uppflyttning och lån delar spelaridentiteter. | Ingen komplett spelad juniorliga med schema/tabell; tydligare utvecklingsväg och konkurrens om istid behövs. |
| Ekonomi | Egna klubben och svensk AI bokför löner, drift, publik, akademi och övergångar. Fleråriga åtaganden påverkar AI-budget. | Förenklad årsmodell fördelad över matcher. Likviditet, nedflyttning och ekonomiska kriser behöver djupare konsekvenser. Ingen färdig insolvensmodell. |
| Matchanalys | Faktiska skott, istid, formationer, trender, träningsuppföljning och AI-tränarråd finns. | Råd måste knytas närmare till återkommande chanser, risker och taktiska orsaker. Enskilda utfall räcker inte som orsaksbevis. |
| Datorgränssnitt | Gemensamma arbetsområden, tillbaka till tidigare lista och flera jämförelsevyer finns. | Inkonsekvent informationsdensitet, långa arbetsytor och vissa kvarvarande mobiltexter. Förbättra arbetsflöden tillsammans med deras underliggande beslut, inte genom fler parallella navigationsknappar. |

## Grundsteg 1: samma samspel från träning till match

- Gemensam träning ger ett separat, synligt bidrag i den befintliga
  parhistoriken. Endast deltagande, träningsbara spelare i samma formation.
  Ett träningsdatum räknas högst en gång per klubb; bidraget begränsas till åtta.
- Svensk AI tränar sina valda kedjor och backpar på matchfria dagar med samma
  regel. Detta är fortfarande ett förenklat taktiskt pass, inte en fullständig
  AI-träningskalender.
- Laguttagning och omklädningsrum visar samma kemivärde. Den gamla sociala
  relationen behålls för kapten/förtroende och äldre matchmotorer, men läggs
  inte längre på som ytterligare kemibonus i den nya matchmotorn.
- Båda motorerna använder samma attributfaktor för passningar, spelsinne,
  positionering och beslut. Samspel beräknas på faktiska spelare i forward-
  respektive backgruppen på isen, inte enbart nästa planerade kedja.
  Målvakter och ensamma spelare får neutral samspelseffekt.
- Bakgrundsmatcher registrerar mål framåt/bakåt för paren på isen vid målet.
  Straffläggningsmål ändrar inte spelarnas parresultat.
- Samma matchbokföring begränsar resultatpåverkan och rensar relationer till
  spelare som lämnat klubben. Befintliga slutregistreringsspärrar förhindrar
  dubbel bokföring.
- En jämförelsetabell i befintlig laguttagning visar spelare, kemi, gemensam
  istid, träningsbidrag, resultatbidrag och attributpåverkan. Den är öppen i
  lagets arbetsvy och hopfälld på matchbänken. Ingen ny huvudmeny.
- Äldre parhistorik behålls. Inga historiska träningspass återskapas; nya
  träningsfält börjar vid noll. Import kontrollerar numeriska värden.

Koefficienterna är begränsade spelregler, inte empiriskt uppmätta hockeyvärden.
Kemi är inte en direkt multiplikator för vinstchans. En bättre kombination kan
fortfarande förlora. Träningsbidraget har ännu ingen frånvarobaserad avklingning;
samspel mellan kvarvarande lagkamrater består över säsongsskiftet.

## Prioriterad fortsättning

1. **Gemensam prestationsgrund:** förena påverkansreglerna för energi,
   positionsvana och mentala förutsättningar mellan motorerna. Visa orsaker i
   spelarnas beslutsunderlag. Testa lika ingångsvärden och kontrollerade skillnader.
2. **Läsbar hockey och kalibrering:** jämför många matchers skott, chanser,
   special teams och taktiska kontraster. Koppla tränarråd till faktisk
   spelsekvens och risk, med underlag och osäkerhet.
3. **Gemensamma spelaråtaganden:** samma logik för roller, istid, löften och
   kontraktsreaktioner hos användaren och AI. Testa petning, skada, utlåning,
   ändrat ansvar och klubbyte.
4. **Flera säsongers utveckling och ekonomi:** utvecklingsvägar, AI-truppers
   åldersstruktur, framtida löner, juniorernas konkurrens och ligabyte. Testa
   hur årets beslut förändrar framtidens handlingsutrymme.
5. **Datorns sammanhängande arbetsytor:** förbättra truppplanering,
   spelarprofiler, scoutingjämförelser och matchanalys i samma ordning som
   deras bakomliggande system blir tillförlitliga.

Varje steg ska redovisa implementerad effekt, tester och kvarstående luckor.
Detta är en utvecklingsriktning, inte en färdig lanseringsbedömning.

## Verifiering av grundsteg 1

10 riktade testfiler passerade: chemistry-foundation, workflow, career-match,
career-match-rules, coach-overhaul, locker, training, rivals, club-ai och
adaptive-coaches. Den nya testsuiten kontrollerar deltagande, faktisk
kalenderträning, tak, idempotens, AI-dagar, gamla värden, export/import,
omladdning och ett kontrollerat attributkontrasttest i den riktiga matchmotorn.
Full match verifierar också deterministisk återupptagning och slutbokföring.
Detta är inte en ny körning av projektets fullständiga flersäsongstest.
