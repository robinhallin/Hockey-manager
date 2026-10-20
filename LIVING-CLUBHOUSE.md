# Det levande klubbhuset

Klubbhuset är den genomgående standardpresentationen för en anställd tränare.
Rummet fyller skärmen utan den gamla sidomenyn. Det är en lokal, offline-renderad 3D-miljö
ovanpå den befintliga karriären. Ingen separat simulering eller ny matchmotor.
Arbetsytor öppnas som en breddningsbar panel ovanpå miljön. Rummets canvas och
grafikresurser bevaras när samma rum ligger bakom arbetsytan. Stäng med Escape
eller Till rummet. Matchen har kvar sin egen fullständiga bildyta.

## Rum och handlingar

- **Tränarkontoret:** animerad tränarfigur, taktiktavla med aktuella spelarnamn
  när en uppställning finns, skrivbord med inkorg, scoutinghörna, klubbledning,
  personligt matchspår, verkliga beslutsärenden och kalenderns tidskontroller.
- **Omklädningsrummet:** en numrerad plats för varje spelare i den aktuella
  A-truppen. Klicka på figuren eller välj spelaren i listan. Aktuell roll,
  trivsel, förtroende, senaste istid, befintliga löften och problem visas.
  Skadade och landslagskallade spelare har en tom plats och faktisk frånvarotext.
- **Träningshallen:** en visuell väg till träningsplan, kedjor, juniorer,
  medicinskt team och assistentens uppföljning. Figurerna hämtas från tillgängliga
  spelare i truppen. Deras animation är miljögestaltning; träning följer kalendern.
- **Scoutkontoret:** analysstationer, rapporter, truppplanering, spelarsök och avtal.
- **Klubbledningen:** mötesbord, klubbens riktning, ekonomi, personal och tränarkarriär.
- **Medierummet:** presspodium och kameror med vägar till hockeyvärlden, ligor,
  landslag och NHL. Inga fiktiva nyheter eller scoutresultat skapas av miljön.

Alla sex rum nås från samma rumsnavigation. Alla områden öppnar hela spelets
navigation, inklusive huvudmeny, sparfiler och ett uttryckligt klassiskt tabelläge.
Kamera växlar mellan närbild och överblick. Figurer har ansiktsdetaljer, kläder,
andningsrörelse och gånganimation; rummen har rundade möbler, utrustning och belysning.
Omklädningsrummets stationer följer väggarna i en U-form runt en öppen mittgång.

Klicka på fri golvyta för att flytta tränarfiguren. I omklädningsrummet hålls
tränaren i gångutrymmet framför platserna. En spelarmarkering flyttar tränaren
mot spelaren. Rumsbyten är omedelbara för att hålla det dagliga spelandet snabbt.
Figurerna är stiliserade, procedurella illustrationer, inte verkliga porträtt.
Spelarnamn och ID hämtas från karriären. Platssiffran är en stationsmarkör när
spelaren saknar registrerat tröjnummer.

## Beslut och konsekvenser

Kontoret kan nu ta emot en faktisk spelare när ett svar väntar, en daterad
avstämning är här eller assistentens underlag motiverar ett samtal. Tillgänglighet,
aktuellt klubbägarskap och samtalens väntetid gäller. En vald gäst stannar under
samtalet; efteråt visar återkopplingen den faktiska förtroendeförändringen.
Samtalsjournal och uppföljning använder karriärens befintliga sparade historik.
Ett informellt samtal besvarar aldrig ett separat obligatoriskt beslutsärende.

Dagens runda samlar aktuella ärenden och räknar dem per rum. Underlagen hämtas
från befintlig agenda och försvinner enligt sina ordinarie regler. Nästa händelse
använder kalenderns befintliga stopp före matcher, sista svarsdagar och beslut.
Att läsa rundan flyttar ingen tid. Datumavstämningar avslutar inte istidslöften.

Träningshallens spelare rör sig i avgränsade övningsytor. Återhämtningsdagar och
reducerad rörelse stänger av skridskoövningen. Gester, hållning och ljus följer
dagens läge; animationen delar aldrig ut träningseffekt eller driver matchmotorn.

Samtalsknapparna anropar ordinarie `socialTalk`, inklusive förtroendeeffekt,
relationsmodell, historik, uppföljning, sparning och tre matchers väntetid.
Inga extra bonusar, nya löften eller egna sociala poäng delas ut av rummet.
Frånvarande spelare, utbytta spelar-ID, ej vald spelare, fel rum och pågående
match kan inte användas för att kringgå samtalsreglerna. Övriga objekt leder
till respektive befintliga arbetsyta med en tydlig väg tillbaka till rummet.
Pressärenden visas i kontoret och utvecklade press/historievyer behålls.

Att öppna ett rum, läsa underlag, flytta en figur eller byta utseende förbrukar
ingen dag och ändrar inte uppställning, pengar, attribut eller löften.
Fortsättknappen och kalenderns ordinarie regler driver fortfarande tiden.

## Tillgänglighet och livscykel

Objekt och spelare har riktiga tangentbordsåtkomliga HTML-knappar över scenen.
Spelarlistan ger åtkomst även där tätt placerade etiketter kan överlappa.
Samtalets svar får en egen sparad återkopplingsruta. Arbetsvy ger direkt tillgång
till samtliga befintliga tabeller och fördjupningar. Även övriga huvudsidor
behåller en väg tillbaka till klubbhuset.

WebGL-fel ger ett textbaserat alternativ med samma objekt och handlingar.
Renderingen pausas i bakgrunden, begränsas till 30 bilder/s och respekterar
reducerad rörelse. GPU-resurser och händelselyssnare släpps vid varje rumsbyte
och när klubbhuset lämnas. Samma rum återanvänder geometrin och sitt grafiksammanhang
över arbetsytor. CSS anpassar bild och interaktionspanel till smalare skärmar.
Arbetsytor har begränsad höjd, egen rullning och tangentbordsfokus inom panelen.

Figurens hudton, hår, klädsel och valet mellan rum/arbetsvy sparas lokalt på
enheten. Karriärnamn, relationer, samtal och alla spelbeslut sparas i den vanliga
karriärfilen. Gamla sparfiler behöver ingen migrering. Rumsposition och vald
spelare är tillfällig presentation och följer inte med exporterade sparfiler.

## Verifiering

`node --test living-clubhouse.test.cjs` kontrollerar verklig trupp, skrivskyddad
visning, sex rum, bevarade beslut, samtal, väntetid, frånvaro, ogiltiga/stale
handlingar, gamla arbetsytor, kosmetik och sparning/omladdning.

`scripts/clubhouse-browser-checks.cjs` körs sist i Windows/Electron-flödet
`desktop/club-build-ui.cjs`. Det kontrollerar riktig WebGL-rendering, taktiktavla,
rumsdörr, spelarmarkering, faktiskt samtal och svar, träningshall, återvägar,
utseende, bibehållen canvas, arbetsvy, diskreload och responsiva bildytor. Skärmbilder 70–75 sparas
som CI-artefakter för visuell granskning. Den tidigare långa skrivbordsregressionen
kör uttryckligen i arbetsvy för fortsatt täckning av spelets analytiska skärmar.
