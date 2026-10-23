# Coaching from the room

The tactics room opens an interactive working table inside the room, retaining the clubhouse navigation. Existing selection commands provide click swaps, drag and drop, candidate selection, special teams, medical restrictions, assistant locks, undo and save persistence. A comparison shows which players moved since the table was opened. Player deep links return to the table and its comparison.

Room initiatives are derived from actual agenda entries, saved staff proposals and the existing selection dilemma. They show the sender, evidence and deadline; opening an initiative does not resolve it. Accept/decline/snooze use their existing domain commands. Context tokens and evidence signatures reject stale actions. Existing proposal and player follow-up records supply the history. No new randomized incidents or automatic rewards are introduced.

The illustrated theme's matchday action opens a briefing before creating the match. A saved brief applies the existing orders. Selection stays in the tactics room; gathering the match team uses the real fixture, medical checks and friendly delegation. The locker room leads to the same 2D engine and one-time team talks. Its postmatch route opens an analysis table containing the archived brief, actual personal selection outcomes and formation evidence. Preparation never advances the calendar or simulates; only the ordinary match commands do.

## Verification

- Focused regressions cover rooms, talks, selection, briefs, existing coach journeys, staff mandates, personal match evidence and persistence.
- A full real friendly was played in the integration fixture through briefing, selection, locker room, 2D playback and the analysis table, then saved/reloaded.
- Browser interactions verified actual swaps and undo, selection comparison, saved brief and PP controls in Chrome. Application console: no errors in the final preview session.
- Windows UI adds the in-room board, click and drag swaps, PP undo, staff acceptance and reload, and layout checks at 1920, 1366 and 390 pixels. The existing full match UI journey now starts at the briefing and ends at the analysis table.
- Visual evidence: `board.jpg`, `brief.jpg`, `powerplay.jpg`. Navy/gold controls and the existing illustrated room assets are reused. Chemistry and tactical fit have separate space; PP/BP unit names no longer wrap. Mobile initiative callouts share the top tools row so they do not cover workstations.

The Windows result is recorded on the pull request. This change does not alter match-engine rules or create a separate save model.
