# Hockeyallsvenskan – spelarunderlag 2026/27

Kontrollerat **5 september 2026**. Startdatabas `ha-2026-09-05`.

325 verkliga spelare i de 14 allsvenska klubbarna. Varje post i
`allsvenskan-data.js` innehåller en direkt spelarkälla, födelsedatum,
position, nationalitet, vikt, publicerad kontraktsstatus och utvald
grundseriestatistik från 2024/25 och 2025/26. Alla 325 har statistikunderlag.
Detta är en daterad startdatabas, inte en löpande liveuppdatering.

## Källor och avgränsning

Ligadeltagarna kontrollerades mot [Hockeyallsvenskans premiärinformation](https://www.hockeyallsvenskan.se/article/18hatf8-1el1/view).
Trupper och individuella säsongsrader hämtades från följande truppsidor och
de länkade spelarprofilerna på Elite Prospects. Direktlänken för varje
spelares statistik finns även på spelarkortet i spelet.

| Klubb | Spelare | Truppkälla |
|---|---:|---|
| AIK | 24 | [2026/27](https://www.eliteprospects.com/team/1/aik) |
| Almtuna IS | 22 | [2026/27](https://www.eliteprospects.com/team/13/almtuna-is) |
| BIK Karlskoga | 23 | [2026/27](https://www.eliteprospects.com/team/25/bik-karlskoga) |
| IK Oskarshamn | 23 | [2026/27](https://www.eliteprospects.com/team/31/ik-oskarshamn) |
| Kalmar HC | 23 | [2026/27](https://www.eliteprospects.com/team/778/kalmar-hc) |
| Leksands IF | 21 | [2026/27](https://www.eliteprospects.com/team/28/leksands-if) |
| MoDo Hockey | 22 | [2026/27](https://www.eliteprospects.com/team/9/modo-hockey) |
| Mora IK | 25 | [2026/27](https://www.eliteprospects.com/team/29/mora-ik) |
| Nybro Vikings | 23 | [2026/27](https://www.eliteprospects.com/team/335/nybro-vikings-if) |
| Södertälje SK | 23 | [2026/27](https://www.eliteprospects.com/team/10/sodertalje-sk) |
| Vimmerby HC | 23 | [2026/27](https://www.eliteprospects.com/team/498/vimmerby-hc) |
| Visby/Roma | 24 | [2026/27](https://www.eliteprospects.com/team/1226/visby-roma) |
| Västerås IK | 23 | [2026/27](https://www.eliteprospects.com/team/308/vasteras-ik) |
| Östersunds IK | 26 | [2026/27](https://www.eliteprospects.com/team/1595/ostersunds-ik) |

En oberoende kontroll av topproduktionen gjordes mot
[Svenska Ishockeyförbundets poängliga 2025/26](https://stats.swehockey.se/Players/Statistics/ScoringLeaders/18266)
och [AIK:s spelarprofil för Scott Pooley](https://www.aikhockey.se/athlete-profile/qbP-4VFmrlRBD/):
Pooley 51 matcher, 27 mål och 32 assist. Eero Teräväinen noterades för
52 matcher, 15 mål och 23 assist i förbundets tabell. Dessa rader stämmer
med databasens individkällor.

Nathan Staios finns i Leksands publicerade lista som provspelare. Han ingår
inte i den kontrakterade starttruppen. Juniorer som är upptagna i A-truppen
behålls. Registrerade lån representeras som ett säsongskontrakt, utan
automatisk återgång; detta anges på respektive spelarkort. En spelare får
bara en aktiv klubb i spelet. Almtunas truppuppgift används för Edvin
Hammarlund även om Örebro också listar honom som lånespelare.

Dubbelregistreringar mellan äldre SHL-data och de nya HA-trupperna tas bort
vid ny karriär. Namnlikhet hanteras särskilt för Anton Olsson:
[Västerås-spelaren](https://www.eliteprospects.com/team/308/vasteras-ik)
är född 2006 och är en annan person än
[den tidigare Skellefteå-backen](https://www.eliteprospects.com/player/420461/anton-olsson), född 2003.
Örebro får dessutom två verifierade spelare så att klubben har två målvakter
och tolv forwards efter avgångarna:
[Filip Larsson](https://www.eliteprospects.com/player/264409/filip-larsson) och
[Alexander Command](https://www.eliteprospects.com/player/617634/alexander-command),
båda i [Örebros aktuella trupp](https://www.eliteprospects.com/team/36/orebro-hk).
Detta är inte en fullständig genomgång av övriga SHL-data.

## Så uppskattas attributen

Beräkningen i `allsvenskan.js` är en transparent spelmodell, **inte uppmätta
attribut eller en professionell videobaserad scoutingrapport**. Det finns
ingen synlig totalsiffra. Tränarteamets och scouternas stjärnor är fortfarande
osäkra och relativa till den egna truppen.

- Underlaget omfattar högst sex klubb- och ligarader per spelare, prioriterat
  efter senaste säsong och antal matcher. Landslag, turneringar och slutspel
  tas inte med. Noll matcher behandlas inte som en prestation.
- 2025/26 väger fullt; 2024/25 väger hälften. Liganivå och antal matcher
  vägs samman. Referensnivå på attributskalan: SHL 13, HA 10,5,
  Hockeyettan 8 och U20 Nationell 7,5. Övriga ligor finns explicit i koden.
  Dessa nivåskillnader är modellantaganden, inte en officiell omräkning.
- Mål per match påverkar avslut, assist per match påverkar passningar.
  Varje rad stabiliseras med tolv referensmatcher. Backar jämförs med lägre
  offensiva referensvärden än forwards. Bonus och avdrag begränsas, så att
  en kort poängsvit inte ger orimliga attribut. Puckkontroll och vision
  påverkas försiktigare; assist är inget exakt mått på dessa egenskaper.
- Positionering och tacklingar får små positionsbaserade justeringar.
  Centerposition ger en grundfördel i tekningar, eftersom komplett
  individuell tekningsstatistik saknas. Låg poängproduktion likställs inte
  med dåligt försvar. Beslut, arbetskapacitet och andra mentala egenskaper
  bygger främst på försiktiga referensvärden; de är inte verifierade fakta.
- Vikt ger ett begränsat styrkepåslag. Ålder över 31 ger en måttlig
  fartjustering. Varken vikt eller ålder betraktas som ett direkt mått på
  tacklingsteknik, kondition eller skridskoskicklighet.
- Målvakter utgår från liganivå och räddningsprocent, stabiliserad med
  tjugo referensmatcher på 90 procent. Matchantal används som approximation
  eftersom skottvolym saknas i detta underlag. Lagförsvar och skottkvalitet
  kan påverka statistiken. Returkontroll, rörelse och placering är därför
  uppskattningar, inte separata uppmätta målvaktsvärden.
- Potential är en försiktig, åldersbaserad utvecklingsmarginal. Den är inte
  en säker prognos över en namngiven spelares framtid. Allt avrundas och
  begränsas till spelets skala 1–20. Samma underlag ger samma startattribut.

Publicerade slutår används för kontraktslängd; optionsår räknas inte som
säkra år. Om slutår saknas används ett tydligt angivet spelantagande på en
säsong. Löner, marknadsvärden, humör, relationer och klubbarnas ekonomi är
speldata. De ska inte tolkas som verkliga avtal eller personliga omdömen.

## Sparfiler och verifiering

Nya karriärer använder den verkliga databasen. Befintliga karriärer behåller
sina trupper, historik, träning, kontrakt och värvningar. Ingen spelaridentitet
byts ut mitt i en pågående värld. Äldre sparningar utan den andra ligan får
samma fiktiva komplettering som tidigare för att inte duplicera verkliga
spelare som redan finns eller har värvats. Huvudmenyn förklarar hur den nya
startdatabasen väljs. Föregående karriär bevaras av det befintliga karriärflödet.

Automatiska tester kontrollerar datatäckning, attributgränser, identiteter,
laguppställningar för samtliga HA-klubbar, statistik som hålls åtskild från
spelade matcher, övergångar, sparning och kompatibilitet med äldre världar.
