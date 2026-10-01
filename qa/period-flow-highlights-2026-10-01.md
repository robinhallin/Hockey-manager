# Period flow and highlight review — 2026-10-01

Base: published main `06721b73f437f926b3b07f559cea375bdeebf401`.

## Changes

- Low graphics now creates a WebGL context without MSAA. Normal/high retain antialiasing. Crossing that boundary rebuilds the context on an explicit quality change and preserves tracked camera state. Quality controls do not change simulation precision or state.
- An attacking runner retains a read-dependent route with separation from the receiver and screen. The other supporting forward yields a crowded screen target to the high slot.
- Net-front tasks now treat a fractional expired stoppage as active play. Previously a negative countdown remained truthy and suppressed screens in natural play. New screen tasks respect the player's existing read latency after a controlled touch.
- Highlights include observed cross-slot pass releases before a shot exists, reject cleared/unreachable rebound signals, and distinguish new controlled touches. Pass success rolls and future choices are not read.

## Full-period review

The ordinary HV71–Björklöven career match ran through its entire first period in Chromium at full match, 1× on-ice speed and 1× simulation speed. This was the published baseline, used to identify defects before making the changes. The recording reached 1200 game seconds (1249.5 simulation wall seconds including stoppages), score 0–1, shots 5–18 and attempts 15–27. There were no page/render errors or layout overflow. A natural medical pause at 1138.5 seconds required accepting the doctor's recommendation in this isolated QA save before continuing; the period then paused normally at its boundary.

Review used the complete spatial/action ledger (6247 samples) and seven ordered contact sheets sampled at ten-second intervals across the full recording, rather than claiming every video frame was watched. Reference review used ordered samples from the official NHL LAK–COL condensed game (0–70, 235–273 and 355–393 seconds), plus USA Hockey's checking/backchecking material and Fake Pass & Go example. These support separating passing support, net-front occupation and coverage; they do not establish complete hockey realism.

References:

- https://www.nhl.com/video/lak-at-col-condensed-game-6406002366112
- https://portal.usahockey.com/cx/hockey-development-coordinator/coaching-development/checking_manual.pdf
- https://threejs.org/docs/pages/WebGLRenderer.html

## Natural full-period observations

Reproduce with `node scripts/check-period-decisions.cjs` and `node scripts/check-period-decisions.cjs --baseline=06721b73f437f926b3b07f559cea375bdeebf401` (local review used the identical baseline tree at `e3926ec`). Each variant runs four complete natural 1200-second periods, seeds 227–230, without scripting actions or outcomes.

| Observation across four periods | Baseline | Change |
| --- | ---: | ---: |
| Attacking-zone carrier time, 5v5 (s) | 646.3 | 650.0 |
| Two forward targets within 3 m (s) | 13.3 | 8.5 |
| Actual net-front screen task (s) | 0 | 43.7 |
| Passes | 500 | 484 |
| Entries | 150 | 137 |
| Attempts | 157 | 174 |
| Shots | 76 | 89 |
| Goals | 11 | 7 |

This small sample is an observation, not a balance guarantee. Signal counts are not final clip counts: the new selector observed 95 cross-slot pass signals and 19 dangerous rebound signals in these four periods. Engine changes also change which situations arise.

The unchanged 96-period production calibration passed: per team per 60 minutes 3.25 goals, 27.328 shots and 54 attempts; save percentage 88.11. The first screen implementation scored 87.91% saves and failed the existing minimum of 88%; the correction was normal task-read latency, not altered test bounds.

## Live rendering measurement

Same Chromium 153, SwiftShader software GPU, viewport 1920×1080, low quality, expanded 1509×589 render canvas, initial career save, ten-second warmup then twenty-second live measurement. Final run was isolated from calibration and other browser checks. No offline replay or encoded-video frame rate was used as a live benchmark.

| Measurement | Baseline | Final |
| --- | ---: | ---: |
| Frame median (ms) | 133.3 | 83.3 |
| Frame p95 (ms) | 249.9 | 150.1 |
| GPU main-pass median (ms) | 108.53 | 69.85 |
| GPU main-pass p95 (ms) | 139.44 | 90.08 |

Median frame time fell about 37.5%; software rendering remains far below 60 FPS. These measurements do not predict the user's hardware.

## Regression checks

New tests cover mirrored forward separation with no movement/RNG side effects, expired stoppage handling, screen-read delay, exact career save/hydration continuation, invalid runner coordinates, observed cross-slot passes without hidden success access, live rebound relevance and stable/new possession keys. Existing control, physical route, goalie/model and mode-parity tests passed locally. Actual Chromium quality switches low→normal→high→low→normal preserved match state and actor picking. The ordinary highlights UI is checked for buffered build-up, pause/resume and recorded scoreboard agreement. CI additionally runs the complete unit-test shards, career/balance/Swiss checks and Electron desktop checks before merge.
