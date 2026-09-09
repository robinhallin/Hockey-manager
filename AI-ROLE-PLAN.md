# AI: trovärdiga rollöften vid rekrytering

## Beslut och konsekvens

En AI-klubb ska kunna avstå en i övrigt möjlig värvning när spelaren kräver en större roll än konkurrensen ger stöd för. Den ska också kunna välja en starkare spelare som faktiskt konkurrerar om rollen. Spelarens egna rollkrav sänks inte automatiskt för att affären ska gå igenom.

`aiRoleOfferIssue` bedömer kandidaten mot samma aktuella och framtida truppåtaganden som kapacitetskontrollen. Egna spelare bedöms utifrån kända attribut; externa spelare med klubbens befintliga scoutbedömning. Små skillnader, högst 0,35 på attributskalan, räknas som likvärdiga.

| Roll | Målvakt | Back | Forward |
|---|---:|---:|---:|
| Nyckelspelare | Bland de 1 främsta | Bland de 4 främsta | Bland de 6 främsta |
| Ordinarie | Bland de 2 främsta | Bland de 6 främsta | Bland de 12 främsta |

Gränserna är spelets planeringsbedömning, inte hockeyregler eller garanterade minuter. Rangordningen görs inom bred positionsgrupp med relevanta attributvikter. Rotation och utvecklingsroller får inget nytt krav. Lån behåller sin särskilda roll- och istidsmodell.

- Direktvärvningar kontrolleras mot dagens konkurrens. Fleråriga köp kontrolleras även mot nästa säsong. Förhandskontrakt kontrolleras mot nästa säsong.
- Skador tar inte bort framtida återvändande konkurrenter.
- Avtalade och väntande ankomster räknas med; egna bud och samma spelare dedupliceras. Utgående kontrakt reserverar inte framtida platser.
- Bedömningen gäller urvalet, skapandet av budet, omprövningen och faktisk AI-övergång. Även ett användaraccepterat försäljningsbud måste klara kontrollen vid registrering.
- Vid avvaktan kan klubbens befintliga rekryteringsnotis förklara vilken roll som saknar stöd och kandidatens bedömda plats. Omprövade bud får samma förklaring i sitt avslagsunderlag.
- Redan genomförda övergångar och sparade kontrakt ändras inte. Underlaget beräknas från befintliga data vid laddning.

## Uppföljning och kontroll

Ett godkänt rollöfte är en bedömning, inte en garanti. Den befintliga matchuppföljningen använder fortsatt faktisk istid för att påverka nöjdhet och senare klubbens beslut.

`ai-role-plan.test.cjs` kontrollerar nekade bud utan reservering, spärr vid faktisk registrering, återvändande skadade konkurrenter, framtida ankomster, avböjda bud, omprövning, egen kandidat utan dubbelräkning och sparning/laddning. En bättre kandidat får skriva avtal; efter 30 kontrollerade matcher utan istid blir spelaren missnöjd genom den riktiga uppföljningsfunktionen.

Befintliga klubb-, kontrakts- och rekryteringstester körs också. Två äldre testuppställningar justeras: en ren budgetreservering använder rotationsroll, och testet av två konkurrerande nyckelspelarbjudanden ger kandidaten förmåga som stödjer den rollen i båda klubbarna. Deras ekonomiska och äganderelaterade kontroller behålls.

## Kvarstående arbete

Detta är en individuell rimlighetskontroll, inte en gemensam fördelning av alla spelares framtida minuter. Flera likvärdiga stjärnor kan fortfarande konkurrera om samma istid. En samordnad prognos för rollöften, taktisk matchning och juniorernas långsiktiga möjligheter återstår. Inga nya fullständiga flersäsongskörningar påstås för denna etapp.
