# Sammanhängande avslutsrörelse – 30 september 2026

Bas: mergad PR #275, `342904effd6748bf96bef69b7c0049f1c691cf92`.

Skottet drevs tidigare främst av överkropp och klubba. Höften deltog inte i
avslutet, och axlarna vred sig åt samma håll under både uppladdning och
efterrörelse. Dessutom bytte bladet vinkel direkt till skottlinjen vid släppet.
Bladets mittpunkt behöll puckkontakten, men hälen, skaftet och händerna hoppade.

Den befintliga riggen har nu en kort, inspelningsstyrd höftrotation som föregår
axlarna, följd av framåtföring, kroppslutning och återgång till åkningen.
Axlarna laddar åt motsatt håll före släppet. Den nedre handen glider längs
skaftet med bibehållna armlängder; axel och armbåge följer med i rörelsen.
Slagskott, handledsskott, direktskott och passningar har olika utslag.

Bladvinkeln börjar vid den hållna klubbans vinkel och går mjukt mot
skottlinjen under de första 90 millisekunderna. Puckens inspelade bana och
kontaktpunkt ändras inte. Rörelsen använder samma inspelade matchtid som
övrig rigg, så paus, återspolning och återläsning reproducerar samma pose.

## Kontroller

62 riktade kontroller godkända, inklusive den befintliga Three.js-skinningen,
kameran, målvaktskontakter, sparning/återläsning och lemlängder:

```
node --test match-release-flow.test.cjs match-3d.test.cjs \
  match-body-equipment.test.cjs match-skating-flow.test.cjs \
  match-motion-contact.test.cjs match-broadcast.test.cjs match-camera-flow.test.cjs
```

Fyra nya kontroller täcker höftens ledning, motsatt uppladdning och efterrörelse,
kontinuitet vid släpp och återgång, båda fattningar, olika rinkriktningar,
äldre inspelningar utan klubbkontroll samt exakt paus, återspolning och
återläsning. Händerna ligger på ett 1,38 meter långt skaft, armar och ben
behåller sina segmentlängder och indata lämnas oförändrade.

### Samma faktiska skott före och efter

HV71–Björklöven, Robin Kovács, inspelat släpp vid wall 55,9. Positionerna
samplades en mikrosekund före respektive efter kontakt för att isolera
diskontinuiteten från den vanliga förflyttningen:

| Förflyttning över släppet | Före | Efter |
|---|---:|---:|
| Skaftets topp | 0,13196 m | 0,0000055 m |
| Vänster hand | 0,11801 m | 0,0000042 m |
| Höger hand | 0,11276 m | 0,0000051 m |
| Bladets kontaktpunkt | 0,0000018 m | 0,0000018 m |

Detta är en kontroll av ett specifikt positionshopp, inte en FPS-mätning eller
en generell kvalitetsmätning av animationerna.

Samma tvåsekunderssekvens från wall 55,3 renderades före och efter i 1920×1080
med kameran Isnivå. Tidsordnade bildrutor vid uppladdning, efterrörelse och
återgång granskades. Matchinspelningarnas resultat, statistik och slumpvärde
är exakt lika: 0–0, RNG `1892237776` vid inspelningens slut. Båda körningarna
saknar JavaScript- och WebGL-fel. Körmiljön var Chromium med SwiftShader;
offlinevideons 30 bilder/s säger inget om spelets faktiska bildfrekvens.
GitHub- och Windows-resultat redovisas i PR:n.

Matchbeslut, fysik, slumpström, sparformat och modellernas geometri ändras inte.
Ingen ny installerare ingår och ingen förbättring av bildfrekvensen påstås.
