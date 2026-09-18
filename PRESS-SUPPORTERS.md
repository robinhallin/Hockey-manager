# Press & supportrar

A saved public-opinion layer for all 28 clubs. Open **Översikt → Press & supportrar** or the two-card block on the manager's desk.

## Evidence and perspectives

The shared league-statistics settlement supplies both live and background fixtures. One completed competitive fixture generates one edition per club, exactly once. Nothing reads or consumes the match random generator. Friendlies and incomplete fixtures are excluded; partial box scores support result commentary only.

Each edition contains a local coach report, an analytical column, an opinion column, three supporter voices, and a frozen evidence snapshot. Reports distinguish wins, defeats, runs of three or more, recovery after a losing streak, expectation-based upsets/setbacks, and playoff results. Known same-city fixtures add derby emotion; other rivalries are not fabricated. Player coverage requires real points, significant goalkeeper workload/save percentage, meaningful youth minutes, or four consecutive scoreless appearances with at least 15 minutes. Powerplay trends require ten opportunities. Shot totals never establish effort or chance quality.

Media scrutiny smooths the last five expectation-adjusted results. The expectation incorporates each team's season objective and home advantage. The manager's agreed board objective takes precedence. Table position contributes only after eight league games. Playoffs use wins rather than league points. A new win cannot immediately erase accumulated scrutiny. Coach changes retain club context while explicitly separating the predecessor's record.

Three supporter groups have independent, bounded memory:
- Terrace: loyalty, results, stronger emotion for city derbies.
- Results: performance against the opponent and season expectations.
- Future: actual meaningful minutes for available young skaters; partial data does not change this assessment.

Their displayed quotes can disagree. Aggregate supporter support weights these groups 40/35/25. These are fictional in-game perspectives, not attributed real statements or survey data. Public opinion does not secretly modify shot odds, board confidence, or gate receipts.

## Public statements

The manager may respond once to the latest edition before the next competitive match. No response is required. A calm response provides no immediate reward. Alternatively the manager may promise five points in three league games (two wins in playoffs), or ten minutes for a skater aged at most 23 in two of three eligible games. One measurable commitment may be active. The commitment starts after the interview, survives reload, and is assessed after three games, not after repeated button clicks.

Youth promises excuse unavailable youngsters and partial minutes; they close neutrally after six attempted games if the evidence remains insufficient. A fulfilled pledge adds six credibility, four to the relevant supporter group and reduces scrutiny by three; a missed pledge subtracts eight/five and adds four scrutiny. All effects are disclosed and bounded. Club changes, unemployment and competition-phase/season boundaries close unfinished pledges without penalty. Serialized pledge copies in the original edition are updated explicitly after reload.

## Persistence and limits

`state.press` contains club profiles, 12 recent evidence samples and 24 editions per club, plus current-season fixture identifiers. Season changes retain editions and soften previous public opinion while clearing the current-season form/identity ledger. Existing saves establish a boundary at already-played fixtures: no retroactive opinions or rewards are invented. UI rendering does not advance the model. Names are HTML-escaped, and the layout includes keyboard focus, accessible tab labels and narrow-screen stacking.

## Verification

`node press-supporters.test.cjs` covers all clubs and tabs, live and background settlement, once-only effects, expectation/OT sensitivity, recovery inertia, player and PP evidence thresholds, partial/friendly handling, three-game statements, reload, youth exemptions, career boundaries, bounded archives and escaped names.

Additional regression coverage: manager pressure, manager feedback, desktop navigation, save compression/import and headless/native parity. Full repository CI runs before merge.
