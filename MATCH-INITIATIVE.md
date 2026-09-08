# Puckspel, press och anfallsinitiativ

Bakgrundsmatcher valde tidigare nästa anfallande lag med en fast sannolikhet på 51 procent för hemmalaget. Nu beror fördelningen på spelarna på isen: passningar, puckkontroll, spelförståelse och beslut, pressdueller samt numerärt över-/underläge. Attributen har redan justerats för faktisk matchenergi, positionsvana, samspel och moral. Hemmafördelen är kvar men spelarnas förutsättningar kan väga tyngre.

## Meningsfull avvägning

Aggressiv forecheck ger fler möjligheter att vinna initiativ när presspelarna kan störa motståndarens puckspel. Samma val kan minska initiativet när motståndaren är bättre på att skydda och spela pucken. Den befintliga belastningsmodellen tar dessutom mer ork vid aggressiv press. Det gör ett skickligt och utvilat lag annorlunda än ett slitet lag, även när de använder samma order.

Pressduellens grundformel har lyfts ur den fullständiga motorn till `StudioHockey.pressureWinChance`. Där avgör fortfarande verkliga avstånd om spelarna kommer i duell. Bakgrundsmotorn använder motsvarande bedömning på spelarna i aktuell formation när ett nytt anfall ska tilldelas. Detta är gemensam spelarbedömning, inte identisk rumslig chansuppbyggnad.

## Återkoppling och sparning

Motståndsrapporten visar anfallsinitiativ vid lika styrka i en utfällbar del intill avslutskvaliteten. Spelaren kan jämföra hur ofta motståndaren får bygga anfall med hur bra avslut laget skapar, inför valet av egen press och försvar.

Andelen avser simulerade anfallslägen. Den är uttryckligen inte uppmätt puckinnehav eller skottandel. Numerära över-/underlägen räknas bort från den visade jämförelsen. Färre än tre matcher markeras som tunt underlag. Äldre och ofullständiga matcher får inga påhittade andelar.

Räknarna sparas i matchens rapport och klubbens redan begränsade historik. De ändrar inte gamla resultat. Händelser, istid och skottbokföring behåller sina befintliga flöden.

## Kontroller

- En kontrollerad jämförelse av 48 riktiga bakgrundsmatcher isolerar svagt/starkt puckspel och därefter hög trötthet. Bättre puckspel ska vinna fler anfallslägen, medan trötthet minskar fördelen.
- Pressmatchningen testas åt båda håll: stark press mot normalt puckskydd och svag press mot skickliga puckspelare.
- Lagens anfallslägen summerar till samma antal tidssteg. Andelar vid lika styrka utesluter numerära skillnader.
- Rapporten är skrivskyddad; engångsbokföring och återlästa sparfiler bevarar räknarna.
- Fullständiga motorns händelser, avslut och slumpförlopp jämförs med versionen före utdragningen av pressformeln.
- Befintliga avsluts-, AI- och belastningstester samt ett helt säsongsförlopp används som regressionskontroll.

Balans och samband ska fortsätta utvärderas över olika lag och längre karriärer. En hög initiativandel garanterar varken bra målchanser eller seger.
