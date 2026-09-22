# Spelararbetsplats – första implementationen

Två genomförda etapper. Detta är inte ett påstående om att hela utvecklingsbeställningen är färdig.

## Etapp 2: sammanlänkade rapporter och beslut

- Målskyttar och assistgivare öppnar rätt spelarprofil både under matchen och i sparad matchrapport. Saknade ID:n i äldre rapporter gissas inte fram.
- Matchbetygens spelarnamn och stabsuppföljning av värvningar/löften länkar till rätt person.
- Profiler visar upp till tio registrerade avslutade matcher med datum, tävlingsfas, dåvarande klubb, istid, mål/assist, skott och verkligt registrerat matchbetyg. Varje match öppnar sin rapport. Saknade PP/BP-minuter uppskattas inte.
- En spelaridentitet kan återfinnas i befintliga matchrapporter även när aktiv spelarpost och pensionsarkiv saknas. Inga historiska attribut kopieras till transfermarknaden.
- Nyheter om genomförd övergång, lån, förhandsavtal, junioruppflyttning, NHL-avtal, NHL-draft, AI-skador och genombrott bär uttryckliga ID-referenser från händelsens källa. Rubrik och brödtext behåller också vanlig text för äldre konsumenter och sparvalidering.
- Individuella utvecklingsrapporter och spelarsamtal stöder strukturerade ID-referenser. Inkorgens detaljrubrik länkar direkt när meddelandet har ett explicit spelar-ID.
- Medicinska ärenden öppnar spelarens hälsodel; träningsrapporter öppnar utvecklingsdelen. Historiska meddelanden kan öppna historisk spelarpost.
- J20-poängliga, NHL-prognos, drafthistorik och rättighetslistor använder samma spelar-ID-länkar. AI-akademier och internationell juniorpool kan öppnas utan att interna attribut eller hälsa visas. NHL-filter följer med tillbaka.
- Egen spelarprofil öppnar kedjeplats och konkurrenter. En bänkspelare visar en relevant positionsplats, inte en påstådd tilldelning. Ingen laguttagning ändras genom navigationen.
- Nytt automatiserat test täcker två namnlika personer i samma nyhet, källans ID:n, mål/assist, sparad nyhetsstruktur, historisk klubb i prestationsfliken, profil → matchrapport → tillbaka, kedjeplats utan automatisk förändring och medicinskt ärende.

Testerna är headless och använder bland annat uttryckliga rapport-fixtures. Verklig webbläsarprovspelning är fortfarande inte genomförd.

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
