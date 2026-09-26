# Etapp 4 – matchbalans och prestanda

Kontrollerad mot main e63c052fc07666a17047d645a235f2697a1e1b62. Inga matchregler eller kalibreringsparametrar ändras i denna etapp.

## Färskt matchurval

80 fullständiga par om 60 minuter, med både visad motor och bakgrundsmotor. HV71 hemma: 16 per taktik; HV71 borta, Färjestad hemma och Oskarshamn borta: 8 per taktik. Taktiker: balanserat och hög press. Samma ursprungliga spelare, ordnade formationer, målvakt och PP/BP-enheter inom varje par. Adaptiv coaching, skador och andra matcher är avstängda endast i testet. Ordinarie energi, belastning och byten kvarstår. Motorerna har olika slumpförlopp; detta är statistisk jämförbarhet, inte exakt matchparitet.

Alla grupper klarar de oförändrade diagnostiska gränserna: högst 10 skott och 2 mål i genomsnittlig skillnad per lag och match. Detta visar **inte** att motorerna är identiska eller slutgiltigt balanserade mot verklig hockey.

Det tidigare fyramatchsurvalets HV71-hemma/press/motståndare gav 48,5 mot 34 skott. Med 16 matcher blir utfallet 45,56 mot 36,5, en skillnad på 9,06. Bootstrapintervallet är 5,31–12,81 skott. En kvarvarande systematisk skillnad är alltså möjlig och intervallet korsar varningsgränsen. Den motiverar fortsatt uppföljning, inte en generell pressjustering: andra klubb- och arenafall ger mindre avvikelser. Urvalet omfattar tre klubbpar, inte hela ligan eller alla taktiker.

Maskinläsbar evidens:
- `stage4-match-modes.jsonl`: samtliga råa matchpar inklusive xG, skottförsök, mål och exponering fem mot fem/PP/BP ("even" inkluderar lika numerär).
- `stage4-match-balance.json`: separata grupper och 2 000 bootstrapdrag av hela matchpar; noll exponering ger null, inte ett påstått nollvärde.

Reproduktion från projektroten:

```bash
MATCH_SAMPLES=16 MATCH_SCENARIOS=balanced,pressure node scripts/compare-match-modes.cjs > /tmp/stage4-home.jsonl
MATCH_SAMPLES=8 MATCH_SCENARIOS=balanced,pressure MATCH_VENUE=away node scripts/compare-match-modes.cjs > /tmp/stage4-away.jsonl
MATCH_SAMPLES=8 MATCH_SCENARIOS=balanced,pressure MATCH_CLUB='Färjestad BK' node scripts/compare-match-modes.cjs > /tmp/stage4-farjestad.jsonl
MATCH_SAMPLES=8 MATCH_SCENARIOS=balanced,pressure MATCH_CLUB='IK Oskarshamn' MATCH_VENUE=away node scripts/compare-match-modes.cjs > /tmp/stage4-oskarshamn.jsonl
node scripts/match-mode-report.cjs qa/stage4-match-modes.jsonl
node scripts/check-playback-parity.cjs
```

Kontrollskriptet väljer nu uttryckligen begärd arena, kontrollerar klubb och taktik, skiljer slutförda matcher från godkänd kalibrering och returnerar exitkod 1 vid varning. Rapporten matchar lag med klubbidentitet även när bakgrundsmotorns hemma/bortaordning skiljer sig. Dubbletter och ogiltiga observationer avvisas.

Full, extended, highlights och commentary gav exakt samma mål, skott, spelarnas energi, istid och slumpförlopp i separat 60-minuterskontroll (5–5).

## Dagsstegets prestanda

`nextDay` mäts runt den faktiska synkrona kalenderbearbetningen, sammanställningen och sparningen. Den gamla Promise-mätningen inträffade före den uppskjutna callbacken och registrerade inga vanliga dagssteg. Väntan på timer/paint ingår inte i bearbetningstiden. Avbrutna/felande försök hamnar i `nextDayAborted`, även om datumet redan delvis ändrats. Föråldrade callbackar som inte körs bidrar inte till någon tidsserie.

Endast en callback i fasen working får köras. Färdiga och felande steg kan inte köras om. Regressionerna kontrollerar 37 ms faktisk bearbetning efter en artificiell väntan på 9 900 ms, dubbelklick, blockerade steg, partiella fel, nya beslut, sparning och stängning. Windows-smoketestet kontrollerar dessutom exakt en ny lyckad mätning per verkligt dagsklick.

Detta är en korrigering av mätning och callback-livscykel, inte ett påstående om att kalendern eller matchmotorn blivit snabbare. En kort CPU-profil användes för orientering; ingen optimering eller balansändring baseras på det lilla profilurvalet.
