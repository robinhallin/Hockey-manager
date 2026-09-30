# Åkning och renderflöde – andra passet, 28 september 2026

Utgångspunkt: `main` efter PR 269, `38e344ba86a78a178d2eca7506c027278c5e0ab0`.
Ändringarna ligger i den befintliga JavaScript/Three.js/Electron-matchen.
Sparformat, spelar-ID:n och managerfunktioner behålls. Ligautökningen är pausad.

## Vad som faktiskt ändras

- En egen författad kurva för bäckenet flyttar belastningen mellan stödbenen,
  komprimerar kroppen vid skärbytet och motroterar överkroppen. Den samplas från
  samma inspelade åkfas som skridskorna. Grundriggen har fortfarande 15 leder.
- Startskär blir kortare vid acceleration. Stadig fart ger tydligare fortsatt
  skridskoarbete, medan avtagande fart blandas mot glid. Svängens lutning beror
  på faktisk fart och vinkelhastighet. Fotlederna får kantning, och övergången
  mellan framåt/bakåt får bredare stöd och lägre fotåterföring.
- Stopp åt vänster och höger registreras, och vald sida hålls genom bromsningen.
  En liten motrotation kan inte slå om hela stoppet. Skridskons registrerade
  riktning interpoleras över den kortaste vinkeln; gamla inspelningar utan
  vinkel får inget påhittat värde.
- Stabila spelar-ID:n väljer startfas och stoppfavorit utan matchens RNG.
  Pågående sparade åkfaser behålls. Nya frivilliga sparfält valideras.
- Klubbor, puck och kontaktskuggor återanvänder arbets- och GPU-buffertar.
  Den tidigare nya arbetsbufferten om 1,8 MB vid varje omritning försvinner.
  Endast använda vertexintervall ritas och uppdateras när antalet ändras.
- Spelarbyten återanvänder paletter och material med fast kapacitet. Tröjornas
  atlas och spelaruppsättning uppdateras utan att sista shaderprogrammet
  slängs. Diagnostiken redovisar program, uppbyggnader och återanvändningar.

Modeller och animationer är fortsatt projektets egen kodskapade, stiliserade
uppsättning. Inga externa klipp eller modeller har importerats. Ursprung och
användningsrätt finns i `assets/models/README.md`; Three.js har kvar MIT-licensen.
Detta är inte en färdig artistgranskad animationsbank eller motion capture.

## Kontroller

54 riktade tester passerade: åkfas, belastning, start/glid, stopp åt båda håll,
fixa benlängder, klubba–puck-kontakt, repris, skinnad rigg, tidsstyrning,
spelbeslut, sparning/återläsning och validering. Fem ytterligare kontroller för
lagring och desktop passerade, inklusive exakt återupptagning av match och
oförändrad sparfil vid skrivfel. Tester bevisar respektive kontrakt, inte att
animationerna har nått beställningens slutliga visuella kvalitet.

Den längre Windows-körningen hittade en befintlig återläsningsavvikelse i
sista reprisbildernas energi under skottförberedelse/flygande puck. Karriären
bokför trötthet efter motorns bildinspelning; återläsning återskapade samma bild
med de nyare värdena. Återläsningen behåller nu den redan inspelade bilden.
Regressionen jämför varje sparat matchfält och fortsatt spel i båda lägena.
Windows-omkörningen ska passera innan merge.

Den riktiga karriärmotorn spelade samma sparade HV71–Björklöven-situation med
12 spelare, samma RNG och samma start som förra passet. Två jämförbara
sargkameraklipp omfattar simulerad väggtid 40–52 s; motorstatistik och RNG är
identiska före/efter. Bildrutorna kommer från registrerade matchtillstånd,
30 bilder/s vid normal rörelsehastighet. Inga handlingar eller utfall skriptas.
Den nya versionen spelas också in med följande kamera över väggtid 40–64 s.

Tidsordnade närbilder används för att granska belastningsväxling, fötternas
återföring, sväng och puckhämtning under press. Den lägre ställningen och
bäckenrörelsen är synliga. Höft/axelform, vissa övergångar och nästan låsta
armposer är fortfarande tydligt mekaniska. Närbilderna är en granskning av
arbete under utveckling, inte ett godkännande av hela modell-/animationskravet.
Inspelade videor saknar ljud och är **inte mätningar av realtids-FPS**.

Windows-testet har utökats med kontroll av shaderåteranvändning och en separat
mätning i ett faktiskt 1920×1080 Electron-fönster: 10 s uppvärmning, 60 s normal
grafik och 20 s låg grafik. Det sparar CPU, OS, grafikdrivrutin, canvasstorlek,
median, p95, p99, max och långa bildrutor. Resultatet redovisas i PR-kontrollen
när körningen har avslutats; inget FPS-resultat antas från att testet finns.

