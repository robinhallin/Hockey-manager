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

## Recruitment centre and active player market

Transfers now opens a shared recruitment workspace: squad role coverage and succession needs, country/profile/age/fee/attribute filters, a shortlist, scout assignments, negotiations and transfer history. Estimates and 0–5 star ranges remain staff opinions relative to the squad; search uses estimated attributes rather than revealing true ratings. Two concurrent scout assignments each cost 25,000 SEK, observe up to three candidates over three market turns, and persist across reloads. Individual and assignment observations cannot double-count a player in the same turn.

The initial foreign market has 156 fictional players in six fictional clubs in Finland, Switzerland and Germany. These are not researched real rosters or playable leagues. They share the existing attribute, contract, training and season systems. A market turn follows a completed fixture round; during preseason a dedicated advance-week action produces observations and decisions without playing a match. Opening pages never advances the market.

Transfer offers specify fee, annual salary, duration and squad role. Pending bids reserve financial room. Clubs protect key players and minimum roster depth; players consider salary, playing role, contract length and the club's sporting level. A visible competing offer can win on those combined conditions. Decisions happen on the next market turn and recheck ownership and budgets before moving a player and money. New regular/key players have their promised minutes reviewed after three matches, using actual ice time. Outgoing player sales always require the manager's acceptance. Unfinished live matches block squad-changing user actions.

AI clubs periodically recruit for their weakest positional group, with cash/wage limits and a maximum squad size, and can bid for manager-listed players. Every completed transfer updates ownership, cash ledgers, team strength and transfer history. AI sellers keep at least two goalkeepers, six defenders and twelve forwards. Prior completed transfer history and an unfinished legacy contract discussion remain accessible after migration. Existing team lineups are rebuilt after manager transfers.

Limitations: the calendar still uses abstract fixture rounds and preseason weeks, with no real transfer-window dates. AI budgets and player preferences are game design; foreign leagues do not simulate fixtures. Contracts at other clubs still renew automatically at season rollover. Retirement and a comprehensive free-agent market remain future work.

Validation: `node recruitment.test.cjs` covers mission filters/cost/time, observation deduplication, persistence, player terms, competing bids, budget constraints, approved sales, active-match protection, unique ownership, minimum roster depth, AI transfers, preseason and views for all 14 clubs. Existing attribute, coaching, career, training and multi-season tests also pass. Static assets and JavaScript syntax are checked. Visual browser QA has not been performed.

## Locker room, leadership and team talks

The locker room joins captain selection, squad trust, individual conversations, unit chemistry and a persistent event journal. Players have deterministic, fictional ambition, loyalty, sensitivity and leadership traits. These are game data, not claims about real people. Traits, trust, captaincy and pair chemistry persist across seasons and old careers migrate without resetting existing attributes or contracts.

Individual conversations require context: praise recognises new attribute development, a bench explanation refers to the previous match, listening addresses dissatisfaction and a challenge depends on playing opportunity, fatigue and personality. Each player needs three played matches between conversations. Captain changes require five matches between appointments, affect the previous captain and familiar teammates, and a vocal captain can spread trust or doubt. A departing captain leaves an explicit vacancy.

Pair chemistry grows from actual simultaneous skater ice time and attended training in selected units. Resting players and unused units do not gain chemistry; duplicate special-team pairs count once per training session. New combinations start at a neutral baseline. Goalies do not receive skater-pair chemistry.

Team talks are available once before first faceoff, at natural period breaks (including repeated playoff overtime) and after the final whistle. Simply pausing during a period does not unlock another talk. Players respond to support, demands, praise or calm instructions according to personality and score. Repeating one message reduces its effect. Period motivation expires at the next period; postgame talks only affect trust. Combined chemistry, trust and motivation alter manager team power by at most +/-2, leaving attributes and tactics dominant. Promise fulfilment/failure feeds into trust once per promise, while persistent unexplained lack of promised ice time creates concerns.

