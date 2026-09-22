# Matchbeslut med kontinuitet

Kodgranskningen identifierade konkreta avbrott i befintliga flöden: matchbriefens samtliga alternativ skrev om taktiken; disciplinrådet hänvisade bara vidare till en meny; energivarningens namn var vanlig text; matchrapportens träningsgenväg kunde ersätta ett pågående fokus direkt.

- Matchbriefen kan nu följa den befintliga planen utan ändrade order. Samma frysta underlag och matchrapport används. Utfallet presenteras åt båda håll utan påstående att en bestämd siffra borde förbättras. Motståndsrapporten filtrerar bort framtida daterade observationer.
- Disciplinrådet kan genomföra befintlig fysisk order eller registrera valet att behålla planen. Motorn använder redan denna order för disciplin och tacklingsegenskaper; inga nya bonusar eller resultatregler införs. Beslutet pausar, sparas i ordinarie taktiska logg och följs genom egna utvisningar i alla spelformer.
- Före avser upp till fem minuter innan beslutet; efter slutar vid nästa tränarbeslut eller aktuell klocka. Antal och tidslängd visas separat. Händelser vid beslutsklockan räknas till föreperioden. Framtida händelser och motståndarnas utvisningar räknas inte. Kort/ofullständigt underlag ger ingen jämförelse. Arkiverad rapport behåller sitt observerade utfall.
- Energi- och utvisningsråd länkar identifierade spelare genom gemensamma ID-hänvisningar, inklusive beslutets sparade bakgrund. Uppgifter utan identifierad spelare matchas inte på namn.
- Rapportens träningsgenväg öppnar befintlig uppföljning när ett fokus redan finns. Den skriver inte över beslutet. Ofullständigt registrerade spelformer ger inte skottbaserade taktiska råd.

`match-continuity.test.cjs` kontrollerar oförändrade order, sparning/laddning av ny brief, samma slumpstatus och matchdata under 250 produktionssteg med respektive utan observationsbrief, disciplinorderns faktiska attributavvägning, ID-länkar, tidsgränser, arkiv, återladdning, inaktuella knappar och skyddat träningsfokus. Befintliga tester för matchbrief, assistentråd och tränarbeslut används också. Detta är inte ett nytt fullmatchstest av alla visningslägen, en balanskalibrering eller visuell provspelning. Matchmotorns regler och slumpvikter ändras inte. Ingen separat meddelandeström eller obligatorisk paus införs.

Modern Dark behålls. Provspelning av läsbarhet och upplevd spelglädje återstår; lokal förhandsvisning har blockerats av webbläsarpolicyn.
