# Sammanhängande datorarbetsytor

Utgår från båda användardokumenten (Hockey Manager-visionen och Spelare). Presentationen ska hjälpa tränaren att jämföra egenskaper och fatta beslut utan att dölja osäkerhet, medicinska hinder eller ekonomiska konsekvenser. Denna etapp ändrar arbetsytorna, inte spelardatabasens faktaunderlag eller matchbalansen.

- Gemensam rubrik-, tabulator- och sektionshierarki för datorvyerna. Kompakta sidhuvuden, nyckeltal och lokala flikar. Matchens direktsändning behåller egen layout.
- Matchförberedelser: åtta befintliga fungerande order i fyra namngivna grupper. Reglage och avvägningar intill varandra. Samma ändringsfunktioner, matchlogik och sparning.
- Stab: truppbehov, förstärkningar/löften och träning/taktik visas separat. Alternativen ligger jämförbart bredvid varandra. Tillbaka återställer vald arbetskategori.
- Rekrytering: prioriterade behov och konkreta rollsökningar i tabell. Förklarar att samma spelare kan vara alternativ för flera roller. Befintlig behovssortering och beräkning bevarad. Direkt väg till stabens jämförelse; introduktionshjälp kan öppnas vid behov.
- Juniorer: träningsplan och bedömning får företräde. Uppflyttning, återgång och lån samlas i öppningsbar sektion; alla villkor och ekonomiska konsekvenser finns kvar. Attribut och matchhistorik kvar.
- Special teams: namngiven sida, begränsad rinkstorlek och kompakt spelarval. Alla fyra enheter, formationsval och riktiga spelarbyten kvar.
- Personal: kompakt jämförelsetabell och budget. Låsta åtgärders förklaringar finns på knapparna och i en samlad hjälp längst ned, istället för över sidhuvudet.
- Handlingsbesked rensas vid byte av arbetsyta, klubb-/utvecklingsunderflik och junior. De ligger kvar vid normal omritning. Beslut, uppdrag, avtal och rapporthistorik raderas inte.

## Kontroll

Godkända befintliga testfiler: button-logic, club-workspace, desktop-workspace, development-workspace, manager-feedback, match-centre och recruitment-hub. Matchcentertestet avslutar en faktisk 2D-match och kontrollerar order, byten och statistik.

workspace-clarity.test.cjs kontrollerar beskedens livslängd, verklig klubbpolicy, scoutinguppdrag, rollsökning, juniorval, stabsflikens tillbaka-navigering samt taktiska ändringar genom sparning och återläsning.

Visuell webbläsarkontroll utförs på den publicerade versionen; lokal webbläsaranslutning är blockerad i arbetsmiljön.

## Kvar

Detta är en gemensam struktur och en riktad omarbetning av de sex rapporterade vyerna. Alla övriga delvyer behöver fortsatt kvalitetsgranskning. PDF-kraven på verifierad verklig spelardata och balans över långa karriärer är inte färdiga genom denna UI-etapp. Den ändrar inte kontraktsregler, rollkrav eller balans för att få vyn att se bättre ut.
