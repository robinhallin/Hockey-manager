# Matchstudion — shared simulation and career integration

Open `match-lab.html` for one 20-minute HV71–Färjestad period. This test route never reads or writes career storage. The integration used by the main game is documented below. Both clubs use a reproducible snapshot of their existing researched game attributes, exported by `npm run data:match-lab`.

## What to try

- Start a normal period, an established attack, a two-on-one counter, home powerplay/boxplay, or a live line change using **Startläge** and **Starta ny testperiod**.
- **Matchsändning** shows dangerous attacking sequences and replaces quieter build-up with a live overview. **Alla sekvenser** also displays the intervening play. The engine simulates every fixed step in either mode.
- Pause, change the match plan or PP/PK structure, give the instruction, then resume. Changing a tactical field pauses play immediately. Space also toggles pause outside form controls.
- Request the next unit. At a stoppage the formation can change; during play it changes one player at a time only while the team controls a safe offensive-zone puck. An outgoing skater must reach the actual bench gate before the replacement enters. A turnover cancels the outgoing change. The next replacement waits for its predecessor to join the play.
- Replay the last attempt. The live engine and clock stay paused; the replay reads immutable recorded frames. The match remains paused when the replay ends.

## Simulation and presentation

`match-simulation.js` owns a fixed 0.1-second simulation step, seeded randomness, puck ownership, movement, fatigue, unit changes, possession phases, shot outcomes and the event ledger. `match-lab.js` only interpolates those positions and presents the same events. Refresh rate, coverage selection and playback speed do not roll results.

The rink uses metre coordinates (60 × 30). Players accelerate, brake and preserve their positions between possession changes. Defensive assignments cover distinct threats, with defenders prioritizing deep attackers. Support players brake before the offensive blue line and tag up after a turnover; illegal entries stop for offside. Loose-puck play sends one pursuer per side while the other skaters continue supporting and covering.

PP offers 1–3–1 and umbrella shapes. PK offers box and diamond coverage, with one forward able to pressure the flank while teammates protect the slot. Established PP circulates the puck while units set up. An open slot, a lateral one-timer or a rebound can be taken immediately. Intercepted passes meet the actual defender along the passing lane. A controlled PK puck is normally cleared; a counter requires a free outlet. Penalties expire in playing time, with the returning skater entering through the penalty-box gate, or end on a powerplay goal.

Stats count actual attempts, shots on goal, saves, faceoffs and time in the attacking zone. Goals credit the shooter and up to two recent distinct passers. The pressure chart summarizes the same zone-time samples, rather than an unrelated momentum roll. Shot probability is an experimental game mechanic, not a calibrated xG model.

## Validation and limits

`npm run test:match-lab` covers six full-period start conditions, fixed-step repeatability, counts/identity/ownership, bounded movement, sequential changes, defensive coverage, PP setup, PK clear/return, attribute and tactical effects, lane interceptions, offside, statistics, replay immutability and save isolation. `node interface.test.cjs` checks the existing career interface still works.

Browser playtesting covers desktop and a 390 px embedded mobile viewport: startup, playing/pausing, counter and PP sequences, replay, instructions and readable controls. This is not a physical iPhone/Safari test.

This intentionally remains a prototype of one period and two fixed teams. It does not replace the career engine, import career formations, simulate a full season, implement icing, coincidental/double penalties, empty-net play, injuries or overtime. Movement and marking remain simplified hockey AI. Results and difficulty benefit from continued playtesting. Reusing the same scenario seed allows tactical comparisons from the same starting situation.

## Development

The tracked HTML, JS and CSS remain buildless on GitHub Pages. Vite is only a local preview dependency; `npm ci` then `npm run dev` runs the existing static game and prototype without rewriting either entrypoint. The supervised Sites preview uses that same development script for browser QA.

## Career integration (career5)

New fixtures in `index.html` now use `CareerBroadcastMatch` in `career-match.js` and the shared `match-renderer.js`. The original test route remains isolated from saves. Saved unfinished legacy matches finish with their original engine; the next fixture automatically uses the broadcast engine.

