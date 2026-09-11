# MatchWorld 2 · Etapp C

Etapp C delar special teams och bytespolicy mellan live-match och bakgrundsmatch.

- `specialUnitScore` ger samma PP/BP-värdering av spelare i båda matchvägarna.
- `shiftTarget` väger in energi, tempo, forecheck och numerärt läge i rekommenderad byteslängd.
- `specialTeamsEdge` jämför PP-enhetens relevanta attribut mot boxplayets struktur utan en separat hårdkodad målbonus.
- Live-matchens giltiga spelarval får en liten PP/BP-bias från MatchWorld medan rinkgeometri och hockeyregler fortsatt ägs av spatialmotorn.
- AI-tränarens grundplan och matchanpassningar använder samma bytespolicy som live-matchen.
- Bakgrundens shot-context behåller samma serialiserade schema som före Etapp C.

Regressionen i `match-world-2.test.cjs` kontrollerar bland annat trötthetsstyrda byten, PP/BP-enhetsvärdering, special-teams edge och en riktig powerplaysekvens i karriärmatchen.
