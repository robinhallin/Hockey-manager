# MatchWorld 2 · Etapp D

Etapp D inför en gemensam händelselogg mellan simulering, statistik och presentation.

- `MatchEventLedger` lagrar faktiska skott, mål, assistunderlag, utvisningar och istid från live-matchens spatialmotor.
- `matchStats()` projicerar skott, räddningar och farliga chanser från ledgern när en ny match använder Etapp D.
- Full match, utökade höjdpunkter och höjdpunkter är filter av samma event-ID:n. Visningsläge får inte rulla om eller skapa matchhändelser.
- Bakgrundssimuleringen publicerar sitt exakta slutresultat, skott och PP/BP-totaler genom samma ledger-kontrakt utan att hitta på en falsk kronologi.
- Gamla eller partiella sparfiler fortsätter använda befintliga statistikvärden tills en Etapp D-ledger finns.
- Save-valideringen kontrollerar sekvens, eventtyp, tid och sida för ledgern.

Etapp D ändrar inte RNG, skottmodell eller hockeybeslut. Den separerar vad som händer från hur det visas.