The adapter uses the career's actual club rosters and attributes, locked match squad (including eligible extras), selected forward lines, defense pairs, goalkeeper and two PP/PK units. The rival coach supplies the opponent lineup. Formation orders wait for a safe change or stoppage; the ice list always shows the actual players, including a mixed formation during a sequential change. Goalie changes and goalie extraction are queued for a stoppage. Three-on-three overtime uses four-on-three powerplay, then four-on-four until the next whistle; playoffs continue in twenty-minute five-on-five sudden-death periods. The existing shootout and season completion paths remain in charge of deciding and recording a finished fixture.

Resolved puck flights write to the existing analysis and league ledger exactly once. Goals, both assists, the keeper's saves/goals against, on-ice shot shares and PP goal attribution use the actual participants and strength at impact. Ice time uses the players present during each fixed step. The existing workload, medical exposure, morale, feedback, training familiarity, team chemistry and recovery systems remain connected. Shot choice, forecheck, tempo, physicality, mentality, shift length, line usage, all three PP shapes and both PK shapes affect the shared simulation through the adapter.

The renderer never advances the match or awards statistics. Live playback keeps controls mounted and runs fixed steps independently of canvas refresh; the career autosaves every five seconds and immediately on pause, period boundaries and match completion. Saving preserves RNG, puck flight, substitutions, energy and the last actual replay; interpolation history is excluded. Resuming a save restores player references and methods without replaying previously credited events. Hidden tabs pause the match. Replays pause the career clock and read captured positions only.

Validation: `npm run test:career-match` exercises a full three-period game, saved-flight continuity through the real start action, both sides' scoring and ice-time ledgers, no duplicate completion, chosen PP/PK players, exclusion and return of the penalized skater, goalie substitutions/extraction, 28 Swedish clubs, regular/playoff overtime boundaries, shootouts, friendly reporting and a PP goal with two assists. `npm run test:match-lab` protects the prototype's movement and event invariants. Browser checks cover career navigation into a match, pause, tactical orders, queued units, replay and a 390 px viewport. Native iOS/Safari is not covered.

This remains simplified hockey AI: one active minor penalty at a time, no coincidental/double penalties or icing in broadcast fixtures. The broadcast's shot probabilities are game mechanics rather than calibrated xG. Those limitations belong to the simulation and are not papered over with unrelated text events.


## Attribute and hockey update (realism4)

The fixed-step engine now resolves different hockey actions from the relevant individual attributes. This extends the existing positional match presentation; there is no second simulation or cosmetic outcome generator.

| Attribute group | Actual effect |
| --- | --- |
| Vision, decisions | Recognition of valuable pass options, reaction time, anticipation in defensive coverage |
| Passing, puck control, composure | Pass completion under pressure and receiving; composure also helps pressured finishing |
| Shooting, strength | Accuracy, finishing and shot velocity; wrist shots, slap shots, immediate lateral shots and rebound attempts |
| Positioning, work rate | Defensive gaps, interception/blocking lanes, recovery skating and off-puck support |
| Checking, strength, puck control, work rate | Timed contested possession with a winner, including board battles; physical contacts separately counted |
| Skating, acceleration, stamina | Real travel/acceleration, existing on-ice energy drain and recovery |
| Faceoffs, discipline | Faceoff outcomes and the risk of a called infraction during a close defensive challenge |
| Goalie positioning, movement, reflexes, composure | Tracking and physically reaching the shooting angle, then resolving the save against the real shot geometry |
| Goalie handling, rebound control | Freezing saves and directing unfrozen rebounds toward safer areas instead of the slot |

Shot geometry includes distance, shooting angle, defensive pressure, traffic, recent lateral reception and rebound context. Impossible shots from behind the goal line are rejected. Blocks meet an actual defender in the shot lane, including a close defender that the old normalized segment cutoff overlooked. For new shots on target, the goalkeeper's actual position at impact affects the outcome. The random trial is saved at release; the renderer does not draw random numbers or decide whether a goal occurred. Old travelling shots retain their already-decided outcome when an older save is loaded.

