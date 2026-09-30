# Moving pass reception — 2026-09-30

## Reference and diagnosis

Official SHL footage: Timrå IK–HV71, highlights 2026-02-28,
https://www.shl.se/single-video/video%7Cstaylive%7C506434?tags=custom.highlights
(StayLive video 506434). Inspected paused positions at video time 20.96,
22.50 and 24.04 seconds: breakout along the near boards, continued movement
up ice and a broken pass under pressure. At 33.26 and 35.24 seconds the
powerplay retained support and traffic while the penalty killers protected
the middle. These are positional references, not a claim of a continuously
watched successful reception or a measured real-world speed benchmark.

The production simulator led every receiver by a fixed 0.25 seconds, even
on longer passes. It then assigned the receiver the puck endpoint as a
movement target, causing the acceleration model to brake before reception.
The renderer began preparing the hands only inside three metres of the
puck, leaving very little preparation time on fast passes.

## Production changes

- `match-simulation.js`: iteratively lead the observed receiver velocity
  using pass travel time, bounded to 0.24–0.9 seconds and rink coordinates.
  Existing accuracy, offside, interception and physical contact remain.
- A reachable pass ahead of a moving receiver now gives a movement target
  through the reception. Behind, stationary or unreachable passes retain
  braking/turning requirements. No forced reception or actor relocation.
- `match-3d.js`: prepare the existing upper-body/stick pose from recorded
  flight timing, starting up to 0.65 seconds before arrival. Old recordings
  without that timing retain the distance fallback. Replay seeking is pure.
- `index.html`: refresh simulator and renderer cache versions.

No new models, animation clips or external assets were added. SHL footage
is referenced only and has not been redistributed or used as game assets.

## Checks completed locally

40 targeted tests pass, including six new tests in
`match-moving-reception.test.cjs`: lead in both directions, swept contact
while moving, unreachable/backward targets, boards and offside, preparatory
pose and replay seek, legacy frame fallback, and save/load during a pass.
Four of the first five new checks fail on the previous simulator/renderer;
the existing boards/offside protection also passes on the previous version.

`scripts/check-moving-passes.cjs` compares 32 autonomous 60-second sequences
with two complete fives and goalkeepers, mirrored starting states and seeds.
The engine chooses all subsequent actions. Baseline is main `5bd94e8`.

| Measurement | Before | After |
| --- | ---: | ---: |
| Completed receptions launched with receiver above 2 m/s | 210 | 210 |
| Those receptions completed below 1 m/s | 124 | 4 |
| Median speed at those receptions, m/s | 0.739 | 3.807 |
| Pass attempts / completions | 390 / 256 | 404 / 275 |
| Shots / goals | 48 / 15 | 56 / 18 |
| Maximum active skater displacement per 0.1-second step, m | 0.475 | 0.472 |

These are deliberately attacking starting states. Increased goals are not
evidence of better realism or a league-wide balance result. Later trajectories
diverge because reception changes subsequent decisions.

The existing 96-period calibration check passes: per team per 60 minutes,
3.344 goals, 28.703 shots and 54.953 attempts; save percentage 88.35%.
These are project regression bounds, not newly verified SHL reference data.
Full, extended, highlights and commentary modes produce identical score
(4–2), statistics, shot records, ice time, energy and RNG state for one full
match with the same seed. Save schema and stable player IDs are unchanged.

## Visual and performance limits

No long normal-speed recording of this new version has yet been visually
reviewed. Logic and pose tests do not establish that animation looks good.
Windows UI CI and its frame-time artifact must be checked on the final head;
results will be recorded in the PR after they complete.

The previous Windows run used a software Microsoft Basic Render Driver on
a Xeon Platinum 8370C runner. Normal/low median frame intervals were
125/78.1 ms, far from 60 fps. This change does not claim to fix performance
or to establish a gaming GPU reference result.

Remaining: authored skating/reception clips and better character assets,
direction-sensitive physical stick control, deeper goalie motion and team
decisions, sustained visual before/after review, and GPU performance work.
The existing receiver collision radius still accepts contact around the
moving body; improving the pose does not make that a precise blade collider.
