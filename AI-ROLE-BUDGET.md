# Gemensamt utrymme för AI:s rollöften

## Vilket beslut tillförs?

En spelare kan vara tillräckligt bra för en stor roll utan att klubben har utrymme för ännu ett sådant löfte. AI måste nu också väga samman befintliga roller, väntande erbjudanden och framtida ankomster innan den värvar, förlänger eller flyttar upp en junior. När ansvar frigörs kan ett tidigare blockerat beslut bli möjligt igen.

## Kopplingen till matcherna

`aiRoleDemand` är gemensam för planering och AI:s befintliga uppföljning efter sex tillgängliga matcher:

| Roll | Utespelare, genomsnitt per match | Målvakt, kvalificerade starter per sex matcher |
|---|---:|---:|
| Nyckelspelare | 15 minuter | 4 |
| Ordinarie | 650 sekunder | 2 |
| Rotation | 6 minuter | 0 |
| Bredd/övriga | 2 minuter | 0 |

Detta bevarar AI:s befintliga trösklar för utespelare. Introduktionslöften i användarens kontrakt är ett separat system med sina befintliga villkor. För målvakter rättas också en inkonsekvens: om `promisedRole` saknas används `squadRole` både i planeringen och i faktisk uppföljning, i stället för att starter oavsiktligt få kravet noll.

Planeringsutrymmet är 180 forwardminuter och 120 backminuter per ordinarie match, motsvarande normal fem-mot-fem-hockey, samt sex planerade målvaktsstarter över sex matcher. Det är ett konservativt planeringsunderlag, inte en regel som hindrar andra positionsfördelningar i special teams eller som styr bytena i matchmotorn. En målvakts kvalificerade matchtid följer den befintliga gränsen 30 minuter.

## Åtaganden och återkoppling

- Samma aktuella och framtida truppunderlag som rekryteringen används. Spelare dedupliceras på ID.
- För väntande erbjudanden räknas den roll köparen erbjuder, inte säljarens tidigare roll. Flera bud för samma spelare räknas en gång med det största åtagandet. Kandidatens eget bud räknas inte dubbelt.
- Avtalade framtida ankomster räknas med sin framtida roll. Avböjda och utgångna bud slutar reservera utrymme.
- Fleråriga köp och uppflyttningar kontrolleras både nu och framåt; förlängningar följer rätt kontraktsperiod och behåller befintlig omprövning.
- AI:s klubbvy visar tre jämförbara rader under den befintliga delen **Truppplan & kontrakt**. Nuvarande och framtida utrymme visas samtidigt, och överbeläggning markeras **Överbokat**.
- Avslag får mängd, kapacitet och period i sin förklaring. Befintliga avtal skrivs inte om automatiskt, inte heller om de redan är överbokade. Ingen ny sparfilstruktur behövs.

Låneerbjudanden behåller sin separata rollprövning; befintliga spelare i det gemensamma truppunderlaget ingår med de roller AI:s ordinarie matchuppföljning använder.

## Kontroll och avgränsning

`ai-role-budget.test.cjs` verifierar att även den bäst bedömda kandidaten kan blockeras av summan, att faktisk övergång går igenom efter frigjort ansvar, att framtida bud använder köparens roll, att egna bud dedupliceras och att sparning/laddning bevarar beräkningen. Det testar också blockerad/återupptagen förlängning och junioruppflyttning, två konkurrerande målvaktslöften, tabellens överbokning och verklig missnöjesuppföljning när endast `squadRole` finns.

Befintliga tester för rollplan, interna AI-beslut, kontrakt, klubb-AI och rekrytering körs också. Den äldre budkonkurrensens testuppställning ger nu köparen ledigt rollutrymme, så att den fortsatt prövar ett genomförbart ekonomiskt överbud; kontrollerna av utfall, ägande och pengar behålls. Den interna testfilen omfattar tre faktiska säsongsövergångar med återladdning, inte tre fullständigt spelade säsonger.

Nästa steg är en taktisk fördelning av planerad istid mellan specifika kedjor och special teams. Denna etapp prövar om rollernas sammanlagda krav ryms; den ändrar inte matchuttagningen eller lovar att varje spelare automatiskt får rätt minuter.
