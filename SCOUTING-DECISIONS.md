# Scouting som beslutsunderlag

Granskningen fann tre konkreta luckor i det befintliga rekryteringsflödet: levererade rapporter beskrev främst kunskapsprocent, jämförelsen visade olika bästa roller i stället för en gemensam uppgift, och en namngiven truppkonkurrent kunde inte direkt jämföras med kandidaten.

Rapportleveransen använder nu samma daterade bedömningar som profilen. Första observationen beskriver relativa styrkor och svagheter med intervall. Senare observationer jämför upp till två ändrade bedömningsintervall med föregående underlag. Överlapp markeras; ändrad scoutbedömning tillskrivs inte säkert spelarutveckling. Uppdragets roll används när den passar spelarens positionsprofil. Äldre meddelanden skrivs inte om och inga extra meddelanden skapas.

Scoutmeddelandet har spelar-ID och öppnar rätt rapport i den gemensamma profilen. Rapportens egna alternativ är ID-länkade och kan läggas till tillsammans med kandidaten i befintlig jämförelse. Tidigare urval behålls; en full jämförelse kräver att användaren tar bort ett alternativ. Samma namn blandas inte ihop.

Jämförelsen kan bedöma alla kandidater för samma uppgift. Rollintervall använder den auktoritativa scoutingbedömningen. Fel positionsprofil och saknad egen observation anges uttryckligen. Egen trupp visas som exakt underlag; externa rapporter visar observatör och datum. Rollen sparas som ett valfritt presentationsfält; äldre sparfiler får standardvalet utan skapade observationer eller ändrade spelarvärden.

Tester: betald scoutbeställning, kalenderdagar till leverans, meddelandelänk, rolljämförelse, ny observation, profil/bakåt, sparning/laddning, äldre sparfil och fullt jämförelseurval. Dolda attribut ändras i testet utan att informationen får ändras före en ny observation. Befintliga scouting- och kunskapstester används också.

Detta är automatiserade arbetsflödestester och kodgranskning. Visuell provspelning och användartest av rapporternas beslutsvärde återstår. Modern Dark och befintlig observations-, budget- och förhandlingslogik behålls.
