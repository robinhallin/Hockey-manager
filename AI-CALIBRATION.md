# Samlad kalibrering av AI-matcher

Kalibreringen jämför den ordinarie karriärmotorn på isen med bakgrundsmotorn. Den skattar **anfallsfrekvens och skottlägen**, inte önskade vinnare eller slutresultat. Spelarnas egenskaper, målvakter, ork, formationer och gemensamma avslutsregler avgör fortfarande utfallet.

## Ändringar

- Anfallsfrekvensen följer uppmätta skillnader mellan kontrollspel, kontringsspel och presspel samt balanserade, tålmodiga och snabba avslut. En anfallsintensitet kan överstiga ett försök per 20-sekunderssteg. Ett sannolikhetstak begränsar därför inte powerplay.
- Powerplay skattas separat för **1–3–1, paraply och överbelastning**, var och en mot **box och diamant**. Att slå samman dessa sex kombinationer dolde stora skillnader i den faktiska livemotorn.
- Uppskattad skottgeometri bygger på gemensamma fördelningar för avstånd, vinkel, press, skymning och sidledsrörelse. Kvantilgrupper behåller sambanden mellan dessa värden. Egenskaper och specialteamskompetens modifierar läget; den gemensamma avslutsmodellen beräknar blockering, träff och målchans. Kontexten märks fortfarande som uppskattad.
- Utvisningsfrekvensen är kalibrerad mot faktisk PP/PK-exponering. Disciplin och fysisk spelstil påverkar fortfarande risken. Säkert boxplay ger färre kontringar.
- Båda matchvägarna använder samma straffläggning med riktiga skyttar och målvaktsegenskaper. Den gamla fasta fördelen för användarens lag och bakgrundens förenklade målvaktslottning är borttagna. Slumpen är reproducerbar. Äldre matcher utan en sparad ismotor har en separat kompatibel väg till samma straffmodell.
- Förlängningen slutar direkt vid ett spelmål. Den registrerar inga nya utvisningar efter avgörandet. Slutspelsförlängning fortsätter med ordinarie spel och periodvila; den tidigare reservvägen som fabricerade ett avgörande spelarmål är borttagen.

## Underlag och oberoende kontroll

`qa/ai-calibration-specs.json` innehåller samtliga klubbval, frön, sidor, taktiker och formationskombinationer. **174 hela matcher används för kalibrering. Kontrollunderlaget omfattar 81 breda kontrollmatcher och 18 nya riktade kontroller.** Nio klubbar ingår. Slutkontrollen korsar de nio spelstil/avslutsvalen och alla sex PP/PK-kombinationer. Båda lagens prestationer ingår, med hemmalag/bortalag korrekt matchade. Kalibreringen inkluderar även lägre/högre tempo, defensiv/offensiv hållning och säker/hård fysisk spelstil.

Slutkontrollen använder samma starttrupper, valda målvakter, ordnade formationer och fasta matchplaner i båda motorerna. Ork och byten körs normalt. Endast skador, adaptiva tränarbyten och andra samtidiga ligamatcher stängs av i jämförelseharnessen. Produktionens adaptiva tränare och belastning kontrolleras dessutom i separata regressionstester. Bakgrundsmotorn körs med tolv frön per kontrollmatch för att minska dess slumpvariation.

Tre tidigare kontrollomgångar **underkändes**. Först återstod PP-volym och presspel; därefter saknades modellering av formationsmötet i special teams. Rapporterna finns kvar i `qa/ai-calibration-first-check.json`, `qa/ai-calibration-second-check.json` och `qa/ai-calibration-third-check.json`. De två första omgångarnas matcher blev därefter en del av träningsunderlaget. Den tredje klarade 43 av 44 kontroller; överbelastning mot diamant hade för få träningsobservationer. Tolv nya träningsmatcher kompletterade enbart PP-underlaget. En exponeringsbaserad Poissonanpassning skiljer därefter formationsmötet från spelstil och avslutsval, med små neutrala priorer för glesa grupper. Ingen kontrollmatch ingår i anpassningen. De 81 breda kontrollmatcherna kördes om som regression och kompletterades med 18 nya, separat seedade kontroller av den rättade kombinationen. Dessa 18 användes inte för att passa modellen. Kontrollerna använder samma breda klubbpopulation; den ska inte beskrivas som nio tidigare osedda klubbar.