## Uppmätt lokal prestanda och profilering

Linux x86-64, AMD EPYC 9V74, 9 synliga vCPU, Chromium 153.0.8010.0,
ANGLE/SwiftShader utan fysisk GPU. Viewport 1920×1080, canvas 1886×736, följande
kamera, normal grafik, 1×. Inga samtidiga regressioner eller videoinspelningar
under dessa mätningar. Varje rad har 10 s uppvärmning och 40 s mätning.

| Version | Bildrutor | Median ms | p95 ms | p99 ms | Max ms |
|---|---:|---:|---:|---:|---:|
| Före | 172 | 216,7 | 450,1 | 616,7 | 850,0 |
| Efter | 171 | 216,7 | 466,7 | 633,3 | 766,7 |

Ingen generell FPS-vinst är visad och 60 fps är inte uppnått. GPU-tidsfrågorna
visar cirka 195–198 ms median för huvudbilden och 16–17 ms för reflektion med
skuggor. Buffert- och shaderändringarna tar bort onödigt arbete men löser inte
mjukvarurenderingens stora bildkostnad. En separat förenkling av glasmaterialet
gav ingen tydlig vinst och har inte behållits. En mellanversion med WebGL-fel
har rättats; dess snabbare mätning är uttryckligen bortvald.

CPU-profilen visar också återkommande synkron autosparning: serialisering och
lagring kan blockera tiotals ms; webbläsarens komprimeringsfallback kan blockera
flera hundra ms när kvoten nås. Den lagringskedjan har inte byggts om här.
Profileringsverktyget avslutar nu CPU-profilen före paus/avveckling av WebGL,
så att en dyr kontextavveckling inte räknas som vanlig aktiv rendering.
GPU-frågor används endast vid begärd profilering, läses asynkront och väntar
aldrig på GPU:n i produktionsloopen.

En tre minuter lång körning med låg grafik gav 1 179 bildrutor, median 150 ms,
p95 300 ms, p99 649,9 ms och max 799,9 ms. Canvas var 1509×589. Den gick utan
JavaScript-/WebGL-fel; spelarresurserna byggdes en gång och återanvändes vid tio
uppdateringar av spelaruppsättningen. Det är en längre lokal kontroll, inte en
hel match eller ett uppnått flytmål.

Den första Windows-körningens separata grafikmätning hann genomföras före
sparningsfelet: Windows 10.0.26100, AMD EPYC 7763, 4 logiska CPU, 16 GiB,
Electron 44.4.5/Chromium 152, Microsoft Basic Render Driver via ANGLE/D3D11.
Det är också **mjukvarurendering**. Normal grafik: 452 bildrutor under 60 s,
median 125 ms, p95 140,6, p99 578 och max 1 000 ms. Låg grafik: 252 bildrutor
under 20 s, median 78,1 ms, p95 78,2, p99 437,5 och max 500 ms. Inga WebGL-fel
eller sidskroll. Mätningen visar ingen 60 fps-prestanda på en referens-GPU.
Slutlig Windows-status och omkörningens värden finns i PR 272.

Rådata: `qa/skating-balance-performance.json`. Reproduktion:

```sh
node scripts/review-match-motion.cjs --root=/path/to/checkout --save=/path/to/teststart.json --out=/path/to/results --profile --seconds=40
node scripts/review-match-motion.cjs --save=/path/to/teststart.json --out=/path/to/video --camera=rinkside --start=40 --seconds=12
```

## Kvarvarande kvalitet och avgränsning

Rikare grundanimationer och mindre mekaniska kroppar är fortfarande ett
produktionsbehov. Målvakternas räddningsval/returer, närkamp, regelprofil och
ligakalibrering har inte godkänts genom detta åkpass. Tidigare kända brister
finns kvar enligt `qa/motion-contact-2026-09-28.md`. Ingen referensdator med
fysisk GPU eller hel match i kontinuerlig 3D har prestandagodkänts.

| System | Berörda filer |
|---|---|
| Åkkurvor och registrerade rörelsetillstånd | `match-broadcast-motion.js`, `match-simulation.js` |
| Pose, IK, fot- och bäckenleder | `match-3d.js`, `match-player-model.js` |
| Buffertar, spelarbyten, GPU-diagnostik | `match-broadcast-scene.js` |
| Sparvalidering | `career-match.js` |
| Logik- och buffertkontroller | `match-skating-flow.test.cjs`, `match-flow-materials.test.cjs`, `match-motion-contact.test.cjs` |
| Windows-kontroller och mätning | `desktop/match-3d-ui.cjs`, `desktop/match-performance.cjs`, `desktop/smoke.cjs` |
| Reproduktion och tillgångsbeskrivning | `scripts/review-match-motion.cjs`, `assets/models/README.md` |
