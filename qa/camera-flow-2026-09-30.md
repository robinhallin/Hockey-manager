# Kameraflöde – 30 september 2026

Bas: mergad PR #274, `239a291af758308257fed3ecaf1932c2c6af09b6`.

Den tidigare följkameran bytte panoreringshastighet direkt när puckens riktning
ändrades. Om pucken kom utanför bildens fyrprocentsmarginal flyttades fokus
hela vägen till pucken. Vid sargkamera och hög zoom kunde en lyft puck hamna
ovanför bilden även efter den omcentreringen.

Dessutom begränsades kamerans position först efter utjämningen. När pucken gick
bakom målet kunde den därför slå tvärstopp vid panoreringsgränsen och börja
röra sig abrupt när pucken kom tillbaka. Gränsen gäller nu destinationen före
dämpningen, så även inbromsningen mot rinkens ändar blir mjuk.

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

Lokalt: 50 kontroller godkända, 0 fel:

```
node --test match-camera-flow.test.cjs match-3d.test.cjs \
  match-physical-flow.test.cjs match-tactical-replay.test.cjs
```

Sju nya kontroller täcker retur med bevarad panoreringshastighet, samma
integrering vid olika bildfrekvenser, exakt paus, minsta korrigering i båda
riktningar, mjuk inbromsning vid rinkgränsen, tekning/återspolning/tidshopp,
lyft puck och manuell zoom. En
90-sekunders sekvens från produktionsmotorn innehåller faktiska skott,
räddningar och returer; pucken förblir synlig i tre följlägen och två zoomnivåer.
Indata lämnas oförändrade. Slutlig visuell kontroll och Windows-CI redovisas i PR:n.

Samma sparade HV71–Björklöven-match som i föregående granskning har en faktisk
plockräddning vid wall 56,2968. Kamerans målpunkt samplades i 30 Hz med följkamera,
100 % zoom och bildförhållandet 1886/736. För intervallet wall 55,5–58:

| Kameramått | Före | Efter |
|---|---:|---:|
| Högsta acceleration, rinkmeter/s² | 289,43 | 108,93 |
| p95 acceleration, rinkmeter/s² | 122,03 | 90,01 |
| Största förflyttning per 1/30 s, rinkmeter | 0,5705 | 0,5884 |

Detta mäter panoreringens kontinuitet i en utvald retursekvens, inte FPS eller
samtliga matchlägen. Maximal rörelse per bildruta minskade inte. Gränskorrigering
vid en extrem puckförflyttning kan fortfarande kräva en snabb panorering för
att hålla pucken synlig.

## Avgränsning

Detta minskar kameraryck, inte kostnaden att rita en bildruta. Isolerade prov
av benmatriser, animationsgrupper och skuggfilter gav inte en robust generell
GPU-vinst; dessa alternativ ingår därför inte i ändringen. Inget påstående om
höjd FPS eller uppnådda 60 fps görs. Grundmodeller och animationstillgångar
är oförändrade.