Validation: `node locker.test.cjs` covers deterministic personalities, migration/reload, simultaneous ice time, rest/training, evidence-based dialogue, captain ID zero and cooldowns, promise finalisation, actual match-engine period transition, one talk per pause, and all 14 club views. Existing coaching, attributes, career, training, season and recruitment tests also pass. JavaScript syntax and local entrypoint assets are checked; visual browser QA has not been performed.

## Medical team, injury risk and rehabilitation

The medical page provides workload/risk signals, injury reports, approximate rehabilitation ranges, return-to-play decisions and a journal. These are abstract game mechanics, not real medical guidance. Risk responds to fatigue, accumulated workload, hard training and an unfinished comeback. A persisted random stream drives medical incidents; opening a view does not progress time or reroll an event.

New injuries occur during attended training or actual match exposure in the manager's squad. During a live match an injury pauses play and removes the player from eligible formations. Normal units, PP/PK, goalie selection, scoring assists and ice-time accounting respect availability. Existing healthy selections are retained while vacancies use eligible reserves. Short benches reuse available skaters across shifts without duplicating anyone on the same unit. If the team falls below one goalie, two defenders and three forwards, play cannot resume; the manager can register an abandonment loss. Between matches fictional academy players can fill positional shortages, at 350,000 SEK per year on three-year contracts.

Rehabilitation advances once per completed training session and once per completed manager match; a preseason week advances seven recovery days. Injured players follow rehab rather than team training, gaining no normal training XP or chemistry. After initial recovery they enter a gradual return stage. The manager can keep resting, allow limited minutes (10 for skaters, 30 for goalies), or permit full return at 85% readiness. A limited player's time is capped exactly and they leave the rotation at the limit. Comeback plans cannot change during an unfinished match. Returnees can suffer setbacks; full recovery removes the restriction. Medical records persist across seasons and transfers; injured players sold to other clubs continue recovering as time advances, although new AI-club injuries are not simulated.

Medically excused absences do not consume playing-time promise opportunities or create benching-related distrust. Existing saves migrate without replacing attributes, contracts or fatigue. Reports and medical controls are linked from player profiles and the manager inbox.

Validation: `node medical.test.cjs` covers migration, time/reload, hard-training exclusion, formation/PP/PK/goalie replacements, exact comeback caps, live injury pause, promise exemptions, setbacks, offseason rehabilitation, depleted squads, academy limits and 14-club views. All seven prior suites also pass. JavaScript syntax and local assets are checked; visual browser QA has not been performed.


## Match analysis and player trends

Statistics & analysis now has a shot map, actual goal/penalty timeline, individual minutes and production, and formation comparisons over the last five/ten games, current season or retained history. Reports are also linked from the coach bench and inbox. The archive retains up to the latest 80 manager matches across regular seasons and playoffs, with immutable player/attribute snapshots. Oldest reports are evicted earlier when the archive exceeds 1.2 million JSON characters, leaving storage room for the rest of the career. Old finished games are not reconstructed; a migrated unfinished match is explicitly partial. Shootout deciders and administrative abandonment goals are labelled and excluded from ordinary shot/player/unit scoring statistics.

Shot coordinates are newly generated game-model positions, not real-world tracking data. They alter the same goal probability used for the shot outcome by a bounded factor (0.8–1.15). Every actual attempt, including posts and second rebound attempts, is recorded with its actual outcome. These are attempts, not official shots-on-goal or externally calibrated xG. Both attacks point right on the map; an accessible event list offers the same information without interpreting dots.

Units follow actual player combinations, with separate powerplay/penalty-kill/overtime records. Regular forward and defender rows share team events and must not be added together. Minutes honour medical return limits. Per-60 figures and assistant observations expose sample-size limitations; observations cite recorded evidence and do not claim causality. Own-player comparisons show production and recorded attribute changes, with no overall rating. Data is local to the user's career and does not reconstruct AI match details.

