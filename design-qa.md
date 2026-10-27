# Klubbhusets arbetsgränssnitt

final result: passed

## Källa, tillstånd och täthet

Visuell grund: `docs/clubhouse-theme/reference.jpg` (1487 × 1066) och `docs/action-surfaces/development-1440.webp` (1440 × 1000). Användaren har valt klubbhustemat och begärt att alla bakomliggande verktyg byggs i det. Arbetsytornas nya innehåll/navigation är en avsiktlig utvidgning: grundbilden visar klubbhusets översikt, inte en specifikation av en spelartabell. Detta är därför en granskning av visuell kontinuitet och användbarhet, inte ett påstående om pixelidentisk återskapning av samma skärm.

Implementation: `docs/workbench/final-squad.jpg`, `final-player.jpg`, `final-finance.jpg`, `final-scouting.jpg`, `final-calendar.jpg`, `final-tactics.jpg`; alla 1363 × 936 CSS/pixlar, 1×. HV71, första försäsongsdagen, verklig karriär och faktiskt öppnade verktyg. `final-mobile.jpg`: 390 × 844, 1×, beskuren från den riktiga iframens position (0,55), ingen skalning. Dokument- och innehållsbredd kontrollerad även vid 1366 × 768 och 1920 × 1080.

Fulljämförelse: `docs/workbench/comparison.jpg` samlar den valda grundbilden och den nya arbetsytan på samma bild, proportionellt nedskalade till högst 1000 px breda. Kontrolljämförelse: `controls-comparison.jpg` använder verkliga 1×-utsnitt av den befintliga dialoggrunden och de nya underflikarna/filterfälten. Fullstora bilder öppnades separat för att bedöma läsbarhet.

## Fynd och iterationer

- P1, spelarprofil: internationell information återkom före varje del och trängde undan nuläget. Den renderas nu en gång i `profile-section-world`, efter huvuddelarna. Profilens översikt använder två riktiga spalter för roll och bedömning. Verifierat i `final-player.jpg` och regressionen för spelarreferenser.
- P2, sökfält: truppens etikett höll en tom bred spalt på dator och konkurrerade med urval på mobil. Fältet fyller nu etiketten, och mobilen har en tydlig sökrad samt två urval. Efterkontroll: `final-squad.jpg`, `final-mobile.jpg`; läsytans scrollbredd = klientbredd (366 px) vid 390 px.
- P2, rekryteringslista: gemensamma knappar gjorde spelarnamn till stora rutor och filtret konkurrerade med rubriken. Tabellen har nu lugna textåtgärder och filtret en egen rad i listans rubrik. Efterkontroll: `final-scouting.jpg`.
- P2, taktikkort: den första gemensamma stilen gav kortens interna kontroller och evidensdetaljer formulärstorlek. Kortkontroller och kompakt evidens undantas nu från fullstora formulär. Efterkontroll: `final-tactics.jpg`; kort 82 px, kedjerad cirka 103 px, läsbara namn och synliga lås.
- P2, orientering: sidrubriken kunde fortsätta visa stationens namn när ett extra verktyg öppnats. Rubrik och aktiv markering följer nu sidan, bland annat ekonomi, tränarkarriär, inställningar och spelarprofil.

Tidiga bilder som fångade webbläsarens tidigare målningsläge eller cachad resurs togs om och ingår inte i leveransen. Slutbilderna öppnades och granskades efter omtagning. Detta var insamlingsproblem, inte en alternativ design.

## De fem granskningsytorna

- Typografi: befintliga lokala HM Inter, 28 px huvudrubrik, 18 px sektionsrubrik, 12 px tabelltext och 10–11 px stödtext. Siffror är tabulära. Långa tabeller behåller kolumner genom intern rullning, inte genom att bryta position/ålder i enstaka tecken.
- Avstånd/layout: ett dokument med separat verktygsmeny, underflikar och listyta. Samma 8 px panelradie, 6 px kontrollradie, 16–22 px panelavstånd. Taktikkort behåller kompakta mått. Mobilen har rullbara navigationsrader och formulär som ryms inom läsytan.
- Färger: marinblå bas/panel/upphöjd yta (#091b2b/#102638/#173247), varm guldaccent (#e6c575), ljus primärtext och blågrå stödtext. Statusfärger behåller sina betydelser. Fokus och aktiva val har en uttrycklig guldmarkering.
- Bilder: befintliga godkända rumsbilder, klubbmärken och spelarporträtt används. Rumsminiatyren beskärs proportionellt; inga nya imitationer eller ersättningsillustrationer har tillkommit.
- Text/innehåll: svenska sidnamn anger konkret verktyg. Riktiga spelare, ekonomi, avtal och rapporter används. Tomlägen gör inte anspråk på genomförd träning eller resultat. Spelarprofilens internationella underlag finns kvar med ursprungliga åtgärder.

## Funktion och begränsningar

Alla 21 arbetsstationer öppnades via riktiga knappar och lämnades till rätt rum. Truppens underflikar, sortering, sökning, en namngiven profil och retur testades. Rekryteringslistor, ekonomi, personal, tränarkarriär, landslag/turnering, ligor, kalender och inställningar öppnades. Inga applikationsfel i webbläsarkonsolen vid slutkontrollen. Webbläsartilläggets egna metadatafel ingår inte i spelet.

Riktade regressioner och offlinepaketering passerar lokalt. Den utökade automatiska Windows-kontrollen körs separat på GitHub. Granskningen gör inget påstående om färdig Windows-CI eller ett genomspelat säsongs-/matchbalanstest. Matchmotor och sparformat ändras inte i denna PR.

## Checklista

- [x] Visuell grund och implementation öppnade och jämförda tillsammans.
- [x] Full vy och läsbara kontrollutsnitt granskade.
- [x] Funna P1/P2-problem rättade och berörda vyer granskade igen.
- [x] 390/1366/1920 px kontrollerade i riktig webbläsarrendering.
- [x] Riktiga listkontroller, detaljnavigation och retur provade.
- [x] Inga kvarstående handlingsbara P0/P1/P2 i de granskade vyerna.
