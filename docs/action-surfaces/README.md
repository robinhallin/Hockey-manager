# Samtal, underlag och beslut

Ett namngivet spelarärende kunde öppna en tidigare vald spelare. `playerFollowupOpen` valde rätt `lockerUI.player`, men rumsrenderingen fortsatte läsa den gamla `clubhouseUI.player`. Öppningen väljer nu uttryckligen den namngivna spelaren i den synliga samtalsvyn. Samma regel gäller löftesunderlag. Saknade spelare öppnar ingen ersättare.

En explicit meddelandelänk lämnar också inkorgens tidigare beslutslista eller rapportfilter, så det begärda meddelandet faktiskt visas. Ett tidigare valt berättelsekort rensas före samtalet renderas.

## Gemensam presentation

- `action-surfaces.js`: en gemensam rubrik, kontext och stängningsknapp för utveckling, omklädningsrum, rekrytering, klubb och omvärld.
- `action-surfaces.css`: gemensamma material, färger, typografi, avstånd, fält, knappar, statusytor och tangentbordsfokus. Även medicinska matchbesked och dagssummeringar använder samma visuella grund.
- Samtalet får tydlig identitet, faktisk situation och svarsalternativ sida vid sida på större skärmar. Uppföljning och spelarnas befintliga minnen finns kvar nedanför.
- Inkorgens spelarbesked visar porträtt, namn, svarsstatus, meddelande och två fullständiga svarsalternativ. Smala skärmar prioriterar själva brevet när det öppnas.
- Arbetsstationernas underliggande dokument, tabeller och formulär använder samma ytor och kontroller.

Domänsystemen äger fortfarande besluten, löftena, samtalsspärrarna och sparningen. Ingen ny matchmotor, spelregel, sparversion eller utgivning införs.

## Verifiering

`action-context.test.cjs` återskapar fel spelare och dolt meddelande, samt kontrollerar saknade länkar, klassisk samtalsvy och namngiven löftesuppföljning under frånvaro. De första testerna misslyckades före rättningen.

Riktade regressioner för rum, samtal, träningsflöde, agenda, klubbeslut och samtliga berörda detaljverktyg passerar. En verklig träningsmatch till analysrummet ingår i kontrollen av rumsflödet.

`scripts/action-surfaces-browser.cjs` använder den ordinarie appen och synliga knappar. Kontrollen öppnar Olle Alsings ärende efter att Hugo Fransson valts, granskar att ingen karriärdag eller laguttagning ändras, tar ett riktigt samtal och kontrollerar att bara Olle påverkas. Ett namngivet meddelande öppnas från underlaget trots gammalt agendafilter. Ett faktiskt svar avslutar rätt ärende och lämnar den andre spelarens begäran obesvarad.

Samtliga fem riktiga detaljdialoger öppnas och stängs med Escape. Samtal granskas vid 1920, 1440, 1366 och 390 px; brev vid 1440, 1366 och 390 px; detaljdialoger vid 1440 och 390 px. Kontrollen verifierar ramar, horisontell passning, porträttens storlek, rubrikskala och innehållsavstånd. Samma kontroll ingår i Windows-jobbet `desktop/club-build-ui.cjs`.

Exempel: [samtal](conversation-1440.webp), [spelarbesked](message-1440.webp), [utvecklingsplan](development-1440.webp), [rekrytering](recruitment-1440.webp). Skärmbilderna kommer från en lokal testkarriär.

Den befintliga webbläsarkontrollen av alla 21 arbetsstationer, profiler och återgångar passerar också tillsammans med de nya flödena. Desktopens offlinepaketering inkluderar båda nya runtimefilerna.
