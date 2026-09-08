# Samlad spelgranskning – 8 september 2026

Utvecklingsriktning: ett managerspel för dator där beslut har observerbara konsekvenser och karriären består över säsonger. Befintliga system behålls när de fungerar. Nedan skiljs genomförda förbättringar från kvarvarande begränsningar.

| Område | Befintlig grund och kontroll | Förbättring eller fortsatt begränsning |
|---|---|---|
| Beslut och konsekvenser | Bud reserverar ekonomi; kontrakt och löften följs upp mot spelad istid. | Rekryteringen visar nu befintlig konkurrens, rollåtaganden och unga spelare före köpbud. En värvning nollställer inte kedjor eller trötthet. |
| Samverkande system | Kalendern driver träning, återhämtning, scouting, affärer och AI. | Stabens delegerade vila använder samma belastningsmodell som egen planering. AI-träning betalar också med ork; vila ger inte attributträning. |
| Individuella spelare | Attribut, utvecklingsutrymme, åldrande, personlighet, förtroende, moral och samspel finns. | Målvaktsrotation och nya målvaktslöften bedöms över sex tillgängliga tävlingsmatcher. Avtalsvillkor, matchunderlag och tidigare överenskommelser visas och sparas; gamla löften behålls (ROLE-PROMISES.md). Rollen kan omförhandlas i ett sparat samtal där spelaren kan avböja. Aktiva löften får inte raderas. |
| Taktik | Kedjor, backpar, matchning, forecheck, tempo, avslutsval och special teams når matchmotorn. | Den föregående etappens taktiska uppföljning sparar förändringar och verkligt spel före/efter. Ändrade kedjor, backpar och målvaktsval ingår nu i samma sparade beslutstidslinje med lagets före/efter-underlag (LINEUP-DECISIONS.md). PP-/PK-uttagning och systemval följs nu upp separat efter faktisk tid i respektive spelform (SPECIAL-TEAMS-REVIEW.md). Lagtrender visar nu återkommande chansbalans per faktisk spelarkombination över flera kompletta matcher, med öppningsbart matchunderlag (FORMATION-EVIDENCE.md). Automatisk rotation och motståndsjusterad långtidsanalys återstår. |
| Matcher | Egna matcher använder samma produktionsmotor för visningslägena; skottförsök skiljs från skott på mål. | Match-, statistik-, byte-, medicin- och sparningstester ingår i helhetskontrollen. Bakgrundsmatcher delar nu avslutens bedömningsformel med 2D-motorn och redovisar uppskattad avslutskvalitet. Chansuppbyggnaden är fortfarande separat. Anfallsinitiativ beror nu på faktiskt puckspel, pressmatchning, ork och numerärt läge; se SHARED-SHOT-MODEL.md och MATCH-INITIATIVE.md. |
| Rekrytering | Scouting förbättrar kunskap stegvis; lån, förhandlingar, motbud och bevakning är samlade. | Konkurrens visas före värvningen. AI följer ekonomiska reserveringar och rollbehov samt avvaktar korta skadebehov när befintlig täckning räcker. Lånelängden anpassas till återgångsprognosen (AI-INJURY-RECRUITMENT.md). Daterade observationer fryser attributunderlaget; gamla rapporter får större osäkerhet och kan uppdateras mot kostnad och väntetid (SCOUTING-KNOWLEDGE.md). Rollpassning kan jämföras i listan och attributkrav kan utgå från möjlig träff eller rapportens nedre gräns. Potential är fortsatt en osäker uppskattning. |
| Flera säsonger | AI-budgetar, förlängningar, pensioneringar, juniorintag, upp-/nedflyttning och arkiv finns. | Den automatiserade karriärkontrollen omfattar tre säsonger och riktiga säsongsövergångar. Ekonomisk och sportslig långtidsbalans behöver även bedömas genom längre speltestning. |
| Tränarvardagen | Kontoret visar aktuella beslut, nästa match och daterade ärenden. | Individuell återhämtning kan delegeras utan att staben ändrar laguttagning, säljer spelare eller gör ekonomiska åtaganden. Manuella belastningsbeslut har företräde samma dag. |
| Tydligt datorgränssnitt | Gemensam navigation, tabeller, filter och sidopaneler behålls. | Rollbeslut ligger i omklädningsrummet, konkurrens i köpflödet och delegering under spelarutveckling. Extra underlag går att fälla ut. |
| Lärande och förklaringar | Tränarråd skiljer observationer från möjliga orsaker, och korta underlag markeras. | Assistentens formationsråd använder nu samma krav på återkommande utfall som trendtabellen. Träningsfokus utesluter ofullständiga spelformsdata och dubbla rapporter. Rollavslag förklarar vilka faktorer som vägts in. Äldre sparfiler får åter en tydlig notis om sin spelarbas i ligavyn. |

## De genomförda besluten

- **Diskutera en mindre roll:** underlag från minst tre tillgängliga tävlingsmatcher krävs. Äldre eller mindre ambitiösa spelare med förtroende och begränsad istid kan acceptera. Andra kan avböja och tappa förtroende. Tre matcher krävs före ett nytt rollsamtal. Lön, kontraktstid och aktiva löften kan inte kringgås.
- **Värva med en plan för platserna:** se spelklara konkurrenter, befintliga ordinarie-/nyckelroller och unga spelare i positionsgruppen. Efter ankomsten behålls fungerande formationer; tränaren väljer vem som ska spela.
- **Delegera återhämtning:** opt-in. Staben väljer en dags träningsvila vid högst 45 procent ork, med samma uppföljning och återgång som en tidsbestämd manuell plan. En explicit manuell ändring gäller den dagen. Medicinsk rehabilitering och matchuttagning förblir separata beslut.
- **Möta AI med verkliga begränsningar:** träningsarbete använder samma ålders-, ork- och tränarstödskomponenter. Matchförberedelse är lätt; slitna spelare vilar utan attributarbete. AI-målvakters rollförväntningar använder samma startgränser som den egna klubbens.

## Sparfiler och testning

Nya fält är valfria och får tomt/defaultvärde i äldre karriärer. Befintliga trupper ersätts inte med en ny databas. Rollhistorik och matchunderlag begränsas i storlek och tillhör spelaren/klubben. Stabens ansvar sparas med träningen och är avstängt i gamla sparfiler.

`cohesion.test.cjs` verifierar beslut, avslag/blockering, cooldown, ekonomi/formationer vid ankomst, faktisk träning, manuellt företräde, AI-belastning samt sparning. Hela projektets testsvit körs separat för att hitta konflikter med övriga system; hittade avvikelser rättas och deras berörda tester körs om. En godkänd automatiserad svit är inte ett påstående om att spelet saknar buggar eller är färdigbalanserat för lansering.

## Kvarvarande designarbete

Längre mänsklig speltestning behövs särskilt för målvakters rollkrav, AI:s träningsbalans och hur många samtal en karriär genererar. Rollsamtal är ännu regelbaserade med ett avgränsat antal faktorer, inte en fullständig förhandling om flera samtidiga löften. Truppkonsekvenserna är positionsbaserade; de lovar inte att en viss ny spelare passar en viss kedja. Dessa begränsningar ska vara synliga och fördjupas med data från spelandet.
