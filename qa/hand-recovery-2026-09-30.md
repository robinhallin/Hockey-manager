# Klubbföring efter skott – 30 september 2026

Bas: PR #276, main `5e099f90fcd58aef94491dd01df37ac98903ad72`.

När bladet lyftes i efterrörelsen pekade skaftet fortfarande nästan lodrätt.
Den övre handen hamnade därför över huvudet. I det tidigare inspelade
handledsskottet av Robin Kovács (HV71–Björklöven, wall 56,1) var handens
höjd 1,625 m och huvudets mittpunkt 1,510 m.

Skaftet vinklas nu genom händerna mot en position framför bröstet. Korrigeringen
tonas in under de första 75 ms efter släppet och ut under avslutets sista 30 %.
Vid själva pucksläppet används samma grepp som tidigare. Bladets bana,
kontaktpunkt och skaftets längd på 1,38 m ändras inte.

Båda armarnas räckvidd begränsar korrigeringen. Den övre handen ska behålla
greppet minst 1,10 m från hälen och händerna ska vara minst 24 cm isär.
Om hela vinklingen inte är möjlig söks en mindre vinkling mot den tidigare
ställningen; armarna sträcks inte för att nå ett visuellt mål. Kan ingen
godtagbar vinkling hittas behålls den ursprungliga lösningen.

## Kontroll

I samma inspelade ögonblick är övre handens höjd nu 1,225 m och högsta armbågen
1,230 m. Huvud, kropp och klubblad har samma positioner som före ändringen.
Den aktuella inspelade spelarställningen och tidigare bladpositionen finns i
`test-fixtures/shot-followthrough.json` och används som regressionstest.

51 riktade tester täcker bland annat båda fattningar, vridna kroppar, olika
skottyper, fasta lemlängder, skaftgrepp, kontaktövergången från PR #276, exakt
paus/återspolning och Three.js-skinning:

```
node --test match-hand-recovery.test.cjs match-release-flow.test.cjs \
  match-3d.test.cjs match-body-equipment.test.cjs \
  match-broadcast.test.cjs match-motion-contact.test.cjs
```

De tidigare inspelade matchrutorna från wall 55,3–57,2 visades i den vanliga
matchvyn för HV71–Björklöven. Tidsordnade bildrutor från uppladdning,
efterrörelse och återgång granskades i 1920×1080 med kameran Isnivå.
Efterrörelsens händer ligger framför kroppen och armbågen lyfts inte längre
över hjälmen i den granskade sekvensen. Inga JavaScript- eller WebGL-fel.

Visningen använder de redan inspelade matchrutorna i en ny öppnad matchvy;
den är inte en ny körning av den ursprungliga karriärsparningen. Rendering
skedde med Chromium/SwiftShader och offlinevideon är ingen FPS-mätning.
Matchmotor, RNG, sparformat, spelarmodeller och målvaktsposer ändras inte.
Fulla GitHub- och Windows-resultat redovisas i PR:n.
