# Match highlight selection

Previously, every shot and generic attack focus selected a highlight. Renewing the tail every simulation tick could keep ordinary play on screen indefinitely. Playback also began at the detected event, omitting its build-up.

## Viewing policy

| Mode | Shown play |
| --- | --- |
| Whole match | All play at the selected on-ice speed |
| Important highlights | Goals, major chances, clear breakaways, dangerous slot rebounds, posts/crossbar, penalties and observed injury events |
| More highlights | Important highlights plus ordinary attempts and credible attacking positions |
| Simulate without rink | The same simulation, with no rink presentation |

Passes, puck transport, zone entries, safe rebounds, ordinary saves, offsides, icing and a powerplay by itself do not trigger important highlights. They remain visible when part of a selected sequence. Selection reads observed chance geometry and resolved contacts; it never reads an unresolved shot's hidden outcome or advances RNG. Sparse legacy shot flights keep their previous fallback.

## Sequence playback

New sequences use up to 3–5 seconds of actual recorded build-up and a 3–4 second tail. Build-up stays within the current presentation reset and does not repeat already shown frames. The authoritative simulation holds while those frames play. Pause and resume preserve the playhead. Returning to live play clears accumulated elapsed time, avoiding a speed burst. Goals and scorers use the displayed frame during build-up.

Only a new event extends the tail; repeated presence of the same chance does not. Overlapping ordinary events have an 18-second window cap. Mandatory event signals remain eligible. Existing medical, goal, penalty and period pause policies remain in force. Presentation buffers are transient and do not change saved match outcomes.

## Verification

- Selector, playback, workspace, replay and 3D regression tests pass locally, including mirrored breakaways, hidden-outcome guards, event draining, paused build-up and delayed goal display.
- A completed seeded match in all four modes produced identical 4–2 results, statistics, shots, ice time, energy and RNG state.
- A natural 3D match at 1× visibly alternated skipped routine play and selected build-ups. Its screenshots and viewport recording had no page errors, renderer errors or viewport overflow.
- The desktop UI check now observes a naturally selected build-up, verifies the held simulation clock, pauses it through the normal button and resumes to live play.

This change addresses selection and playback timing. The software-rendered environment's existing low frame rate is outside its scope.
