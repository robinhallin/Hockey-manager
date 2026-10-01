# Transition flow review — 2026-10-01

## Scope

Improve neutral-zone support, continuation after a pass, and recovery assignments without forcing passes, moving actors directly, or changing outcomes for a presentation mode. Keep special-team shapes and established-zone marking. Low graphics uses simpler ice/glass lighting; normal/high retain their materials.

## Hockey references inspected

- Official NHL condensed game: https://www.nhl.com/video/lak-at-col-condensed-game-6406002366112. Ordered frames from the first 70 seconds, particularly 63–71 seconds: separate defensive lanes, inside recovery, and continuing skating after a pass. Not a claim to have watched the full condensed game.
- USA Hockey checking manual: https://portal.usahockey.com/cx/hockey-development-coordinator/coaching-development/checking_manual.pdf, backchecking/steering guidance, pages 42–45.
- USA Hockey Fake Pass & Go demo: https://usahockey.cachefly.net/Coaching/NewsletterVideos/FakePassGo.mp4 (17.28 seconds).

## Verification

- Five focused tests cover mirrored rush coverage, distinct late-threat assignments, support read latency and replacement, pass continuation with offside/pressure/special-team overrides, and identical continuation after save/reload.
- Existing breakout, backcheck, 3D, control integration, highlight playback and workspace checks pass locally. Workspace checks retain identical simulated match events across viewing modes.
- Natural full-match browser playback at 1× reviewed before and after, for over one minute each, with no forced plays. After: 12 actors/models, rink lines and logos retained, no page/render errors or layout overflow. Whole-viewport recording used because goals may replace the canvas.
- Desktop quality-switch test now checks actual ice/glass material types, as well as existing scene and state invariants.

## Observational measurements

Run `node scripts/check-transition-flow.cjs` for eight seeded natural 180-second sequences. For the before comparison use `--baseline=cf008ca710d21aa278fbc509d6c0a7ac6b843c4c` (or the equivalent local tree commit `8a7dca4`). Only the engine-4 layer is substituted.

| Observation | Before | After |
| --- | ---: | ---: |
| Qualifying wide-runner rush samples | 1577 | 1326 |
| Back targets collapsed onto puck lane | 1546 (98.0%) | 158 (11.9%) |
| No goal-side back in qualifying samples | 19 | 6 |
| Near/wide support job swaps | 47 | 0 |
| Observed pass-and-go seconds | 0 | 7 |
| Passes / entries / shots / goals | 179 / 56 / 20 / 1 | 157 / 42 / 18 / 2 |
| Open central attempts | 5 | 7 |

These are small trajectory-dependent samples, not balance calibration. They establish reduced target collapse and support-role flipping, not fewer open chances or a generally improved scoring distribution. Controlled breakout checks also retain legal movement and entry behavior; first-pass choice remains unchanged in those cases.

## Performance limitation

Same headless Chromium/SwiftShader software renderer, low graphics, 10-second warmup followed by 20 seconds of live profiling without video capture. Median main GPU pass cost: 141.345 ms before, 130.469 ms after (80/88 samples). Median frame interval remains approximately 150 ms in both runs; tails vary. This is a modest rendering-cost reduction, **not solved frame pacing**. Normal/high are not silently downgraded. Video-capture timing is not used as an isolated performance benchmark.
