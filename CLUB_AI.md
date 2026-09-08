# Klubb-AI: långsiktiga beslut och en levande liga

Motståndarna behöver bygga trupper som fungerar nästa år och bära följderna av
sina beslut. Uppdateringen kopplar samman laguttagning, ekonomi, rekrytering,
kontrakt, akademi och spelarreaktioner för de 28 svenska klubbarna. Den fortsätter
arbetet i PR #45.

## Vad spelaren möter

- Klubbar har en bestående inriktning: titel, slutspel, talangutveckling,
  ombyggnad eller ekonomisk återhämtning. Resultat och prognos kan ändra planen.
- Sportchefer skiljer sig i bedömning, tålamod, risktagande och kontaktnät.
  Tränarnas profiler styr spelidé, rotation och anpassning.
- Truppplanen skiljer mellan dagens skador och nästa säsongs luckor. Den söker
  målvakter, backar, forwards, naturliga centrar, målskyttar, spelfördelare och
  defensiva backar. Specialistroller överlappar ordinarie truppplatser.
- Egna juniorer kan få chansen. En tillfällig skada kan utlösa ett lån. En
  överflödig, dyr eller missnöjd spelare kan erbjudas andra klubbar.
- Förlängningar väger samman position, efterträdare, ålder, lön och missnöje.
  Avslag kan omprövas efter minst fyra veckor när situationen ändrats.
- Motståndsrapporten visar klubbens riktning, truppbehov, ekonomi, akademi och
  daterade beslut efter den vanliga matchförberedelsen och laguppställningen.

## Marknaden och pengarna

Klubbar observerar kandidater över flera kalenderdagar. Normalt behövs två
bedömningar; akut målvaktsbrist kan ge ett snabbare beslut. Osäkerheten minskar
med observationer och sportchefens kompetens. Ungdomsprojekt värderar ålder och
utveckling, medan resultatinriktade klubbar föredrar spelare som bidrar direkt.
När deadline närmar sig ökar takten.

Bud blir sparade förhandlingar med svarstid. Alla klubbars avsikter samlas innan
spelaren väljer efter lön, roll, avtalslängd och klubbens nivå. Användarens
förhandlingar deltar i samma konkurrens. Ogiltiga AI-bud tas bort ur valet.
Bud på användarens spelare kräver användarens försäljningsbeslut. En spelare
med utgående avtal kan välja ett förhandsavtal; användaren får en varning och
tid att försöka förlänga innan AI-budet avgörs.

Pågående bud reserverar avgifter och löner. Fleråriga avtal reserverar framtida
lön. Egna utlånade spelare, lånens lönedelning, betalda akademikontrakt och redan
säkrade ankomster ingår. Behov, tillgänglighet, ägande, villkor och budget
kontrolleras igen när affären avgörs. Trupptaket lämnar utrymme för de
målvakter, backar och forwards som krävs för en spelbar minimitrupp.

AI-klubbar bokför publik, sponsoravtal, löner, personal, akademi, drift, resor
och övergångar. Årsutgifterna fördelas på 52 grundseriematcher enligt spelets
befintliga ekonomimodell. Slutspel ger publikintäkter och matchkostnader.
Unika matchnycklar förhindrar dubbel bokföring.

Den automatiska årliga tilldelningen på sex miljoner till svenska AI-klubbar
är borttagen. Kassan förs vidare. Sponsoravtalet utgår från ursprungliga resurser
och justeras vid ligabyte och säsongsskifte; höjda löner skapar inga automatiska
sponsorintäkter. Budgeten bygger på intäkter, fasta kostnader och marginal.
Negativ kassa medför värvningsstopp och besparingsbehov.

## Matcherna och utvecklingen

AI-lagen väljer särskilda PP1/PP2- och BP1/BP2-uppställningar. Naturliga
positioner, passningar, avslut, försvar, disciplin och form påverkar valet.
Utvisade specialister ersätts på rätt position. Centrar prioriteras i kedjorna
och en defensiv kedja kan matchas mot motståndarens förstakedja.

