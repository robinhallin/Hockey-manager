# Återkommande formationsutfall

## Beslut och spelvärde
Behålla en kedja för mer prövning eller ändra kombinationen? Lagtrender visar nu om samma kombinations chansbalans återkommer över flera matcher och låter tränaren öppna matcherna bakom siffrorna. Summerad statistik och tidigare matchrapporter behålls.

## Underlag
Samma sparade formationsnyckel binder samman samma spelare och spelform oavsett kedjenummer. Endast avslutade, kompletta, icke avbrutna tävlingsmatcher räknas. Dubbletter av samma rapport räknas inte igen. Tid, farliga lägen och matchidentitet kommer från befintliga sparade formationsrapporter.

En signal kräver minst tre matcher med minst en minuts gemensam istid per match samt totalt tio minuter. Återkommande övertag/underskott kräver samma riktning i minst två tredjedelar av de kvalificerade matcherna och samma riktning i totalsiffrorna. Lika chansantal är neutralt. Om ett extremresultat drar totalsiffrorna åt motsatt håll blir signalen blandad. Kortare underlag får ingen signal.

Tolv kombinationer med mest istid visas i det befintliga urvalet (senaste fem/tio, säsong eller alla sparade). Varje rad har öppningsbara matchunderlag och länkar till exakta matchrapporter. Urvalet är fortsatt sparat; själva beräkningen härleds utan nya simuleringseffekter eller sparfältskrav.

## Begränsningar
Detta visar återkommande chansbalans, inte kausal effekt, spelarvärde eller motståndsjusterad prestation. PP/PK bedöms separat men deras chansbalans är inte ett mått på effektivitet. Formationer delar laghändelser. Högst befintliga arkivets 80 matcher kan användas. Individuella motståndare, matchning och medspelare måste vägas in av tränaren. Fullständig långtidsbalans är inte validerad av denna etapp.

## Kontroller
formation-evidence.test.cjs använder den faktiska formationsregistreringen som grund och testar återkommande utfall, extrema enstaka matcher, kort istid, ofullständiga/avbrutna rapporter, spelformer, dubbletter, sparning/återläsning och navigation till rätt rapport. Befintliga analysis och matches-workspace testas som regressioner.
