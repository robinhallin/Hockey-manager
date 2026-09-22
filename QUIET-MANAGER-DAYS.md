# En spelvecka med färre omvägar

Kodgranskningen fann att varje normalt dagssteg stannade i en dialog som behövde stängas. Kontorets scoutöversikt läste bara äldre gruppuppdrag, trots att dagens scouting också använder namngivna uppdrag. Delegerad bevakning dolde även högprioriterade avvikelser.

1. Normala dagar avslutar bearbetningen och återgår direkt till kalendern. Ingen extra simulering eller konstgjord väntan införs. Upp till tolv nya rapporter/resultat finns i en valfri sammanfattning på kalendern och kontoret. Sammanfattningen sparas, hör till klubb och datum och ersätts vid nästa dagssteg. Äldre sparfiler saknar den tills ett nytt dagssteg görs. Beslut som kräver svar och bearbetningsfel behåller sina befintliga stopp. Dubbelklick under bearbetning schemalägger fortfarande bara ett steg.
2. Kontoret räknar både gamla och nya scoutuppdrag. Nästa väntade observation, kontakt eller värvningssvar väljs efter datum i stället för en fast kategoriprioritet. Ett kontaktbesked öppnar rätt spelares kontrakts-/kontaktunderlag via ID. Läsning gör inga offerter och startar inga uppdrag.
3. Högprioriterade risker förblir synliga även när området bevakas av staben. Vanliga rutinrader kan fortsatt döljas. Delegering ändrar inte vem som måste fatta ekonomiska beslut, och inga automatiska kontrakt tillkommer. Befintlig automatisk träningsvila och försiktig medicinsk återgång återanvänds.

Testerna kontrollerar två verkliga på varandra följande dagssteg utan stängningsklick, faktisk träning och delegerad vila, sparning/laddning, gamla sparfiler, datum-/klubbavgränsning, modern scoutbeställning, väntande kontakt och rätt destination. Befintliga tester kontrollerar dubbelklick, samma simulering som kalendersteget, beslut som skapas under dagen, pausad match och fel utan automatisk omkörning. Förväntningen att varje rutinmässig dag lämnar en öppen dialog har avsiktligt ändrats i regressionstestet.

Detta är teknisk verifiering och kodgranskning. Visuell provspelning och bedömning av upplevd rytm återstår. Modern Dark behålls. Säsongen snabbspolas inte automatiskt och inga nya dagliga meddelanden läggs till.
