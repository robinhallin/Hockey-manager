# Arbeta direkt i klubbhusets rum

Varje arbetsstation öppnar sitt riktiga verktyg med ett klick. Den tidigare mellanpanelen är inte längre ett nödvändigt steg. Verktyg, profiler och bekräftelser får samma marinblå ytor, varma markeringar, typografi och tydliga tangentbordsfokus som klubbhuset. Rum, datum och huvudnavigation finns kvar under arbetet.

| Rum | Arbetsstationer och direkt arbete |
| --- | --- |
| Tränarkontoret | Skrivbord → inkorg; veckoplan → kalender; enskilda samtal → samtalsverktyget |
| Omklädningsrummet | Spelarplatser → trupp; samtal → relationer och löften; rolltavla → alla kontrakt och roller |
| Taktikrummet | Tavla → befintlig interaktiv uttagning; motståndsskärm → matchbrief eller motståndarunderlag; analysbord → färdig match eller analysverktyget |
| Utvecklingscentret | Veckoträning → daterad kalenderplanering; medicinskt team → status och rehab; akademi → juniorernas utveckling |
| Scoutkontoret | Truppbygge → bemanning och avtal; scoutbord → uppdrag; förhandlingsbord → bud och avtal |
| Styrelserummet | Riktning → styrelse; budgetbord → ekonomi; stabsmöte → mandat, faktiska förslag och uppföljning |
| Omvärldsrummet | Hockeyskärmar → nyheter; bevakningsbord → följda händelser; landslag → JVM och klubbens talanger |

Fler verktyg nås bredvid stationerna: individuell utveckling, personalavtal, tränarkarriär, ligor och NHL. Rekryteringsarbetets flikar behålls, medan den dubbla interna flikraden tas bort i rumsläget. Den befintliga 2D-matchen behåller sitt fullskärmsflöde och delar färger och typografi.

## Granskning före ändringen

Granskad lokalt i Chrome på HV71-karriär 3 augusti 2026, utan kalenderförflyttning. Sparade bilder har granskats; en tidig fångst som visade föregående bildruta avvisades.

1. **Välj ett rum – tydligt.** [Rumsvyn](before-room.jpg) har tydliga namngivna stationer, bild och permanent huvudnavigation. Station och sidopanel upprepar samma val.
2. **Klicka på en arbetsstation – onödigt mellanled.** Klicket väljer sidopanel, varefter ytterligare en knapp måste öppna verktyget. Nu öppnas verktyget direkt och rubriken får tangentbordsfokus.
3. **Arbeta i verktyget – begränsat utrymme.** [Medicinska verktyget före ändringen](before-medical.jpg) har dubbla rubriker, generisk dialogram och bara en synlig tabellrad. Nu har tabellen eget användbart utrymme, verktyget följer dokumentets naturliga höjd och den yttre scrollen behålls vid filter och beslut.

Bekräftade risker: dubbla navigeringar, svåröverskådlig prioritering och tabellens otillräckliga höjd. Möjliga tillgänglighetsrisker från bilderna: små sekundära texter och otydlig fokusåtergång. Implementeringen har tydliga fokusmarkeringar, fokus på öppnat arbete och återgång till stationen. Bilder ensamma verifierar inte skärmläsare eller full WCAG-överensstämmelse.

## Resultat och verifiering

- [Medicinskt team](medical.jpg), [budgetbord](budget.jpg), [truppplanering](recruitment.jpg).
- Bemanning och avtalsbehov visas före alternativa lagbyggen. Alternativa planer finns i en separat utvecklingsbar sektion.
- Sortering, filter, spelarlänkar, sparning och alla verkliga beslut använder befintliga domänkommandon.
- Nya tester täcker 21 direkta stationer, alla äldre verktygsrutter, detaljretur, rätt filter och inaktuella handlingar.
- Windows-flödet går igenom alla 21 stationer, profilretur och tabellfilter samt kontrollerar arbetsytor vid 1920, 1366 och 390 pixlar. Befintliga verkliga match-, tränings-, scout- och avtalsflöden behålls.

Ingen ny simuleringsmotor eller sparversion införs. Öppna verktyg flyttar inte kalendern och genomför inte träningspass, scoutuppdrag eller avtal.
