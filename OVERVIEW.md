# Overview renovation

The previous overview composed a club hero, a second match/table/report grid, the manager pulse, a long agenda, a second seven-day briefing and expanded community panels. The same decisions and matches appeared repeatedly.

The overview now has five primary sections: the next or ongoing match, actionable priorities, seven calendar days, players with a recorded reason to follow, and the manager's surrounding league positions. Steel/navy panels and a gold action colour follow the supplied September 25 overview reference. Styles are scoped to the home workspace.

## Behavior

- The dashboard uses the saved career's fixtures, home/away venue, medical state, fatigue, attribute baseline, contracts and league table. An ongoing match takes priority and preserves its paused clock. Scores follow the displayed home/away order.
- Decisions keep the existing agenda/action handlers. Required responses and known dates sort first. The first three rows are shown initially; an explicit total and expansion control expose every remaining row. Incoming counters awaiting the other club and approved agreements awaiting the player appear under waiting, with a link to that exact negotiation.
- Seven calendar buttons open their exact date and leave a previously selected fixture-list tab. Training uses the calendar's actual plan.
- The player panel explains why the player appears and keeps assessed ability/potential uncertainty. It opens the actual profile, development plan, contract or medical case. Profile/back restores the selected player. The whole-roster link clears stale filters and detail selection.
- Training/J20 briefings, coaching follow-up, results/finances, responsibility settings, stories and press remain accessible on demand. Merely showing the main dashboard changes neither calendar nor simulation state.
- The layout uses the existing offline font and crests. Desktop player details appear in a bottom panel; narrower layouts scroll naturally. No new save schema, match simulation, roster or data migration is introduced.

## Verification

`overview-workspace.test.cjs` exercises read-only rendering, away friendlies/live scores, deadline sorting, response stages, all decisions, selection/back, exact calendar/development targets and saved career reload. Existing office, navigation, coaching, J20 and day-continuity regressions are retained; tests of detailed briefings now explicitly open that section.

`CHROMIUM_EXECUTABLE=/path/to/chromium node scripts/overview-browser.cjs` checks actual keyboard/click routes, medical selection, seven incoming offers, optional sections and horizontal overflow at 390, 800, 1280, 1440 and 1920 px. It writes screenshots of a new test career to `OVERVIEW_SCREENSHOTS` (default `/tmp/hockey-overview`). Existing user saves are not loaded or altered by this verification.
