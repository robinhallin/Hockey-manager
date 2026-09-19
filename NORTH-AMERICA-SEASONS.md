# NHL/AHL seasons — fourth international stage

Access: **Ligorna → NHL & draft → Ligaspel**. Both leagues now have complete generated regular seasons, standings, playoff series, champions, match reports and a separate statistical ledger for tracked career players. All dates advance with the existing daily calendar. The Swedish preseason transition completes the remaining North American season before birthdays, contract expiry and the June draft, then archives it.

## Researched facts and explicit model choices

Club names and NHL divisions were checked in the [NHL club directory](https://www.nhl.com/info/teams/). Current AHL divisions and NHL affiliations were checked in the [AHL directory](https://theahl.com/nhl-affiliations) and the site navigation of the [AHL qualification rules](https://theahl.com/qualification-rules), September 19, 2026. The latter's qualification article still describes **2025–26**, whereas its current directory places Hamilton in the North division. This implementation adapts qualification counts to the current directory's 7/8/7/10 division sizes; it does not claim verified 2026–27 qualification rules.

The schedule and detailed competition rules are a disclosed game model, not an imported official fixture list or complete NHL/AHL rulebook:

- NHL: 84 games per club, 42 home and 42 away. Four against each division rival, three against each team in the other division of the conference, two against each opposite-conference team.
- AHL: 72 games per club, 36 home and 36 away. Generated pairings favor division opponents, then the same conference. Reversed fixtures balance home advantage. Exact geographic scheduling, travel and arena availability are not modeled.
- Regular seasons run from October 1 through mid-April, with no club playing twice on a date. NHL and AHL calendars are independent. Two points for a win, one for an overtime/shootout loss. Tie-breaks: points, regulation wins, wins excluding shootouts, all wins, goal difference, goals scored, stable club-name order. Exact head-to-head tie-breaks remain unimplemented.
- NHL qualification: top three in each division plus two wild cards in each conference. Division winners draw the conference wild cards; the stronger division winner gets the lower-ranked wild card. Division second and third seeds meet. Division, conference and final brackets follow; all series are best of seven.
- AHL qualification: five teams from each seven-team division, six from the eight-team division, seven from Pacific (23 total). The highest seeds receive first-round byes. Division survivors are reseeded. Series lengths are best of three, five, five, seven and seven. Conferences then meet in the final.
- Regular-season overtime is at most five minutes with three skaters, then a shootout. Playoff overtime continues with five skaters until a simulated goal; no playoff shootouts. Shootout deciding goals count in team scores but not individual goals or shots.

## Player coverage and the match engine

The complete real-world NHL/AHL player database is **not** present. Remaining roster places use anonymous depth slots, visibly described as **Övriga laget (lagmodell)**. They have reproducible estimated club/season attributes, not researched claims about current team quality. They are not invented real players, transferable objects or entries in the international player pool. Their output is excluded from the named player-statistics table.

Career players signed through the contract system keep their original object and ID. They compete against the model's depth for one goalkeeper, six defender and twelve forward game places. Current attributes, fatigue and availability influence selection. Same-day arrivals, international duty, injury, Swedish loans and a previous game that day block appearance. A player who has played in North America cannot also borrow into Sweden on that date. A placement change introduces a travel day.

The lightweight season engine uses the existing `MatchWorld2` attribute, initiative and shot-context functions plus `StudioHockey` shot evaluation and shootouts. It is a background simulation, not a new live rink renderer or a claim of exact tactical parity with the richer Swedish match engine. The regulation game generates shot attempts, saves, goals and assists; the resulting event record owns both score and player production. Goalkeeper time and skater-time budgets include overtime. A normal untracked inaugural season was measured around six total goals and 55–60 total shots per game; tests enforce broad scoring bounds and exact statistical conservation rather than a predetermined champion.

Only selected tracked players receive match minutes, fatigue, load, development or injury risk. Their `naSeasons` ledger separates year, club, league and competition phase, retaining six years. It does not overwrite their Swedish `games/goals/assists` fields or national-team ledger. Debuts create messages; existing overseas reports now include registered NHL/AHL production. Personal records remain after loans or free-agent returns.

## Persistence and timing

`state.naLeagues` holds the current season and at most three archived seasons. Completed seasons use a lossless structural dictionary of field layouts, repeated strings and up to 64 repeated short fragments, stored in bounded text blocks; only champion summaries remain expanded. The structural representation remains compressible by the outer career packer, avoiding nested compressed byte streams. Selecting an archived year decodes a read-only view and retains every fixture and player row while keeping the active save below its storage budget. Fixtures have stable IDs and a played marker, so reloads or repeated date processing cannot count a game twice. Each completed match retains goals, team shots, duration, tracked player rows and any injuries. The UI reads these records; navigation and filtering do not simulate matches.

Existing saves opened after October 1 start league coverage the following season. The module does not reconstruct earlier results using current contracts or placements. An unfinished live match blocks North American processing. The ordinary daily calendar processes matches on their date, before advancing to next-day recovery. The explicit preseason transition finishes the season chronologically, including daily overseas recovery, before annual aging and contract changes. No user-facing button skips the Swedish manager calendar to simulate these leagues.

## Validation

`north-america-seasons.test.cjs` covers schedule counts, home/away balance, division membership, deterministic dates, complete champions, NHL/AHL qualification and series completion, points and goals, saves, time budgets, tracked-player production, health/JVM/loan exclusions, travel, same-day borrowing, reload, live-match guards, legacy-save migration, read-only views and the actual preseason transition. Existing contract/draft suites and full repository CI run alongside these tests.

Still outside this stage: a full researched NHL/AHL roster database, managing an NHL/AHL club, complete NHL CBA/cap/waiver rules, imported real schedules, detailed North American coach/roster AI, European league seasons and senior national teams.