Validation: `node analysis.test.cjs` covers shot outcomes/rebounds, goal/assist accounting, PP/PK and actual combinations, minute reconciliation, frozen snapshots/reload, partial migration, shootout exclusion, archive cap, all 14 club views and a complete simulated match. The eight earlier suites cover existing mechanics, including playoff reporting. JavaScript syntax and local assets are checked. Visual browser QA has not been performed.


## Academy, mentors and development loans

Juniorer & talanger provides a persistent 20-player fictional academy (two goalies, six defenders, twelve forwards). Existing careers migrate without replacing senior players or past reports. Individual role plans target actual role attributes; training load, age, coaching environment, fatigue and hidden attribute-specific development limits influence progress. Staff assessments show separate uncertain ability/potential ranges, relative to the senior squad and chosen role. Staff competence, specialism and observations affect the estimate; viewing or reloading a report never rerolls talent.

Youngsters can stay in junior training, attend senior sessions while still playing junior games, move to the senior roster, or join one of two explicitly fictional development-loan clubs for eight senior match rounds. Loan minutes depend on role competition and fatigue; goalie starts rotate. Recall is available between matches. Senior promotion transfers the same player object, checks wages, and activates a three-year contract for a first promotion. Returning to the academy preserves salary commitments, age, attributes, identity and history. Over-age academy releases settle any remaining senior salary commitment. Existing emergency/offseason call-up buttons select real academy members rather than creating unlimited replacements.

At each finished manager match the academy plays a simplified development fixture if enough eligible players remain. Registered minutes—not selection alone—drive match development. Junior/loan production is kept separate from senior stats and board goals. Senior graduates continue using the existing match engine and its actual minute-based development. Mentors must be available experienced senior players, with compatible goalie/skater groups and at most two mentees. Attended training builds work habits (skaters), composure (goalies) and confidence; absent, injured, resting or loaned players receive no mentoring benefit. Injuries carried back from the senior team continue rehabilitating off the senior roster. New junior injuries and a full junior league table are not simulated.

At the annual preseason transition, academy ages advance once, loans return, and up to six 16-year-olds arrive, subject to a 30-player academy capacity. Players over 20 stop playing junior fixtures and need a senior/loan/release decision. Graduates age with the senior roster, not twice. Intake history, recent development matches and evidence-based progress advice remain in the academy journal. Three development sessions run with each offseason week; no additional offseason junior fixtures are fabricated. Match/intake/player journals are bounded.

Validation: `node juniors.test.cjs` checks migration/persistence, training idempotency, coach uncertainty, mentoring attendance/cap, promotion ownership/wage limits, retained contracts, loans/recall, actual participation and score reconciliation, rehabilitation, annual intake/age limits/cap, and views for all 14 clubs. The nine existing suites also pass, including full engine matches, playoffs, transfers and saves. Entrypoint assets and JavaScript syntax are checked. Visual browser QA has not been performed.


## Spatial 2D match engine

The match page now opens on a live top-down rink with the actual selected skaters, goalies and puck. CSS interpolates snapshots from the possession engine; opening, selecting or refreshing the view never generates a new event. Desktop labels and an accessible numbered player list identify players; mobile controls allow pause, tactics, substitutions, timeout and pulling the goalie. Reduced-motion preferences show the same positions without animation. The manager always attacks to the right for a stable viewing orientation. Text commentary and detailed statistics remain available below the rink.

A persisted possession model replaces independent random attacks in regulation and overtime: faceoff, buildup, carry, pass, interception, shot, save, loose rebound and recovery. Skating, passing, vision, puck control, checking, positioning and faceoffs affect actual movement and decisions. Distance and defensive lanes influence passing and blocked shots. Forecheck changes pressure positions; attacking/defensive shape, tempo, PP/PK selections and available skater counts affect the sequence. Fatigue affects both sides; the existing familiarity, special-team preparation, chemistry and team-talk bonuses feed into decisions with bounded influence.

