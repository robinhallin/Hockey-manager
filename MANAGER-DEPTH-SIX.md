# Sex fördjupningar av managerspelet

## Tränarråd och uppföljning

Veckan använder återkommande underskott för samma forwardskedja eller backpar
(minst tre kvalificerade matcher och tio minuters istid). Powerplay utan ett
registrerat farligt läge under motsvarande underlag ger ett PP-fokus.
Rekommendationen sparar den specifika kombinationen/spelformen och dess
utgångsläge. Kommande matcher följer samma underlag. En försvunnen kombination
visas som ingen istid, inte som lyckat försvar. Det går att planera ett verkligt
PP-pass; skills-pass räknas då inte som genomförd PP-träning.

## Planera en värvnings plats

Kandidatprofilen låter tränaren välja kedjeplats, backplats eller startmålvakt
samt en roll. Planen sparas för klubb och säsong och visar vem som skulle
förlora platsen, berörda rollåtaganden, en undanträngd ung spelare och blivande
medspelare. Rollbedömningen bygger på befintlig scouting och dess osäkerhet.
Ingen dold potential eller påhittad framtida kemi visas. En ändrad uppställning
jämförs med den sparade planen. Inga ekonomiska eller spelaravtalsmässiga
åtaganden skapas, och värvningen byter inte automatiskt plats på spelare.

## Personliga historier

Nya historier får version 2. Ambition och avtalad roll påverkar individuella
minutkrav. Förtroendereaktionen väger in lojalitet, trygghetsbehov, befintligt
förtroende och tidigare besvikelse. Reaktionerna fryses när beskedet lämnas.
Äldre historier behåller sina ursprungliga val och redan lämnade besked.

Talang- och veteranhistorier kan erbjuda en minut PP i tre av fyra matcher där
laget faktiskt får minst en minuts PP. Medicinska undantag och ofullständiga
rapporter gäller fortsatt. Ingen möjlighet innebär ingen missad prestation.
Ordinarie kontraktslöften gäller parallellt; ett PP-besked ersätter dem inte.

## Chansuppbyggnad

Bakgrundsmatcher använder de faktiska spelarnas effektiva attribut i den
befintliga gemensamma besluts- och specialteamsmodellen, inklusive deras
belastning och positionsförutsättningar. Samma kalibreringskurva som i 2D-motorn
används en gång efter beredskapsberäkningen; bakgrundsmatcher förstärker inte
attributskillnader genom att hoppa över kurvan. Passningar och spelsinne kan skapa
direktavslut. Returskott följer fortfarande verkliga räddningar och märks inte
samtidigt som direktavslut. Äldre anrop utan attribut har kvar sin fallback.

Geometrin är fortsatt specifik för 2D-motorn. `npm run check:match-modes`
jämför samma karriärs match i de två motorerna och redovisar skott, mål och
avslutskvalitet, utan att kräva identiska slumpresultat. Spatiala 20-minutersprov
skalas till 60 minuter; bakgrundsmatcher kan innehålla förlängning. Små prov
är en kontroll av stora avvikelser, inte bevis för färdig balans.

## Utveckling

Spelarprofilens 28-dagarsuppföljning sparar utgångsattribut och fokus och räknar
faktiskt registrerade pass, vila, medicinska hinder och matchtid. Rådet pekar på
begränsat deltagande eller behov av fortsatt arbete utan att läsa av dolda tak.
Attributsteg redovisar registrerade arbetskällor separat för träning, senior-
och J20-matchvana. Äldre attributsteg skrivs inte om. Träningsloggen sparar
56 pass; matchunderlaget följer spelets befintliga arkivgränser.

## Längre karriärkontroll

`npm run test:career-long` kör sex säsonger som standard (`CAREER_SEASONS=1..20`).
Kalender, AI-ekonomi, marknad, åldrande och säsongsövergångar körs på riktigt.
Teststrategin förnyar avtal till faktiska krav när de ryms, släpper utgående
avtal, försöker fylla luckor med akademi/fria spelare och söker jobb genom
befintliga handlingar. Ingen anställning eller kontraktstid skrivs över för att
skydda karriären. Matcherna använder bakgrundsmotorn; detta är inte ett test av
alla personliga matchdialoger. Rendering och autosparning per klick är avstängda
för hastighet, men riktiga spar-/återläsningskontroller körs vid varje årsskifte.

Kontrollerna följer poängbokföring, spelaridentiteter, attributgränser, ekonomi
mot transaktionsbok, truppstorlek, löner, unga spelare och sparfilens storlek.
Rapporten visar klubbarnas styrka och poäng för långsiktig balansbedömning.

Långtestet körs direkt i Node för hastighet. `headless-career.test.cjs` verifierar
identiska matchutfall mot den isolerade testmiljön, som också används för varje
sparfilsåterläsning. Testlagringen har en verklig kvotspärr på 5 MiB per värde så
att spelets komprimeringsfallback verkligen körs.

## Sparutrymme i långa karriärer

Sparformat v3 internar återkommande JSON-strängar före den befintliga
förlustfria LZW-komprimeringen. Spelarvärden och historik tas inte bort.
Äldre v1- och v2-filer läses fortfarande, vanliga exporter är fortfarande JSON,
och längd/kontrollsumma kontrolleras efter fullständig återställning.
Lagringsfel lämnar den senaste fungerande sparfilen kvar.

Långtestet kan återupptas från `CAREER_RESUME=/absolut/sparfil` och skriver
checkpoints när `CAREER_CHECKPOINT=/absolut/utfil` anges. `CAREER_SEASONS`
anger antalet ytterligare säsonger vid återupptagning. Ett misslyckat test ska
inte kräva att en redan verifierad karriär byggs upp från början igen.

## Verifierat 18 september 2026

18 riktade testfiler är godkända, inklusive komprimering, äldre sparformat,
matchåterupptagning, nya beslutsflöden, juniorkällor och kalibrering.
Sex sammanhängande säsonger (2026/27–2031/32), 4 368 seriematcher plus slutspel,
årsskiften och verkligt klubbbyte har genomförts. V2 nådde kvotgränsen vid femte
årsskiftet. Karriären återupptogs från fjärde checkpointen med V3 och slutförde
de två återstående säsongerna. Den sista sparfilen är 3 422 932 byte i testets
UTF-16-beräkning, utan att historik tagits bort av komprimeringen.

Matchjämförelsen körde sex parade prover. Skillnader i skottfördelning kvarstår;
uppdateringen gör inte de två simuleringsmotorerna identiska. Hela projektets
testsvit har inte slutförts på denna ändring. Visuell Chromium-kontroll kunde
inte köras eftersom webbläsarhämtningen misslyckades. Detaljer och mätvärden
finns i `qa/manager-depth-six.json`.

Ändringarna är lokala. GitHub-push stoppades av automatisk behörighetskontroll.
Ingen PR eller merge har därför skapats för denna uppdatering.
