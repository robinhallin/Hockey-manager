# Matchlägen, avslut och kalibrering

Den fortsatta kalibreringen och nyare kontrollresultat finns i [AI-CALIBRATION.md](AI-CALIBRATION.md). Nedanstående siffror beskriver den tidigare kontrollomgången.

## Resultatpåverkande visningsfel rättat

Höjdpunktsvyn bedömde avslutskvalitet för att välja vad den skulle visa. Den beräkningen anropade målvaktens positionsbedömning, som samtidigt skrev över målvaktens senaste puckläsning. Även en vyfråga kunde därmed ändra nästa beslut på isen.

Målvaktens positionsbedömning är nu en ren avläsning. Minnet uppdateras bara i simuleringens positionssteg. Före rättningen gav det kontrollerade provet 4–4 i helmatch och 1–3 i höjdpunkter. Efter rättningen ger helmatch, utökade höjdpunkter, viktiga höjdpunkter och resultat/kommentarer alla 0–2 med exakt samma skotthändelser, statistik, istid, energi och slumptalsläge efter 60 minuter. Detta är ett regressionstest av lägesoberoende, inte en prognos för HV71.

## Gemensamma avslutsregler

- Målchansens kalibreringsfaktor 0,75 låg tidigare enbart i den visade motorns omslag. Den ligger nu i den gemensamma avslutsberäkningen, en gång per avslut. Ett träffande skott i tom bur ska inte räddas av denna faktor.
- Båda motorerna använder samma regler för blockering, träffsäkerhet och mål/räddning. Bakgrundsmatcher producerar skottförsök och prövar därefter blockering och träff. Tidigare började de direkt med ett skott på mål.
- Taktisk avslutsbias delas mellan modellerna. Bakgrundens chansfrekvens tar nu hänsyn till spelidé och avslutsval tillsammans. Koefficienterna 0,44 och 3 i frekvensmodellen är spelkalibrering; de är inte verklig SHL-statistik och gör inte den förenklade modellen identisk med positionsmotorn.
- AI-lagets avslutsval och fysiska spel följer samma anslutningar till den visade motorn som spelarens. Fysisk nivå påverkar också AI-lagets arbetsbelastning.
- Bakgrundens periodvila använder samma 180 återhämtningssekunder som karriärmatchen, i stället för 1 200.
- Bakgrundsrapporter redovisar även missade och blockerade försök i händelsesummeringen. Straffavgörandets extra resultatmål skapar inte längre ett påhittat spelarmål eller tar bort en målvaktsräddning.

Sparformatet kräver ingen migrering. Gamla rapporter behålls, och nya försöksfält är tillägg. Pågående matcher fortsätter med de rättade reglerna; redan spelade resultat räknas inte om.

## Verifiering

- `npm run check:playback-parity`: fyra identiska fulla 60-minutersförlopp, med AI-coaching aktiv. Endast skador och andra samtidiga ligamatcher kopplas bort i provet.
- `match-mode-rules.test.cjs`: rena avläsningar, gemensam kalibrering, utfallsgränser, AI-taktik, skottbokföring och straffavgörandets statistik.
- `shared-shot-model.test.cjs`: attributpåverkan, målvaktsreturer, förväntade mål per försök, determinism, engångsbokföring och sparning/återläsning.
- Produktionstestets 96 perioder: 26,25 skott, 46,03 försök och 2,625 mål per lag och 60 minuter, samt 90 procent räddningar. Samtliga befintliga intervall klarades utan att ändra testgränserna.
- Övriga riktade tester täcker taktiska kontroller, målvaktsrörelser, byten, matchrapporter och karriärens attributkalibrering.

## Kvarvarande skillnader

En bakgrundsmatch skattar fortfarande lägen och skottlinjer; den visade matchen beräknar faktiska positioner och puckförlopp. De använder olika slumptalsströmmar. Gemensamma avslutsregler är därför inte bevis för identiska vinstfördelningar.

Jämförelseskriptet låser starttrupper, formationer, special teams och matchplan. `MATCH_VENUE=away` vänder hemma/borta i den valda testmatchen. Det redovisar avvikelser för varje lag och taktik. `passed` avser att matcherna slutfördes med giltiga räknare; `calibrationPassed` är en separat grov varningsgräns (10 skott eller 2 mål per lag). Små stickprov kan varken bevisa balans eller säker obalans. Råresultaten sparas i `qa/match-mode-parity.json`.

Slutjämförelsen omfattar 23 matchpar: fem taktiker med HV71/Björklöven, två med Brynäs/Örebro på bortaplan och två med Leksand/Nybro. Varningsgränsen klaras i Leksand/Nybro-provet men inte i samtliga SHL-scenarier. Exempelvis ger Brynäs höga press i det lilla bortaprovet 31 mot 46,5 skott i visad respektive bakgrundsmatch. Den skillnaden är kvar och kräver fortsatt kalibrering; uppdateringen ska inte beskrivas som bevisat identiska vinstchanser mellan de två motorerna.
