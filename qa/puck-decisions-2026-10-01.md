# Puck decisions — 2026-10-01

Base: published main `5ce40f9333af91a7cff1b861fc9d8fefcf8046f7`.

## Changes

- Board-battle support ranks nearby available forwards using skating and velocity toward the battle. Backs retain coverage. Helpers still have to arrive inside the existing physical support radius; no remote possession or battle winner is awarded.
- Dump corner reads include velocity and the extra distance an offside teammate must skate to tag up. The expired stoppage check in the saved-dump rim continuation accepts negative countdowns. Current dumps still meet real board and equipment contacts; the legacy route cannot override a physical collision.
- Rebound pursuit requires an available puck, rather than a three-second-old save record. Controlled pucks, passes, battles, stoppages and cleared loose pucks release the old orders. A direct recovered rebound can receive the existing shot-context bonus for the first 0.85 seconds near the save spot; subsequent carrying does not.
- Loose-puck and net-front layers share a single pursuer per side. A travelling rebound retains its own pursuit orders; screen planning cannot replace them. A close battle is formed from the actual collecting player and nearby opponent, rather than distant claimants at the forecast endpoint.
- A saved rebound record cannot start a remote battle when a player later takes possession elsewhere. A genuinely close contested rebound retains the existing physical battle.

## Verification

`match-puck-decisions.test.cjs` covers motion-sensitive helper selection, physical arrival, dump corner changes, tag-up cost in both directions, direct put-back context and stale rebound release. `match-engine-4-rim.test.cjs` covers actual board contact and a saved legacy dump with an expired countdown. The existing career rebound fixture now explicitly places a loose puck at its claimed rebound spot, rather than asking players to chase a fictitious return while another puck is controlled.

`node scripts/check-playback-parity.cjs` completed regulation in full, extended, highlights and commentary modes with identical score (2–3), shots, statistics, energy, ice time and RNG. Physical-contact, equipment, shared-shot-model and route-screen tests passed locally. Three-dependent tests initially ran before dependencies were restored; their separate rerun passed all 34 checks. The shot-context fixture explicitly records the actual controlled puck and recovery time.

The 96-period production calibration and complete regression/desktop checks are required before merge. Their final results are recorded in the pull request.

## Reference scope

Ordered two-second frames from 150–174 seconds of the official LAK–COL condensed game were inspected. This short window contains a shot/replay, period transition and offensive-zone circulation. It is reference material for puck and player relationships, not evidence of full-game realism or a continuous live review of the new implementation.

- https://www.nhl.com/video/lak-at-col-condensed-game-6406002366112
- https://www.usahockey.com/news_article/show/1087000
- https://www.icehockeysystems.com/hockey-drills/2-vs-1-rebound-battle-drill

No change to goal probabilities, calibration thresholds or highlight selection is included.

The first candidate failed the unchanged 88% save floor (87.32%). Review identified competing loose-puck/rebound/screen assignments; the revised candidate shares the same pursuit selection and tests one pursuer per side plus exact target restoration through JSON reload. The failed candidate is not eligible for merge.
