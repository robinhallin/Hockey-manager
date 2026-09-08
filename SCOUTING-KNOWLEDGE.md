# Daterad scoutingkunskap

## Beslutet
Värva utifrån den kunskap klubben redan har, eller betala för ytterligare sju dagars observation. En färdig rapport ger inte ständig tillgång till en annan klubbs aktuella attribut.

## Genomförande
- Varje observation sparar en kopia av spelarens attribut och observationsdatum. Bedömningen använder detta underlag tills nästa observation.
- Tre observationer förbättrar kunskapen enligt den befintliga modellen. Efter 60 dagar kan en färdig rapport uppdateras. Därefter sjunker säkerheten gradvis och intervallet vidgas; åldrandet ändrar inte attributbedömningens mittvärden.
- Uppdateringen använder samma scoutkapacitet, kassa, reserveringar, kostnad och sjudagarskö som en vanlig observation. En väntande beställning kan inte debiteras igen. En uppdatering behåller tre av tre genomförda grundobservationer.
- Rekryteringen och Scoutcentralen visar datum, ålder och behov av nytt underlag. Inboxen skiljer uppdateringar från grundobservationer.
- Egna spelare har fortsatt exakta attribut. Vid försäljning eller utlåning sparas den senast kända förmågan.
- Gamla rapporter fryses vid migreringen och markeras som äldre underlag. Ingen historisk observation hittas på; datum och antal besök behålls. Nästa riktiga observation ersätter underlaget.

## Gränser
Gruppuppdrag hittar fortfarande spelare med färre än tre observationer; uppdatering av färdiga rapporter beställs individuellt. Okända spelare använder den tidigare breda uppskattningen. Stjärnor är relativa till den egna truppen och bedömaren. Potential är fortfarande en osäker bedömning av utvecklingsutrymmet. Rapporternas attributunderlag är fryst, inte hela omvärlden eller personalens värdering.

## Kontroll
scouting-refresh.test.cjs kontrollerar verklig kalenderleverans, frysta attribut, åldrande, kostnad och dubbelbeställning, leverans efter sju dagar, migrering och sparning/återläsning. Befintliga attribut-, rekryterings- och truppflöden körs som regressioner.
