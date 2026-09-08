# Uppföljning av ändrad laguppställning

## Tränarens beslut
Byt kedjekamrater eller målvakt, följ det faktiska fortsatta spelet och behåll underlaget till nästa laguttagning. Matchen hade redan statistik per faktisk spelarkombination; nu sparas även sammanhanget för tränarens ändring.

## Genomförande
- De befintliga handlers som används av coachpanelen, rinkuttagningen och lagvyn registrerar ändrade kedjor, backpar och målvakt. Ett spelarbyte mellan två kedjor visar båda berörda kedjorna.
- Laguppställning och taktiska order ingår i samma beslutstidslinje. Flera ändringar vid samma matchklocka grupperas. Ogiltiga och oförändrade uttagningar skapar inga nya beslut.
- Matchmotorn använder fortfarande den ordinarie uttagningen. Målvaktsval pausar också en rullande match, som övriga tränarbyten.
- Före/efter använder befintliga registrerade skottförsök, farliga lägen och tid vid lika styrka. Minst tre minuter på vardera sidan krävs för att jämföra takten. Boxplay, powerplay och ofullständigt underlag hanteras enligt befintlig uppföljning.
- Coachpanelens Byten och Kedjor visar tidslinjen; den finns också i taktiken och den sparade matchanalysen. Spelarnas namn vid beslutet sparas, så arkivet inte ändras om truppen senare förändras.

## Tolkning och avgränsning
Siffrorna gäller hela laget efter tränarbeslutet, inte en isolerad effekt av en spelare eller femma. Uppställningen är en plan; den ändrade kedjan måste också få istid. Separat statistik för spelarkombinationer finns redan under matchanalysens Formationer. Automatiska byten, val av nästa kedja och separata special teams-ändringar får ingen ny egen beslutsuppföljning i denna etapp. Äldre rapporter kompletteras inte med påhittade spelarbyten. Historiken behåller högst 24 beslut per match; sex senaste visas.

## Kontroller
lineup-review.test.cjs provar verkliga ändringshandlers, båda kedjorna i ett byte, kombinerad taktik och målvaktsändring, oförändrade/ogiltiga val, tids- och styrkeavgränsning, sparning/återläsning, arkivets namn och faktisk fortsatt produktionsmatch. tactical-review.test.cjs kontrollerar den befintliga taktiska uppföljningen och roster-depth.test.cjs matchtrupp, skador, lån och sparfilsutrymme.
