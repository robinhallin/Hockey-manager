# Gemensam avslutsbedömning

Egna matcher och bakgrundsmatcher använder nu `StudioHockey.evaluateShot` för målchansen vid ett avslut. Den fullständiga motorns formel har flyttats utan att ändra dess resultat. Funktionen använder avslut, puckkontroll, kyla, målvaktsattribut och lägesinformation. Den varken slumpar eller ändrar spelvärlden.

I egna matcher mäts läge, press, skymning och målvaktsplacering av den rumsliga simuleringen. Bakgrundsmatcher uppskattar läge och press från spelarna på isen, numerärt läge och aktuell spelstil. Ett kontringslag kan få närmare och mindre pressade avslut mot aggressiv forecheck. Det är fortfarande två olika sätt att skapa chanser, inte en identisk matchmotor.

Bakgrundsmatcher behandlar registrerade skott på mål. Den villkorliga målchansen används därför direkt; sannolikheten att träffa mål appliceras inte ytterligare en gång. Returskott kan bara följa en verklig räddning, med högst en retur per anfall. Målvaktens returkontroll och plock/stöt påverkar sannolikheten. Returen blir ett nytt registrerat skott med samma avslutsmodell.

## Beslut och återkoppling

Motståndsrapporten visar ett utfällbart underlag för avslutskvalitet från de senaste registrerade bakgrundsmatcherna: skott, farliga avslut, returer, mål och modellens summerade målchanser. Tränaren kan väga skottmängd mot kvalitet inför valet av försvarsspel och press. Underlaget beskriver uttryckligen uppskattningar och omfattar bara skott på mål; det ska inte jämföras direkt med ett mått över samtliga skottförsök.

Bedömningen sparas med matchrapporten och klubbens befintliga historik. Gamla matcher fylls inte ut med påhittat underlag. Ofullständiga rapporter utesluts. Straffavgöranden och den befintliga reservlösningen för extremt långa slutspelsmatcher ingår inte i kvalitetsunderlaget.

## Kontroller och gränser

- Befintliga testfall för riktiga avslut, målvakter, puckflykt och äldre pågående matcher kontrollerar att utdragningen bevarar den fullständiga motorn.
- Den nya integrationstesten följer den gemensamma funktionen genom riktiga bakgrundsmatcher och stämmer av skott, mål och summerad målchans, determinism, engångsbokföring och återlästa sparfiler.
- Två grupper om 24 matcher jämför målvakters faktiska returer vid svag respektive stark returkontroll och plock/stöt.
- Säsongstestet kontrollerar tabeller, spelarstatistik, slutspel och säsongsövergång efter ändringen.

Nästa grundarbete är gemensam chansuppbyggnad, regelhantering och byten. Denna etapp förenar avslutsbedömningen men gör inte bakgrundsmatcher rumsligt identiska med egna matcher. Numeriska balansgränser är skydd mot grova fel, inte ett bevis på perfekt sportslig realism.
