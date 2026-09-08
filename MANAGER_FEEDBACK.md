# Stab, liganyheter och uppföljning

Uppdateringen knyter ihop befintliga karriärsystem. `manager-feedback.js` läser scoutbedömningar, truppbehov och matchrapporter. Den ändrar inga resultat, spelarbeslut eller humöreffekter vid visning.

- Översikt → Stab & uppföljning: daterat underlag med högst tre konkreta alternativ (egen junior, lån, värvning). Rankningen använder bedömda rollattribut, inte dold potential. Pending löne- och transferåtaganden dras av. Knappen öppnar spelarens befintliga ärende; förhandling/uppflyttning kräver dess ordinarie handling. Gamla förslag är tydligt daterade och kontrolleras igen av ordinarie transferregler.
- Ligorna → Liganyheter: genomförda övergångar, låneavtal, förhandsavtal, tränarbyten, skador, ekonomiska AI-beslut och transferlistningar. Unga AI-spelares första registrerade trepoängsmatch under säsongen ger en talangnotis. Rubriken påstår inte ett bevisat långsiktigt genombrott. Ligatillhörigheten sparas vid händelsen.
- Kalendern producerar högst ett stabsunderlag och en ligadigest per sju dagar. Rapporter blockerar inte tiden. Manuell uppdatering kostar inga pengar och simulerar ingen dag.
- Faktiska värvningar, lån, junioruppflyttningar och tillträdda förhandsavtal startar fem matchers uppföljning. Fullständiga tävlingsmatcher krävs. Medicinska undantag räknas separat. Tillräcklig istid betyder 12 minuter för utespelare och 30 för målvakter; detta är uppföljningens mått, inte ett nytt speltidslöfte. Spelare som lämnar och säsonger som avslutas får ett ofullständigt avslut utan extra moralstraff.
- Samlad läsning av befintliga speltidslöften och träningsfokus. Tidigare fokus bevaras när tränaren väljer nytt. Före/efter-värden ger inte belägg för att en taktisk ändring ensam orsakat en förbättring; det ursprungliga matchunderlaget är fortsatt tillgängligt.

Arkiven är begränsade till 120 nyheter, 12 stabsunderlag, 60 förstärkningsuppföljningar, 16 tidigare fokus och 240 matchidentiteter. Gamla sparfiler får tomma arkiv utan retroaktiva spelareffekter. Import validerar de nya strukturerna. Exakt stabsunderlag, nyhetsfilter och scroll följer tillbaka-navigeringen.

`manager-feedback.test.cjs` kontrollerar observationsgränsen, verklig junioruppflyttning, veckodigest och dubbletter, inkorg/tillbaka, fullständiga och medicinskt undantagna matcher, fokusbyte, säsongsavslut, sparning och validering. Befintlig regressionssvit täcker integration med kalender, lån, rekrytering, karriär och flera säsonger.