`aiCoachDecision` används både i direktsända matcher och bakgrundsmatcher.
Tid, resultat och skottbild styr press, försvar, rotation, bytestid och timeout.
Bakgrundsmotorn väger också in specialteamsystem, energi och uthållighet.
Timeout och bänktid ger återhämtning. Moralen påverkar mentala attribut.

Upp till sex möten per motståndare sparas med resultat, skott och observerad
spelidé. Anpassningsbara tränare kan ändra nästa plan efter upprepade nederlag
eller problem i skottbilden. Minnet följer klubben över säsonger.

Varje AI-akademi börjar med 14 fiktiva spelare, 16–19 år. De har stabila
identiteter, utvecklingstak, rollträning, mentorskap och veckovisa
utvecklingsmatcher. Årligt intag, uppflyttning, seniorlån och utträde ur
junioråldern använder samma spelare. Skador och rehabilitering följer kalendern.

Seniorernas faktiska istid jämförs med utlovad roll efter sex matcher. Missnöje
kan påverka försäljningar, förlängningar och utlåning. Mer ansvar kan återställa
nöjdheten. Även spelklara seniorer utanför matchtruppen följs upp.

## Sparningar och klubbyte

`state.clubAI` lagrar klubbar, akademier, ekonomi, observationer, motståndarminne
och förhandlingar. Äldre karriärer får data vid inläsning. Seniorer, pengar och
redan spelade resultat behålls. Sidvisning flyttar inte kalendern.

Vid klubbyte lämnas den befintliga akademin till den gamla klubbens AI och den
nya klubbens akademi tas över. Faktiska ekonomiska förutsättningar följer med.
Samma junior får inte finnas i två aktiva ägarpooler. Import validerar
akademispelare, identiteter, AI-avtal och ekonomi. Historiker begränsas i storlek.

Komprimerade webbläsarsparningar använder förlustfri LZW v2. Ordboken startas
om när den fylls, så att senare säsongers data också komprimeras effektivt.
V1-sparningar kan fortfarande läsas och exporterade karriärer är vanlig JSON.
Ingen matchhistorik raderas för att klara det testade sparutrymmet.

## Omfattning och verifiering

Detta är ett större steg mot ett managerdjup i Football Manager-stil.
Bakgrundsmatcher använder en kompakt händelsesimulering; direktsända matcher
använder 2D-motorn. Akademimatcher saknar ett komplett juniorspelschema och
tabellsystem. Utländska marknadsklubbar har fortfarande inga spelade ligor och
behåller sin äldre ekonomimodell. Ekonomiska belopp och klubbprojekt är
spelmodeller, inte uppgifter om verkliga klubbars ekonomi. Insolvens simuleras
inte. En sista akademireserv bevarar minimitruppen även när budgeten överskrids;
externa värvningar förblir budgetstyrda.

- `club-ai.test.cjs`: migrering, sparningar, positioner, special teams, taktiskt
  minne, ekonomisk press, konkurrens, spelarreaktioner och utveckling.
- `club-ai-contracts.test.cjs`: reservationer, förhandsavtal, spelarval,
  säsongsankomster, lånelöner, ägande och återkomst.
- `club-ai-career.test.cjs`: tre grundserier, slutspel och säsongsskiften med
  ekonomisk avstämning, spelaridentiteter, truppkrav och omladdning.
- `npm test`: hela projektets regressionstestning.

Verifiering 8 september 2026: 45 övriga testfiler passerade i fullkörningen.
Långtestets testhölje justerades till bakgrundsslutspelets riktiga entrypoints
för att undvika obesvarade användardialoger, och kördes sedan om separat.
Det passerade 2 184 grundseriematcher, tre slutspel och tre säsongsskiften med
avstämda kassor, spelbara trupper, unika identiteter och återlästa karriärer.
Den aktiva komprimerade sparningen höll sig under 5 MiB vid varje årsskifte.
Lagringstesterna kördes om efter v2-ändringen och passerade, inklusive exakt
matchåterupptagning och läsning av en komplett äldre v1-karriär.

Visuell webbläsarkontroll kunde inte genomföras: förhandsvisningens anslutning
till den lokala spelservern blockerades. Mobilvyerna behöver därför även en
faktisk visuell kontroll före publicering. Cacheversion: `club-ai1`.
