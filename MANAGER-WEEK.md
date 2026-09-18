# En sammanhängande spelvecka

Tränarkontoret → Påverka idag visar nästa match, sju verkliga kalenderdagar,
veckans träningsfokus, individuell belastning och nästa motståndare. Klick på
en dag öppnar dess befintliga kalenderprogram. Juniorernas senaste rapport
och befintliga beslut om A-träning, uppflyttning eller fortsatt bevakning visas
under veckan när ett underlag finns. Den gemensamma prioriteringslistan
behåller obligatoriska spelar-, avtals- och klubbärenden.

Efter en fullständig tävlingsmatch kan staben föreslå försvar, anfall eller
disciplin utifrån registrerade farliga lägen och utvisningar. Antal matcher
visas; små underlag beskrivs inte som trender. Valet startar spelets befintliga
träningsuppföljning. Det skapar inte fiktiva pass eller en prestationsbonus.
En aktiv uppföljning ersätts inte av ett dubbelklick.

Nästa steg visar datumet för ett möjligt fokuspass. Planeringsknappen använder
den riktiga träningskalendern och bevarar återhämtning, matchförberedelser,
matchdagar, genomförda pass och egna avvikande datumplaner. Ändras kalendern
uppdateras förslaget. Genomförandet sker först när användaren går vidare med
dagen som vanligt. Stabens återhämtningsansvar gäller fortfarande.

Motståndsunderlaget gäller nästa fastställda match och skiljer senaste
observerade spelidé under aktuell tränare från tränarens grundprofil.
Tidigare säsonger och ofullständiga rapporter räknas inte i resultatformen.
Rådet öppnar befintlig motståndsrapport och matchplan; det ändrar inte taktiken.

Tränarkontoret → Uppföljning visar beslutets datum, faktiskt genomförda pass,
före/efter per match och befintliga tidsjusterade mått per spelform. Inget
orsakssamband påstås utifrån en resultatförändring. Avslutade uppföljningar
kan ersättas med ett nytt fokus genom det befintliga arkiveringsflödet.

Ingen ny sparstruktur införs. Kalender, rapporter och `analysis.coachFocus`
är fortsatt sanningskällor. Visning och rådgivning drar inga slumptal och
flyttar inte tiden. Matchmotorn ändras inte.

`manager-week.test.cjs` verifierar faktiska dagsteg och träningsdeltagande,
kalenderkonflikter, dubbelklick, sparning/återläsning, motståndarunderlag,
säsongsbyte och visning under pausad match. Befintliga tester täcker även
kalender, träningscykel, juniorbeslut, delegering och navigation.

Visuell kontroll i en riktig webbläsare kunde inte köras i denna miljö;
webbläsarbinär saknas. Layouten använder kontorets befintliga rullningsyta
och en radbrytande dagöversikt.
