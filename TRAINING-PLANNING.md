# Etapp: individuell belastningsplanering

## Kodgranskning och prioritering

Den befintliga grunden har verkliga kopplingar: `runTrainingSession` påverkar ork, attributarbete, taktisk vana och special teams. `developmentAdvance` begränsar utveckling efter individuellt utvecklingsutrymme. `medicalDay` följer belastning och rehabilitering. Matchtruppen får spelarens attribut och trötthet genom `career-match.js`. Kalendern driver dagar, marknad och AI-klubbar.

Luckan i denna etapp var att besluten saknade jämförbara konsekvenser före passet, individuella passrapporter och ett tidsbestämt slut på återhämtningen. Dessutom behandlade medicinska modellen matchförberedelse med vald hård intensitet som hård exponering, trots att själva träningen alltid var lätt.

## Beslutet och dess konsekvens

Tränaren väljer mellan träningsarbete, lättare deltagande och vila. Vila förbättrar orken men ger ingen attributträning eller medverkan i lagets taktiska förberedelser. Lätt träning ger mindre träningsarbete och återhämtning. Hård träning ger mer arbete men mer trötthet och medicinsk belastning. Trötthet reducerar redan utbytet av träningen.

Samma `trainingSessionEffect` används i förhandsjämförelsen, genomförandet och den medicinska klassificeringen av passet. Befintliga tillväxttal och återhämtningsvärden behålls. Jämförelsen av träningsarbete är relativ för samma spelare och pass; den lovar inte ett visst attributsteg eller skadefrihet.

Lätt träning och vila kan återgå till lagets pass efter 1, 3 eller 7 kalenderdagar. Datumet är första dagen med lagets pass. Manuella belastningsändringar avslutar timern. Matchuttagningen påverkas inte automatiskt och medicinska begränsningar gäller alltid.

## Uppföljning och kompatibilitet

Spelaren sparar högst tolv individuella pass. Inkorgen följer upp avslutad plan med deltagande och ork före/efter, med förklaring att matcher och rehabilitering också påverkar utfallet. Äldre sparfiler behöver inga nya obligatoriska fält. Befintlig individuell vila utan återgångsdatum fortsätter som tidigare.

## Nästa prioriteringar

- Taktisk återkoppling baserad på faktiska matchsekvenser: länka ett konstaterat problem till ett möjligt ingrepp och mät utfallet.
- Spelarnas roller och förväntningar: jämför löften med faktisk istid och konkurrens över tid, inklusive hur värvningar påverkar juniorernas möjligheter.
- AI-klubbarnas träning använder fortfarande en förenklad utvecklingsmodell. Gemensamma ekonomiska och utvecklingsmässiga avvägningar behöver följas upp över flera säsonger innan modellen fördjupas.

Detta är en genomförd etapp, inte ett påstående om att hela spelvisionen eller all säsongsbalans är färdig.
