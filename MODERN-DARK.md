# Modern Dark

Visuell riktning: användarens övre vänstra referensbild. Neutral mörk blågrå bas, blå primärknappar, kompakta paneler, tydliga tabeller, arenabanner och klubbmärken.

Den gemensamma stilen ligger sist i index.html och gäller spelram, navigation, arbetsvyer, profiler, rekrytering, klubbar, ligor och matchpaneler. Rinkens geometri och speldata styrs fortsatt av befintliga moduler. Översiktens nästa match, tabell och resultat kommer från aktuell sparfil; ingen exempelstatistik används.

## Lagmärken

60 officiella märken lagras lokalt: alla 28 svenska ligaklubbar och alla 32 NHL-klubbar i spelmodellen. Källadresser finns i assets/crests/sources.json. Svenska märken kommer från SHL:s och HockeyAllsvenskans officiella sidor; NHL-märken från NHL:s lagförteckning. Märkena tillhör respektive organisation. WebP-original har bäddats in oförändrade i SVG-behållare. Spelet gör inga nätanrop för märkena.

Den gemensamma komponenten används i lagval, sidofält, klubblänkar, tabeller, översikt, draft/rättigheter och matchresultattavla. Fiktiva klubbar använder textmärken; dessa utges inte för officiella logotyper. Saknade/borttagna bildfiler visar ett reservmärke.

## Verifiering

Automatiserade tester kontrollerar samtliga märkesfiler, identitetsmappning, escaping, oförändrat speltillstånd, verkliga matchlänkar och äldre rapporter utan datum. Befintliga funktionstester körs också.

Cloud Browser kunde anslutas men blockerade både lokal server och lokal fil enligt sin URL-policy. Ingen visuell webbläsargranskning har därför genomförts. Kontrollera särskilt skärmbredder, tabellscroll, tangentbordsfokus och matchvyn visuellt före slutlig designacceptans.
