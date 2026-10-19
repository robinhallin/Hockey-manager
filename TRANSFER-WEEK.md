# En sammanhängande transfervecka

Rekrytering → Affärer visar kassautrymme efter reserverade köp, årets löneutrymme, daterade besked, faktiska rivalbud och de senaste sju dagarnas genomförda övergångar. Äldre övergångar utan datum fylls inte på med påhittade datum.

## Först ersättaren, sedan försäljningen

Öppna ett inkommande köpbud och välj **Sälj först när ersättaren är klar**. Välj ett av dina pågående omedelbara köp i samma positionsgrupp. Ett köp kan säkra en försäljning; samma utgående spelare kan inte ingå i flera aktiva kedjor.

Godkännandet är villkorat. Det flyttar ingen spelare och ändrar inga pengar. Köparens befintliga svarstid gäller. Ersättaren måste först registreras för den aktuella klubben och vara spelklar. Därefter prövas den ordinarie försäljningen följande dag, inklusive spelarens vilja, köparens faktiska behov och budget, truppbredd och transferfönster. Ersättarens klubbtillhörighet, hälsa och avtalsläge kontrolleras igen vid försäljningen. Ersättaren blir kvar även om försäljningen faller.

Köpbudet reserverar hela sin kostnad och lön. Möjliga framtida försäljningsintäkter och lönebesparingar kan inte finansiera köpet. Systemet erbjuder därför en försiktig ersättarkedja, inte samtidiga nettotransaktioner med kredit.

Om köpet återkallas, avslås eller går till en annan klubb återgår försäljningen till ett nytt uttryckligt beslut. Att ta bort ersättarvillkoret återkallar godkännandet men behåller köpbudet. Pågående match och fel klubbuppdrag spärrar åtgärderna. Sparfiler validerar villkor, referenser, dubbletter och klubbägda spelarreaktioner, även i tidigare arbetsgivares bank.

## Rivalerna väntar inte obegränsat

Rivalbud kommer från den befintliga AI-scoutingen, klubbarnas verkliga truppbehov, rollplaner och finansiering. En osignerad managerförhandling skjuter upp rivalens beslut till fem dagar efter rivalbudet. Därefter kan ett giltigt, förfallet AI-bud registreras genom samma transaktionsväg. Ett accepterat motbud skyddas fortfarande och omprövas inte som en ny auktion.

Femdagarsgränsen är en spelregel, inte en regel ur tävlingsbestämmelser. Gränsen visas i transferveckan och meddelas för aktiva förhandlingar. Kalendern stannar inför den även om frivilliga affärsstopp är avstängda. Om finansiering eller behov faller bort avslås AI-budet, orsaken journalförs och klubben kan söka alternativ vid nästa marknadsdag. När rivalen vinner får managerförhandlingen ett daterat besked med klubbens namn och frigjort utrymme.

## Spelarna minns beskeden

En verkligt registrerad övergång jämförs med berörda spelares pågående provperioder, introduktionsroller och individuella löften. Högst tre berörda spelare uppmärksammas per övergång, med prioritet för en vald provperiod. Ett konkurrerande nyförvärv kan ge −1 förtroende och en konkret fråga som återger det tidigare beskedet. En försäljning kan öppna en plats eller avsluta en gemensam väg utan att detta felaktigt bedöms som missad istid.

Spelaren kan få en förklaring om konkurrensen eller ett besked att den tidigare överenskommelsen står fast. Inget val ändrar laguttagningen eller nollställer befintliga löften. Samtalet ger inga extra förtroendepoäng. Det registreras i samma spelarjournal och spelarresa, medan tävlingsmatcherna avgör om tidigare löften faktiskt hålls. Frågorna finns under Affärer och i beslutslistan. Högst 60 frågor behålls i kontoret; spelarjournalerna behåller minnena.

## Verifiering

`node --test transfer-week.test.cjs` kontrollerar riktiga köp/försäljningar, bokföring en gång, export och omladdning, brutna kedjor, ursprunglig deadline, medicinsk förändring, köparens finansiering, återkallande, dubbletter, positionsgrupper, rivalens beslut, accepterade motbud, spelarminnen, tidigare klubbuppdrag och sparfilsvalidering.

`scripts/transfer-week-browser-checks.cjs` kör de faktiska gränssnittsknapparna, registrering via kalenderdagar och sparning på disk. Den ingår i det befintliga korta Electron-testet `desktop/club-build-ui.cjs` och producerar skärmbilder 50–53.
