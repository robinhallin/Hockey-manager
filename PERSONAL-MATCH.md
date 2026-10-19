# Matchens personliga historia

Översikten lyfter en faktisk personlig tråd inför nästa match: en pågående provperiod, ett nyligen värvat namn som ännu saknar registrerad tävlingsistid efter ankomsten, en comeback efter registrerad frånvaro, ett befintligt rollöfte eller en såld spelare som nu tillhör motståndaren. Spelaren kan välja vilken aktuell tråd som ska följas. Ingen historia skapas genom att läsa vyn.

## Två verkliga uttagningsalternativ

I Taktik & laguttagning föreslår assistenten ett namngivet byte när en uttagen spelare har minst 35/100 slitage och ett tillgängligt alternativ är minst 15 slitagespoäng fräschare, eller när en spelare med pågående provperiod står lägre i uppställningen. Riktmärkena är spelregler för förslaget, inte medicinska gränser.

Förslaget kräver samma positionsgrupp, minst 90 % positionsvana på platsen och full medicinsk spelklarhet för båda. Låsta platser respekteras. En redan uttagen kandidat måste komma från en lägre plats i samma formationsgrupp. Förslaget visar bedömd nivå, startenergi om matchen börjar nu, befintliga besked och konsekvensen av att behålla respektive byta.

**Behåll nuvarande spelare** registrerar beslutet utan ett byte. **Välj ersättaren på platsen** använder spelets ordinarie byte av spelare eller målvakt. Ett byte mellan ordinarie formationer byter deras platser; det betyder inte automatiskt att någon vilar hela matchen. Reserver och special teams behåller sina separata val. Inga nya rollöften, förmågebonusar eller förtroendepoäng skapas. Beslutet sparas i spelarresan.

En signerad förhandsbild förhindrar att en gammal knapp skriver över en ändrad uppställning, låst plats eller förändrad tillgänglighet. Åtgärderna spärras när en match är skapad och pågår. För nästa match måste ett nytt beslut fattas.

## Från nedsläpp till slutsignal

Matchstarten fryser huvudpersonen, det tidigare beskedet, managerbeslutet och de berörda spelarnas verkliga placeringar och förutsättningar. Den uppdateras vid första nedsläpp om laget ändrades efter att matchen skapades. Äldre matcher som redan har börjat får ingen påhittad förhandsberättelse.

Den färdiga matchrapporten ger en kort återkoppling med faktisk istid, mål och assist. Ett manuellt ändrat lag efter det ursprungliga beslutet redovisas som ändrat. En enskild match kan nå eller missa provperiodens minutgräns, men den ordinarie spelarresan äger den samlade bedömningen. Medicinska undantag gäller. Ingen formulering hävdar att ett uttagningsval orsakade segern eller spelarens mål.

Första mål avser registrerad tävlingshistorik under den egna ledningen, aldrig ett påstått första mål i spelarens verkliga karriär. En återseendehistoria visar inte att motståndarspelaren deltog utan individuellt underlag. Träningsmatcher har en tydlig märkning och räknas inte till tävlingslöften eller tävlingsmilstolpar. Ofullständiga eller avbrutna rapporter får inget slutligt personligt utfall; saknade spelaruppgifter redovisas som saknade.

Utfallet finns direkt i eftermatchens coachpanel, i matchrapporten och på översikten i högst sju kalenderdagar. Matchrapportens detaljarkiv behåller befintliga begränsningar; bestående val och matchminnen finns även i spelarresan. Utkast stannar hos klubben i `clubOffice.personalMatch`, medan matchens frysta underlag sparas i `personalMatch` och resultatet i `personalOutcome`. Sparfiler validerar även tidigare arbetsgivares klubbank.

## Verifiering

`node --test personal-match.test.cjs` täcker läsning utan sidoeffekter, två faktiska val, bevarade roller och löften, export/omladdning, stale-knappar, medicinska och låsta platser, sena manuella ändringar, verklig matchproduktion, vänskapsmatcher, medicinska undantag, ofullständiga rapporter och en hel match i ordinarie matchmotor.

`scripts/personal-match-browser-checks.cjs` ingår i det korta Windows/Electron-testet. Det provar båda knapparna, omladdning, en fullständig riktig träningsmatch och bestående spelarminne. Skärmbilder 60–63 visar före match, uttagningsalternativen, faktiskt utfall och nästa kapitel.
