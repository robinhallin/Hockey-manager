# Match view design QA — 27 October 2026

final result: passed

This is an intentional redesign of the existing match flow, using its captured screen and established clubhouse theme as source truth. It is not a pixel-for-pixel recreation of the previous layout. The new information order and intentional differences are recorded in `docs/match-command/README.md`.

## Evidence and normalization

- Source visual truth: `docs/match-command/05-before-decisions.jpg`, plus `02-before-locker.jpg` and `03-before-bench.jpg`.
- Implementation: `docs/match-command/14-final-changes.jpg`, `18-final-match.jpg`, `19-final-room.jpg`, `16-final-tactics.jpg`, `17-replay-guard.jpg`.
- Full-view combined comparison: `docs/match-command/comparison-decisions.jpg`. Both halves are the same actual friendly, 0–0, paused P1 0:23, changes panel, at 1363 × 936 CSS pixels. Each original screenshot is 1363 × 936 pixels, density 1; combined canvas is 2726 × 972 including a 36-pixel label strip. No density scaling is used in the stored comparison.
- Focused combined comparison: `docs/match-command/comparison-focus.jpg` crops the original and rebuilt coach panels at their native density. The different panel widths are intentional. Timeout consequences and formation energy are readable; the selected decision and data groups have distinct hierarchy.
- Mobile combined comparison: `docs/match-command/comparison-mobile.jpg`. A real 390 × 844 CSS iframe viewport contains the app at density 1 inside the 1363 × 936 browser capture. Scrollbars leave 375 CSS pixels for document content. `#content` and the match root have matching client/scroll widths after the fix; playback remains inside the iframe bottom edge. The outer desktop background is a test harness, not product UI.
- Final desktop capture: `18-final-match.jpg`, same friendly now paused P1 1:02 following actual play, a timeout and tactical preset. The different time/data are disclosed rather than treated as visual drift.

## Comparison history and fixes

1. **P2 — first mobile implementation inherited desktop grid tracks.** The 390-pixel viewport showed clipped controls, vertically broken club names and horizontal overflow. The internal evidence `10-mobile-before-fix.jpg` is retained in the mobile comparison. Fixed the specificity of breakpoint overrides, removed the surrounding desktop navigation from the phone match surface, stacked the bench and gave playback a two-column layout. Re-capture `11-mobile-fixed.jpg` shows readable clubs, the full rink and complete controls. DOM widths agree; no horizontal scrolling remains.
2. **P2 — preparation card retained flex layout and large inherited padding.** Its image and copy squeezed into narrow columns. Explicit block layout, zero outer padding and a 165-pixel image strip produce the readable card in `19-final-room.jpg`.
3. **P2 — compact desktop navigation overlapped the duplicate fixture label.** Moved date/type into the scoreboard and removed that duplicate desktop utility label. `14-final-changes.jpg` and `18-final-match.jpg` show the corrected single navigation row.
4. **P2 — tactical consequences were hidden by an old stylesheet.** Restored the actual preset descriptions and order notes. `16-final-tactics.jpg` shows the effect/risk alongside each choice. These are the existing tactic descriptions, not invented recommendations.

The final comparison contains no remaining actionable P0/P1/P2 finding. Source-to-implementation changes in scoreboard scale, rink width, bench width, statistic position, grouped navigation and playback position are the requested redesign.

## Required fidelity surfaces

- **Typography:** retained the real Inter/font stack. Team names and score have a clear hierarchy; 12-pixel body text and 10/11-pixel supporting labels suit this dense management screen. Club names stay readable on the phone; energy-strip names truncate with profile links intact. Heading line height and weights were checked in the final captures.
- **Spacing/layout:** score, rink, players, statistics and playback have independent regions. Controls fit the observed desktop viewport. The right panel scrolls independently; mobile stacks the content and keeps playback at the bottom. Desktop breakpoint/minimum rink-height assertions are authored for CI, not claimed as locally run.
- **Colors/tokens:** consistent navy panels, gold selected decisions and primary playback, subdued blue data navigation, green recovery/energy. Focus outlines retain the established high-contrast treatment. No decorative gradient or unrelated accent system was added.
- **Images:** existing real club crest assets and the existing clubhouse interior asset are retained. No logos or icons were approximated. The native canvas renderer remains the source of the ice image; the image strip has an intentional crop.
- **Copy/content:** phase-specific guidance distinguishes pregame, play, pause, intermission, medical decision, replay and final whistle. Midperiod visits no longer imply the match has not started. Preset risks, timeout effects and queued keeper actions describe real behavior. Match data comes from the current game and uses the retained home/away mapping.

## Interactions and verification

Actual browser UI: resume a saved paused game; move between room and bench; select a tactic and inspect updated order; open statistics while play continues; open tactics to pause; spend a timeout and verify the same P1 0:23 clock with recovered energy; start/exit a real latest-shot replay; verify the replay coaching message and disabled match-start control; change viewing mode and see the appropriate speed label. Mobile was opened in the actual responsive iframe rather than by mutating application state.

Local tests passed: `match-command.test.cjs`, `match-desk.test.cjs`, `match-workspace.test.cjs`, `match-centre.test.cjs`, `timeout-decisions.test.cjs`, `coach-journey.test.cjs`, `match-presentation.test.cjs`, `room-coaching.test.cjs`. The offline desktop stage completed. The phase suite covers current/legacy matches, pregame/replay guards, icing, pending keeper label, used timeout, intermission and finished controls. Existing tests complete real simulations and archive reports, and confirm identical simulated outcomes across presentation modes.

Console was inspected. No application error appeared; the observed errors originate from the browser extension's metadata transport (`chrome-extension://…/content-script.bundle.js`), not game code.

## Coverage limits and checklist

- The interactive browser session covers an actual first-period match, not a manually watched full match. Final reports and full-match accounting are exercised by automated real simulations.
- Desktop sizes 1366 × 768, 1440 × 1000 and 1920 × 1080, mobile overflow and the complete room-to-report browser journey are included in the Windows CI checks. Their CI result is reported separately.
- Keep the DOM hooks used by the renderer, score patches and profile return history.
- Check the PR's CI before merging.

final result: passed
