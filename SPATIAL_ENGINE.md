# Matchmotorn: rumsliga spelarbeslut

Den synliga karriärmatchen och matchstudion använder samma fasta simulationssteg. Uppdateringen förändrar handlingar och fysisk rörelse; inga slutresultat väljs i efterhand.

## Förändringar

- Puckföraren jämför passning, avslut, pucktransport, dumpning, puckskydd och rensning på en gemensam skala. Passningsväg, mottagarens läge, risk att förlora pucken, terrängvinst, press och matchplan påverkar värdet. Vision och beslutsförmåga påverkar osäkerheten i bedömningen. Offside och numerärt underläge har uttryckliga begränsningar.
- Pucktransport söker flera möjliga vägar runt försvarare. Puckskydd får kort varaktighet och ersätter inte permanent ett försök att spela vidare.
- Medspelare söker spelbara ytor runt sin formationsroll. Passningsväg, avstånd, motståndarnas täckning och avstånd till medspelare vägs ihop. Understödet uppdateras var 0,6 sekund, vilket undviker målbyten varje bildruta. PP-formationernas struktur behålls.
- Försvaret prioriterar centrala hot och möjliga passningsvägar, med viss kontinuitet i markeringen. Kontakten med puckföraren kan nu skapa en närkamp mellan två beslutstillfällen. Spelaren kan inte passera en försvarare enbart för att beslutsklockan inte har löpt ut.
- Snabba sidledspassningar påverkar avslutet utifrån passningens faktiska tid och målvaktens rörelseförmåga. Returbonus kräver närhet till den faktiska returen; den följer inte godtyckligt med till en annan del av rinken eller genom en ny passning.
- Målvaktens positionsfel förstärker skottlägets grundfara proportionellt. Det tidigare fasta tillägget kunde övervärdera långa skott ur svåra vinklar.
- Under rinken visas spelarens senaste val och dess motiv. Reprisen använder fortsatt det registrerade avslutet; den rullar inte ett nytt resultat.

## Kontroller och mätningar

`scripts/match-quality.cjs` kör reproducerbara perioder och mäter puckinnehav, lös puck, puckflykt, passningar, zoninträden, skott, modellens chansvärden och resultat. Exempel:

```
node scripts/match-quality.cjs match-simulation.js 24 0
```

`qa/match-quality-results.json` innehåller nuläget (12 perioder före ändringen) och slutmodellen (24 perioder). Fröregeln och källversionen är dokumenterade. Resultaten är ett litet diagnostiskt urval med samma två lag; de bevisar inte att modellen är kalibrerad mot SHL eller att målbilden är korrekt för alla lag. Modellens xG är dess egen sannolikhet, inte en oberoende empirisk värdering. Den lätta beräkningen för bakgrundsmatcher är fortsatt separat från den synliga rumsliga motorn.

Situationsproven kontrollerar blockerade passningsvägar, vägar runt försvarare, offside, ändrat understöd när en yta blir täckt, sidledsskott, lokala returer och kontakt mellan beslut. Karriärproven kontrollerar fullständiga matcher, spelarantal, statistik, regelhantering, återupptagning och sparfiler. Beslutsjournalen är begränsad till 30 rader och importvalideras tillsammans med sparade rörelsemål.

Den breda regressionen hittade även ett AI-truppfel: egna utlånade spelare saknade reserverade truppplatser. Värvningar, junioruppflyttningar och inlåning tar nu hänsyn till deras återkomst. Befintliga lån får återvända enligt avtalen.
