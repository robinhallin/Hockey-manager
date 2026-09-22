# Spelglädje: beslut som går att följa

Granskningen följde kodvägen kontor → kalender/träning → uttagning → rekrytering → match → rapport. Befintliga system har redan daglig träning, delegering, utvecklingsplaner, fem matchers introduktionsuppföljning, scoututvärdering efter sex veckor och taktiska beslutsloggar. De återanvänds. Dagsövergången lägger redan ingen konstgjord väntetid ovanpå simuleringen.

Tre prioriterade förbättringar:

1. Belastning till uttagning. Kontorets belastningsvarning öppnar spelarens faktiska kedjeplats. Kandidater visar positionsrelevanta exakta attribut, avtalad roll och registrerad istid tillsammans med befintlig energi och positionsvana. Spelaren väljs med befintlig laguttagningslogik; öppnandet gör inget byte. Ett redan uttaget alternativ byter plats enligt befintliga regler.
2. Utvecklingsplan till matchunderlag. Den befintliga 28-dagarsuppföljningen visar före/efter: rapportantal, matcher med registrerad istid, minuter per sådan match och poäng. Matchrapporter öppnas direkt. Endast fullständiga tävlingsrapporter för rätt klubb används; framtida rapporter utesluts. Saknad spelarrad tolkas inte som frisk petning. Arkivgallring kan begränsa underlaget. Inga kausala träningspåståenden görs.
3. Värvningsplan till faktisk användning. Rekryteringsöversikten visar sparad plats/uppgift, nuvarande uttagning, medicinskt läge, avtal och befintlig introduktionsuppföljning utan sex veckors väntan. Scoututvärderingen finns kvar. Åtgärden öppnar aktuell plats eller sparad plan; annars första platsen i rätt positionsgrupp. Beslutet att faktiskt ändra laget fattas fortfarande i uttagningen. Uppföljningar från tidigare managerklubbar visas inte som aktuella värvningar.

Modern Dark och sparstrukturen behålls. Ingen ny meddelandeström, automatisk uttagning eller separat berättelsemotor tillkommer.

Verifiering: `decision-followthrough.test.cjs` använder verkligt köp, sparad placeringsplan, laguttagning, dagsavancering, träningspass, produktionsmatchmotor, matcharkivering och återladdning. Kontrollerade rapporter testar jämförelsens gränser. Befintliga tester täcker rekrytering, träningsplanering och navigation. Det är automatiserade arbetsflödestester, inte visuell provspelning eller bevis för att spelet upplevs roligare. Visuell kontroll och användartest av informationsmängden återstår. Denna etapp ändrar inte matchmotorns balans eller AI-klubbarnas beteende.
