# MatchWorld 2

MatchWorld 2 är första steget mot en gemensam hockeymodell för spelarens matcher och bakgrundsmatcherna i ligavärlden.

## Etapp A – gemensam hockeyprofil

Den rumsliga 2D-motorn fortsätter att äga faktisk positionering, puckflykt, offside, icing, närkamper och andra händelser som kräver rinkgeometri. Bakgrundsmatcher behöver inte rendera eller simulera varje 0,1 sekund på isen, men de ska tolka samma spelare och samma taktiska styrkor på samma sätt.

`match-world-2.js` centraliserar därför:

- lagets puckkontroll från passing, puckControl, vision och decisions,
- offensiv, defensiv och transitionell lagprofil,
- pressduellens grundmodell via `StudioHockey.pressureWinChance`,
- sannolikheten att ett lag skapar nästa anfallsläge,
- bakgrundsmatchens uppskattade avslutskontext,
- en liveprofil byggd från de effektiva attribut som faktiskt gäller för spelarna på isen.

Bakgrundsmotorns tidigare `rivalInitiativeChance` och `rivalShotContext` är nu tunna anrop till MatchWorld 2 i stället för egna formler. De numeriska formlerna är avsiktligt bevarade i denna etapp för att inte samtidigt ändra hela ligabalansen.

Live-matchen beräknar samma profil från `CareerBroadcastMatch.attribute`, vilket innebär att ork, positionsvana, kemi, moral och befintliga matchbonusar redan finns med innan MatchWorld 2 jämför lagen. Profilen används initialt endast som en liten tiebreaker mellan annars närliggande puckbeslut; den rumsliga situationen fortsätter vara huvudsignalen.

## Varför detta görs stegvis

Projektet delar redan avslutsmodellen `StudioHockey.evaluateShot`. Att direkt ersätta hela bakgrundsmotorn med den rumsliga 0,1-sekundersmotorn skulle både bli dyrt och göra det svårt att skilja arkitekturfel från balansförändringar.

Därför flyttas sanningskällan steg för steg:

1. gemensam lagprofil, initiativ och chanskontext,
2. gemensamma spelbeslut och chansuppbyggnad,
3. gemensam special-teams- och regelmodell där det går utan rinkrendering,
4. gemensam byten/istid/trötthetslogik,
5. samma matchrapportkontrakt oavsett presentationsläge.

Målet är att full match, höjdpunkter, snabb simulering och AI–AI-match ska vara olika sätt att konsumera samma hockeyvärld — inte fyra separata sätt att bestämma vad som händer.

## Regression

`match-world-2.test.cjs` kontrollerar att bakgrundsmatchens initiativ och avslutskontext faktiskt går genom MatchWorld 2 samt att en riktig karriärmatch skapar en versionerad gemensam liveprofil som används av beslutsvärderingen.
