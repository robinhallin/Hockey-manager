# AI: förlängningar och juniorer i samma framtidsplan

## Beslutet

Att behålla en spelare och att flytta upp en junior använder samma begränsade truppplatser och löneutrymme som en värvning. Klubben måste väga kontinuitet och talangutveckling mot redan avtalade eller pågående ankomster. En misslyckad rekrytering kan göra en tidigare avvaktande förlängning aktuell igen.

## Granskning och ändring

Tidigare räknade förlängningar framför allt säkrade spelare i dagens trupp och färdiga framtida värvningar. Väntande efterträdare och egna återvändande lån kunde missas. Junioruppflyttning kontrollerade dagens lön, trots att beslutet ger minst två kontraktsår.

- Förlängningar använder nu `aiCommittedRoster`, samma underlag som AI:s rekrytering. Positionsgruppens planerade spelare dedupliceras, och klubbens kapacitetsregel gäller även när en ung spelare i ett utvecklingsprojekt annars prioriteras.
- Vid säsongsgränsen har kontrakt redan räknats ned och framtida värvningar aktiverats. Då räknas även avtal med ett kvarvarande år som säkrade för den nya säsongen.
- Junioruppflyttningar kontrollerar både dagens och nästa säsongs trupputrymme och löner. Väntande låneförhandlingar reserverar också dagens lön.
- En akademispelare med ett redan avlönat senioravtal belastar inte löneutrymmet en gång till när spelaren byter trupp.
- Avvaktande förlängningar får en sparad orsak: efterträdare, truppplatser, löneåtaganden, ekonomiprognos eller spelarens önskan om istid. Orsaken syns i klubbens befintliga beslutshistorik. Oförändrade orsaker skapar inte samma notis på nytt.
- Den befintliga 28-dagarsfristen för omprövning behålls. Ett avböjt eller utgånget bud kan därefter öppna för förlängning igen.

Spelaridentitet och befintliga avtal bevaras. En blockerad uppflyttning ändrar inte spelarens kontrakt, trupp eller ekonomi. Det enda tillkommande sparfältet är en valfri förklarande `reason` på ett befintligt kontraktsbeslut.

## Verifiering

`ai-internal-planning.test.cjs` kontrollerar faktisk förlängning efter en misslyckad rekrytering, cooldown, uteblivna dubbla notiser, sparad förklaring, korrekt bedömning efter kontraktsnedräkning, framtida löneutrymme, verklig junioruppflyttning, ingen dubbel lönekostnad och reserverade framtida platser. Dessutom körs tre riktiga `beginPreseason`-övergångar med kontroller av spelbara AI-trupper och återladdning. Dessa övergångar är inte tre spelade säsonger.

Befintliga tester för klubb-AI, kontrakt, marknadsåtaganden och säsongsflödet körs också. Förra etappens tre fullständiga säsonger återanvänds inte som ett testresultat för denna ändring.

## Kvarstående djup

Planerade platser och löner är sammanlänkade. AI har fortfarande ingen gemensam prognos för hur framtida istid ska fördelas mellan samtliga lovade roller, och kvalitet/åldersstruktur vägs fortsatt genom de befintliga separata behovsbedömningarna. Det är nästa steg i truppplaneringen.
