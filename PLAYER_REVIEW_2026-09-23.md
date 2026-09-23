# Genomförd spelaröversyn 2026-09-23

Start: 2026-09-07, säsong 2026/27. Gäller nya karriärer.

## Täckning per klubb

"Officiellt" avser spelare med minst en matchad kompletterande förbundspost,
inte individuellt uppmätta attribut. Alla befintliga spelare har kvar sitt
ursprungliga tvåsäsongsunderlag. Noll i kolumnen betyder ingen kompletterande
post, inte att spelaren saknar bakgrundsstatistik.

| Klubb | Spelare | Rättad fysik | Officiellt | MV med skottdata | Tekningsdata | Lån | Juniorstatus |
|---|---:|---:|---:|---:|---:|---:|---:|
| Björklöven | 25 | 0 | 8 | 2 | 0 | 0 | 0 |
| Brynäs IF | 26 | 0 | 7 | 1 | 2 | 1 | 0 |
| Djurgårdens IF | 24 | 0 | 6 | 2 | 2 | 1 | 1 |
| Frölunda HC | 26 | 0 | 7 | 2 | 1 | 0 | 2 |
| Färjestad BK | 24 | 0 | 7 | 2 | 2 | 1 | 3 |
| HV71 | 25 | 0 | 6 | 3 | 1 | 1 | 0 |
| Linköping HC | 28 | 0 | 5 | 1 | 1 | 0 | 0 |
| Luleå HF | 24 | 0 | 7 | 2 | 2 | 0 | 0 |
| Malmö Redhawks | 27 | 0 | 9 | 2 | 2 | 0 | 0 |
| Rögle BK | 26 | 0 | 8 | 1 | 4 | 1 | 1 |
| Skellefteå AIK | 26 | 0 | 8 | 3 | 2 | 0 | 1 |
| Timrå IK | 24 | 0 | 5 | 2 | 1 | 1 | 0 |
| Växjö Lakers | 25 | 0 | 8 | 2 | 1 | 0 | 2 |
| Örebro Hockey | 26 | 0 | 9 | 2 | 3 | 1 | 0 |
| AIK | 24 | 0 | 5 | 3 | 0 | 0 | 0 |
| Almtuna IS | 21 | 21 | 2 | 1 | 1 | 2 | 0 |
| BIK Karlskoga | 23 | 0 | 7 | 2 | 3 | 1 | 1 |
| IK Oskarshamn | 23 | 0 | 3 | 2 | 1 | 2 | 0 |
| Kalmar HC | 23 | 0 | 4 | 1 | 3 | 1 | 0 |
| Leksands IF | 21 | 0 | 5 | 2 | 1 | 0 | 1 |
| MoDo Hockey | 22 | 0 | 3 | 2 | 1 | 1 | 0 |
| Mora IK | 25 | 25 | 3 | 2 | 0 | 1 | 0 |
| Nybro Vikings | 23 | 0 | 4 | 1 | 1 | 2 | 0 |
| Södertälje SK | 23 | 0 | 8 | 2 | 4 | 1 | 0 |
| Vimmerby HC | 23 | 0 | 1 | 1 | 0 | 3 | 0 |
| Visby/Roma | 24 | 0 | 2 | 1 | 1 | 1 | 0 |
| Västerås IK | 23 | 0 | 2 | 1 | 0 | 0 | 0 |
| Östersunds IK | 26 | 0 | 6 | 2 | 3 | 1 | 0 |

Fyra frispelare ingår dessutom i modellen. Delia har fått två matchade
målvaktsrader. 23 lån och 12 juniorregistreringar ingår redan i klubbantalen,
inte som dubbletter. Inga senare övergångar har backdaterats.

## Konkreta förändringar

- Almtunas och Moras 46 felimporterade vikter i pund är nu kilogram;
  saknade längder kompletteras. Alla andra profiler behåller källvärdena.
- Samma prestation ger samma grundförmåga även om säsongen delats mellan
  två klubbar. Namn/ID påverkar inte bedömningen av nuvarande förmåga.
- Målskyttar får inte automatiskt höjt hockey-IQ och tunga spelare inte
  automatiskt högre styrka. Saknade egenskaper redovisas som osäkra antaganden.
- Tekningsspecialister och målvakter använder fler faktiska observationer.
  Profilen visar registrerade tekningar, skott emot och målvaktsistid.
- Potential har flera utvecklingsscenarier. Den faktiska marginalen används
  av träningen; stabens osäkra stjärnor är separata och frysta i scoutrapporten.
- Neutral personlighet används för nya verkliga spelare när verkligt underlag
  saknas. Äldre karriärers värden lämnas orörda.

## Verifiering och gränser

`player-evidence.test.cjs` kontrollerar enheter, datum, splittrade säsonger,
oberoende attribut, skottvolymer, tekningar, potential, scoutingens skydd samt
träning och återladdning. Befintliga tester täcker alla 28 uttagningar,
värvningar, frispelare, flerårig spelarvärld och äldre karriärer.

`node scripts/check-player-evidence.cjs` använder samma produktionsmotor och
slumpfrön för tidigare respektive nya attribut. Resultat och åtta spelare
före/efter finns i [player-model-review.json](data/player-model-review.json).
Det är periodsimuleringar, inte en fullständig säsong eller visuell provspelning.

Kvar: individuellt verifierade defensiva/fysiska/mentala profiler, fullständig
historisk registreringskontroll, aktuell istid/PP/PK-användning, kompletta
verkliga juniortrupper och empirisk kalibrering av ligaöversättning/potential.
Denna uppdatering gör underlaget spårbart och rättar konkreta modellfel;
den gör inte 684 osäkra spelarbedömningar till ett facit.

## Kontrollerad matchserie

64 perioder à 20 minuter: två möten, 16 slumpfrön och två attributversioner.
Samma aktuella motor och regler användes i båda grupperna.

| Attributversion | Perioder | Mål totalt | Skott på mål | Mål / lag / 60 min | Skott / lag / 60 min |
|---|---:|---:|---:|---:|---:|
| Tidigare | 32 | 61 | 606 | 2.86 | 28.41 |
| Uppdaterad | 32 | 55 | 568 | 2.58 | 26.62 |

Den första mindre delserien hade större målskillnad. Med 16 frön per möte
blev skillnaden mindre. Underlaget visar att attributen når simuleringen,
men bevisar inte verklighetsbalans eller orsaken till ett enskilt resultat.

## Exempel före och efter

| Spelare | Konkret ändring | Tolkning |
|---|---|---|
| Daniel Meyer | Styrka 9 → 7 | Felimporterad vikt ger inte längre en styrkebonus. |
| Fredrik Händemark | Tekningar 14 → 16 | Registrerade vunna tekningar och försök används. |
| Tobias Normann | Plock & stöt 14 → 13 | Räddningsprocent är inte längre bevis för alla målvaktsegenskaper. |
| Scott Pooley | Spelförståelse 12 → 11 | Poäng räcker inte för att belägga hockey-IQ. |
| Daniel Meyer | Utvecklingsmarginal 4 → 3.3 | Ålder, nivå och underlag ger scenario; ingen utveckling garanteras. |