Kontrollgränserna för totaler, spelstil, sida och spelform har behållits genom omgångarna. Sex särskilda formationskontroller lades till före den sista kontrollen. Ingen gräns höjdes för att få ett underkänt resultat att passera. Detta är interna konsistensgränser, inte en validering mot ett externt SHL-dataset. Enskilda matchresultat behöver inte vara identiska mellan två olika simuleringsmotorer.

## Resultat

**46 av 46 kontroller godkända.** 99 kontrollmatcher och 1 188 bakgrundskörningar i den nya modellen, samt lika många i referensversionen.

| Mått | Livemotor | AI i bakgrunden |
|---|---:|---:|
| Skott per lag/match | 30,439 | 28,678 |
| Mål per lag/match | 2,505 | 2,370 |
| Förväntade mål per lag/match | 2,515 | 2,390 |
| Skott/60 vid lika styrka | 31,480 | 29,682 |
| Skott/60 i powerplay | 37,629 | 35,892 |
| Skott/60 i boxplay | 8,552 | 9,360 |

Bakgrundens kvarvarande genomsnittliga skillnad är −1,762 skott och −0,126 förväntade mål per lag och match. Matchvis bootstrap ger 95-procentsintervall −2,771 till −0,736 skott och −0,195 till −0,056 förväntade mål. Det finns alltså en liten mätbar underskattning kvar; den ligger inom de förutbestämda gränserna. Modellerna påstås inte vara statistiskt identiska.

`qa/ai-calibration-final-check.json` innehåller varje kontroll, dess gräns och utfall samt bootstrapintervall som samplar om hela matcher. Mätvärdena per livematch och bakgrundens medelvärden per match samt referensversionens resultat ligger i `qa/ai-calibration-validation.json` och `qa/ai-calibration-baseline.json`.

Separata kontroller täcker:

- 24 riktiga 3-mot-3-förlängningar, med åtta bakgrundsfrön per startläge och slut vid avgörande mål. Färska trupper används i just frekvensprovet; överförd trötthet testas separat.
- 90 fulla bakgrundsmatcher som tillsammans måste innehålla vanlig förlängning, straffar och slutspelsförlängning. Händelser, lag- och spelarsummor måste stämma exakt.
- 2 000 straffläggningar med jämnstarka lag och 2 000 med starkare respektive svagare skyttar/målvakter, samt exakt återspelning av samma frö.
- Gemensam avslutsmodell, attributens verkan, returer efter räddningar, PP-mål och utvisningsslut, istid, ork, dubbelföringsskydd, äldre rapporter och sparning/återläsning.
- Samma hela match i fyra visningslägen: identiska händelser, resultat, ork, istid och slumpstatus.
- Den oförändrade kalibreringsgrinden för livemotorn: 96 perioder, 26,25 skott och 2,625 mål per lag och 60 minuter, 90,0 % räddningar.

## Återskapa

Kör från projektroten med Node. Matcherna är riktiga simuleringar och tar flera minuter. De stora tillfälliga karriärbilderna behöver inte läggas i Git.

```sh
node scripts/sample-ai-calibration.cjs /tmp/hockey-ai-calibration 6
node scripts/fit-ai-calibration.cjs /tmp/hockey-ai-calibration /tmp/refitted-ai.js
cmp ai-calibration-data.js /tmp/refitted-ai.js
node scripts/replay-ai-calibration.cjs /tmp/hockey-ai-calibration /tmp/validation.json 12 validation
node scripts/replay-ai-calibration.cjs /tmp/hockey-ai-calibration /tmp/baseline.json 12 validation b8ff44ef2f14d0e2adf82a345980f66027c7551d
node scripts/check-ai-calibration.cjs /tmp/validation.json /tmp/baseline.json /tmp/check.json
node scripts/compact-ai-calibration.cjs /tmp/validation.json /tmp/compact-validation.json
node scripts/check-ai-overtime.cjs /tmp/hockey-ai-calibration /tmp/overtime.json
node scripts/check-playback-parity.cjs
node --test --test-concurrency=3 ai-calibration-rules.test.cjs shared-shot-model.test.cjs match-mode-rules.test.cjs background-event-evidence.test.cjs match-readiness.test.cjs adaptive-coaches.test.cjs career-match-rules.test.cjs analysis.test.cjs league-lineup.test.cjs
```

Modellen behöver fortsatt följas när själva livemotorns taktik, fysik eller spelarunderlag ändras. De sparade måtten och kontrollerna gör sådana avvikelser synliga i stället för att dölja dem med ett godtyckligt målresultat.
