# Etapp 1–3: härdning efter första integrationen

Den första versionen av managerdagen, styrningar och J20-världen ligger redan i `main`. Den här etappen gör tre saker mer konsekventa utan att skapa nya parallella system.

## Managerdagen

Morgonmötet komprimeras till en rad som kompletterar den befintliga Managerpulsen i stället för att upprepa samma beslut i ytterligare tre stora kort. Den visar största risk/nästa kontrollpunkt samt den senaste avslutade matchen eller träningen även om en vilodag hunnit passera. Översikten är fortsatt läsande och flyttar inte kalendern.

## Matchstyrningar

En styrning avgörs först när puckens faktiska skottflykt når spelarens position framför mål. Spelaren måste fortfarande finnas kvar nära skottlinjen. Först då kan målskytten ändras och ursprungsskytten läggas till i assistkedjan. Skottets läge, press och skymning räknas om från styrningspunkten. En sparning mitt under skottflykten behåller den väntande styrningssituationen och RNG-läget, så omladdning ändrar inte utfallet.

Samma slutliga skottobjekt används av matchmotor, reprisinformation, analys och karriärstatistik.

## J20-världen

J20-serien använder de svenska seniorligornas klubbar och respektive akademis aktuella nivå. Matchutfallet fryser akademiernas nivå före utvecklingseffekten från just den matchen. Användarklubbens lagresultat och spelarnas mål/assist räknas därefter från samma deterministiska matchutfall, så lagets mål alltid motsvarar summan av spelarnas mål. Grundseriens första 13 J20-omgångar bildar ett komplett enkelmöte mellan ligans 14 klubbar.

## Regression

`phase-1-3.test.cjs` kontrollerar att morgonmötet inte muterar karriären och behåller senaste aktivitet över en vilodag; att en styrning inte krediteras vid skottögonblicket utan vid puckpassagen; att en sparning mitt i skottflykten ger samma målskytt och assist efter omladdning; att J20-schemat täcker samtliga 91 parningar; att J20-resultatet använder förmatchens akademinivå; att spelarmålen stämmer med lagets resultat; och att J20-tabellen överlever save/reload exakt.
