# AI: trupputrymme för dagens och nästa säsongs värvningar

## Beslutet och spelvärdet

AI måste väga ett kort avtal för ett omedelbart behov mot ett flerårigt åtagande. En klubb kan ha plats i dagens lag men redan ha lovat nästa säsongs platser till nya spelare. Då kan ett ettårsavtal fortfarande fungera, medan ett flerårigt köp måste avstås. Detta gör konkurrenternas långsiktiga truppbygge mer konsekvent och låter verkliga åtaganden påverka konkurrensen om spelarna.

## Granskad lucka

`aiCanCommit` kontrollerade framtida löner för fleråriga köp, men framtida truppstorlek bara för förhandskontrakt. Ett vanligt tvåårsavtal kunde därför gå igenom trots att nästa säsongs trupp redan var full. Truppkontrollen saknade dessutom vissa väntande köp och lån, trots att motsvarande löner reserverades.

## Genomförande

`aiCommittedRoster` beräknar underlaget från befintliga spelare, kontrakt och förhandlingar. Befintlig kontroll behåller gränsen 30 och reserverar utrymme för minst två målvakter, sex backar och tolv forwards. Det är spelets AI-planeringsregel, inte ett påstående om officiella registreringsregler.

- Dagens trupp omfattar även egna återvändande lån, väntande aktuella AI-köp, giltiga bud till användarklubben samt lån med väntande svar eller motbud.
- Nästa säsong omfattar permanent kontrakterade spelare med återstående avtal, egna återvändande lån, avtalade ankomster samt väntande förhandskontrakt och fleråriga köp.
- Inlånade spelare blir inte automatiskt permanenta framtida truppmedlemmar. Ettårsavtal och korta lån reserverar inte nästa säsongs platser.
- Spelar-ID dedupliceras av den befintliga kapacitetskontrollen. Kandidaten och dess eget bud räknas tillsammans en gång.
- Avböjda bud och utgångna bud till användarklubben slutar reservera platser.
- Samma kontroll används vid marknadsval, omprövning av AI-bud och faktisk övergång. Ett avslagsmeddelande nämner nu både trupp och budget eftersom båda kan blockera.

Ingen ny sparfilstruktur behövs. Beräkningen läser befintliga åtaganden även efter laddning och avslutar inte redan undertecknade avtal retroaktivt.

## Kontroll

`ai-roster-commitments.test.cjs` återskapade felet med en trupp på 20 spelare och tio avtalade framtida ankomster: ett flerårigt köp godkändes före rättningen. Efter rättningen blockeras själva övergången utan flytt eller ekonomisk förändring. När en framtida plats frigörs genomförs övergången. Testet täcker också sparning/laddning, egna bud utan dubbelräkning, marknadsbud och användarbud, utgångna/avböjda bud, lånemotbud och ägande vid återvändande lån.

Befintliga tester för klubb-AI, kontrakt, skadebehov, rekrytering och lån körs tillsammans med rättningen. Karriärkontrollen kör tre säsonger med verkliga kalendersteg och säsongsövergångar.

## Avgränsning

Detta är rekryteringskontroll, inte en ny global registreringsregel för användaren. Förlängningar, akademiuppflyttningar och säsongsrensning har sina befintliga separata beslut. Numerisk platskontroll ersätter inte vidare balansering av lovade roller, kvalitet, åldersstruktur eller juniorernas chanser.
