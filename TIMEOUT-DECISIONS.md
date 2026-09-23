# Timeout som ett beslut om återhämtning

Kodgranskningen fann tre olika effekter: managerns timeout gav 30 sekunders återhämtning och +7 momentum, den levande AI-motståndarens gav 60 sekunder till båda lagen, och bakgrundsmatcher gav 60 sekunder endast till laget som tog timeouten. Det gjorde villkoren olika utan begripligt underlag.

- Alla timeoutvägar använder nu samma 30-sekunders återhämtningsfunktion. Båda lagen får vila, med effekt beroende på aktuell ork, uthållighet och belastningens återhämtningstak. Den fria momentumökningen tas bort. Periodvila och vanlig bänkåterhämtning behåller sin befintliga logik.
- Bänkens befintliga timeoutkontroll visar beräknad orkvinst för de egna utespelarna på isen. Det framgår att även motståndaren får vila, att säsongsbelastningen ligger kvar och att match- och utvisningsklockorna står stilla. Beslutet gäller när återhämtningen behövs och vilka instruktioner man vill ge; ingen taktik ändras automatiskt.
- Den faktiska återhämtningen lagras vid timeouten och följer med till matchrapporten. Historiska spelar-ID, namn och lagets namn behålls. Rapporten jämför ork före/efter utan att tillskriva timeouten senare mål eller seger. Äldre sparade rapporter får ingen uppfunnen historik. Detta är ett valfritt nytt rapportfält; äldre pågående matcher behåller redan använd timeout.

Automatiska kontroller följer timeouten till verkliga matchattribut, båda lagens ork, fortsatt match och sparad rapport. De kontrollerar oförändrade klockor, utvisningar, poäng, momentum, belastning och RNG vid själva beslutet, engångseffekt efter laddning, levande AI, båda trupperna i bakgrundsmatch och samma fortsatta simuleringssekvens med identiskt utgångsläge/beslut i olika visningslägen. Bakgrundsmatchen upprepas med identiskt frö. Befintliga beredskaps- och matchkontrolltester körs också; full CI innehåller balanssimuleringar.

Detta är kodgranskning och automatiserad verifiering. Visuell provspelning och användartest av när timeouten känns användbar återstår. Modern Dark, befintliga matchkontroller och sparfilens grundstruktur behålls.
