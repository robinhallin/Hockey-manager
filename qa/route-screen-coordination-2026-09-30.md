# Passningsalternativ, skymning och försvarsmarkering

Utgångspunkt: main a54f2cc, samma motor som i den levererade 64-sekundersvideon.
Detta är en avgränsad förbättring av beslutens samordning i det befintliga spelet.
Inga modeller, animationsklipp, ligor, installationer eller nya spelversioner skapas.

## Referens och granskning

SHL:s officiella HV71–Färjestad BK, highlights 2025-01-16:
https://www.shl.se/single-video/video%7Cstaylive%7C363002

Videon öppnades i webbläsaren och spelaren kontrollerades på 1×.
Bildlägen runt 97,9 sekunder (uttryckligen 4 mot 5 i resultatraden),
105,6 sekunder (kamera bakom mål) och 111 sekunder granskades.
Observation: spelaren vid sargen/flanken och spelaren vid mål erbjuder olika
fortsättningar. Försvarare är placerade mellan olika anfallare och målet.
Det är referens för separata uppgifter, inte bevis för en viss fem-mot-fem-formation.
Granskningen bestod av bildlägen och korta observationer i en spelande video;
hela förloppet analyserades inte sammanhängande bildruta för bildruta.
Inget referensmaterial kopieras in i spelet. Ingen tillgång eller ny licens införs.

Den tidigare spelvideons tre bildlägen granskades också. De visar bland annat
täta grupper runt tekningscirkeln. De visar inte på egen hand vad som orsakade
gruppen eller om en animationsövergång är bra.

## Konkret fel i kod

`targets` kör först grunduppgifter, sedan anfallsrutter och sist `netFrontTargets`.
Den sista delen kunde välja den redan utsedda passningsmottagaren som skymmare.
En cykelrutt bakom mål kunde exempelvis ersättas med x=54,1, y=13,8.
Den kunde också flytta en närliggande försvarare som hade en annan markering.
Tidigare skymningsuppgifter låg dessutom kvar upp till 0,35 matchsekunder efter
att en ny spelare tagit över, så två aktörer kunde samtidigt ha samma uppgift.

## Ändring

- Skydda den aktuella anfallsruttens mottagare, inkommande passningsmottagare
  och skottförberedande spelare från skymningsuppgiften.
- Föredra den redan utsedda löparen och ge befintlig skymmare en måttlig
  kontinuitetsfördel. Små avståndsskillnader ska inte skapa omedelbara rollbyten.
- Vid lika numerär får en försvarare framför mål endast täcka sin tilldelade
  motståndare eller ta uppgiften om han saknar tilldelad markering.
- Avsluta gamla skymnings- och boxout-uppgifter när de inte längre används,
  även vid spelstopp, närkamp, ny mottagningsuppgift och utgång ur anfallszonen.
- Returer kan fortfarande attackeras när den aktiva passningsrutten har upphört.
- Behåll en annan spelares skymning och markering medan passningen är i luften;
  frigör bara mottagaren och hans eventuella gamla boxout-relation.

Positionsgränser och fysisk närhet gäller fortsatt. Endast mål för rörelsen
ändras; kroppar flyttas inte av planeringen. Befintlig tidsstyrning, puckkontakt,
beslutsfördröjningar, attribut, taktik, spelar-ID:n och sparformat används.
Powerplay behåller sitt befintliga särskilda urval och sin försvarslogik.

## Reproducerbar jämförelse

`node scripts/check-screen-flow.cjs --baseline=a54f2cc`
och `node scripts/check-screen-flow.cjs`.

32 sekvenser à 60 matchsekunder, identiska startpositioner och slumpfrön,
spegelvända sidor och flanker, två femmor plus målvakter. Endast utgångsläget
ställs upp. Den ordinarie produktionsmotorn väljer alla handlingar och utfall;
ingen föreskriven passningsföljd eller målsituation används.

| Mått | Före | Efter |
| --- | ---: | ---: |
| Steg med aktiv anfallsrutt | 664 | 572 |
| Mottagare samtidigt skymmare | 84 | 0 |
| Steg med någon skymmare | 987 | 645 |
| Steg med dubbla skymmare | 70 | 0 |
| Boxout av annan än tilldelad motståndare, ej boxplay | 104 | 0 |
| Fullbordade passningar | 262 | 272 |
| Skott | 45 | 48 |
| Mål | 8 | 9 |
| Största förflyttning per aktivt simuleringssteg | 0,485 m | 0,485 m |

Steg är diagnosräkningar, inte antal separata hockeyhändelser. Förändrad rörelse
ger olika senare händelser, så nämnarna skiljer sig. Målökningen är inget
realismmått. Urvalet är avsiktligt smalt och säger inte hur vanlig situationen
är i alla matcher eller om generell trängsel är löst.

## Tester och begränsningar

30 riktade tester passerade i fyra testfiler. Fem nya tester kontrollerar
den verkliga målplansordningen, båda anfallsriktningarna, skyddad markering,
kontinuitet även under en passning i luften, mottagning, spelstopp och retur.
Fyra av de fem misslyckas mot
a54f2cc och passerar efter ändringen. Det befintliga testet av fysisk boxout
har fått en uttrycklig korrekt markeringsrelation i sitt utgångsläge.

Full regressionskörning, kalibreringsurval, lägesparitet och Windows UI-körning
hör till PR-kontrollen. Deras slutresultat ska läsas från körningen för exakt
PR-head; den här rapporten ersätter inte dessa kontroller.

Den nya versionens animationer har ännu inte visuellt bedömts i en längre
normalhastighetssekvens. Inga nya uppmätta bildrutetider eller 1080p/60-fps-
resultat finns för den här ändringen. Tidigare mjukvarurenderad Windows-miljö
är inte en representativ speldator. Skridskoanimationernas kvalitet, passnings-
och skottförberedelser, generell ytfördelning och bildruteflyt behöver fortsatt
arbete; dessa riktade beslutskorrigeringar gör inte hela matchen färdig.

## Berörda filer

- `match-engine-4.js`: skymning, retur och försvarsuppgifter.
- `index.html`: uppdaterad cacheversion för samma produktionsmotor.
- `match-route-screen.test.cjs`: nya regressionsfall.
- `match-physical-flow.test.cjs`: korrekt markeringsrelation i boxout-fixturen.
- `scripts/check-screen-flow.cjs`: jämförelse med autonom produktionsmotor.
- Denna rapport.
