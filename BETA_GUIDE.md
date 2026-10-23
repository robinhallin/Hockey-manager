# Hockey Manager · Beta 0.1.0-beta.8

Testversion för 64-bitars Windows 10/11, mus och tangentbord.

## Hämta rätt version

Använd den versionsmärkta nedladdningen under [GitHub Releases](https://github.com/robinhallin/Hockey-manager/releases). En kandidat i Actions är inte en publicerad beta. Kontrollera att release, installerare och spelets F1-sida visar samma version. BUILD-INFO.json identifierar exakt källrevision, genomförda installationstester och installerarens SHA-256; SHA256SUMS.txt låter dig kontrollera filen.

1. Exportera din nuvarande karriär före uppdateringen.
2. Kör `Hockey-Manager-0.1.0-beta.8-Windows-x64-Setup.exe`. Installera över tidigare version i samma mapp.
3. Starta från skrivbordet eller Startmenyn. Välj Fortsätt eller Starta ny karriär.
4. Välj klubb, acceptera styrelsens uppdrag och välj riktning för säsongen.

Betan saknar kodsignering och automatisk uppdatering. Vid en Windows-varning: notera den exakta texten och rapportera; stäng inte av antivirus eller andra skydd.

## Din första spelvecka

Spelet öppnas i klubbhuset. **Kom igång: din första vecka** på kontoret öppnar introduktionen i rummets hjälpvy. Därifrån går du direkt till rätt arbete utan att byta gränssnitt. Klubbhusets rum är: kontor, trupp, taktik, utveckling, rekrytering, klubb och värld. Klicka på en station för att arbeta där. Att besöka ett rum gör inte jobbet automatiskt: träning och utveckling sker när kalendern går vidare.

1. **Taktik → Kedjor & matchplan:** kontrollera spelklara spelare, målvakt, kedjor och special teams.
2. **Truppen → Träning:** planera belastning och återhämtning. Kalendern visar när nästa match spelas.
3. **Avsluta dagen/Fortsätt:** driver kalendern framåt. Besvara obligatoriska ärenden först; frivillig kontraktsplanering behöver inte stoppa dagen.
4. Spela första träningsmatchen. Pausa för att fatta beslut; återupptagna matcher startar pausade.
5. Läs matchrapporten och istiden, följ upp belastningen och välj nästa träningsfokus. Bedöm utveckling över flera matcher.

Rekrytering: börja med truppbehov, välj en kandidat och följ **Nästa steg för spelaren**. Scouting kostar tid och pengar och startar först när du bekräftar. Ej bedömd betyder att underlag saknas, inte att spelaren är dålig.

Kontraktsplanen räknar egna avtal som behöver en plan. Inlånade och spelare med framtida avtal redovisas separat. Planer är inte bindande kontrakt.

## Sparning och återställning

Spelet sparar automatiskt i `%APPDATA%\Hockey Manager\saves`, separat från installationen. Senaste föregående sparning och upp till fem kontrollpunkter per sparplats behålls. Sparmappen raderas inte vid avinstallation.

**Sparfiler & inställningar → Återställ en automatisk säkerhetskopia** låter dig granska innan du bekräftar. Exportera gärna en egen kopia. En oläsbar sparning skrivs inte över automatiskt.

För att flytta från webbläsaren: exportera JSON-filen där, välj filen under **Läs in en karriär** i Windows och bekräfta efter granskning. Webbläsarens original finns kvar. Sparformatet 0.2 är skilt från appens betaversion.

F1 öppnar hjälp och sparfiler, Ctrl+S sparar, F11 växlar helskärm och Ctrl+0 återställer zoom. Menyn Visa erbjuder zoom. Spelet försöker pausa och spara före stängning; misslyckad sparning ger möjlighet att stanna och exportera.

## Rapportera problem

Öppna **F1 → Rapportera ett problem**, fyll i steg, förväntat och faktiskt resultat och exportera felrapporten. Skapa sedan ett [betafel på GitHub](https://github.com/robinhallin/Hockey-manager/issues/new?template=beta-bug.yml) och bifoga rapporten (GitHub-konto krävs).

Rapporten innehåller version, exakt bygge, klubb, speldatum, vy/rum/station, skärmstorlek, felindikatorer och tidsmätningar. Inget skickas automatiskt. GitHub-ärenden är offentliga: undvik personuppgifter. Sparfil är frivillig och exporteras separat.

Vid sparförlust, blockerad kalender eller upprepade krascher: sluta spela den berörda karriären, behåll originalfilen och rapportera innan du provar återställning.

## Omfattning och kända begränsningar

- 28 klubbar i SHL/Hockeyallsvenskan samt 14 klubbar i en separat schweizisk National League-karriär.
- Schweiz: 52 grundseriematcher, play-in och slutspel. Swiss League, nedflyttning och importlicenser ingår inte. Ekonomi i SEK, genererat schema och förenklade kontrakts-/registreringsregler.
- Tjeckien och Finland är datapaket, inte spelbara ligor.
- Nya trupper är daterade 23 september 2026. Befintliga karriärer behåller sin värld. Scheman, attribut, ekonomi och utveckling är spelmodeller.
- Juniorer och Nordamerika är inte fullständigt verifierade verkliga truppregister.
- Matchen använder den aktuella 2D-vyn. Äldre instruktioner om 3D gäller inte denna version.
- Balans, långsiktigt djup och spelglädje behöver mänsklig provspelning. Automatiska tester bevisar inte att varje dator eller karriär är felfri.

## Pilot före större beta

Börja med två testare på olika Windows-datorer, därefter 5–10 på samma bygge. Testa ren installation och uppgradering, en sammanhängande spelvecka, stäng/återuppta match, export/import och återställning på en testkarriär. Prova offline, 1366×768 och 1920×1080 samt Windows-skalning 100/125/150 %. Rapportera väntetid och beslut som är svåra att förstå.

Starta inte större testomgång vid sparförlust, kalenderstopp eller reproducerbar krasch. Mänsklig pilot och verklig Windows-skalning kan inte ersättas av CI:s fönster- och zoomtester.
