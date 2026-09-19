# Matchbrief

Motståndsrapporten visar en brief för nästa ospelade match. Tre uppgifter sätter befintliga order för taktik, spelstil, press, tempo och avslutsval. Kedjematchningen använder samma matchningsorder som matchmotorn. Inga attribut eller matchutfall justeras direkt.

Planen sparas med klubb, säsong, datum, motstånd, matchtyp och arena. Endast rätt match på rätt dag får en fristående kopia vid skapandet. Pågående matcher och äldre sparfiler får ingen efterhandskonstruerad plan. Manuell taktik vid nedsläpp sparas separat från planvalet.

Scoutingen använder högst fem fullständiga rapporter under innevarande säsong. PP redovisar mål och faktiska lägen; färre än tio lägen markeras som litet underlag. Kedjemönster kommer bara från registrerad kedjetid i högst tre egna möten. Minst tio minuters exponering krävs. Kedjenummer är inga garantier för samma spelare nästa gång.

Baslinjen fryses från högst fem kompletta egna tävlingsmatcher. Live- och efterrapporten kräver tio minuters registrerad tid vid lika styrka; jämförelsen kräver minst tre baslinjematcher. Båda sidors farliga lägen redovisas per tio minuter. En skillnad om 0,5 används som beskrivande observationsgräns, aldrig ett signifikanstest eller kausal slutsats. Special teams blandas inte in. Taktiska beslut följs fortsatt genom befintlig beslutslogg.

Matchanalysen erbjuder ett uttryckligt val av träningsfokus. Om ett fokus finns står det att det ersätts. Träningsdagen väljs sedan via befintlig uppföljning, med dess skydd för återhämtning, matchförberedelser och egna kalenderplaner. Senaste briefen mot samma motståndare visas inför nästa möte.

Verifiering: match-brief.test.cjs, match-coach-decisions.test.cjs, match-evidence.test.cjs, matches-workspace.test.cjs, tactical-controls.test.cjs, coaching-cycle.test.cjs samt full CI.
