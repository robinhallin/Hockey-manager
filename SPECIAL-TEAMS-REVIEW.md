# Beslut och uppföljning i special teams

## Tränarens val
Ändra PP-/PK-enhet, spelsystem eller agerande vid puckvinst och följ sedan lagets faktiska spel i rätt numerära situation. Underlaget hjälper tränaren att välja vilka instruktioner och spelarkombinationer som är värda fortsatt prövning.

## Genomförande
Befintliga ändringshandlers registrerar spelarval, PP-system, PK-system och kontringsinstruktioner. Matchmotorn använder samma ordinarie special teams-plan som tidigare. Spelarändringar pausar en rullande match. Ogiltiga och oförändrade val skapar inga extra beslut; samtidiga ändringar grupperas.

Varje beslut sparar separata totalsiffror för PP och PK. Nästa tränarbeslut avslutar båda jämförelseperioderna, även om nästa beslut gäller annan taktik. Rapporterna visar speltid, skottförsök och farliga lägen före/efter, med eget lag först. Minst tre minuter i respektive spelform på vardera sidan och fullständigt registrerat underlag krävs för jämförelse av takten. Noll sekunder ger ingen påhittad effekt.

Uppföljningen syns i special teams-vyn, coachpanelens tidigare beslut och den sparade matchanalysen. Äldre pausade matchers saknade PP-/PK-baslinje markeras som saknad. Spelarnamn, plan och statistik följer med sparning och återläsning.

## Avgränsning
Underlaget gäller hela lagets PP eller PK, båda enheterna sammanräknade. Det skiljer inte 5-mot-4 från 5-mot-3 och bevisar inte kausal effekt. Tidigare kombinationsstatistik och matchmotorns regler behålls. Automatisk rotation får ingen egen beslutspost. Längre jämförelser över flera matcher återstår.

## Kontroller
special-review.test.cjs kontrollerar styrkeseparering, riktiga spelar- och systemval, minimitid, avslutade perioder, sparning/återläsning, faktiska motorplaner och äldre saknad baslinje. tactical-review, lineup-review och roster-depth är regressioner för matchfortsättning, övriga tränarbeslut, matchtrupp, medicin, lån och sparning.
