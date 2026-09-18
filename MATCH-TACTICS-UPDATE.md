# Matchtaktik och matchförklaringar

## Rättade regelglapp

- Den visade matchen behåller `control`, `counter` och `pressure` i den gemensamma beslutsmodellen. Tidigare ersattes spelidén av presentationsmotorns grövre `control`/`direct` och kontringsspelet tappade sin särskilda beslutsbias. Mentalitet skickas separat.
- Bakgrundssimuleringen tar hänsyn till avslutsvalets avvägning mellan frekvens och närmare lägen samt offensiv/defensiv mentalitet. Högre anfallsrisk lämnar mer utrymme åt motståndaren.
- Fysisk nivå påverkar både disciplin, tacklingar och energiförbrukning i bakgrundsmatcherna, med samma attributjusteringar som i visade matcher.
- Bakgrundens matchningskedja prioriteras bara med minst 65 procent energi. Under 50 procent väljs en piggare kedja ur den planerade rotationen.
- Lagets och AI-lagens rotationssekvenser kommer från samma funktion.
- Byte av taktik uppdaterar den gemensamma profilcachen även när matchklockan står stilla.

## Beslut före och efter match

Taktikpanelen visar vilka avvägningar den aktuella planen innebär. Matchrapportens nya avsnitt sammanställer enbart den valda matchens sparade händelser:

- Ledningsmålet som höll, när målloggen är komplett och matchen inte avgjordes på straffar.
- Mål, skott och farliga avslut separat för lika styrka, eget PP, eget BP och förlängningsspel.
- Räddningar och skott mot mål för båda lagen, utan att likställa skottens svårighet.
- Forwardskombinationer med minst fem minuters istid och störst/minst registrerad chansskillnad. Backpar summeras inte med kedjorna.
- Hänvisning till befintligt före/efter-underlag för taktiska ändringar.

Ofullständiga eller administrativt avbrutna matcher får ingen påhittad förklaring. Uppgifterna räknas från befintliga rapporter och kräver ingen ny sparfil.

## Kontrollerad jämförelse

`npm run check:match-modes` kör hela ordinarie matcher i fem taktiska scenarier. Samma starttrupper, ordnade formationer, målvakter, special teams och fasta matchplan används i båda motorerna. Den visade motorn kör det riktiga karriärsteget, inklusive ork, istid och periodvila; tidigare jämförelse körde motorn direkt och skalade en period till tre.

Endast testmiljön fryser tränarändringar och skador. Simuleringarnas egna byten, positionsspel, arbetsbelastning och slumptalsströmmar behålls. Förlängning och straffar utesluts från jämförelsen. `MATCH_SAMPLES`, `MATCH_SCENARIOS` och `MATCH_CLUB` styr urvalet. Resultatet redovisar även skillnader per lag. Spatial xG per skottförsök jämförs inte med bakgrundens villkorade xG per skott på mål.

Detta är en diagnostisk jämförelse, inte bevis för identiska resultatfördelningar. Geometri, puckförlopp, bytesögonblick och chansgenerering skiljer sig fortfarande. Små stickprov räcker inte för att lova lika vinstchanser eller färdig slutbalans. Den här uppdateringen rättar identifierade regelglapp; den ersätter inte motorerna med en gemensam fullständig simulering.

## Verifiering

12 riktade testfiler har passerat: match-depth-followup, tactical-controls, match-world-2, match-initiative, headless-career, shared-shot-model, tactical-review, matches-workspace, match-calibration-career, match-centre, match-readiness och match-shifts. Där ingår fortsatt riktig match, paus/återläsning, statistikavstämning, uppställning, belastning och äldre rapporter.

Slutkörningen omfattade 20 matchpar i fem scenarier samt två matchpar med Brynäs. Rådata och medelvärden finns i `qa/match-tactics-comparison.json`. I grundscenariot hade HV71 19,25 skott i visad match mot 29,75 i bakgrunden; motståndaren hade 35,75 mot 24. Det visar kvarvarande skillnader som behöver större kalibreringsunderlag.
