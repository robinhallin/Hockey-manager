# Spelarresor, kalenderrytm och klubbbygge

Den här ändringen knyter befintliga beslut till längre förväntan och minne.
Matchmotorn och kalenderns dagssimulering förblir de befintliga systemen.

## Spelarresor

- Översikten visar pågående personliga historier och en registrerad milstolpe.
  Tränaren kan välja en egen spelare att diskutera en provperiod med redan under
  försäsongen. Provperioden bedöms först i tävlingsmatcher.
- ”Öka ansvaret” i en genombrottshistoria betyder nu minst åtta minuter i tre av
  fyra tillgängliga tävlingsmatcher. Valet avslutar inte längre historien direkt.
  Laguttagningen är tränarens ansvar. Kontraktsrollen och andra löften består.
- Uppföljningen använder historiesystemets befintliga personliga reaktioner,
  medicinska undantag och spärr mot dubbla matchregistreringar. En genomförd och
  en utebliven satsning får olika sparade utfall och förtroendereaktioner.
- En gemensam tidslinje på spelarprofilen samlar historiekapitel, samtal för
  följda spelare, kaptensbesked, fadderbesked, undertecknade förlängningar,
  ankomster, avgångar och faktiska matchmilstolpar.
- Första matchen och första målet avser det som registreras under denna
  tränarkarriär, inte ett påstående om verkliga spelares karriärdebut.
  Unga spelare och valda huvudpersoner följs; alla veteranmatcher ger inte notiser.
- Tidslinjen tillhör tränarkarriären och använder stabila spelar-ID:n, även om
  spelaren eller tränaren byter klubb. Högst 200 spelare och 40 händelser per
  spelare sparas. Äldsta inaktiva spelare kan gallras vid gränsen.
- Äldre matcher och samtal återskapas inte. Fullständiga tävlingsrapporter krävs
  för nya matchmilstolpar; ofullständiga, avbrutna och vänskapsmatcher räknas bort.

## Klubbbygge

Klubbbygget väljs i Styrelsen eller under den första säsongsplaneringen och
visas löpande på Översikt. Tränaren namnger projektet och väljer 1–3 egna
spelare. Lånade spelare ingår inte i den valbara stommen.

| Projekt | Period | Årets etapp |
| --- | --- | --- |
| Nästa generation | Tre säsonger | Minst två utvalda (eller den enda valda) når 6, 12 respektive 18 matcher med minst åtta minuter; målvakter 30 minuter. Ålder högst 23 vid projektstart. |
| En stomme att tro på | Tre säsonger | Minst två utvalda (eller den enda valda) når tolv matcher med minst tolv minuter; målvakter 30 minuter. Alla utvalda är kvar i A-truppen vid slutbedömningen. |
| Sista stora satsningen | Två säsonger | Topp fyra i grundserien med en utvald erfaren stomme (minst 30 år vid projektstart). Istid visas som underlag. |

Samtliga etapper kräver lönekostnad inom ramen under den observerade perioden.
Minst tolv fullständigt registrerade tävlingsmatcher och fjorton observerade
dagar krävs för styrelsens projektbedömning. För spelarprojekten krävs även
tillräckliga tillgängliga matcher för det utlovade ansvaret. Giltig frånvaro
räknas bort. Saknat underlag ger ingen extra bedömning.

Projektet väger tio procent av den slutliga säsongsbedömningen när underlaget
räcker; de ordinarie målen väger tillsammans nittio procent. Mellanliggande
styrelseavstämningar påverkas inte av detta extra projektbetyg. Detta anges i
projektväljaren innan åtagandet ingås.

En försäljning av en utvald spelare eller en värvning på samma positionsgrupp
visar projektkonsekvensen i det befintliga affärsunderlaget. Sex matcher,
avgångar och återkommande budgetöverskridanden ger daterade avstämningar.
Årsutfall sparas och nästa säsong fortsätter samma projekt. Projektet stannar hos
arbetsgivaren via befintlig klubbarkivering. Ett projekt kan avslutas vid en
säsongsgräns; tidigare utfall finns kvar. Inga spelarattribut ändras av valet.

## Kalenderrytm

- ”Till nästa relevanta händelse” finns på Översikt och Kalender. Det vanliga
  Fortsätt fortsätter att flytta en dag i taget.
- Valbara stopp: skador, affärsbesked, scoutrapporter, spelarhistorier och
  projektavstämningar. Inför matcher kan tränaren välja dagen före eller själva
  matchdagen. Inställningarna sparas.
- Obligatoriska samtal, medicinska beslut, sista svarsdagar i beslutslistan,
  pågående matcher, säsongsplanering och säsongsslut stoppar alltid. Läge för
  pågående förhandling skiljs från ett bud som behöver svar.
- Varje steg går genom calendarContinue och samma träning, ekonomi, AI och
  sparning. Ingen match startas eller simuleras av framflyttningen. Högst fjorton
  kalenderdagar körs per omgång, och användaren kan stoppa mellan dagsstegen.
- Gränssnittet låses under bearbetningen; stoppknappen ligger utanför låsningen.
  Ett karriärbyte eller fel avbryter körningen. Ett eventuellt delvis genomfört
  felande dagssteg körs aldrig om automatiskt.
- En samlad rapport visar framflyttade dagar, rapportantal, stopporsak och
  öppningsbara meddelanden. Rapporterna ligger kvar i den ordinarie inkorgen.
  ”Granskat – fortsätt vidare” kan passera en valfri avstämning, aldrig ett
  obligatoriskt svar eller en brådskande sista svarsdag.

## Verifiering

Nya tester: player-journeys.test.cjs, club-vision.test.cjs och
calendar-pace.test.cjs. De prövar olika faktiska beslut från samma situation,
frånvaro, idempotens, importerade och äldre sparningar, klubbbyte, riktig
säsongsövergång och kalenderparitet mot vanliga dagssteg.

scripts/club-build-browser-checks.cjs prövar knapparna i den verkliga appen:
projektval, spelarresa, profilminne, inställningar, fem faktiska dagssteg och
diskåterläsning. Den ingår i det befintliga Electron-testet och i en separat kort
Windows-körning med skärmbilder. Lokal visuell körning är miljöberoende; en grön
logiksvit innebär inte automatiskt att gränssnittstestet har körts.

Ingen ny installationsfil eller betarelease skapas av ändringen.
