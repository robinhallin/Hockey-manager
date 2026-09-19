# North American roster evidence — 19 September 2026

This is **a source register, not the completed real-roster simulation**. Open **Ligorna → NHL & draft → Ligaspel → Verkliga spelare**. The register is available in old and new careers and has its own league, club, position and name filters. It always displays the source season/date, independent of the career's current year. It does not overwrite career players, advance time or enter save data.

## What was retrieved

- All **32 NHL organisation lists** from ESPN's public roster service for **2026–27**: **1,392 distinct source identities**, no cross-club identity conflicts in this snapshot. These are preseason lists, including prospects and potentially tryout players. They are not 23-man opening rosters or proof of a playing contract. Example source: https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/21/roster
- All **32 AHL team roster responses** for **2026–27 regular season**, HockeyTech season **94**. Every response currently contains staff but **zero player rows**. Staff are explicitly excluded. The importer does not substitute the populated 2025–26 lists (season 90). Example source: https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&key=50c2cd9b5e18e390&fmt=json&client_code=ahl&lang=en&season_id=94&view=roster&team_id=335
- AHL source attribution: **Official statistics provided by American Hockey League**, [LeagueStat](http://leaguestat.com), powered by [HockeyTech](https://www.hockeytech.com/). The feed key is the public site identifier, not an account credential.
- NHL's official roster service returned HTTP 403 in this environment. The official team website rendered navigation but no player rows. ESPN is therefore identified explicitly as the NHL source; it is not presented as official NHL confirmation.

`north-america-roster-data.js` contains only source ID, name, position, birth date, birth country and shooting side, with a source URL, source season and raw-response SHA-256 for each club. Birth country does **not** establish national-team eligibility. Missing values remain missing. Photos, biographies and staff records are not imported.

## Repeatable collection

Run `python3 scripts/import-na-roster-evidence.py --cache /absolute/path/to/a/new/dated-cache --date YYYY-MM-DD`. Use a new cache for each new verification date. The date argument identifies the retrieval snapshot, not an arbitrary historical date. A previously fetched cache may be reused to reproduce that same snapshot offline. The script validates the target season, requires all 64 club responses, checks identity duplication and only writes the output after every response is parsed. It never updates a career or assigns an AHL affiliate from an NHL list.

Raw JSON is kept in the selected cache. The committed minimized snapshot is sufficient for the shipped register; runtime access never calls ESPN or HockeyTech. `conflicts` preserves any same-source identity appearing in multiple club lists for human review. Source IDs from different providers are not assumed to be equivalent.

## Still required before activation in matches

1. Confirm professional roster/contract status and actual NHL/AHL placements, separating signed players, prospects, loans and tryouts. Current AHL source responses are insufficient; a published roster or equivalent club-level verification is needed.
2. Resolve identities against existing Swedish and international career players using provider IDs or reviewed name/date matches. A same-name match alone must never create a transfer or overwrite a player.
3. Collect performance evidence for individual attribute estimates. Attribute estimates, potential and uncertain assessments must be distinguished from sourced biography. Do not derive playing strength from a famous name or roster presence alone.
4. Integrate contracts, AI squad selection, player development and match statistics; verify multi-season state/export budgets with full populations before activation.

Until those steps are completed, the existing North American match engine continues to use tracked career players plus its disclosed anonymous depth model. This update does not claim that full real NHL/AHL playing rosters are ready.

## Verification

Tests verify coverage against the actual game's 64 clubs, source/date/identity consistency, explicit AHL gaps, filtering and pagination, escaped text and zero mutation of a paused career. A parser fixture verifies that staff-only responses cannot become player rosters. Existing North American integration suites continue to exercise actual match and career behavior.
