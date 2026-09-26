# Hockey Manager · Beta 0.1.0-beta.7

Privat testversion för 64-bitars Windows 10/11, stor skärm, mus och tangentbord.

## Installera och börja spela

1. Kör `Hockey-Manager-0.1.0-beta.7-Windows-x64-Setup.exe`.
2. Välj installationsmapp och starta Hockey Manager från skrivbordet eller Startmenyn.
3. Välj **Starta ny karriär**, välj klubb och acceptera styrelsens uppdrag.
4. Börja med översikten, truppen och kedjorna. Fortsätt för spelets kalender framåt.
5. I matchen kan du pausa, ändra instruktioner och välja visningsläge. Återupptagna matcher börjar pausade.

Den första privata betan är inte kodsignerad. Om Windows blockerar filen: meddela projektägaren med exakt varning; stäng inte av antivirus eller andra skydd.

## Behåll din karriär

Spelet sparar automatiskt i `%APPDATA%\Hockey Manager\saves`, separat från installationen. Huvudfilen har kontrollsumma och ersätts först när en komplett ny fil är skriven. Senaste föregående sparning och upp till fem äldre kontrollpunkter per sparplats behålls. Kontrollpunkter tas vid första ändringen efter start, sedan högst var tionde minut.

**Sparfiler & inställningar → Återställ en automatisk säkerhetskopia** låter dig granska och bekräfta en återställning. En oläsbar fil skrivs inte över vid automatisk sparning. Vid uttrycklig återställning bevaras den skadade filen separat. Exportera gärna också en egen JSON-kopia till en annan disk.

För att flytta en befintlig webbläsarkarriär: exportera JSON-filen i det gamla spelet, välj filen under **Läs in en karriär** i Windows-betan och bekräfta efter granskning. Webbläsarens original ligger kvar. Samma sparformat används; spelets sparversion 0.2 är skild från appens betaversion.

Installera en kommande version över den gamla. Sparmappen raderas inte vid avinstallation. Automatisk uppdatering ingår inte ännu.

## Kontroller och hjälp

- **F1:** sparfiler, spelguide och felrapport; pausar en pågående match.
- **Ctrl+S:** spara karriären.
- **F11:** helskärm.
- **Ctrl+0:** återställ zoom. Använd menyn Visa för annan zoom.
- Klicka på spelarnamn för profil och använd Tillbaka för att återgå till arbetsvyn.

Spelet försöker pausa och spara innan fönstret stängs. Om sparningen misslyckas får du välja att stanna och exportera, eller avsluta utan ny sparning.

## Testa en sammanhängande spelvecka

Välj gärna 5–10 testare med olika klubbar och datorer. Börja med detta:

1. Starta/importera karriär. Ändra en kedja eller ett individuellt träningsfokus.
2. Öppna en profil från en filtrerad lista. Kontrollera att ditt urval finns kvar när du går tillbaka.
3. Fortsätt till nästa match, spela och granska matchrapport och istid.
4. Stäng under en pågående match. Starta igen och kontrollera paus, resultat och matchtid.
5. Fortsätt veckan, exportera och importera en sparfil. Prova en automatisk säkerhetskopia.
6. Spela vidare genom en säsong. Notera väntetider, upprepningar och beslut som saknar begriplig återkoppling.

Rapportera konkreta steg, förväntat och faktiskt resultat. Använd **Sparfiler & inställningar → Rapportera ett problem → Exportera felrapport**. Bifoga skärmbild och, om det behövs, en separat exporterad karriär. Inget skickas automatiskt.

## Omfattning

28 seniorklubbar i SHL och Hockeyallsvenskan. Nya karriärer använder trupper daterade 23 september 2026. Befintliga sparningar behåller sin spelvärld. Schemat är simulerat; verkliga matchresultat importeras inte. Attribut, ekonomi och utvecklingsprognoser är spelmodeller. Juniorer och Nordamerika är inte en fullständigt verifierad verklig truppdatabas.

Det här är en spelbar testversion, inte en färdig slutversion. Automatiska kontroller av installation, sparning och spelmekanik ersätter inte mänsklig provspelning, test på flera Windows-datorer eller återkoppling om balans och spelglädje.

## Rekrytering i den här uppdateringen

- Översikt visar verkligt antal målvakter, backar och forwards, vilka som är spelklara och hur många som är säkrade nästa säsong.
- Truppbehov skiljer dagens luckor från kontraktsplanering. Lägre attribut räknar inte bort en spelare. Stabens kvalitetsråd finns under Roller och kvalitet.
- Sök spelare, välj ett namn och följ Nästa steg för spelaren. Beställ rapport, kontrollera intresse och villkor och granska sedan ett eventuellt bud.
- Scouting visar pågående uppdrag och nästa observation. Färdiga rapporter kan öppnas därifrån eller från Översikt.
- Bevakning samlar sparade kandidater. Affärer samlar köp, försäljningar och lån.

Installera den nya versionen i samma mapp som tidigare. Karriärerna ligger kvar i programmets datamapp. Exportera gärna din karriär via inställningarna före uppdateringen.