Shots use the shooter's actual normalized rink coordinates in both the goal model and analysis archive, with distance/angle influence and spatial conversion scaling. Recent actual passes provide assists; standalone shots do not invent an assister. Retur attempts occur in subsequent possession steps, not as invisible instantaneous shots. Blocks are tracked separately from attempts. A powerplay goal ends one opposing minor penalty. Pulling a keeper adds a real extra skater with recorded ice time and exposes the empty net; the opponent pulls only within two goals and returns its keeper on equalizing or falling three goals behind, and overtime begins with goalies back in place.

Playback speed and highlights affect wall-clock delay only: all modes run identical six-second simulation steps, including quiet play, shifts, penalties and minutes. Period boundaries are processed before additional play; overtime uses the same spatial engine with playoff sudden-death periods preserved. Navigation away from a running match pauses it. Existing unfinished saves gain a scene without resetting their score, time, lineups or analysis; reload resumes paused.

This is a schematic possession simulation, not continuous collision physics: animations interpolate between game snapshots, faceoffs reset positions, and shootouts remain in the text/result flow. Offside and icing were added in the hockey-depth update below. No claim is made to calibrated real-world xG or tracking data.

Validation: `node rink.test.cjs` covers geometry and attributes, contextual shots/assists, actual PP/PK and extra skaters, pause/reload, speed/highlight invariance, legacy migration, 14 club scenes and a complete spatial match with reconciled shot and ice-time records. The ten earlier suites pass, including playoffs and medical substitutions. Bounded full-match simulations were used to tune the shot conversion scale. Static entrypoints and JavaScript syntax are checked; visual/browser QA has not been performed.


## Hockey depth: roles, special teams and stoppages

The match plan and rink offer controlled possession, counterattacking and high-pressure styles. Choosing a style sets a matching initial forecheck; the manager can adjust details afterwards. Changing style pauses play and contributes to tactical familiarity. Counterattacking movement accelerates briefly after possession changes; controlled attacks favour safe passing options. Off-puck forwards seek free lanes or drive the net, defenders cover behind the puck, and support normally waits at the attacking blue line.

Established powerplay uses explicit point, flank, middle and net-front assignments (adapted for fewer skaters). The penalty kill protects the slot in a box or triangle and prioritizes clearing under pressure. Pass selection rewards circulation in PP; shooting waits for better development of the play. Blocked shots are credited to a defender actually occupying the shooting lane. Loose rebounds and clears stay loose until a skater reaches them; distance, positioning and strength decide recovery.

Zone entries use prior skater/puck positions for simplified immediate offside. Full-length pressured clears from behind the centre line produce simplified icing, except while shorthanded. The offending side cannot switch units before the faceoff; medical replacements remain available. Faceoffs return to the correct end or neutral side with lateral dot positions. Goalies freeze under pressure or attempt an outlet when safe. Empty-net misses are recorded as wide attempts, never saves by an absent goalkeeper. Stoppage/clear counts persist into match analysis; old saves initialize counters without inventing history.

Playback holds goals slightly longer and gives dangerous situations more viewing time without changing the fixed simulation steps. These rules use the game's schematic coordinates, not continuous skate/puck collision or hybrid-icing race adjudication. Delayed offside and the full set of official rule exceptions are outside this model. Shootouts remain text-driven.

Validation: `node hockey.test.cjs` covers PP roles and box/triangle defense, both-direction positional offside, icing and line-change restriction, PK exemption, reachable loose-puck recovery, goalie freeze/outlets, style effects, pause/reload/migration, empty-net misses and 14 club views. The eleven existing suites also pass, including full matches, statistics reconciliation and identical simulations at different playback speeds. JavaScript and entrypoint assets are checked. Visual browser QA has not been performed.

## Club building: personnel and operating finances

Personal adds five staffed roles: assistant, head scout, goalie coach, junior coach and physiotherapist. Fifteen fictional candidates are generated deterministically each season. Managers review salary, contract end and replacement compensation before signing; minimum demands, one-to-three-season terms, the annual personnel budget, reserved transfer fees and available cash are checked again at acceptance. Active matches block personnel changes. Replacing/releasing an employee costs half of their estimated remaining salary; renewal is available in the last contract year and must extend the term. Expiring contracts leave an unpaid, lower-skilled interim in the role, so existing assessment and training flows keep working. Contract reminders and expiry notices reach the inbox. Candidates already hired cannot be repeatedly rehired in the same season.

