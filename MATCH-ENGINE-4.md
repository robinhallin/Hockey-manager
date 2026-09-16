# Match Engine 4 · spelaridentitet och puckbeslut

Första etappen låter relevanta individuella attribut påverka vilket hockeybeslut en spelare värderar, utan en dold overall-bonus. Den befintliga spatiala motorn äger fortfarande passningsvägar, press, skottkvalitet, regler och utfallet av själva handlingen.

- Skottval: shooting, composure och decisions.
- Passningsval: passing, vision, decisions och composure under press.
- Pucktransport: puckControl, skating och decisions.
- Puckskydd: puckControl, strength och composure.
- Dump/rensning: decisions, workRate/composure och aktuell press.

Rollprofilerna från Match Engine 3.1 finns kvar, men de kontinuerliga attributen gör att två spelare inom samma roll inte längre värderar samma situation identiskt. Beslutsalternativen märks också med vilken färdighetsgrupp som påverkat värdet så att senare diagnostik kan förklara varför ett val ändrades.

`match-engine-4.test.cjs` använder samma rinkläge men extrema attributprofiler och kräver riktad skillnad i passning, transport och avslut. Det bevisar inte att en bättre spelare alltid lyckas eller vinner; det verifierar att rätt egenskaper påverkar rätt beslut innan exekvering och slump.
