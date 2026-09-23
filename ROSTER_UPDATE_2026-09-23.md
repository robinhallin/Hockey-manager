# Truppuppdatering 23 september 2026

Startdatabasen har jämförts med samtliga 28 svenska klubbars truppsidor.
Daterade klubbesked avgör när aktuella truppsidor motsäger varandra.
[Ändringslistan](data/roster-update-2026-09-23.json) innehåller spelar-ID,
födelsedatum, från-/tillklubb, källor och datum för 52 ändringar.

## Vad som ändras

- 36 tillagda spelare, inklusive nyförvärv och listade juniorer.
- Nio nya lån mellan svenska starttrupper och tre utgående lån till
  Karlskrona, Wings och Lindlöven. Samma individ flyttas; inga kopior skapas.
- Linus Nässén och Elias Ekström finns bland kontraktslösa.
- Tex Williamsson är pensionerad och kan granskas historiskt, men inte tas ut.
- Felix Nilsson är registrerad utanför den svenska rekryteringsmarknaden.

Totalt: **362 SHL-spelare + 347 allsvenska spelare = 709**, sex verkliga
frispelare, fyra externa spelare och en pensionerad post. Totalt 720
källbundna identiteter. De 35 initiala lånen omfattar tre externa mottagare.

Exempel på tillagda nyförvärv:

| Spelare | Klubb | Daterat underlag |
|---|---|---|
| Oliver Wahlstrom | Djurgårdens IF | [15 september](https://www.difhockey.se/article/5apatlf-1lead/view) |
| Graeme Clarke | Frölunda HC | [8 september](https://www.frolundahockey.com/article/s8datl1-24601/view) |
| Pavol Regenda | HV71 | [17 september](https://www.hv71.se/article/ckvatli-3iaijd/view) |
| Markuss Komuls | HV71 | [8 september](https://www.hv71.se/article/a6uatl1-3iaijd/view) |
| Sami Niku | Linköping HC | [14 september](https://www.lhc.eu/article/rtgatl9-30c01/view) |
| Lukas Zetterberg | Västerås IK | [8 september](https://www.vik.se/article/ai8atl1-4a8i1/view) |
| Christian Felton | Kalmar HC | [9 september](https://www.eliteprospects.com/transfer/2026/09/09/christian-felton-in-a-confirmed-transaction-to-kalmar-hc/649145) |

## Datum, identiteter och sparning

Nya karriärer börjar 23 september med ett nytt genererat serieschema,
seniorpremiär 26 september och J20-start 24 september. Verkliga resultat
från september importeras inte. Starten kan inte flyttas tillbaka till
augusti efter att septembervärvningarna har importerats. Följande säsonger
behåller ordinarie kalender. Äldre sparningar behåller sina egna datum,
spelarutveckling, övergångar, kontrakt och statistik.

Leo Sundqvist, född 2007, är Brynäsforwarden på lån till Almtuna. Leo
Sundqvist, född 2005, är Skellefteåbacken på lån till Östersund. De har
olika ID, kontrakt och historik. Melvin Nilsson stannar i Linköping efter
klubbens återkallelse den 15 september. Edvin Hammarlund stannar på lån
i Örebro till september månads slut.

Externa lån går att öppna från spelarsökning och lånecentralen. Återkallelse
flyttar tillbaka samma spelarpost med historik och tillstånd bevarat.
Hockeyettans matcher simuleras inte; vyn anger att uppföljningsdata saknas.
William Håkanssons NHL-kontrakt med Carolina skiljs från Luleå som svensk
återgångsklubb. Ej publicerade lånevillkor och löneandelar markeras som
spelantaganden. Simon Carlssons minst en månad långa lån använder 17 oktober
som sista lånedag i spelet.

## Verifiering

- `swedish-roster-update.test.cjs`: samtliga 52 ändringar, dubbelnamn,
  externa lån, återkallelse en gång, pensionering, felaktiga importer,
  sparning/laddning och bevarade äldre karriärer.
- `swedish-roster-career.test.cjs`: faktisk spelvecka 23–30 september med
  Wahlstrom i kedjan, individuell träningsbelastning, två fullföljda matcher
  i produktionsmotorn, profilbesök under paus och återlästa matchrapporter.
- Befintliga tester för alla 28 laguttagningar, målvaktslån, kontrakt,
  dagsövergångar, J20, säsongsbyte och attributunderlag används fortsatt.
  Datum- och antalassertioner följer den nya startdatabasen. Historisk
  försäsong testas med ett uttryckligt historiskt kalenderunderlag.
- Kvottestet använder den befintliga förlustfria lagringskomprimeringen och
  verifierar att den större karriären återläses exakt. Exporten är vanlig JSON.
- `node scripts/build-player-evidence.cjs --check` kontrollerar att
  statistikkompletteringen kan återskapas identiskt.

Detta är automatiserade körningar och kodgranskning, inte visuell
provspelning i webbläsare. PR-kontrollerna redovisar slutligt regressionsresultat.

## Avgränsningar

Philip Lantz har inte lagts till: profilen gick inte att läsa och fullständigt
födelsedatum saknades. Alexander Proos och Johannes Neumann har verifierad
identitet men saknar verifierad historisk matchstatistik i underlaget;
de fälten visas som saknade och startbedömningen är osäker.

Nathan Staios provspel och Elliot Ekefjärds lån för en enstaka match räknas
inte som säsongsavtal. Fullständiga verkliga J20-, NHL- och AHL-trupper har
inte importerats i denna etapp. Felix Nilssons externa registrering är inte
en ny fullständig integration med den nordamerikanska matchsimuleringen.
Övriga ursprungliga statistikuppgifter återanvänds; denna ändring är ingen
ny individuell verifiering av varje äldre attribut eller statistikrad.