Personnel are connected to the existing simulation: senior and goalie coaches affect actual training XP, junior coaches affect club-based academy training, assessor competence and person-specific bias affect reports, a head scout with ability judging of at least 16 unlocks an extra concurrent mission, and the physiotherapist affects senior workload recovery and comeback readiness. Existing assessor roles remain stable and initial report bias is preserved. No personnel bonus changes a player's true match attributes directly.

Ekonomi now shows cash, separate player/personnel annual limits, a forward cash estimate, season category totals, a bounded transaction ledger and ten fiscal-year summaries. Transfers, scout assignments, severance, academy contract settlements and board grants use the same cash ledger. Existing cash is the opening balance; historical transactions and missed salary instalments are not reconstructed. The initial personnel budget is 3.2 million SEK/year; the five initial salaries total 2.34 million. Initial staff and all resources are fictional game scenarios.

Only home matches earn ticket revenue. Ticket price, fan demand, standing, arena capacity and playoff demand determine a simple attendance estimate. Home event costs and away travel costs differ. Annual player wages (including contracted academy players), staff wages, operations and sponsor/central distributions settle in 52 regular-season instalments. This allocation includes offseason and playoff employment: additional playoff fixtures only add ticket revenue and matchday costs. This remains the game's abstract fixture calendar, not real monthly accounts. Sponsor/central income is initialized from the club's wage scale, then changes by -4% to +4% per year according to fulfilled board goals. Existing preseason board grants remain and are recorded. No sponsor negotiation, debt interest, bankruptcy or dismissal is added.

One optional operating priority can support junior development (+15% club academy XP, excluding loans), senior training (+10% XP), or scouting (one extra concurrent mission and 20% lower mission fees). The annual extra cost is displayed before choosing and charged prospectively during regular rounds. Rest does not generate training gains. Choosing no extra investment preserves cash. Priorities/prices cannot change during an unfinished match. Forecasts hold the roster, fan demand, current salaries and chosen policy constant, deduct reserved transfer fees, and exclude future playoffs, board grants and unsigned-player salaries; preseason forecasts use a full upcoming regular season. Negative cash blocks new paid personnel commitments but does not end the career.

Validation: all thirteen Node suites pass (the legacy-attribute migration case was repaired and rerun), including a full match, multiple seasons, all 14 club views and saves. `club.test.cjs` checks once-only home/away/playoff settlement, cash reconciliation, review-before-signing, budget and reserved-fund rejection, active-match protection, termination, renewal, annual expiry, migration and actual senior/junior training and rehab effects. JavaScript syntax and local entrypoint assets pass. Visual browser QA has not been performed.

## Manager career, board confidence and jobs

Min karriär now has an editable coach name/identity, earned reputation, board confidence, an employment contract, season achievements and a persistent career timeline. Existing saves start a new evaluation record without retroactively judging old results or resetting club/player data. The initial contract runs for two seasons. The manager's salary is a separate operating-finance entry, paid over the same 52 regular-season instalments and included in the cash forecast.

Board check-ins happen once per eight newly played regular fixtures. Results contribute 50%, youth progress 20% and finances 30%; during the season youth progress is compared with elapsed fixtures. Season-end results determine reputation changes, with an additional championship reward. Two consecutive final confidence scores below 45 result in dismissal; a poor final contract season can instead result in non-renewal. Decisions apply at the preseason boundary, so there is no mid-playoff club switch or sudden one-loss dismissal. Good final-year reviews offer an explicit contract extension. Managers awaiting a renewal or out of work must resolve employment before starting another season or managing matches, training, paid recruitment or staff commitments.

