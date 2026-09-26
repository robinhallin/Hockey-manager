# Puck decisions under pressure

This increment changes the authoritative spatial match engine, shared by 2D,
3D and replay capture. It does not add a second simulation or change save schema.

- Shield: choose a short legal route away from nearby defenders, considering
  other teammates and the boards. The chosen target is executed through normal
  movement/acceleration, not a teleport or a guaranteed possession bonus.
- Reset pass: surrendering the attacking zone costs more when unforced. A safe
  outlet behind blue gains value when the carrier is under pressure and the
  receiver has space. Long, unforced retreats before entry are discouraged.
- Dump: compare arrival estimates in both corners from actual active skaters,
  skating attributes and positions, retaining a near-board preference when
  similar. Do not count players currently changing as chasing support.
- Board continuation: Engine 4 now uses the chosen flight endpoint to select
  its rim path, rather than the puck carrier's original side of the rink.

Decision inspection is read-only and adds no RNG draws. Execution may change
match results because available routes and choices change. No automatic wins,
successful recoveries, or guaranteed safe passes are introduced.

Targeted checks: `puck-pressure.test.cjs`, `spatial-engine.test.cjs`,
`match-engine-4-zone.test.cjs`, `match-engine-4-breakout.test.cjs`,
`match-shifts.test.cjs`, plus coaching/tactics and CI regression/balance checks.
Both directions, pressure vs free space, actual carry-plan execution, chosen
corner, real career flight reload and subsequent rim path are covered.

Windows beta packaging is manual (`workflow_dispatch`) from this increment.
Development PRs retain normal regression and desktop UI checks. No version bump
or new installer is part of this change.
