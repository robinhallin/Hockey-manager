# Sammanhängande rollöften

Nya kontraktslöften för målvakter stämmer nu med den löpande rollbedömningen: ordinarie innebär minst 30 minuters spel i 2 av 6 tillgängliga tävlingsmatcher, nyckelspelare 4 av 6. För utespelare behålls 12 respektive 15 minuter i 2 av 3 matcher. Rotation och bredd skapar inget särskilt introduktionslöfte.

## Beslut och följder

Villkoren visas före köp, kontraktsförlängning och förhandsavtal. Tränaren måste väga utlovat ansvar mot konkurrensen om platser och istid. Ett uppfyllt eller brutet avtal påverkar faktisk trivsel och förtroende med befintliga storlekar på effekterna. Lön och avtalslängd förhandlas som tidigare.

Omklädningsrummet visar avtalat mål, återstående matcher och utfällbart underlag med datum, motstånd och faktisk istid. Stabens uppföljning använder samma villkor. Tidigare avtal arkiveras när ett nytt avtal ersätter dem, inklusive vilket resultat de hade; ett pågående avtal markeras som ersatt genom nytt avtal. Historiken begränsas till åtta avtal per spelare och högst sex matchposter per löfte.

Nya samtal genererar inte ytterligare istidsgarantier för en spelare som redan har ett aktivt avtalslöfte. Ett äldre väntande samtal kan fortfarande besvaras ärligt, men kan inte lägga en andra garanti ovanpå den första. Inlånade spelare sköts via låneavtalet.

## Sparfiler och undantag

Aktiva gamla löften saknar nya villkorsfält och behåller därför 2 av 3 matcher. Redan signerade äldre förhandsavtal behåller också gamla villkor vid ankomst. Nya förhandsbud bär med sig en villkorsversion till aktiveringen. Medicinska undantag pausar räknaren; träningsmatcher och upprepade anrop för samma match räknas inte.

Matchunderlag läggs bara till när nya matcher faktiskt följs upp. Äldre matchhistorik rekonstrueras inte. Avtalets uttryckliga resultat styr förtroendereaktionen, med bakåtkompatibel tolkning när ett äldre sparat resultat saknas.

## Kontroller

`role-promises.test.cjs` kontrollerar ordinarie och nyckelmålvakt, faktisk trivsel och förtroende, gamla avtal, medicinska undantag, träningsmatcher, dubbla matchanrop, sparning/återläsning, avtalsarkiv, förhandsavtal, en riktig accepterad förlängning och ett väntande samtal som inte får stapla löften. Befintliga tester för rekrytering, kalender, medicin, omklädningsrum, träning, AI-avtal och stabsuppföljning kontrollerar angränsande flöden.

Detta är fortfarande ett avgränsat rollsystem. Fullständiga förhandlingar om flera samtidiga löften och längre mänsklig balansering återstår.