Preseason jobs are drawn from the existing 14-club league, prioritising clubs that underperformed their editorial targets. The job-week action reveals further vacancies without rerolling rejections or changing player ages. Interviews use earned reputation, the coach identity and fit with the club's expectations. The manager sees the actual roster, cash, wage limit and board brief before accepting, plus their offered salary and contract end. A low-reputation manager can eventually access a building-club vacancy; there is no forced new-save restart. Job seeking is an abstract offseason hiring window, not an independently simulated global coaching market.

One appointment per preseason is allowed. Pending transfer bids and unfinished matches block a switch. Changed cash/budget figures must be reviewed again before acceptance. Switching does not call newState: worldwide player ownership, attributes, schedule, transfer history and career/season/match archives remain intact. Club cash, personnel, academy, tactical familiarity, scouting reports and other club-owned state stay with their club. Old assignments are cancelled on departure; player promises tied to the outgoing coach are closed. The previous employer receives its actual current cash as its AI market budget. A return uses the AI club's updated cash and its preserved academy rather than awarding a fresh starting budget. Stored academy ages/contracts and staff expiry are brought forward on return, but inactive academies do not receive fabricated development sessions, injury recovery or new intakes. This is not a complete AI-club daily management simulation.

Match-report archives retain both employers, while trend calculations filter to the currently managed club. New club board targets are unassessed before its next season starts. The current club remains the last employer internally while the coach is unemployed; the interface shows the career/job workspace and blocks season launch until an appointment or extension is accepted.

Validation: fourteen Node suites pass, including legacy save migration, full matches, multiple seasons and finance/scouting/training regressions. `manager.test.cjs` checks evaluation idempotency, dismissal boundaries, unemployment guards, persistent rejections, budget re-review, transfer blocking, roster/attribute/schedule preservation, club-owned academy/cash on departure and return, renewal, reload and a completed match after changing jobs. Syntax and entrypoint assets pass. Visual browser QA has not been performed.

## Two playable leagues and promotion/relegation

The game now contains 28 playable clubs: the existing 14 SHL clubs and 14 Hockeyallsvenskan clubs, each with 52 regular fixtures (728 fixtures in total). Career selection offers a league filter. The added club names follow the published 2026/27 opening round: https://www.hockeyallsvenskan.se/article/18hatf8-1el1/view . Each new club has 24 deterministically generated fictional players; these are explicitly not researched real rosters. Club goals, finances, playing strengths, attendance and player reactions are game scenarios.

Regular fixtures are generated separately per league: each pair meets four times, with 26 home and 26 away games per team. Both leagues advance on each played round; the manager's fixture is never simulated in the background. Tables, opponent selection, career targets and league labels use current league membership. The new Ligavärlden page shows both tables, each playoff bracket, the SHL survival series and historical league changes. Ordinary fixtures still use the existing simpler background simulation; the managed game uses the full rink engine.

Both leagues run parallel top-ten playoffs: 7–10 play best-of-three, then quarterfinals, semifinals and final use best-of-seven with reseeding. SHL places 13–14 separately play best-of-seven survival, with home sequence H-H-A-A-H-A-H. The HA playoff champion replaces the SHL survival loser at the preseason boundary; there is no fabricated direct SHL-vs-HA promotion series. Managed survival matches use the same five-skater, repeated sudden-death playoff overtime. The whole postseason finishes before the year rolls over. Structural references: https://www.hockeyallsvenskan.se/slutspelet2026 and https://www.shl.se/sa-spelas-shl-kvalet . This does not implement Hockeyettan or HA relegation to a third tier; that boundary is explicit in the interface.

Promotion/relegation preserves player identity, attributes, salaries and existing contracts. It changes the following season's operating income and wage room: the manager's sponsor/central income scales by 1.7 on promotion or 0.55 on relegation, and the wage limit by 1.5 or 0.7; operating costs and personnel limits adapt to the new tier. Actual wages do not automatically shrink. Ambitious relegated players lose happiness, request a higher level and become transfer-listed; outgoing transfers still require acceptance. Promotion improves morale and clears previous relegation-driven requests. Moving down voluntarily is also reflected in ambitious recruits' salary demands. Job vacancies span both divisions, with lower entry requirements in HA; promoted/relegated clubs get targets appropriate to the next tier. These are balancing rules, not real competition financial regulations.

