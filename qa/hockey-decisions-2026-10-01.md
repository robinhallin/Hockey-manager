# Hockey decisions review — 2026-10-01

Base: published main `3eab824b7103c9ac226197bfc94ba611d83fd91f`.

## Concrete changes

- Active F2 covers an observed first-pass segment instead of remaining capped at defending progress 47 when that pass is deeper. Aggressive forecheck covers nearer the receiver; passive forecheck retains its high limit and F3 continues protecting the high middle.
- Transition support reserves an available forward for the next wide outlet, including when only one forward remains available. A supporting back stays below the carrier rather than receiving the forward's advancing target. Existing read latency, identity hysteresis, blue-line limits, skating and pass choice remain authoritative.
- The weak-side back's longitudinal gap uses the deeper of his assigned runner and the puck carrier. The strong back retains his puck gap. A runner ahead of the puck no longer leaves the weak back's target above that runner.
- Attack-route scoring includes defender pressure at the intended destination. Pass-segment risk excludes endpoints, so evaluating only the current receiver and that segment could send support to an occupied destination. Vision/decisions scale the read and the existing plan latency still delays a changed route; no forced pass or finish is added.

## References and visual review

Ordered official NHL LAK–COL condensed-game frames at 60–69.5 seconds were re-examined at 0.5-second intervals for a neutral-zone rush, inside recovery and coverage; a new 440–478-second window at two-second intervals includes offensive-zone circulation, net-front occupation and shot/replay material. Only these windows are claimed, not the whole condensed game. The observed distinction between puck pressure, weak-side coverage and high support guides the implementation; it is not proof of complete realism.

- https://www.nhl.com/video/lak-at-col-condensed-game-6406002366112
- https://www.usahockey.com/news_article/show/775908-creating-offense-with-zone-entries-and-puck-support
- https://www.usahockey.com/news_article/show/775914
- https://portal.usahockey.com/cx/hockey-development-coordinator/coaching-development/checking_manual.pdf

USA Hockey's article pages returned 403 on full retrieval in this session; search excerpts were available. The existing checking/backchecking manual and official video windows are the direct review material. No unviewed clip is presented as evidence.

The ordinary initial HV71–Björklöven career save was run in Chromium at full match, 1× on-ice and simulation speeds after the changes. A sequence exceeding one minute was recorded as real live playback and inspected using ordered two-second contact sheets. Twelve actors/models, no page/render errors and no layout overflow. This is a gameplay review, not an FPS benchmark or a claim that every frame was inspected. The prior published baseline's matching live sequence is retained for comparison.

## Reproducible natural observations

`node scripts/check-hockey-decisions.cjs` runs eight natural 300-second lab games, seeds `4504 + n*1107`, n=1…8. `--baseline=3eab824b7103c9ac226197bfc94ba611d83fd91f` substitutes only the engine-4 layer in production order; the review checkout used its identical local tree at `2698521`. No action or outcome is prescribed. Transition-wide observations require the current carrier's plan and equal-strength play.

| Observation | Before | After |
| --- | ---: | ---: |
| Rush back target observations (s) | 1368.1 | 1295.2 |
| Target above the assigned threat (s) | 64.7 | 2.7 |
| Current transition-wide task (s) | 481.6 | 477.7 |
| Back carrying the advancing wide task (s) | 237.5 | 0 |
| Attack-pattern observations (s) | 86.5 | 102.7 |
| Destination under pressure >0.65 (s) | 4.9 | 1.2 |
| Destination pass line through cage (s) | 0 | 0 |
| Passes / entries / shots / goals | 262 / 91 / 24 / 2 | 254 / 80 / 45 / 4 |

Trajectory changes affect the opportunities and denominators. These are small-sample diagnostics, not calibration or evidence that more shots/goals are intrinsically better. Residual coverage observations are reported rather than hidden; targets remain subject to rink bounds and observed player reads.

## Regression coverage

Five new mirrored tests cover role-preserving support with one/two available forwards and no movement/RNG effects, active F2 on the actual outlet segment with F3 above, a weak-side runner ahead of the puck, endpoint pressure missed by lane risk, and a destination reread after existing latency. The old defensive-gap test now measures the gap against the deeper assigned threat rather than assuming both backs should always share the puck carrier's depth; its original 2.1–5.5 m bounds remain unchanged. Existing transition, breakout, save/hydration, goalie, screen/route and control tests passed locally. The ordinary highlight UI and full/extended/highlights/commentary parity are checked as well. Complete CI, unchanged 96-period balance calibration and Electron UI are required before merge.
