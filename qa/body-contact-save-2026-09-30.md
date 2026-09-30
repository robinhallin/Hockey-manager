# Överkropp, puckkontakt, målvakt och autosparning – 30 september 2026

Bas: PR 272, `6d7a343df161717a7a7dfe5aa50dc4490f013999`. Befintlig
JavaScript/Three.js/Electron-stack, befintliga karriärer och stabila spelar-ID:n.
Inga nya ligor, installationsfiler eller parallella matcher.

## Ändringar

- Överkropp och blick får egna inspelade riktningar med begränsad vinkelhastighet.
  Skridskorna fortsätter följa åkriktning/skär. Originalkurvor ger liten motsväng
  i axlar, armbågar, grepp och fri klubba. Puckarbete tonar ned den fria rörelsen;
  händerna behåller greppet och bladet möter den riktiga pucken.
- Uppföljningen efter pass/skott börjar vid den registrerade kontakten och dess
  höjd. En mjuk båge återför klubban till åkposen. Överkroppsvinklar interpoleras
  över kortaste vinkel och återläses från sparade steg.
- Målvaktens lokala händer, armlängder, knän, benskyddsytor och klubba beräknas
  tillsammans. Räddningskontrollen använder samma begränsade räckvidd som bilden.
  Bilden flyttar inte längre en modern inspelad hand till en efterhandsvald
  räddningspunkt. Äldre inspelningar har kvar en begränsad presentationsfallback.
- Returer lämnar faktisk kontakt och påverkas av inkommande rörelse, träffad
  utrustning och returkontroll. Plock, stöt och klubba har olika förmåga att
  hålla pucken. Returer kan möta sarg och spelare under sitt puckförlopp.
- Periodisk matchsparning går genom en kö och en dedikerad Web Worker. Ett
  sammanhängande kopierat tillstånd serialiseras där. Webbläsarens befintliga
  lossless-format komprimeras i samma worker. Desktop skriver via asynkron IPC.
  Manuellt spara, paus, import och stängning behåller sin synkrona sparningsgaranti
  och ogiltigförklarar äldre workerresultat. Native skrivningar har ordningsnummer.
  Fel bevarar senaste sparning och visas i befintlig sparningsvarning.

Snapshot-kopiering och webbläsarens slutliga localStorage-skrivning kan fortfarande
blockera huvudtråden. Desktopens filvalidering/atomiska disk-I/O ligger fortfarande
i huvudprocessen, men renderaren väntar inte på periodiska autosparningar. Detta
är inte ett påstående om att alla ryck eller I/O-kostnader har försvunnit.

## Kontroller och mätningar

Nya riktade kontroller täcker oberoende överkropp, vinkelhastighet, grepp och
benlängder, bladets kontakt vid avslut, gemensam målvaktsutrustning, begränsad
räckvidd, returer i båda rinkriktningar, kö/coalescing, gamla workerresultat,
asynkrona kvittenser, sparfel och verklig worker-komprimering av en full karriär.
De befintliga riktade match-, återläsnings- och desktopfilerna passerar lokalt.

Slutlig regression, 96 perioders utfallsprov, uppspelningsparitet, Windows-
omkörning, videogranskning och uppmätta bildrutetider redovisas i den tillhörande
PR:n efter avslutade körningar. De får inte anses godkända utifrån detta dokument.

`desktop/match-comparison.cjs` öppnar riktig baseline och ändrad Electron-app
med samma initiala karriär. Motorn fattar besluten. Den mäter 1×/normal grafik
i faktiskt 1920×1080-fönster, 10 s uppvärmning och 40 s mätning per version.
Före/efter visas med samma sargkamera, 12 s, och den nya versionen med följande
kamera, 24 s. Offlinevideo i 30 fps från inspelade tillstånd saknar ljud och
är **inte en mätning av realtids-FPS**. Separat ordinarie Windows-test mäter
60 s normal och 20 s låg grafik, med driver/CPU/canvas och långa bildrutor.

Det är fortfarande ingen dokumenterad fysisk referens-GPU och 60 fps är inte
godkänt. Grundmodeller/15-ledsrigg är fortsatt stiliserade och procedurala.
Rikare artistgranskade grundklipp, större rigg och utrustningssilhuetter återstår.
Tacklingar, byten, regelprofil, ligakalibrering och ljud är inte slutgodkända här.

## Filer

| System | Filer |
|---|---|
| Inspelad rörelse och utrustning | `match-broadcast-motion.js`, `match-simulation.js`, `match-3d.js` |
| Sparning och validering | `career-storage.js`, `career-save-worker.js`, `script.js`, `career-match.js` |
| Native skrivning | `desktop/preload.cjs`, `desktop/main.cjs` |
| Diagnostik och cacheversioner | `beta-support.js`, `index.html` |
| Regression | `match-body-equipment.test.cjs`, `match-rig-goalie-pattern.test.cjs`, `career-autosave.test.cjs` |
| Windows och före/efter | `desktop/match-performance.cjs`, `desktop/match-comparison.cjs`, `.github/workflows/desktop-ui.yml` |
| Ursprung | `assets/models/README.md` |

Inga externa modeller/klipp har importerats. Kurvor och utrustningsberäkningar
är originalkod i projektet, under befintlig projektlicens. Three.js har MIT-
licens. Videokodaren är ett utvecklingsverktyg; den ingår inte i spelets tillgångar.
