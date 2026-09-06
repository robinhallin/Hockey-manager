# Kontraktslösa vid karriärstart 2026/27

Kontrollerat **6 september 2026**. Fyra verkliga spelare med SHL-matcher 2025/26 ingår i den nya startpoolen. De saknade registrerad klubb och kontrakt för 2026/27 i de kontrollerade profilerna. Avgångar kontrollerades också mot klubbarnas besked. Detta är ett daterat urval: avsaknad av ett publicerat avtal bevisar inte att ett ännu opublicerat avtal saknas.

| Spelare | Senaste klubb | Underlag för status |
|---|---|---|
| Daniel Brodin | Björklöven | [Klubbens avgångsbesked 6 augusti](https://www.bjorkloven.com/article/6j3atjc-2e4ad/view) och [spelarprofil](https://www.eliteprospects.com/player/10051/daniel-brodin), senast registrerat avtal 25/26. |
| Oliver Kylington | Djurgårdens IF | [Djurgårdens avgångsbesked 25 mars](https://www.difhockey.se/article/eoyatcg-1lead/view), [SHL:s truppkoll](https://www.shl.se/truppkollen) och [spelarprofil](https://www.eliteprospects.com/player/142238/oliver-kylington), senast registrerat avtal 25/26. |
| Oula Palve | Djurgårdens IF | [Djurgårdens avgångsbesked 25 mars](https://www.difhockey.se/article/eoyatcg-1lead/view), [SHL:s truppkoll](https://www.shl.se/truppkollen) och [spelarprofil](https://www.eliteprospects.com/player/43555/oula-palve), senast registrerat avtal 25/26. |
| Collin Delia | Kalmar HC | [Kalmars officiella avgångsbesked 16 april](https://www.instagram.com/p/DXMYka7iIzA/) och [spelarprofil](https://www.eliteprospects.com/player/155712/collin-delia), senast registrerat avtal 25/26. [Brynäs besked 9 februari](https://www.brynas.se/article/bbzata7-1ekad/view) avser den tidigare avgången, före Kalmar. |

[Elite Prospects offentliga SHL-pool](https://www.eliteprospects.com/free-agent-pool/shl) användes som ingång, inte som enda kontroll. **Jack Kopacka** uteslöts eftersom [hans profil](https://www.eliteprospects.com/player/233512/jack-kopacka) visar Fort Wayne Komets och avtal 26/27. **Marcus Krüger** uteslöts eftersom [hans profil](https://www.eliteprospects.com/player/8311/marcus-kruger) visar Djurgården och avtal 26/27; han finns redan i lagets starttrupp. Den automatiska listan var alltså inte tillräckligt uppdaterad på individnivå. Inga betalda spelarlistor har hämtats förbi åtkomstgränser.

## Attribut och spelregler

Spelarprofilerna ovan är även källor till födelsedatum, position, storlek, fattning och grundseriestatistik. `WORLD_START_FREE` i `player-world.js` innehåller ett begränsat statistikutdrag från 2025/26 och 2024/25. Samma försiktiga modell som för övriga svenska trupper används, med liganivå och regression för små stickprov. Delias sex SHL-matcher balanseras exempelvis mot hans AHL-säsong och två matcher i Kalmar. Brodins kvalpoäng blandas inte in i grundseriens poäng. Ingen säsongsproduktion läggs in i karriärens egna statistikräknare.

Attribut, potential, personlighet, lönekrav, förhandlingsvillkor och framtida beslut är **speluppskattningar**, inte observerade personliga egenskaper eller verkliga löneuppgifter. Se [hela attributmetoden](PLAYER_RESEARCH.md).

Poolen skapas enbart vid **ny karriär**. Äldre sparfiler får inga extra spelare automatiskt. En värvad, pensionerad eller släppt spelare återställs aldrig genom omladdning; samma käll-ID kan bara ha en aktuell klubb. Verklig bakgrund ligger under spelarprofilens källor och hålls isär från den pågående karriären.
