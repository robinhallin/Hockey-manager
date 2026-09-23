# Träningsbeslut med uppföljning

## Faktiska brister

- Kalenderns passval saknade en jämförelse med återhämtning och nästa match. Kontorets prognos räknade dessutom landslagsfrånvarande spelare som återhämtande hemma, trots att de hoppades över i genomförandet.
- Medicinsk belastning beräknades genom att välja träningsbelastning igen efter passet. Vid delegerad återhämtning kunde en spelare passera vilogränsen under ett hårt pass och sedan felaktigt registreras som vilande medicinskt.
- Stabens individuella endagsvila skapade separata återgångsmeddelanden per spelare. Rapporten visade inte vilka som faktiskt vilat eller förberedelsernas uppmätta förändringar.

## Genomfört

1. Kalendern visar dagens avvägning med nästa match, antal matcher inom sju dagar, valt pass och relevanta alternativ. Individuella instruktioner, delegering och frånvaro ingår. Startenergi, slitage och medicinsk belastning förklaras separat. Framtida dagar får ingen påhittad exakt belastningsprognos.
2. `trainingTeamProjection` används av kalender, kontor och det riktiga träningspasset. Samma deltagande skickas vidare till medicinsk uppföljning. Befintliga utvecklings-, förberedelse- och återhämtningsformler behålls. Manuell belastning och planerad återgång har samma prioritet i prognos och genomförande.
3. Befintliga passrapporter innehåller uppmätta förändringar i matchplansvana, PP/BP-förberedelse, slitage, medicinsk belastning och vilka spelare staben vilat. Inkorg och träningshistorik öppnar rätt kalenderdatum; spelarhänvisningar använder ID och individuella träningsplaner kan öppnas direkt. Stabens rutinmässiga återgång skapar inga extra individuella meddelanden. Manuella planers slutrapporter behålls.

## Sparning och historik

Den befintliga, begränsade träningshistoriken sparar valfri `evidence` version 1. Ingen befintlig rapport skrivs om. Äldre sparfiler laddas utan detta fält och visar uttryckligen att det detaljerade underlaget saknas. Nya rapporter behåller dåvarande klubb, säsong, namn och mätvärden. Profillänken använder fortsatt spelarens ID. En spelares aktuella situation ersätter inte den historiska mätningen.

## Verifiering och gränser

`training-decisions.test.cjs` använder verkliga produktionsmoduler: passval, delegering, två lika namn, profilbesök och återgång med scroll, kalendersteg, medicinsk belastning efter gränspassage, landslagsfrånvaro, rapportnavigation, sparning/import och äldre sparfiler. Flödet fortsätter genom matchförberedelser, produktionsmotorns matchbonus, en hel match, arkivering och nästa träningsdag.

Regressionskontroller omfattar befintlig individuell planering, delegering, klubbbyte/lån, utvecklingsvyer och lugna dagssteg. Inga nya dialogstopp eller dagliga beslut införs. Träningsprognoser lovar inte attributsteg eller matchresultat, och rapporterna påstår inte att träningen orsakade seger eller förlust.

Detta är kodgranskning och automatiserade arbetsflöden. Visuell provspelning har inte genomförts i denna miljö. Läsbarhet i den körande desktopvyn och hur roligt besluten upplevs behöver fortsatt användartestas.
