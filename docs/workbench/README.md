# Klubbhusets arbetsytor

Alla arbetsvyer använder nu `workbench-system.css`, sist i den statiska sidans stilordning. Det täcker kontor, trupp, omklädning, utveckling, akademi, medicin, rekrytering, klubbledning, ekonomi, personal, tränarkarriär, omvärld, ligor, kalender, profiler och inställningar. Taktikrummets verktyg använder samma komponenter, med egna kompakta spelarkort.

## Formgivning och navigation

- Gemensamma marinblå material, varm guldaccent, läsbar typografi, filter, underflikar, formulär, tabeller, valda rader, rapporter, tomlägen och fokusmarkeringar.
- Vänstermeny med rumsbild och verktyg på dator. Horisontella, rullbara verktyg på liten skärm. Tabeller rullar i sin egen yta.
- Rubriken namnger den öppna sidan. Ett extra verktyg markerar inte samtidigt en orelaterad arbetsstation. Inställningar finns även i kontorets verktygsmeny.
- Spelarprofilen börjar med identitet, navigation och nuläge. Landslag/NHL visas en gång i en egen hopfällbar bakgrundsdel; tidigare duplicering tas bort.

## Kontroller

Riktade Node-regressioner passerar för spelaridentitet/profil, alla rumsrutter, samtal, navigation, trupp, taktik, utveckling, medicin, klubb, coach, kalender, sparning och offlinepaketering. CSS parsas med esbuild. `node desktop/stage.cjs` tar med den nya stilmallen i offlinepaketet.

Molnwebbläsaren användes för verkliga knappar i samtliga 21 arbetsstationer samt underflikar och detaljsidor. Kontrollerat bland annat truppens fyra tabellvyer, stigande namnsortering, ett sökresultat för Olle Alsing, profil och återgång, rekryteringens listor, ekonomiundersidor, personal, tränarkarriär, landslag, ligor, kalender och inställningar. Inga fel från applikationen i den granskade konsolen; webbläsartilläggets metadatafel är separata från spelet.

Responsiv kontroll genom en tillfällig iframe med det riktiga spelet vid 390 × 844, 1366 × 768 och 1920 × 1080 CSS-pixlar. Truppvyn håller dokument och läsyta inom respektive bredd; tabellen behåller sin rullbara bredd. Testharnessen ingår inte i leveransen.

`scripts/workbench-browser-checks.cjs` utökar Windows/Electron-jobbet med samtliga sidrutter/underflikar, en kontroll att turen inte ändrar karriärdata, elva verktyg vid tre skärmstorlekar samt profil och retur. Det jobbet körs på GitHub; lokal molnwebbläsargranskning är inte ett påstående om godkänd Windows-CI.

## Bilder

`final-squad.jpg`, `final-player.jpg`, `final-finance.jpg`, `final-scouting.jpg`, `final-calendar.jpg`, `final-tactics.jpg` är verkliga webbläsarbilder vid 1363 × 936, 1×. `final-mobile.jpg` är den riktiga 390 × 844-ramen, beskuren ur webbläsarbilden utan skalning. `comparison.jpg` jämför det valda klubbhustemat med arbetsytan. `controls-comparison.jpg` visar typografi/kontrollmaterial i dialoggrunden och de nya tabellverktygen.
