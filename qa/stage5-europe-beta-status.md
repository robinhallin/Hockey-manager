# Etapp 5 – delresultat, inte färdig Europaaktivering

Datum: 2026-09-26. Utgångspunkt: main dd815bcd4d689ef0c4e754556612a98bb3e2407a.

## Europeiska ligor

Ingen av de tre ligorna är en spelbar karriär i denna leverans. Att byta en statusflagga skulle inte skapa fungerande karriärer. Registrerade klubbar och förberedda scheman är inte ett verifierat karriärflöde.

Den nya klubbvisa rapporten i `data/europe/readiness.json` visar underlaget utan att flytta det till aktiva sparfiler:

| Liga | Källposter | Borttagna poster | Saknar nationalitet | Verifierad registrering |
| --- | ---: | ---: | ---: | ---: |
| Tjeckien | 0 | 0 | 0 | 0 |
| Schweiz | 413 | 0 | 411 | 0 |
| Finland | 515 | 22 | 3 | 0 |

22 borttagna finska poster räknas inte som aktiva kandidater i täckningsrapporten. Saknade kontrakt, positioner och attributunderlag visas per klubb. Ett publicerat statistikdeltagande räknas inte som bevis på ägande eller aktuell registrering. Två redan upptäckta identitetskrockar mot Sverige kvarstår för granskning; ingen automatisk sammanslagning görs.

### Kod som fortfarande måste integreras

- `createSchedule` grupperar endast SHL och HA; `simulateOtherGames` följer samma svenska omgångsnummer.
- `leagueStartPlayoffs` och `leagueAdvanceCups` förutsätter svenska play-in-serier, två slutspel och ett svenskt kval.
- Kalendern har svensk premiär, gemensamma omgångsdatum och svensk transferdeadline.
- Klubbval och klubbekonomi, registrering och spelaridentiteter behöver ett sammanhängande europeiskt karriärflöde.
- Minst två riktiga säsonger per ny liga måste testas med matcher, kontrakt, ekonomi, tabeller, cup, jobbbyte, export/import och återläsning innan aktivering.

### Källkontroll denna etapp

- Tjeckiskt offentligt truppunderlag finns på https://www.hokej.cz/tipsport-extraliga/roster . Direkt hämtning från arbetsmiljön returnerade HTTP 403. Ingen komplett tjeckisk import producerades och inga spelarposter har hittats på.
- National League har ett särskilt tvåmatchers play-in med sammanlagt resultat och en andra kvalificeringsväg: https://www.nationalleague.ch/media/cmegdmgp/modusnl_25-26.pdf . EV Zug beskriver 2026/27 års format som oförändrat: https://www.evz.ch/news/teams/men/2026/06/der-spielplan-2026-27-ist-da/ . Det kan inte ersättas med svensk bäst-av-tre utan att ändra tävlingen.
- Finland planerar en 14+10-struktur från 2027/28. Omställningen påverkar både bottenlag och fortsatt karriär: https://hc.tps.fi/fi-fi/article/uutiset/liiga-tiedottaa-uusi-1410-mallinen-sarjamuoto-kaynnistyy-kaudella-202728/1573/ . Detta räcker inte ensamt för att koda samtliga kvalregler.

## Betaleverans

0.1.0-beta.4 samlar etapp 1–4 med samma sparformat 0.2. Diagnostikexport innehåller nu mätantal och tidsöversikter för render, save, nextDay, nextDayAborted och aiMarket, utan fullständig karriärdata.

Windows-bygget körs för relevanta pull requests. Det bygger NSIS-installationsfilen, installerar den i en separat katalog och kör det befintliga speltestet mot den installerade körbara filen. Ett vanligt utvecklings-Electron-test godtas inte som installationsbevis. Leveransen kräver matchande version, tom fellista och exakt en installationsfil. BUILD-INFO.json anger testad revision, källrevision, Git-trädets hash, filstorlek och SHA-256 samt vilka ligor som faktiskt är spelbara.

Detta dokument är ingen godkänd Europaacceptans och påstår inte att etapp 5 är färdig.
