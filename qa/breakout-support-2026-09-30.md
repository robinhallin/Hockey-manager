# Hockeybeslut: uppspel och förstapass

## Omfattning och ärlig kvalitetsnivå

Utgångspunkt: main `11b02d82f63991502e04094fc47b2881b54b1fcf`.
Detta är en avgränsad förbättring i det befintliga spelet, inte en färdig
realistisk matchmotor. Spelarmodeller och grundanimationer är oförändrade.
Ingen ny beta, installation, liga eller parallell demonstrationsmotor skapades.

Hela produktionskedjan granskades: match-simulation, rules-3, engine-3,
engine-4 och control-integration. Den tidigare bedömningen att F1/F2/F3
och understöd saknades var för förenklad: funktionerna finns i engine-4.
Problemet som åtgärdas är vilka spelare som får vilka uppgifter och hur
verkliga passningsalternativ värderas.

## Referensgranskning

Officiella SHL-spelare öppnades och riktiga videobilder granskades genom
uppspelning i 1× samt pauser och flera på varandra följande bildobservationer:

- Timrå–HV71, 2026-02-28: https://www.shl.se/single-video/video%7Cstaylive%7C506434?tags=custom.highlights
  Bland annat uppspelsbild omkring 23 sekunder och etablerat powerplay
  omkring 32–36 sekunder. Pucknära press, centralt skydd och spelare på
  skilda flanker är separata uppgifter. Det är inte en full matchstudie.
- HV71–Färjestad, 2025-01-16: https://www.shl.se/single-video/video%7Cstaylive%7C363002
  Delar av närkamp och avslut/målvaktsförflyttning granskades. Närbilder
  begränsar vad som går att dra för slutsatser om alla tio utespelare.

IIHF:s videowebbplats blockerade webbläsaren med Cloudflare och ingen
IIHF-video har därför visuellt granskats. Inga videor återanvänds som tillgångar.

## Faktiska kodändringar

- Djupt fem-mot-fem-uppspel med back som puckförare: backpartnern ger
  ett lågt återspel, centern kommer ned invändigt, en ytter öppnar längs
  pucksidans sarg och den andra håller bortre bredd. Ersätter just här
  den gamla tilldelningen av två närmaste medspelare oavsett position.
- Lokala justeringar av understödet efter passningsrisk, motståndarnas
  positioner och egen resväg. Spelarnas befintliga lästid och sparade
  supportPlan används; inga speglingar tvärs över rinken eller teleporteringar.
- Säkra bakåtpass i egen zon slipper en generell bakåtpassbestraffning.
  Avstånd, press, faktisk passningslinje och målbur måste tillåta alternativet.
  Passning, transport och andra handlingar konkurrerar fortfarande.
- Forecheckens F2 prioriterar ett användbart förstapass inom räckhåll,
  inte alltid puckförarens närmaste medspelare. F1/F3 och befintliga
  taktiska skillnader behålls.
- Markpassningar genom målbur tas bort ur beslutsalternativen. Befintlig
  svept kontaktfysik avgör fortfarande vad som händer efter pucksläpp.
- Nya planfält valideras i befintliga sparfiler; ingen sparformats- eller ID-ändring.
- Produktionsskriptens cacheversioner uppdateras i index.html.

## Tester och jämförbara logiska sekvenser

Sex nya tester i match-breakout-support.test.cjs passerade, inklusive
båda anfallsriktningarna, båda sargkanterna, backroller, lokal lästid,
taktisk stretch, special-team-undantag och exakt fortsättning efter save/reload.
Ytterligare 29 riktade tester passerade för kontakt, mottagning, skottfaser,
returer, försvarsgap, understöd, målvakt och managerbeslut.

96 perioder före den sista korrigeringen av mottagarspecifika handlingsvärden
passerade befintliga testgränser:
2,75 mål, 27,6875 skott, 56,65625 avslutsförsök per lag/60 minuter och
90,07 procent räddningar. Före: 3,046875 mål, 29,875 skott, 58,984375
försök och 89,8 procent. Gränserna ändrades inte. Detta är spelets interna
regressionsurval, inte ett verifierat jämförelsematerial från aktuell SHL.
Hel match, utökade höjdpunkter, höjdpunkter och kommentarsläge gav i den
körningen identiska resultat (5–6), statistik, ork och slumpström. Slutlig
balans och paritet måste köras om för sista handlingskorrigeringen.

Den sista korrigeringen kopplar fri mottagare/passningslinje till varje
passnings handlingsvärde, inte bara passingOptions-score. Det senare används
bland annat av forechecken, medan puckförarens chooseAction har egen värdering.
En fri medspelare ska inte ge ett generellt värdepåslag till andra täckta
passningar. Ett test kontrollerar att den riktiga handlingens värde och orsak
ändras när återspelsmottagaren blir täckt.

Ett befintligt återstartstest flakade vid CPU-belastning: det krävde att
matchklockan gick efter en enda UI-puls trots pågående nedsläppspaus och
pulsens begränsade arbetsbudget. Testet kontrollerar nu först att
simuleringstiden går och sedan att matchklockan börjar gå efter pausen,
inom ett begränsat antal pulser. Ingen matchregel eller arbetsbudget ändras.

scripts/check-breakout-flow.cjs kör 32 × 60 sekunder från kontrollerade
uppspelspositioner med två kompletta femmor och målvakter. Bara startläget
är valt; produktionsmotorn bestämmer samtliga efterföljande handlingar.
Jämförelse med ovanstående main-revision (samma frön och startpositioner):

| Mått, båda lagen tillsammans | Före | Efter |
| --- | ---: | ---: |
| Passningsförsök | 333 | 398 |
| Fullbordade passningar | 200 | 263 |
| Zoningångar | 65 | 63 |
| Skott | 21 | 31 |
| Mål | 2 | 2 |
| Största aktiva förflyttning per simsteg, meter | 0,479 | 0,477 |

Detta är diagnostik av ett smalt testläge, inte SHL-kalibrering eller bevis
för bättre animationer. Alla första passningar i urvalet gick till LW,
vilket visar att variation mot flera olika pressbilder fortfarande behöver
granskas. Närhet mellan medspelare ökade också i urvalet; mer understöd
är inte automatiskt mindre trängsel.

## Kvarstående begränsningar

Den lokala spelservern kunde inte öppnas i tillgänglig webbläsare
(`ERR_BLOCKED_BY_CLIENT`). Den uppdaterade 3D-matchen har inte visuellt
granskats eller spelats in före/efter i denna arbetsomgång. Ändringarna får
inte kallas visuellt verifierade eller realistiska av den anledningen.

Ingen ny renderingsmätning på referensdator: ingen ny FPS- eller 60-FPS-claim.
Diagnostikens CPU-tid under samtidiga tester är inte en renderingsbenchmark.
Etablerat anfall, zonförsvar, rörelsekaraktär och variation i uppspel kräver
fortsatt faktisk matchbildsgranskning. Full regression och den nya
96-perioders balanskörningen ska bedömas före merge; gröna tester ersätter
inte visuell bedömning.
