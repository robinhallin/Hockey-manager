# Hockey-manager
## Attribute and staff assessment system

Player profiles now show 15 skater attributes or 6 goalie attributes on a 1–20 scale, as staff-estimated ranges. Current ability and potential use separate uncertain 0–5 star ranges relative to the manager's squad. Three assessors have different ability/potential judging skills and specialties. Reports give role suggestions, strengths and weaknesses. External players require up to three observations, each completed after a played round; refreshing or repeated clicks cannot accelerate progress.

New attributes are fictional game data, deterministically seeded from the old ratings, player identity and varied archetypes, then persisted. They are not researched assessments of real players. Existing saves migrate without resetting careers. Legacy overall/potential fields remain internal for compatibility with existing contract pricing and development progression; they are no longer displayed or used as the live match ability score. Development also improves a real attribute.

Live matches use weighted attributes for shots, passing/attack, defense, faceoffs, hits, penalty discipline, fatigue and goaltending. The active units contribute to manager team power; report uncertainty and assessor selection never alter actual match ability. Other fixtures still use the simpler background simulation. Staff recruitment, detailed scouting budgets and international leagues are future work.

Validation: `node coaching.test.cjs` and `node attributes.test.cjs`. Covers legacy migration, persistence, observation timing, assessor differences, attribute-driven ability, 14-club views, special teams and a completed match. Browser visual QA has not been performed for this release.
