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

## Grundsteg 2: gemensam matchberedskap

Implementerat 8 september 2026 i match-readiness.js, med anrop från båda
matchmotorerna och den befintliga uppföljningen efter match:

- Startenergi och återhämtningsgräns utgår från spelarens kvarvarande slitage.
  Bakgrundssimuleringen börjar inte längre med full energi för alla.
- Samma attributfunktion väger energi, positionsvana, kemi och moral. Moral
  påverkar mentala egenskaper; tekniska/fysiska basattribut blir inte
  automatiskt bättre av hög moral. Tränarbudskap och taktik läggs på separat.
- Tempo, forecheck, uthållighet, målvaktsroll och boxplay påverkar energi.
  Samma regler beskriver arbetsbelastning och bänkåterhämtning. AI:s
  aggressiva forecheck har nu också en fysisk kostnad i direktsänd match.
- Bakgrundsmatcher återhämtar vid periodpauser och timeout, med samma
  slitagetak. Målvakten använder också matchenergi.
- Bakgrundsmotorn bedömer de faktiska platserna i formationerna. Ordinarie
  tre-mot-tre använder två forwards och en back.
- Arbetsbelastningen samlas under bakgrundsmatchen och bokförs en gång vid
  avslut. Motståndaren i direktsänd match behåller den uppmätta belastningen,
  i stället för ett nytt schablonavdrag från antalet minuter.
- Laguttagningens Matchtrupp innehåller en jämförbar beredskapstabell med
  medicinsk status, slitage, startenergi, position och moral samt ett
  uttryckligt avgränsat exempel på attributpåverkan.

Gränser: bakgrundsmotorn tar steg om 20 sekunder och saknar skridskobana;
dess rörelseansträngning är därför neutral, medan direktsänd match mäter
rörelsen. Bänkåterhämtning delas upp i högst en sekund per beräkning i
bakgrundsmotorn; tidsupplösningen ger fortfarande små skillnader. Äldre
matchmotorer och rapporter utan uppmätt belastning behåller kompatibilitetsvägar.
Rivalernas uttagningsbetyg är fortfarande ett separat bedömningsmått.
Koefﬁcienterna är spelregler som ännu behöver statistisk hockeykalibrering.

Verifiering: match-readiness.test.cjs kontrollerar verkliga anrop i båda
motorerna, vila/tempo/uthållighet/moral, återhämtningstak, läsande
beredskapsvy och exakt engångsbokföring av både AI- och direktsänd belastning.
Ingen ny sparstruktur krävs för den gemensamma modellen; den använder
befintlig energi och fatigue. Simuleringsrapportens arbetsdata tas bort
efter bokföring och sparas inte i klubbens rapportarkiv.

Åtta riktade testfiler passerade för detta steg: match-readiness,
chemistry-foundation, career-match, career-match-rules, adaptive-coaches,
workflow, coaching och rivals. Full flersäsongskalibrering återstår.

## Grundsteg 3: tränarråd med synligt underlag

Implementerat i match-evidence.js och den befintliga coachbänkens Feedback-vy.
Assistenten granskar de senaste fem spelminuterna, högst två observationer åt
gången. Energiläget gäller spelarna som faktiskt är på isen.

- Farliga avslut bakåt och egna skottförsök med låg farlighet behandlas
  separat. Skottmönster analyseras endast vid lika styrka och efter minst tre
  spelminuter, med minimiantal observationer. Farlighet är matchmotorns
  befintliga klassificering, inte en ny extern xG-modell.
- Upprepade egna utvisningar och minst två slitna aktiva utespelare kan ge
  egna observationer. Special teams blandas inte in i fem-mot-fem-analysen.
- Varje råd visar observation, handlingsalternativ och avvägning. Det gör
  ingen säker orsaksbedömning av ett statistiskt mönster.
- Redan avvaktande press, tålmodiga avslut eller disciplinerad fysisk nivå
  leder till att assistenten hänvisar till formationer eller matchloggen,
  i stället för att föreslå samma taktiska val igen.
- Befintliga coachflikar används för granskning. Taktik och byten pausar
  matchen, medan logg följer spelarens befintliga pausinställning. Inget råd
  ändrar taktiken automatiskt eller ger en dold prestationsbonus.
- Underlaget uppdateras var 30:e spelad sekund i direktsänd match. En
  fokuserad knapp byts inte ut under tangentbordsanvändning. Ett nytt
  renderat pausläge läser aktuella värden.
- Äldre delvis registrerade matcher får inga automatiska slutsatser från
  skottmönster eller utvisningar. Det aktuella energiläget kan fortfarande
  bedömas. Ingen historik eller slump skapas av att läsa råden.

Gränser: detta är fyra avgränsade regelbaserade observationer. Zoninträden,
uppspelsvägar, forecheckens faktiska genomslag och utfall efter en vald
åtgärd behöver mer registrering och uppföljning innan assistenten kan
diagnostisera dem. Ingen effekt av tränarråd eller taktik på vinstsannolikhet
har kalibrerats i detta steg.

## Desktop workspace redesign — September 8, 2026

The FM reference images establish a spatial hierarchy: persistent club navigation, compact context tabs, instructions beside the formation, and a comparable player table. The default selection view now follows that hierarchy rather than stacking chemistry reports and reserve cards above and below the lineup.

- Tactics and lineup share one navigation destination. Legacy tactics links remain supported.
- Five-on-five uses independent four-line / three-pair selection, a rink, and a candidate table. Mouse drag/drop, keyboard slot selection and explicit assignment use existing lineup mutations and medical/icing guards.
- Long chemistry and readiness explanations live in the analysis tab. Special teams and match squad retain their existing mutation paths.
- The player overview places grouped technical, mental and physical attributes alongside role and readiness. Contract negotiations, development/medical/social actions and full reports have dedicated tabs.
- The shared desktop shell is denser; the immersive live-match shell is excluded from these changes.

Validation: actual saved roster swaps, profile/back navigation, contract form access, development access, saved tactical orders and pause-on-order behavior are covered in desktop-workspace.test.cjs. Existing navigation, attributes, training, medical and locker suites remain relevant. This is an information architecture change; it does not introduce new simulation bonuses.
