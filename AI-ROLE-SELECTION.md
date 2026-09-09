# AI: rolluppföljning påverkar matchuttagningen

## Beslut och spelvärde

Rollöften prövas redan mot truppens kapacitet. Nästa koppling är att tränaren reagerar när faktisk istid inte motsvarar rollen. En jämnstark ordinarie spelare kan nu få chansen före en konkurrent när uppföljningen visar för lite speltid. Klubben får därmed en möjlighet att hantera problemet sportsligt innan missnöjet leder vidare till kontrakts- eller försäljningsbeslut.

## Hur det fungerar

`rivalRoleSelection` läser den befintliga sexmatchersuppföljningen. Bara ordinarie och nyckelspelare får extra prioritet.

- Utespelare får som mest 0,6 i uttagningsbedömningen, beroende på avståndet mellan verklig genomsnittlig istid och rollkravet. Pågående uppföljning kräver minst två matcher i den första perioden; en avslutad period kan användas direkt inför nästa.
- Målvakter får som mest 0,8. Bedömningen jämför kvalificerade starter hittills med rollens förväntade andel under sex tillgängliga matcher. Minst två observationer krävs.
- Medicinsk otillgänglighet eller minst 35 procent trötthet stänger av stödet. Ordinarie förmåga, form och trötthetsavdrag används fortsatt.
- Stödet påverkar vilka forwards/backar som tas ut, ordningen bland naturliga centrar, reserver och målvaktsval. Naturliga positioner, kedjekemi och befintliga tränarpreferenser behålls.
- Special teams behåller sin separata bedömning av specialistförmåga. Detta garanterar inte specifika minuter eller en viss kedja och gör ingen automatisk ändring av spelarens roll.

Det är samma `rivalLineup` som används i bakgrundsmatcher och mot användaren. När en match har skapats används dess sparade uttagning vid återladdning; läsning av en prognos förbrukar inte matcher eller förändrar uppföljningen.

## Återkoppling och sparning

Motståndsrapporten förklarar att rolluppföljningen kan avgöra jämna uttagningar. För den förväntade målvakten visas en särskild mening när uppföljningen faktiskt ger stöd för en start. Ingen ny knapp eller sparfilstruktur införs; befintliga `aiRoleReview`-fält återanvänds.

## Testning

`ai-role-selection.test.cjs` verifierar en faktisk förändring i backuttagningen efter riktiga anrop till matchuppföljningen. Den valda spelaren får sedan registrerad istid i en bakgrundsmatch. Testet kontrollerar även skada, trötthet, tydlig förmågeskillnad, uppfylld roll, avslutad uppföljningsperiod, målvaktsval, oförändrat spelstate vid läsning och sparning/laddning. En separat kontroll skapar användarens riktiga premiärmatch och verifierar att samma uttagning sparas och återladdas.

Befintliga tester för klubb-AI, sammanlagda rollkrav, motståndare och ligauttagningar körs också. Inga nya fullständiga flersäsongskörningar påstås för denna etapp.

## Kvarstår

Att beräkna och fördela planerad istid per kedja och special teams över flera matcher. Den här etappen påverkar uttagning och ordning, medan matchens befintliga bytes- och taktiklogik fortfarande avgör den faktiska istiden.
