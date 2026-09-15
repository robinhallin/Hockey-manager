# Shifts and measured line matching

The career bench now offers Byten → Matchning & utfall. A coach can prioritize one forward line against an opposing line, or keep the normal rotation. Matching reads actual on-ice identities rather than the next requested lineup, respects player availability and at least 65% mean energy, and avoids prolonging a checking line that already reached its shift target. Explicit manual changes take priority. Away declares first at a stoppage and home can respond; icing still forbids replacement. PP, PK and 3v3 keep their existing units. The opportunity cost is actual ice time and rest for other lines, with no new ability/energy bonus.

The fixed-step rink now recognizes safe individual changes during controlled neutral-zone possession and deep opponent retrievals. An opponent rush back towards our end or an outgoing player receiving the puck cancels the departure. Each outgoing player must reach the bench gate before their replacement enters. Closest eligible players change first. The actual shift target is read directly, replacing the career timer-offset workaround. A tired formation also values a real dump beyond the centre line to create a change window; possession can be lost. The chosen 30/45/60 seconds is a request target, not a forced teleport or guaranteed shift duration.

New 5v5 accounting uses one of 25 mutually exclusive own/opposing line cells per actual moment, including mixed forward groups. Time, shots, dangerous attempts and goals use the same actors and events as the match. PP/PK, fewer skaters and empty-net play are excluded. The compact live table shows four lines and mixed shifts; match reports retain the totals and opponent breakdown. Historical slot numbers can include different player combinations, which remain available in the existing combinations view. Old matches start collecting prospectively, and older reports show missing evidence. Display functions never advance the simulation or grant ice time to a selected line.

Validation: match-shifts.test.cjs covers territorial changes, the actual target, tired-unit decisions, actual-vs-selected opposing line, tired/unavailable matching, manual overrides, home order, icing, mixed exposure, empty-net exclusion, saved settings/ledger, report archive, and read-only controls. Existing career match tests complete a real three-period match, save/resume a puck flight deterministically, and check all 28 clubs, OT/PP/PK, goalkeeper substitutions and idempotent statistics. Targeted coach, tactical, energy and match workspace tests pass.

scripts/match-shift-audit.cjs runs four paired production periods with the same HV71 career, two seeds and four-line rotation. Injuries are disabled solely to isolate shifts. qa/match-shifts.json records mean completed shifts of 53.8 seconds under the short plan versus 63.8 under the long plan; exact games and shot totals differ. This is a small descriptive test, not a guarantee for each game. In the original saved audit period, mean own shifts were 105.6 seconds with a maximum of 264.6; the revised version reached 62.9 with a maximum of 152.6. No recovery coefficients were changed.

The wide ability diagnostic previously loaded only the unpatched base engine. It now loads Match Engine 3 and manager controls, uses paired seeds and swaps rink sides. The shared calibration guard keeps the same numerical bounds but expands 24 to 96 periods: the old 24-period sample moved just outside its save-percentage bound after changed puck paths; the larger sample yields 28.0 shots, 3.08 goals per team/60 and 88.99% saves. No scoring coefficients were retuned to make the smaller sample pass. Career-only modifiers are explicitly outside this shared-engine diagnostic. Strong/weak stress profiles still suppress the weaker team's offense; broader ability separation and the different career/lab attribute paths remain follow-up work, not claimed solved here.

# Matchcoach: choose, observe, learn

The match coach now connects five situations to real manager choices: fatigued formations, low-quality attempts, dangerous chances against, chasing a late equalizer, and defending a narrow late lead. The player can apply the stated order or deliberately retain the current plan. Existing matchOrder/matchPlan handlers own the tactical changes; there is no new performance bonus or alternate simulation.

The existing tactical review ledger records the reason, tradeoff and selected alternative. Follow-up requires at least three minutes at equal strength before and after the decision; PP/PK cannot satisfy this exposure. Rates show both dangerous chances created and conceded. Before means since the previous recorded decision (or faceoff), after means until the next decision or now. Further manual orders close the interval; edits at the same stoppage are explicitly labelled as combined changes. These observations do not prove causation or predict wins.

One match-coach panel shows the current decision or its follow-up, with additional observations collapsed. Read the match and speak to players are two selectable workspaces. Current decisions survive reload and are included in archived match reports. Old saves without decision metadata remain supported, and incomplete old reports cannot produce a rate comparison. Fatigue offers 30-second shifts and four-line rotation. The same players are followed for at least three match minutes, including bench time and special teams; their measured average energy is shown. Period rest and other interventions may also contribute. Rotation never refills energy directly. Discipline observations still link to the appropriate bench controls.

