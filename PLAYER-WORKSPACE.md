# Spelararbetsplats – första implementationen

Detta är första etappen, inte ett påstående om att hela utvecklingsbeställningen är färdig.

## Implementerat

- Gemensam ID-baserad spelarreferens med HTML-escaping och riktig länk. Ingen namnsökning används för att bestämma identitet.
- Egna och externa aktiva profiler använder samma rubrik, fliknamn och jämförelseflöde. Befintliga kontrakts-, scouting-, låne- och träningsåtgärder återanvänds.
- Felaktiga gamla egna/externa länkar väljer profil efter spelarens nuvarande tillhörighet.
- Attribut, bedömning, prestation, utveckling, kontrakt och registrerad historik kan öppnas separat. Statistik visar registrerade säsonger, liga, tävlingsfas och dåvarande klubb.
- Egna och externa spelare kan läggas till samma jämförelse från profilen. Urvalet lagras med scoutingkontoret och överlever sparning/laddning.
- Sökning efter spelare och klubbar från arbetsvyerna. Spelarresultat visar ID-länk, position, ålder och klubb; klubbresultat öppnar klubbens spelarstatistik, inte en ny fullständig klubbsida.
- Poängliga, analysens spelartabell och jämförelse, formationer med registrerade ID:n, scoutjämförelse och uppdragsutkast använder gemensamma spelarreferenser.
- Medicinska meddelanden bär spelar-ID. Inkorgens ärende visar en direkt spelarlänk när ett ID finns. Nya strukturerade meddelandetexter kan innehålla uttryckliga spelarreferenser; gamla namn i fritext matchas aldrig automatiskt.
- Pensionering sparar en liten offentlig identitetspost, inte dolda attribut eller hälsodata. Äldre sparfiler kan använda redan registrerade spelar-ID:n i ligastatistik och världshändelser. Arkivet ingår inte i transfermarknadens uppslagning.
- Interna medicinska värden visas inte i externa profiler eller genom den gemensamma medicinska panelen.
- Bakåtnavigation bevarar tidigare profilflik, kalenderperiod, inkorgsurval, scoutkolumner och analysurval, utöver tidigare filter/sortering. Namngivna formulärutkast och utvalda tabellers vertikala/horisontella scroll återställs när samma formulär fortfarande finns.

## Testning

- Nytt automatiserat test: identiska namn med olika ID:n, egen/extern ingång, escaping, strukturerade referenser, profilflik, filter/sortering/scroll, jämförelse, träningsåtgärd på rätt spelare, medicinsk sekretess, pensionering, historisk klubb, gammal sparfil samt sparning/laddning.
- Formulär- och nested-scroll-test använder simulerade DOM-objekt. Detta är inte visuell provspelning.
- Befintliga tester för interface, scouting och medicinska flöden körda separat.
- Ingen browserbaserad eller visuell QA genomförd i denna miljö. Verifiera särskilt fokus, tabellscroll och formuläråtergång i det körande gränssnittet.

## Kvar innan hela beställningen kan betraktas som klar

- Fullständig inventering och konvertering av varje spelarnamn, mål/assistnotering, nyhet, historikpost och junioryta. Juniorprofilen återanvänds fortfarande som ett särskilt innehåll.
- Fler nyhets-/meddelandeproducenter måste skriva strukturerade referenser; API-stöd är inte detsamma som full täckning.
- Egen fullständig klubbsida och konsekventa liga-, match-, skade- och förhandlingslänkar.
- Alla tabellers/arbetsvyns scroll och alla formulärtyper; nuvarande återställning är avgränsad och ska inte kallas generell draft-hantering.
- Utbyggd roll-/kedjekonkurrens, taktiska avvägningar, arbetsbelastning, ekonomiska konsekvenser, moral, delegering, styrelse- och AI-flöden enligt beställningen. Befintliga funktioner bevaras, men har inte alla fördjupats i denna etapp.
- Full UI-provspelning inklusive tangentbord, webbläsarens bakåtknapp, pågående match, klubbbyte, lån och pensionering.