Existing careers retain all old fixtures and results. A newly introduced HA background league is caught up deterministically to the old save's current regular round; old SHL fixtures and money are untouched. Saves already in playoffs/review/preseason keep their existing postseason rules and start the new two-league playoffs after the next season launch. No old results are retroactively used to relegate the player. Frozen season tables remain visible through preseason; the new membership determines the next schedule. Movement application is once-only across refreshes and save/reload.

Validation: fifteen Node suites pass. The dedicated league suite verifies 28 clubs, 728 fixtures, 26 home games per club, no cross-league regular fixtures, unique fictional player IDs, a full HA game, both migration paths, concurrent playoffs, no automatic simulation of managed survival games, overtime, promotion/relegation financial effects and player reactions, repeated rollover protection, next-season membership and reload. Prior tests now exercise all 28 club offers and views; expected bracket/schedule sizes were updated for the added competition. JavaScript syntax, local assets and git diff checks pass. Visual browser QA has not been performed.


## Riktiga allsvenska starttrupper (2026-09-05)

325 verkliga spelare i samtliga 14 allsvenska klubbar för nya karriärer.
Individuell grundseriestatistik från 2024/25 och 2025/26 ligger till grund
för ligajusterade attribut. Spelarkort visar underlag och direktlänkar till
källorna; inga exakta scoutingbetyg eller löner påstås vara verkliga.
Befintliga karriärer behålls. Se [metod, källor och begränsningar](ALLSVENSKAN_RESEARCH.md).

Nya moduler: `allsvenskan-data.js` (fakta) och `allsvenskan.js` (spelmodell).
Test: `node allsvenskan.test.cjs`. Alla befintliga VM-sviter laddar båda modulerna.

## Player-world renewal

The shared player world now advances once at each preseason boundary. Existing
careers keep current rosters; old club-specific free-agent lists migrate into a
single pool, deduplicated against employed players and across saved employers.
Contractless players use the existing scouting, player wishes, reserved salary
budget, competing offers and timed decisions, with exactly zero transfer fee.
The old instant two-year re-sign button now opens a normal negotiation.

Players can retire from age 36 (38 for goalies), with increasing deterministic
career-specific probability and a maximum playing age of 43. Retirement removes
them at the offseason boundary, including from the managed roster; inbox reports
explain departures. These are game events, not real-world retirement predictions.
Historical snapshots and original researched statistics remain unchanged.

AI clubs assess expiring contracts by positional depth, age, salary room and a
limited desire for a new challenge. Renewals vary from one to three years; players
who are not retained enter the shared free-agent market. Contracted AI youngsters
through age 25 gain one attribute per year while development room remains. This
is a modest background model, not a simulation of their daily training.

AI clubs fill positional shortages from affordable free agents, then fictional
academy graduates if necessary, retaining at least two goalies, six defenders and
twelve forwards. Emergency academy salaries can put a troubled AI club over its
budget rather than make its fixtures unplayable; ordinary signings stay budgeted.
Two additional fictional prospects per AI club annually compete for senior slots;
those without room enter the market. Pending user targets are excluded from
emergency recruitment. Normal rival-offer resolution remains active.

Contractless players age and receive rehabilitation. After three unemployed
offseasons they leave the tracked market (distinct from retirement), bounding
pool growth. The world retains 700 compact event records and 20 yearly summaries.
Rekrytering contains Kontraktslösa and a filterable Spelarvärlden journal.
The shared pool persists across coaching jobs. Foreign clubs remain fictional
recruitment destinations, not playable simulated leagues. There is no new real
calendar or transfer-window regulation in this update.

Validation: player-world.test.cjs covers migration/deduplication, scouting and
zero-fee negotiations, retirement, AI contract decisions, eleven offseason
transitions with valid unique rosters, bounded history, free-agent rehabilitation,
reload and views. Existing recruitment, season, manager, medical and league tests
cover interacting systems. Browser visual QA has not been performed.