## Nytt i Beta 0.1.0-beta.3

- Översikten samlar säsongens historier, press och supportrar. Stab & uppföljning visar konkreta beslut, aktuell truppstorlek och pågående arbete utan extra undermenyer.
- Taktik & laguttagning visar fyra kedjeisar, tre separata backpar och en bänk. Dra mellan platser eller använd Byt och Välj. Reserver och spelare utanför matchtruppen visas var för sig. Matchtruppen låses fortfarande vid nedsläpp.
- Powerplay & boxplay visar PP1, PP2, BP1 och BP2 på samma sida. Dra mellan enheterna eller välj spelare med knapparna.
- Nyckelspelare förväntar sig kedja/backpar 1–2, ordinarie högst tredje enheten och breddspelare kan acceptera fjärdekedjan. Bedömningen bygger på verkliga byten, rotation över flera matcher och medicinska undantag. Ett kort byte i förstakedjan räcker inte.
- Pågående äldre introduktionslöften för utespelare får en ny period med placeringsbaserade krav. Det tidigare underlaget arkiveras. Separata uttryckliga minutlöften och målvaktslöften behåller sina villkor.
- Matchbetyg visas med en decimal, 0,0–10,0. Truppens Snittbetyg visar bedömda tävlingsmatcher för aktuell klubb och säsong. Betyg utan tillräckligt underlag saknas i snittet; redan borttagna gamla rapporter går inte att återskapa.


## Nytt i Beta 0.1.0-beta.5

- Historiska matchrapporter behåller matchens egna händelser och spelarbedömningar.
- Rekryteringens motbud, accepterade villkor och ekonomiska prognos följer samma affär till registreringen.
- Akademirapporter summerar hela säsongens junior-, senior- och låneistid och fryses vid säsongsskiftet.
- Dagsstegets faktiska bearbetningstid registreras. Felrapporten innehåller nu antal mätningar, senaste, genomsnittlig och längsta tid, även för avbrutna försök.
- 80 matchpar har granskats; kvarstående skillnad mellan visad motor och bakgrundsmotor vid hög press följs upp. Visningslägena gav samma matchförlopp i separat kontroll.

### Europeiska ligor är fortfarande inte spelbara

Schweiz går att välja som en separat National League-karriär med 14 klubbar och 412 verkliga spelare från ligans underlag. Karriären börjar 1 augusti med fem träningsmatcher. Grundserien har 52 matcher per klubb, tvåmatchers play-in på sammanlagda mål, en andra chans för förloraren i 7–8 och slutspel i bäst av sju. Starta en ny karriär och välj National League. Svenska sparfiler behåller sin värld.

Betans schweiziska värld omfattar endast högstaligan. Swiss League och nedflyttning ingår inte. Importlicenser simuleras inte eftersom registreringsunderlag saknas. Nationalitet som saknas visas som okänd. Kontrakt, löner, klubbresurser och transferfönstret är spelantaganden; alla belopp visas i SEK. Schemat är genererat inom säsongsfönstret 15 september–1 mars, inte det officiella matchschemat. Vid lika poäng används spelets målskillnad. Spelarlistan är inte ett verifierat registreringsregister. Spelarnas källor och osäkerhet visas i profilerna.

Tjeckien och Finland är fortfarande förberedda data. Etapp 5:s samtliga europeiska ligor är därmed ännu inte färdiga.

## Nytt i Beta 0.1.0-beta.6

Välj **Matchvy → 3D · test** ovanför rinken för den första 3D-versionen.
TV och Överblick visar samma match med olika perspektiv. Klubbfärger,
skridskor, klubbor, målvaktsbenskydd och målburar visas i 3D. Puckförarens
namn visas över spelaren; klick på en spelare pausar och visar uppgiften.
Matchklocka, spelval, statistik och repriser kommer från befintlig matchmotor.
Välj 2D när som helst. Om grafiken inte stöds visas 2D med ett meddelande.

Detta är en grafisk prototyp med enkla procedurmodeller, inte färdig
spelaranimation. Pucken följer motorns plana koordinater; puckhöjd,
kontaktanimationer, individuell målvaktsanimation och förbättrad hockey-AI
återstår. Kameraval gäller den aktuella spelsessionen. Ligautbyggnaden är pausad.

## Nytt i Beta 0.1.0-beta.7

3D-spelarnas skär följer faktisk förflyttning. Ben, knän och armar rör sig
separat; passare och skyttar följer upp pucksläppet med klubban. Puckförarens
kroppsposition låter klubbladet möta pucken utan att puckbanan ändras.
Målvakter tittar mot pucken, förflyttar sig med korta skär och går ner i en
låg blockeringsposition vid ett annalkande skott. Det är en räddningsrörelse,
inte ett besked om skottet räddas.

Välj **Kamera → Följ pucken** för en närmare vy. TV och Överblick finns kvar.
Även repriser använder de inspelade rörelsedata som den aktuella matchen gav.
Äldre sparade repriser fungerar, men saknar de nya rörelsedetaljerna.
Puckhöjd och avancerade kroppskontakter återstår; spelarmodellerna är fortsatt enkla.
