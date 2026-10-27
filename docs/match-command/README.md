# Match command centre

The redesign keeps the clubhouse's navy, warm gold, Inter typography, actual club crests and the existing 2D renderer. The intended order is fixture and score → ice → players and match data → playback. The bench separates decisions from data that can follow play.

## Audit evidence

Captured the real HV71–Björklöven preseason friendly on 7 August 2026, through preparation, locker room, puck drop and a pause at P1 0:23. The screenshots precede implementation.

- `02-before-locker.jpg`: the illustrated hero dominates preparation; the actual match choices are secondary.
- `03-before-bench.jpg`: observations precede the team talk before puck drop. The nine equal bench tabs mix decisions with viewing preferences and statistics.
- `05-before-decisions.jpg`: score, viewing mode, speed, explanatory copy and six statistics occupy the upper third. Coach actions have no visible phase boundary.

## Implemented hierarchy

- A centred scoreboard with the actual home/away identities, clock, arena, fixture date, scorers and manpower.
- A wider ice column, players and energy directly below, then the home-first summary statistics.
- Four coaching destinations and a separate row for statistics, ice time, events and analysis; viewing settings sit in a utility control.
- A persistent playback row: start/pause, what to show and the relevant speed control. Detailed playback explanations remain in Settings.
- Team talks appear first before puck drop, in the intermission and after the final whistle. Assistant evidence is available in a disclosure.
- Pre-game and replay cannot spend a timeout or pull the goalkeeper. Replay coaching offers an explicit return to the game. Icing continues to block keeper changes; pending keeper requests show the inverse action so they can be cancelled.
- Midperiod visits to the team use paused-match wording. After the final whistle, preparation links become report/analysis follow-up links.
- Mobile uses the same match surface with stacked content and a sticky playback row.

No simulation rules, RNG, season progression, tactical presets or recovery calculations were changed.

## Verification

The current and legacy match suites, timeout accounting, display-mode parity, room journey and new phase guards pass locally. Actual cloud-browser interaction verified saved-game resume, navigation to tactics, a tactical preset, live statistics without pausing, coaching with pausing, a timeout at the same clock, replay exit and disabled match continuation during replay. A 390 × 844 CSS iframe exercised the real responsive app, including DOM width measurements; this is not a scaled desktop screenshot.

The existing Windows browser checks now cover the renamed match-bench route, 1920/1440/1366 desktop geometry, a minimum readable rink height, 390-pixel overflow and unavailable pregame actions. These checks run in GitHub CI; do not describe them as locally executed browser tests.

See `/design-qa.md` for the evidence-based comparison and remaining coverage limits.
