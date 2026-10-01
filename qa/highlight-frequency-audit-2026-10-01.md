# Important-highlight frequency audit

## Method

Ran five complete 60-minute HV71–Björklöven simulations with fixed, varied engine and rink seeds. Medical exposure and automatic goal/penalty pauses were disabled only so each run could finish uninterrupted. For each seed, compared the original selector, a selector without standalone cross-slot-pass triggers, and a stricter breakaway rule. Sequence starts count a new highlight window, not repeated selector reads. Shot visibility was checked at the resolved shot frame.

This small controlled sample measures selection density and coverage. It is not a league-wide gameplay calibration.

## Results

| Seed | Score | Shots | Original sequence starts | Without pass-only triggers | Final rule | Ordinary shots shown, original → final | Dangerous shots shown, final | Goals / penalties selected, final |
| ---: | :---: | ---: | ---: | ---: | ---: | :---: | :---: | :---: |
| 1103 | 6–1 | 120 | 102 | 59 | 40 | 39 → 15 | 9 / 9 | 7 / 7 · 4 / 4 |
| 2207 | 1–3 | 150 | 119 | 84 | 57 | 39 → 13 | 23 / 23 | 4 / 4 · 6 / 6 |
| 3301 | 2–3 | 129 | 101 | 68 | 48 | 25 → 11 | 14 / 14 | 5 / 5 · 8 / 8 |
| 4409 | 3–5 | 139 | 108 | 78 | 59 | 37 → 15 | 25 / 25 | 8 / 8 · 7 / 7 |
| 5519 | 3–2 | 136 | 105 | 71 | 56 | 26 → 10 | 26 / 26 | 5 / 5 · 5 / 5 |
| **Mean** | — | **135** | **107** | **72** | **52** | **33 → 13** | **97 / 97** | **29 / 29 · 30 / 30** |

The final rule cuts starts by 51% against the original selector. All recorded goals, penalties and dangerous non-goal shots still trigger or appear inside their selected sequence. Ordinary shots shown as incidental build-up fall by about 61%.

The changes keep cross-slot passes in “More highlights” and treat a pass that leads to a selected chance as part of that chance's build-up. “Friläge” now requires every active opposing skater to trail the puck carrier by at least two rink units; a clear shooting lane by itself no longer receives that label.

## Verification

- Mirrored unit tests cover the two-way breakaway rule, defenders ahead or in the lane, and cross-slot passes appearing only in extended mode.
- The seeded four-mode parity check confirms selection mode does not change the match result, statistics or random stream.
- Natural Chromium 3D playback confirms the selected build-up, pause/resume and displayed scoreboard still work.
