# En sammanhängande tränarvardag

Spelets huvudloop är att bedöma laget, fatta ett beslut, genomföra arbete och match, och följa konsekvenserna över tid. Tränaröversikten är standardhemmet. Klubbhusets rum och den animerade tränaren finns kvar som besök; matchdagens omklädningsrum, tunnel och bås ingår fortfarande i matchflödet.

## Bevara kärnan

| Område | Befintlig auktoritet | Plats i det samlade spelet |
| --- | --- | --- |
| Tid, träning och belastning | `calendarContinue`, `calendarSetSession`, `runTrainingSession` | Veckans valda dag, verkligt planerat pass, ett dagssteg åt gången |
| Match och taktik | Befintlig matchmotor, laguttagning, match brief och matchanalys | Taktik → omklädningsrum → tunnel → bås → samma registrerade matchrapport |
| Spelare och relationer | Rollöften, sociala samtal, relationer, spelarhistorier | Truppen och den kanoniska ärendelistan; inget slutförs av att läsas |
| Långsiktig utveckling | Träningsfokus, formationsunderlag, utvecklingsplaner och akademi | Genomförda pass och efterföljande matcher följs med befintliga mått |
| Rekrytering | Scoutingobservationer, osäkerhet, förhandlingar, villkorade affärer | En rekryteringsyta och länkar till det faktiska beskedet |
| Klubb och omvärld | Styrelse, kassaflöde, stab, AI-klubbar, ligor och landslag | Egna arbetsytor i samma navigation |
| Karriär och sparning | Befintliga sparfiler och validerare | Ingen ny parallell simuleringsdata eller ändrat sparschema |

## Samla presentationen

`coachWorkspaceWrap` är ett alternativ direkt i den befintliga renderaren. Det nya läget monterar inte den gamla sidomenyn, skrivbordsramen eller klubbhusets arbetsdialog ovanpå varandra. Sex huvudytor har en konsekvent placering. Den befintliga routningen, historiken och domänvyerna används fortsatt.

Hemmet ersätter hela den tidigare staplingen av kontorspaneler. Det innehåller veckoplanen, en samlad aktuell ärendelista och ett smalt sammanhang för nästa match och uppföljning. Spelarhistorier och press öppnas som egna vyer, inte ytterligare en hel skärm under den gamla startsidan. Kalenderns snabbspolning finns kvar i hela kalendern.

Ärendena läses från `managerAgendaItems(true)`. Framtida samtal och uppskjutna ärenden går att se via Senare/Alla. Identiska meddelande- eller affärsmål grupperas med alla underlag kvar; olika löften eller skyldigheter slås inte bort. Matchförberedelsen visas i sin egen matchpanel. `requiresDecision` är inte liktydigt med att kalendern blockeras: det är de verkliga obligatoriska svaren och säsongsgränserna som avgör fortsätt-knappen.

Dagssteget sparar den befintliga sammanfattningen och återvänder till översikten endast när det initierades där i det nya läget. Fel återspelas aldrig automatiskt. Matchdatum behålls under eftersnack och rapport; användaren avslutar därefter matchdagen.

Presentationsvalet uppgraderas en gång till den nya översikten. Senare uttryckliga val av rum eller tabelläge respekteras. Rummens verktygsrad har en direkt väg tillbaka till tränaröversikten.

## Avgränsning och kontroll

Detta är en ombyggnad av struktur och spelrytm. Befintliga djupa domänvyer bevaras. Deras interna detaljrikedom kan förenklas vidare utifrån den här gemensamma strukturen. Inga nya slumpkonflikter, belöningar, påhittade diagnoser eller andra klockor införs.

`coach-workspace.test.cjs` kontrollerar verkliga skyldigheter, läsning utan simulering, framtida planering, faktisk veckoprogression, matchinträde, sparning och byte av karriär. `scripts/coach-workspace-browser-checks.cjs` använder den riktiga Electron-appen för samma vecka, ett fullständigt simulerat träningsmöte, matchrapport, följande dag, omstart och rum. Skärmbilder granskas i 1920, 1440, 1366 och 390 pixlars bredd. Befintliga regressionssviter för matchmotor, kalender, ekonomi och relationer gäller fortsatt.
