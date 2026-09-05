# Hockey-manager
## Attribute and staff assessment system

Player profiles now show 15 skater attributes or 6 goalie attributes on a 1–20 scale, as staff-estimated ranges. Current ability and potential use separate uncertain 0–5 star ranges relative to the manager's squad. Three assessors have different ability/potential judging skills and specialties. Reports give role suggestions, strengths and weaknesses. External players require up to three observations, each completed after a played round; refreshing or repeated clicks cannot accelerate progress.

New attributes are fictional game data, deterministically seeded from the old ratings, player identity and varied archetypes, then persisted. They are not researched assessments of real players. Existing saves migrate without resetting careers. Legacy overall/potential fields remain internal for compatibility with existing contract pricing and old-save migration; they are no longer displayed or used as the live match ability score. Development also improves a real attribute.

Live matches use weighted attributes for shots, passing/attack, defense, faceoffs, hits, penalty discipline, fatigue and goaltending. The active units contribute to manager team power; report uncertainty and assessor selection never alter actual match ability. Other fixtures still use the simpler background simulation. Staff recruitment, detailed scouting budgets and international leagues are future work.

Validation: `node coaching.test.cjs` and `node attributes.test.cjs`. Covers legacy migration, persistence, observation timing, assessor differences, attribute-driven ability, 14-club views, special teams and a completed match. Browser visual QA has not been performed for this release.

## Career start and board objectives

The game opens on a full-screen arena menu with Continue Career and New Career. Club selection previews 14 distinct editorial game scenarios, transfer cash, annual wage limits and board expectations. A second screen presents the job offer before acceptance. The preview roster and budget are the exact values used when accepting. Selecting or cancelling a new career does not replace the active save; accepting preserves one previous career, which can be reopened from the menu. Menus and reloads pause ongoing matches.

New careers have tracked regular-season table, youth and financial objectives. Youth appearances require at least 300 seconds of actual match ice time; each match counts once. League and financial outcomes are evaluated at the end of the regular season. Development progress and current financial/league standing appear under Board and on the club overview. Objectives do not yet fire managers. Older saves retain their finances and start tracking youth appearances from this update.

The interface uses midnight navy, ice-white text and a pale lime accent, with club monograms and a collapsible mobile menu. Club scenarios and financial resources are game design, not real club statements. `assets/arena-career.jpg` was generated with the built-in image tool, then compressed to JPEG for the game. Prompt: cinematic indoor hockey arena viewed from an empty coach bench; pristine ice, dark navy roof and stands, cold haze, bright floodlights center/right and dark left-side room for menu typography; no logos, text or people.

Validation: `node career.test.cjs` covers all club offers, exact budgets, start/resume, legacy saves, previous-career recovery, youth ice-time thresholds, finances and final standings. Existing coaching and attribute suites also pass. Static entrypoint assets and JS syntax checked; browser visual QA has not been performed.

## Training and the manager's daily work

Each fixture now has three abstract training days. FORTSÄTT executes the next session, presents a report, handles an outstanding player conversation, or opens the match. Managers can edit only future sessions, select a preset, or delegate the remaining sessions. Going directly to a match skips the remaining training; a started/paused match locks training for that round. This is an abstract fixture cycle, not a real-world league calendar.

Seven session types cover recovery, technique, physical work, tactics, powerplay, penalty killing and match preparation. Light/normal/hard intensity trades development against fatigue. Individual rest and lighter training override team load and persist until changed. Goalkeepers have appropriate individual attributes and a dedicated coach. Training XP depends on age, coach training skill, fatigue, development room and the chosen focus. Completed XP improves actual 1–20 attributes. Real match minutes also contribute, starting at five minutes; being dressed alone no longer develops a player. Legacy development progress migrates into attribute training progress.

Tactical familiarity is specific to playing style/forecheck/tempo, improves through attended sessions and matches, and adds a bounded live-match modifier. PP/PK preparation adds its own bounded modifier in the corresponding situation. Resting the entire squad cannot generate tactical gains. End-of-match recovery is now smaller because between-match training/recovery is an actual choice. Goalkeeper fatigue also affects saves.

The new inbox includes training results, development reports, uncertain opponent analysis, scout reports, club/transfer news, board updates and player conversations. Players with low happiness or limited young-player ice time may request a larger role. A promise requires at least 15 minutes in two of the next three actual matches; fulfilment or failure changes happiness, and repeat replies/counting are prevented. An honest refusal avoids a promise. This release does not add a medical injury model or staff recruitment.

`training.test.cjs` verifies once-only training, reload/migration, past-session locking, individual rest, real attribute gains, goalie focus, tactical participation, promises, all 14 club views, and a complete training→match→scouting→next-period loop. Career, coaching and attribute tests also pass. Static entrypoints and JavaScript syntax checked; visual browser QA has not been performed.

## Complete seasons and career history

The season module connects 52 regular rounds to a seeded playoff bracket: places 7–10 play best-of-three, then quarterfinals, semifinals and final are best-of-seven. Home sequences follow https://www.shl.se/sa-spelas-sm-slutspelet. Playoff overtime uses five skaters at even strength and repeated 20-minute sudden-death periods, without shootouts. Managers play their own fixtures; spectator progression stops whenever their next fixture becomes available. Eliminated and non-qualifying teams can follow the bracket to its conclusion.

Regular standings and board evaluations are frozen before playoffs. The season page shows the bracket, results, champion, board review and archived player statistics. Preseason advances ages and contracts once, awards a board-based grant and wage limit, allows expired contracts to be renewed or released, and offers fictional academy players to fill roster gaps. Remaining AI clubs renew expiring contracts automatically. Starting the next regular season resets season statistics and fixtures while retaining attributes, squad, money, tactical familiarity and career archives. Over-budget squads can proceed, with the financial objective still unmet.

This release keeps the same 14 clubs: promotion/relegation, external leagues, retirement, detailed calendar scheduling and a complete free-agent market remain future work. Training still uses abstract days per fixture. Existing saves migrate automatically. `node season.test.cjs` verifies all stages, qualification and elimination paths, save/reload, real final-round transition, multiple-season archives, contract expiry, budget idempotency and repeated overtime. All four previous suites pass; browser visual QA has not been performed.
