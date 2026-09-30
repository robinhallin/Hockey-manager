# Kameraflöde – 30 september 2026

Bas: mergad PR #274, `239a291af758308257fed3ecaf1932c2c6af09b6`.

Den tidigare följkameran bytte panoreringshastighet direkt när puckens riktning
ändrades. Om pucken kom utanför bildens fyrprocentsmarginal flyttades fokus
hela vägen till pucken. Vid sargkamera och hög zoom kunde en lyft puck hamna
ovanför bilden även efter den omcentreringen.

`match-3d.js` använder nu kritiskt dämpad panorering med bibehållen hastighet,
styrd av inspelad matchtid. En korrigering vid bildkanten flyttar fokus bara så
långt som krävs för att få in pucken innanför sexprocentsmarginalen. Om en hög
puck kräver större bildfält öppnas zoomen tillfälligt, varefter den mjukt återgår
till användarens inställning. Ett manuellt zoomval gäller direkt även i paus.

Paus fryser kameran exakt. Bakåtspolning, hopp i matchtid och ny tekning nollställer
panoreringshastigheten. Kameratillstånd lagras endast i renderaren; matchmotor,
slumpström och sparformat ändras inte. Samma kamerafunktion används av den
befintliga Three.js-vyn och dess WebGL-reservväg.

## Kontroller

Lokalt: 49 kontroller godkända, 0 fel:

```
node --test match-camera-flow.test.cjs match-3d.test.cjs \
  match-physical-flow.test.cjs match-tactical-replay.test.cjs
```

Sex nya kontroller täcker retur med bevarad panoreringshastighet, samma
integrering vid olika bildfrekvenser, exakt paus, minsta korrigering i båda
riktningar, tekning/återspolning/tidshopp, lyft puck och manuell zoom. En
90-sekunders sekvens från produktionsmotorn innehåller faktiska skott,
räddningar och returer; pucken förblir synlig i tre följlägen och två zoomnivåer.
Indata lämnas oförändrade. Slutlig visuell kontroll och Windows-CI redovisas i PR:n.

## Avgränsning

Detta minskar kameraryck, inte kostnaden att rita en bildruta. Isolerade prov
av benmatriser, animationsgrupper och skuggfilter gav inte en robust generell
GPU-vinst; dessa alternativ ingår därför inte i ändringen. Inget påstående om
höjd FPS eller uppnådda 60 fps görs. Grundmodeller och animationstillgångar
är oförändrade.
