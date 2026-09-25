# Laget – truppens arbetsyta

Truppen använder samma lugna gråblå grund som översikten. Klubbens befintliga färger och klubbmärke följer den klubb som tränas. Menyernas placering är densamma för alla klubbar.

- **Truppstatus:** förmåga och potential med osäkerhet, verklig attributförändring, ork, matchmoral och tillgänglighet. Alla kolumnrubriker går att sortera.
- **Prestation:** registrerade tävlingsmatcher, mål, assist, poäng, istid per match och snittbetyg. Statistik avgränsas till aktuell klubb och säsong. Träningsmatcher och andra klubbstinter blandas inte in. Ofullständigt underlag markeras.
- **Snittbetyg:** antal bedömda matcher, senaste betyg, snitt och datum. Saknade värden ligger sist i båda sorteringsriktningarna.
- **Kontrakt:** årslön, återstående år, avtalad roll och avtalsläge. Befintliga genvägar från rekrytering till utgående avtal fungerar fortsatt.

Klick eller Enter på ett spelarnamn väljer spelaren i panelen under tabellen. Panelen visar en neutral spelarsilhuett i klubbfärger (inte ett påstått foto), bedömda stjärnor, registrerade attributförändringar och ett relevant nästa steg. Den fullständiga spelarprofilen öppnas separat. Urval, vald spelare och tabellens scrollposition följer med vid återgång.

Genvägar leder till exakt vald spelares avtal, utveckling, medicinska ärende, samtal eller plats i laget. De använder befintliga spelhandlingar och deras spärrar. Att läsa eller sortera truppen skapar ingen laguttagning och flyttar inte karriärens datum. Inga sparfilsformat ändras.

Kedjetavlan med fyra kedjor, tre backpar och målvakt samt de fyra PP/BP-enheterna är fortsatt tillgängliga under Taktik & laguttagning. Denna etapp bygger om truppvyn och kopplar den till de befintliga arbetsytorna.

Verifiering: `squad-workspace.test.cjs` täcker urval, sortering, saknade värden, läsning utan karriärförändringar, statistikomfång och exakta åtgärdslänkar. `scripts/team-browser.cjs` klickar alla kolumnrubriker, väljer med tangentbord, går till profil och tillbaka, kontrollerar åtgärder och mäter layout vid 390–1920 px. `desktop/smoke.cjs` kontrollerar spelarval och profilflödet i den riktiga Electron-appen.
