# Hockey-manager
## Attribute and staff assessment system

Player profiles now show 15 skater attributes or 6 goalie attributes on a 1–20 scale, as staff-estimated ranges. Current ability and potential use separate uncertain 0–5 star ranges relative to the manager's squad. Three assessors have different ability/potential judging skills and specialties. Reports give role suggestions, strengths and weaknesses. External players require up to three observations, each completed after a played round; refreshing or repeated clicks cannot accelerate progress.

New attributes are fictional game data, deterministically seeded from the old ratings, player identity and varied archetypes, then persisted. They are not researched assessments of real players. Existing saves migrate without resetting careers. Legacy overall/potential fields remain internal for compatibility with existing contract pricing and development progression; they are no longer displayed or used as the live match ability score. Development also improves a real attribute.

Live matches use weighted attributes for shots, passing/attack, defense, faceoffs, hits, penalty discipline, fatigue and goaltending. The active units contribute to manager team power; report uncertainty and assessor selection never alter actual match ability. Other fixtures still use the simpler background simulation. Staff recruitment, detailed scouting budgets and international leagues are future work.

Validation: `node coaching.test.cjs` and `node attributes.test.cjs`. Covers legacy migration, persistence, observation timing, assessor differences, attribute-driven ability, 14-club views, special teams and a completed match. Browser visual QA has not been performed for this release.

## Career start and board objectives

The game opens on a full-screen arena menu with Continue Career and New Career. Club selection previews 14 distinct editorial game scenarios, transfer cash, annual wage limits and board expectations. A second screen presents the job offer before acceptance. The preview roster and budget are the exact values used when accepting. Selecting or cancelling a new career does not replace the active save; accepting preserves one previous career, which can be reopened from the menu. Menus and reloads pause ongoing matches.

New careers have tracked regular-season table, youth and financial objectives. Youth appearances require at least 300 seconds of actual match ice time; each match counts once. League and financial outcomes are evaluated at the end of the regular season. Development progress and current financial/league standing appear under Board and on the club overview. Objectives do not yet fire managers or simulate a playoff bracket. Older saves retain their finances and start tracking youth appearances from this update.

The interface uses midnight navy, ice-white text and a pale lime accent, with club monograms and a collapsible mobile menu. Club scenarios and financial resources are game design, not real club statements. `assets/arena-career.jpg` was generated with the built-in image tool, then compressed to JPEG for the game. Prompt: cinematic indoor hockey arena viewed from an empty coach bench; pristine ice, dark navy roof and stands, cold haze, bright floodlights center/right and dark left-side room for menu typography; no logos, text or people.

Validation: `node career.test.cjs` covers all club offers, exact budgets, start/resume, legacy saves, previous-career recovery, youth ice-time thresholds, finances and final standings. Existing coaching and attribute suites also pass. Static entrypoint assets and JS syntax checked; browser visual QA has not been performed.
