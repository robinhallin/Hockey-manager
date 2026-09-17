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