Rebounds travel out from the save as puck flights. The preceding shooter is eligible for a subsequent rebound assist if possession remains with that team; an opponent gaining control clears the assist chain. A player who has gone to the bench during a pass no longer causes a missing-passer crash. PP normally moves the box before shooting, but takes a genuine immediate opportunity. PK may fail to clear under pressure, or counter through a safe outlet according to its instructions. A neutral-zone dump requires an onside team and a release beyond the centre line. Controlled dumps and deep clearances permit a sequential change, with the normal turnover protection retained. A replacement is released from the entry queue after clearing the bench gate, rather than having to catch a moving tactical target. Individual continuous shifts remain authoritative even when a unit changes around them. Automatic career rotation prefers a rested unit when the scheduled unit is below 50% energy; explicit coach orders remain authoritative. Actual bench recovery is faster when depleted and tapers near full energy, while stamina and accumulated workload still matter.

The career view adds one compact explanation below the rink and stores it with the shot in the match report. Existing comparison statistics now include completion percentage, contested possessions, actual blocks, one-timers and dangerous rebounds allowed. This adds no new navigation or coach buttons. The selected shot's explanation also follows the replay.

### Save compatibility and verification

Migration is additive. Scores, participants, RNG, flight, penalties and existing analysis remain intact. New counters start at migration; old passes are excluded from the denominator and numerator of the new completion percentage. An old in-flight pass is excluded on reception too. The comparison table identifies partial new statistics by elapsed match time. New physical battles and shot contexts serialize alongside the existing match data.

- `npm run test:match-realism`: thirteen scenario/statistical checks plus four career integration checks, including physical-battle resume, older-save migration and retained shot explanation/replay.
- Paired finishing experiment: 4,000 identical clean-slot starting shots per variant, all other attributes and starting conditions equal. Shooting 4 produced 304 goals / 2,470 shots on goal; shooting 18 produced 634 / 3,142. These are controlled test fixtures, not predicted season scoring rates. Separate paired trials verify goalkeeper reflexes, positioning and composure; movement, handling and rebound control have their own relevant scenarios.
- `npm run check:match-balance`: reproducible sample of 24 independent twenty-minute HV71–Färjestad periods with seeds `i * 1107`. Projected per team per 60 minutes: 2.19 goals, 29.44 shots on goal, 48.69 attempts, 24.69 hits and 4.31 penalties. This is a tuning sample with these two rosters, not a guarantee for other clubs or a calibration against league event data.
- Browser QA: desktop and a 390 × 844 px iframe; existing saved career, live play, medical stoppage, pause/resume, tactical preset, replay, shot explanation and expanded comparison table. The mobile broadcast panel measured 343 px wide with 341 px scroll width. No application console errors were observed. This does not cover native Safari/iPhone.
- Existing match-studio invariants, full career match, all 28 clubs' selected lineups, both overtime formats, PP/assist/keeper accounting, friendlies and legacy-match continuity remain required regression checks.

### Hockey basis and remaining scope

The hockey concepts were checked against [Hockey Canada's goaltending principles](https://www.hockeycanada.ca/en-ca/news/seven-coaching-principles-goaltending-2024-ncw) and [Developing Skilled Defencemen](https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Players/Downloads/2018/2018-19-developing-hockey-defencemen-e.pdf). The former informs angle tracking, movement and rebound handling; the latter informs inside coverage, gap control, support, shot lanes and backpressure. Numerical weights and probabilities are this game's design choices, not published coaching or research measurements.

Still simplified: one active minor at a time, no icing in broadcast fixtures, no deflection-goal attribution, no 3D height/stick physics and no fully calibrated expected-goals model. The existing career shootout path remains in place. These are explicit remaining development areas; this release concentrates on normal live play and individual attribute effects.
