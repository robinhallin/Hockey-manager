# Club decisions and role competition

The daily desk separates immediate decisions, planning, pending followups and closed cases. Shared case identity comes from the canonical message, deal or player action, and preserves separate source rows/deadlines. Case history is captured during actual daily progression and explicit planning actions. Rendering never writes history or progresses the career.

Contract intentions retain a 28-day review date and the original club, salary, years, role and trust. Changed real contracts or departures can trigger an earlier review. Replacing an intention preserves its earlier record. An intention never signs a player, promises ice time, changes the lineup or reserves money. Its next action opens the ordinary renewal, conversation or replacement scouting workflow.

The squad, development inspector, negotiation impact report and tactical selection show competition for current places, active promises and junior alternatives. Named trials use the existing story evaluator and persistent player memory. Goalkeepers have a real six-game trial: 30 minutes in three eligible competitive matches. Existing role agreements remain in force. Success and failure use personality-dependent trust effects; medical absence, international duty, friendlies and incomplete records are excluded by the canonical evaluator.

All seven rooms connect to these decisions through contextual evidence: daily work, role expectations, selection tradeoffs, junior paths, contract priorities, reserved finances and actual world-news opportunities. Recruitment tools are scoped to the selected workstation. Tactical fit now exposes strengths and weaknesses through a keyboard-accessible disclosure, with no change to engine factors. Medical status defaults to people needing attention, with an explicit full-roster action. Story views use the room's navy/gold styling.

Persistence is bounded to 60 plans, 80 cases and eight evidence entries per case inside the existing employer-scoped office save. Validation loads before startup and checks active and archived employer state. Saves without the new optional section remain valid.

## Validation

- 61 targeted regression tests passed across rooms, conversations, staff proposals, development, training projections, planning and decision followthrough.
- Followup checks: 28 room/history/new-decision tests, 14 squad/decision-link tests, and the final seven new behavior tests passed after navigation and persistence fixes.
- New isolated tests cover save/reload, pure views, deduplication, real contract-change review, live/stale guards, six-game keeper trials with different lasting outcomes and malformed save rejection.
- Browser: verified daily queue, saved contract intention after reload, retained expanded controls, named competition navigation, and correct direct story decision view. No simulation advancement was required for these checks.
- Automated browser coverage added to the existing Windows Electron job: all seven rooms, actual plan controls, save/reload, isolated goalie-trial choice, medical empty/full states, and 1920/1366/390 layouts. Its CI result is reported separately from local checks.
- A browser test click that would leave a permanent keeper promise in the preview career was rejected by automatic approval review; the same decision and resulting trust effects were tested in isolated fixtures, not retried in that browser career.

This change does not rebuild the match engine or introduce random story outcomes. Longer careers and the existing full regression matrix remain covered by repository CI.