Validation: match-coach-decisions.test.cjs exercises real production action preferences from the same saved situation, all four order paths, retaining the plan, stale/duplicate clicks, strength separation, frozen follow-up, combined manual changes, partial records, saved/archived decisions and speech navigation. Existing match-centre, match-workspace, tactical-review, tactical-controls and match-evidence tests pass, including a complete production match and deterministic presentation-mode comparison. This stage does not recalibrate the engine's scoring or league-wide balance.

# Coherent manager workflow

The office has a persistent decision list and one context panel: Påverka idag, Uppföljning or Klubbläge. Required replies remain reachable even when more than five items are pending. Detailed follow-ups scroll inside the panel; the header owns advancing time. Back navigation restores the selected context.

Junior development has distinct workspaces for players/plans, lines, calendar, table/statistics and reports. Selecting a junior opens their player workspace. The live coach's eight tactical choices use a compact two-column grid on desktop.

Training responsibility has one authoritative owner across the office and training screen. An explicit medical comeback plan lasts for the current injury; staff actions are reported. Junior A-training evidence counts participation separately from rest/recovery, once per session. Legacy counts are retained but do not satisfy new attendance milestones. Goalkeeper/defender J20 evidence uses recorded ice time rather than attacking point targets; save and defensive performance rates remain a future addition.

Board ultimatums use permanent match summaries and hockey's 3/2/1/0 points. Existing detailed reports backfill missing overtime metadata; unavailable historical outcomes are not fabricated. A met ultimatum closes and cannot be restarted at the same match checkpoint.

Calendar owns team sessions, individual development owns individual focus/load and observed development. Analysis owns choosing a coaching focus, calendar owns scheduling its session, and development displays its follow-up instead of repeating the whole editor.

Lineup is one workspace with even-strength rink, match squad/reserves and PP/PK rink views; old specialTeams links resolve to it. Recruitment has Needs, Search, Scouting, Shortlist and Negotiations. Free agents are a search filter; old free links still work. Scouting's legacy route resolves to the shared recruitment page. Existing loan/world/history functions remain under More.

Shared navigation pauses a running fixture without advancing it. Player profile back actions restore their originating list, filters, lineup view and desktop/document scroll. History is bounded, session-only and resets when the career state is replaced. This is in-game back navigation, not URL/browser-history synchronization. Existing selected inbox detail is restored on back. Reports link to the archived match by ID; new transfer rejection/counter messages carry a deal ID. Older generic transfer messages still open the negotiations overview. Existing player and story links remain contextual.

Validation: workflow.test.cjs covers all primary routes and recruitment/lineup tabs, player return and scroll/filter preservation, exact report/deal selection, aliases, live clock/pause isolation and save compatibility. Development and coaching-cycle tests pass. Browser: new HV71 career, office desktop and 390×844 iframe, continue after reload, lineup and PP/PK navigation. Oversized SVG arrows and cramped task text found visually and corrected. This is not native iPhone testing or exhaustive visual testing of every page.

## Button and navigation rules (September 2026)

- Tactics links open five-on-five; special-teams links open PP/PK. Both use the same lineup destination. Scout-report links resolve to Scouting.
- Secondary workflows (loan planning, junior selection and role searches) use shared browser history. Back restores the profile tab, lineup slot/query, special-team selection, recruitment filters and selected loan/junior/deal.
- Explicit click actions use `type="button"` so they cannot accidentally submit a surrounding form. Actual submit controls retain their form behavior.
- `button-logic.js` explains existing domain locks and disables known unavailable actions before the click. It never bypasses domain guards. Reasons are available on each affected button and through one compact explanation in the view. Contract calls also show feedback when invoked directly.
- A rejected sale is still allowed during a match; accepting a sale is locked. Roster edits pause a running match and preserve medical/icing restrictions.
- Search filters can be reset. Shortlist actions state exactly what is added or removed.

`button-logic.test.cjs` audits handler availability across primary areas, recruitment tabs, lineup tabs, player tabs and match tabs, and tests state restoration and eligibility distinctions. This is a handler/flow audit, not a claim that every possible career outcome has been simulated.

## Unified recruitment workspace

Five stable destinations: Planering, Spelare, Scouting, Önskelista, Affärer. There is no separate loan/scout portal navigation. Candidate lists and a contextual inspector share the screen; the inspector offers report, purchase, eligible future contract, and loan actions. Full profiles preserve the list selection and page on return.

Scouting uses the same player table with observation state, report dates and active assignments. A scoped group mission receives the visible recruitment pool's candidate IDs so loan searches cannot accidentally commission unrelated players. Existing observation fees, timing and uncertainty remain authoritative.

Affärer combines purchase/future offers, incoming sales, loan offers, active loans and completed loans. Details show only the selected record and invoke the existing domain decisions. Old loan/scouting/world/history links still resolve into this workspace; saved transfers, loans and pending legacy negotiations are retained.
