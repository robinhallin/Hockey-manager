# Hockey Manager · Beta 0.1.0-beta.1

Privat testversion för 64-bitars Windows 10/11, stor skärm, mus och tangentbord.

## Installera och börja spela

1. Packa upp betaarkivet. Kör `Hockey-Manager-0.1.0-beta.1-Windows-x64-Setup.exe`.
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
