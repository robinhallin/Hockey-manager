# Åtgärder efter granskningen den 17 september 2026

## Matchmotorn

Försvarsmål räknas nu i det försvarande lagets koordinatsystem. Backarna
behåller ett målsidesavstånd på 2,1–5,5 meter till puckföraren vid omställning,
i båda spelriktningarna. När anfallet etablerats i försvarszonen behålls
basmotorns individuella markering i stället för att skicka forwards mot
mittzonen. F2 stänger åter förstapasset. Beslutsalternativen återger vilka
attribut och vilket zonläge som påverkat värderingen.

Dumpbeslut skiljer mellan offside, hård press och glest understöd. Glest
understöd ger inte längre samma stora dumpbonus som ett akut tag-up-läge.
Puckföraren kan därför behålla pucken när det finns en rimlig skridsko- eller
passningsväg. Skottens träff- och målchanser har inte ändrats.

## En gemensam dagsagenda

Tränarkontoret och agendasystemet använder samma prioriteringar, åtgärder och
regler för delegering. Det finns en beslutslista, även när man växlar till
Uppföljning. Inga obligatoriska svar kapas bort av en femradsgräns.

Löften hämtas från samma underlag som omklädningsrummet: samtalslöften i
`state.training.promises` och spelarnas avtalade `recruitmentPromise`.
Uppföljningen visar återstående tillgängliga tävlingsmatcher enligt respektive
löftes villkor, inklusive målvakternas sexmatchersperiod. Avslutade löften,
historiska avtal och löften till spelare som lämnat laget är inte aktuella
uppgifter. Klick öppnar omklädningsrummets löftesvy. Ingen ny deadline eller
nytt löfte skapas när kontoret visas.

## Test- och balansverktyg

Agendan använder vanliga globala funktioner som övriga spelet i stället för
att kräva `window` vid inläsning. Produktionskoden kan därmed laddas av den
befintliga testmiljön utan en särskild testshim.

Kalibrering, bred balansdiagnostik och övriga matchdiagnoser använder
`scripts/current-match-engine.cjs`: regler, motor 3, motor 4 och managerkontroller
i produktionsordning. Verktyget kontrollerar ordningen mot `index.html` och
stoppar om en ny motorfil saknas i verktygets lista. Matchstudion laddar samma
gemensamma motor. Karriärspecifika adaptrar testas separat genom riktiga
karriärmatcher; de ingår inte i den fristående balansdiagnostiken.

Regressionsfallen kontrollerar faktiska försvarskoordinater i båda riktningarna,
markering i etablerat försvar, riktiga samtals-/avtalslöften, sparning och
återläsning, obligatoriska svar och en ensam skrivskyddad prioriteringslista.
Kalibreringens tidigare gränser för skott, skottförsök, mål och räddningsprocent
behålls.

### Attributbalans och karriärkoppling

Attributkurvan använder nu 10 + (värde − 10) × 0,5 i stället för × 0,88.
Samma råa styrkeskillnad påverkade flera efterföljande moment: rörelse,
passningsval, dueller och avslut. Den mildare kurvan begränsar denna samlade
förstärkning. Råa spelarattribut, utveckling och sparformat ändras inte.
Bättre attribut behåller sin ordning; resultaten styrs inte av ställningen.

Karriärmotorns egen attributmetod hoppade tidigare över kalibreringen eftersom
installationsflaggan ärvdes från basklassen. Kontrollen skiljer nu på en egen
och en ärvd flagga. Kalibreringen körs exakt en gång efter karriärens beräkning
av energi, positionsvana, kemi och moral. Regressionstestet använder den riktiga
karriärklassen och kontrollerar även återinläsning, oförändrade råattribut och RNG.
Det befintliga beredskapstestet förväntar nu den faktiskt kalibrerade effekten.

### Uppmätt kalibrering

De oförändrade gränserna över 96 perioder passerar med aktuell gemensam motor:
25,63 skott, 44,72 skottförsök och 2,80 mål per lag och 60 minuter; 89,09 %
räddningar. Slumpfröna är i × 1107 för i = 1…96. Resultat och gränser finns i
`qa/match-balance-current.json`.

Det separata stresstestet i `qa/match-balance-wide.json` använder samma trupp
med −2/0/+2 på samtliga attribut, parade slumpfrön och båda spelriktningarna.
I största styrkeskillnaden minskar det starkare lagets skott från 23,17 till
15,33 per period; det svagare ökar från 3,00 till 5,08. Svagare profiler får
fortfarande varningar under sex skott per period: detta är en förbättring,
inte ett påstående att alla styrkeskillnader eller verklig SHL-statistik är
färdigkalibrerade. Karriärens särskilda beredskap och taktiska tillskott ingår
inte i dessa fristående volymsiffror.

Ett separat regressionstest kör 24 perioder med andra slumpfrön (101…112 × 1879)
och ombytta spelriktningar. Det kräver fortsatt fördel i chanser för starkare
spelare, samtidigt som det svagare laget måste behålla minst 20 % av skotten
och nio skottförsök per period över hela provet. Dessa är spelmässiga skydd mot
återfall, inte observerade liganormer.
