# Etapp: taktiska beslut och uppföljning

Matchens befintliga observationssystem använder faktiska skott under de senaste fem minuterna, separerar lika styrka från special teams och föreslår avvägningar. Det som saknades var en sparad uppföljning av tränarens ändringar.

Coachbänkens taktiska lagorder och matchplansval registrerar nu utgångsläge, spelad tid, ändrade inställningar och efterföljande skottförsök/farliga lägen. Flera ändringar vid samma spelstopp grupperas. Befintliga orderfunktioner ändrar fortfarande den verkliga matchmotorn; uppföljningen läser enbart matchens faktiska analysdata.

Uppföljningen finns under Taktik på coachbänken och i Matchrapport efter slutsignalen. Den visar de sex senaste av högst 24 registrerade beslut. Ingen extra åtgärd behövs för att börja registreringen. Äldre rapporter saknar uppföljningen och får inga konstruerade data.

Jämförelsen använder faktisk tid vid lika styrka, inte klocktid som också innehåller special teams. Takten för farliga lägen visas först efter minst tre minuter på vardera sidan av ändringen. Före/efter är inte ett kausalt bevis; motstånd, spelare på isen och andra ingripanden kan förändras samtidigt. Ändringar utanför coachbänkens lagorder samt separata spelarbyten registreras inte som egna taktiska beslut i denna etapp.

En namnkollision rättades samtidigt: liverådens `coachEvidence` skrev över träningsuppföljningens funktion med samma namn. Liveråden heter nu `matchCoachEvidence`, medan den befintliga träningscykeln åter får en lista över avslutade matcher.

Verifiering: separata observations- och träningscykler, giltiga order, gruppering vid spelstopp, exkludering av boxplay, tidsnormalisering, sparning/återläsning, arkiverad rapport och fortsatt produktionsmatch där ordern når motorn. Befintliga matchcenter-, analys-, arbetsflödes- och träningscykeltester kördes också.

Nästa steg är att koppla spelarroller, utlovad istid och rekryteringsbeslut tydligare till den verkliga konkurrensen i truppen.
