# Från kontraktsutkast till rolluppföljning

Granskningen fann att förlängningsformuläret saknade beslutsbudget, att inmatningen återställdes vid omrendering och att rollöftets historiska matchunderlag saknade rapportlänkar. Rekryteringsvyn hade också en separat uträkning av budgetreservationer.

1. Förlängningen visar före erbjudandet total lön över avtalsåren, löneändring, utrymme innevarande och nästa säsong samt det specifika rollöftet. Samma budgetunderlag används av förhandsvisningen, rekryteringsvyn och beslutets ekonomiska kontroll. Gammal lön räknas av när avtalet ersätts. Kända bud, lån och framtida kontrakt ingår; spelaren kan fortfarande tacka nej.
2. Ett frivilligt utkast sparas på spelarens ID och avgränsas till aktuell klubb. Att skriva eller navigera reserverar inga pengar, ger inga löften och påverkar inga förhandlingsförsök. Avslag behåller utkastet; avbryt eller accepterat avtal tar bort det. En annan spelares förhandling skriver inte över utkastet. Äldre sparfiler utan fältet använder befintliga förhandlingsvärden. Utkastet överlever laddning och ignoreras hos annan klubb.
3. Aktiva löften visas på kontraktsfliken: vad som återstår, om målet redan är nått eller inte längre kan nås under perioden. Reaktionen sker fortfarande vid den ordinarie uppföljningen. Faktiskt lagrad matchidentitet öppnar rapporten; gallrade rapporter märks som saknade. En genväg leder till spelarens laguttagning. Förlängnings- och uppföljningsmeddelanden bär spelar-ID.

Befintlig förhandling, simulering, reaktion och sparning används. Modern Dark behålls. Inga extra dagliga meddelanden, nya flikar eller ändrade reaktionsregler införs.

Automatiserade tester omfattar separata utkast för spelare med samma namn, profilbesök, sparning/laddning, reservationer, avslag och accepterat avtal, riktiga dagssteg, en hel produktionsmatch, rolluppföljning och historiska rapporter. Befintliga budget-, rollöftes- och desktopflödestester körs också. Visuell provspelning och användartest av spelglädjen återstår.
