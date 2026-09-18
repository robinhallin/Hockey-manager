# Bakgrundsmatcher: boxplay och spelformer

Bakgrundsmatchernas tidigare händelsesummering byggdes från slutstatistiken. Skott och mål fick tidpunkten noll och skott kunde tillskrivas andra spelare än dem som faktiskt avslutade. Det gjorde den olämplig för att lokalisera skillnader mot en visad match.

Nu registreras avslut, mål, assist och utvisningar i simuleringens ordning och vid dess verkliga matchtid (bakgrundsmotorns upplösning är 20 sekunder). Returen följer sin räddning. Händelserna innehåller spelare, formation, spelform och den uppskattade skottsituationen. Registreringen använder ingen extra slump. I ett isolerat prov gav 12 matcher exakt samma spelarrader och resultat före och efter enbart loggningsändringen.

Den fulla händelseströmmen är simuleringens arbetsunderlag. Sparfilen behåller kompakta händelse- och spelformssummeringar i rapporterna, inte en ny fullständig repris av varje ligamatch.

## Boxplayfelet

Den förenklade anfallsmodellen visste om powerplay men saknade motsvarande boxplayvillkor. Vid en puckvinst fick ett lag i numerärt underläge därför nästan samma möjlighet att bygga ett anfall som vid lika styrka. Dess beslutsprofil fick dessutom alltid `shortHanded:false`.

Boxplay får nu färre anfall efter puckvinst: merparten blir rensningar. Chansen att kunna kontra beror på enhetens offensiva egenskaper mot motståndets försvar. Ordern **Prioritera rensning** minskar kontringarna ytterligare. Detta är en skattning i den förenklade modellen, inte samma positionsförlopp som på den visade isen. PP-uppställningens två interna benämningar `oneThreeOne` och `131` tolkas också likadant. Jämförelseskriptet låser numera den normaliserade uppställningen och boxplayets kontringsorder från den faktiska matchplanen.

## Kontroll

`npm run check:background-strength` använder samma 60 matcher och starttrupper i tre varianter. AI-coaching är fryst. Kontrollvarianten stänger bara av det nya boxplayvillkoret; den är inte en återkörning av hela föregående version. Ändrade beslut ger olika efterföljande slumptalsförlopp.

| Variant | Skott/60 lika styrka | Skott/60 powerplay | Skott/60 boxplay |
|---|---:|---:|---:|
| Utan boxplayvillkor | 28,38 | 42,43 | 23,67 |
| Selektiva kontringar | 28,66 | 40,74 | 7,37 |
| Prioritera rensning | 28,58 | 39,35 | 2,80 |

Detta är modellkontroller, inte verklig ligastatistik. Alla tal använder exponeringstiden i respektive spelform. Kontrollerna kräver att boxplayets anfallsfrekvens sjunker och att säker rensning har ytterligare effekt; lika styrka ändras inte direkt av regeln.

24 andra provmatcher verifierar händelseordning, rätt skytt och assist, utvisningar, returer, istid samt exakta avstämningar mot spelarraderna. Karriärsparning/återläsning av spelformssummeringarna verifieras separat. Regressioner för delad avslutsmodell, matchvärld, anfallsinitiativ och äldre rapporter passerar också.

## Återkoppling i spelet

Motståndsrapportens **Avslutskvalitet** innehåller nu **Lagets avslut per spelform**: mål, skott, speltid och skott per 60 minuter i lika styrka, PP och BP. Tabellen använder endast nya kompletta rapporter med registrerad tid. Äldre rapporter fylls inte ut med påhittade värden. Korta underlag markeras.

## Kvarvarande arbete

Boxplayfelet är avgränsat från den övriga kalibreringen. De kontrollerade jämförelserna visar fortfarande skillnader vid tålamod och hög press, även vid lika styrka. De ska inte förklaras bort som enbart powerplaytid eller beskrivas som lösta här. Underlaget i `qa/background-strength.json` skiljer spelformer och xG från slutresultat så att nästa justering kan bedömas utifrån rätt spelmoment.
