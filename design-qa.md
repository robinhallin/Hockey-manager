# Clubhouse workrooms QA

final result: passed

Scope: seven illustrated room landings and their workstations, extending the approved clubhouse direction. Desktop visual review completed in Chrome at 1363 × 936 CSS pixels (1× captures). Automated responsive checks at 1920 × 1080, 1366 × 768 and 390 × 844 are included in the Windows UI suite; their CI result is reported separately on the PR.

## Comparison evidence

Source: `docs/clubhouse-theme/overview.jpg` and `assets/clubhouse/interior.webp`. Implementation: `docs/rooms/office.jpg`, `locker.jpg`, `tactics.jpg`, `ice.jpg`, `recruit.jpg`, `boardroom.jpg`, `world.jpg`.

`docs/rooms/comparison.jpg` puts the approved overview and rendered tactics room in the same comparison image, normalized to equal width. `navigation-comparison.jpg` compares focused navigation/material regions. `all-rooms.jpg` permits a single-input comparison across all seven rooms. The reference represents the overview on August 1; implementation represents actual workroom states on August 2. New room subjects, wider working panel, station controls, and permanent seven-area navigation are intentional changes, not pixel-match claims.

## Findings and fixes

No outstanding P0/P1/P2 issue in the reviewed desktop views.

- Resolved functional P1 during implementation: locker room rendering referenced a nonexistent portrait helper. Reused the existing `playerAvatar` renderer; the post-fix locker capture shows the actual roster and avatars.
- Resolved responsive P2 by inspection: stations near the scene edge could escape a narrow scene. Horizontal positions now clamp to the scene bounds, with smaller mobile controls. Windows UI checks assert station and footer bounds at each target width.
- Resolved state integrity issue: the world news reader initialized feedback state during a visit. It now reads the optional collection without writes. Whole-career and room-tour regressions pass.
- Resolved mobile P2 after inspecting Windows 390px evidence: long footer labels reached adjacent buttons. Labels now cap to their own button width and use narrower inline padding; the UI suite asserts each label stays inside its parent.
- Resolved accessibility P2: the roster selector now has an explicit accessible name, verified with `getByLabel` in the rendered UI.

Asset loading required a loaded-image capture; an early unloaded office screenshot was discarded and recaptured. Browser caching and preview reloads are tooling observations, not design iterations.

## Required fidelity surfaces

- Typography: retains the game's font stack and condensed heading treatment; 25px side headings, 12px primary actions, 10–12px supporting copy. No room name truncation or heading overflow in the reviewed viewport. Dense controls use the established navigation hierarchy.
- Spacing/layout: original top bar and permanent bottom navigation retained. Room image takes the left scene; work occupies a 340–450px right panel with its own scroll. Three station controls match focal objects. Captions stay inside the scene. Full-room comparisons show consistent panel and caption rhythm.
- Colors/tokens: dark navy surfaces, oak/amber imagery and gold selected/primary controls match the reference. Selected stations, side tabs and footer area agree. Focus outlines are explicit and reduced motion is respected.
- Images: all seven room assets are distinct 1536 × 1024 WebP illustrations in the approved architectural style. Full-size captures show consistent warm lighting, navy furnishing, ice views and sharp subjects. Decorative text is not embedded as interaction labels. Existing avatars/logos are retained; added icons come from Bootstrap Icons.
- Copy/content: Swedish labels name concrete work. Needs, injuries, contracts, line assignments, cash, news and schedules come from the active career. Empty states make no claims of completed work. Training explains that the session runs when the day ends. Office count is labeled “Svar som krävs” to distinguish decisions from advisory agenda items.

## Interaction evidence

45 targeted regression tests pass, including read-only world/room visits and existing clubhouse, coach and match presentation behavior. Final rerun of 14 directly affected tests passes after the accessibility/copy fixes.

Browser interactions verified: all seven room landings; PP2 opens the selected real special-teams unit and returns to the tactics room; next-opponent following persists through reload; next-day recovery persists and locks intensity to light without advancing the day; a roster conversation raises trust from 60 to 61, applies the existing three-match cooldown, and persists through reload. No application console errors in the final build session.

## Implementation checklist

- [x] Distinct scenes and three contextual workstations in each room.
- [x] Existing career commands and consequences used for changes.
- [x] Room navigation does not simulate or grant progress.
- [x] Detail surfaces preserve their originating room and station.
- [x] Source and implementation viewed together, including focused regions.
- [x] Desktop primary interactions and reload persistence verified.
- [x] Responsive interaction/bounds checks added to Windows CI.
