# NHL draft and player rights — second international stage

## What is implemented

Thirty-two real NHL franchise names, persistent career draft choices, separate NHL rights on existing player objects, uncertain scouting forecasts and a concrete post-draft development dialogue. Access under **Ligorna → NHL & draft**. Player and junior profiles and the recruitment inspector show rights; the calendar links to the draft year. Existing save files initialize prospectively. No past choices, money or departures are invented.

A player selected in the draft stays in the same roster with the same ID, attributes, salary, Swedish contract, future agreement and statistics. Promotion and domestic transfers therefore carry the draft record naturally. Rights expire on June 30 four years after the choice; the historical draft record remains. Expiry never terminates a Swedish contract. There are no NHL contracts or transatlantic transfers in this stage.

## Explicit simulation assumptions

The NHL club names were checked against the NHL's [official club directory](https://www.nhl.com/info/teams/), accessed September 19, 2026. Club names are the researched part. The following are **game rules**, not a verified implementation of the NHL/NHLPA collective bargaining agreement or a reproduction of a real draft:

- Draft day is June 28 each year; seven rounds, up to 224 picks from the tracked player pool.
- The order is generated reproducibly for each year. There is no fabricated NHL table, draft lottery, traded pick ownership or compensatory pick system. The same order applies to every round.
- Exact recorded birth dates use turning 18 by September 15. Age-only records use the international layer's estimated birth year. The model allows three eligible years and prevents a selected player being selected again, even after rights expiry. Real-life geographic/re-entry exceptions are not modeled.
- Older real-world players do not have researched draft/rights information in the start database. Real players whose first eligible draft was 2026 or earlier are excluded rather than redrafted; profiles state that earlier status is unverified. Future first-eligible cohorts and fictional prospects can participate.
- All new career choices use a uniform four-year rights term. Real CBA exceptions by league, nationality, education or previous registration are not implemented.
- NHL clubs have individual reproducible scout opinions and positional preferences for that draft. These do not claim to represent real NHL rosters, current needs or actual scout opinions.

Full NHL/AHL seasons, NHL contracts and departures, a complete researched historical rights database, tradeable picks, European league seasons and senior national teams remain later stages.

## Scouting and decisions

Forecasts use present role attributes, recorded improvement relative to the training baseline, a modest age projection and capped international exposure. They do not read hidden development ceilings, the legacy overall/potential values or attributeGrowth. Existing registered production contributes through the shared role score; a JVM appearance adds only limited evidence. Club-specific deterministic uncertainty changes each club's ranking. Previous picks modestly reduce a club's preference for the same position, avoiding seven identical positional choices by default. The public report displays overlapping round ranges and can still be wrong. The top 100 matching players are displayed; search operates across the whole board.

Reports publish on the first processed day of the autumn, winter (January 15 onward) and spring (May 15 onward) windows. Simply reading a view never advances time, rolls a new draft or mutates a player. Final selection uses current evidence immediately before the draft. The existing season transition skips directly to July 1; its June draft is therefore resolved **before** annual birthdays, retirements and stat resets. Draft records and news are dated June 28. Normal daily progression also handles June 28, idempotently. Older editions are archived on the next processed date.

For a currently owned drafted player, once per season the manager may promise senior ice time, promise J20 time (eligible academy players only), or keep an open dialogue. Promises do not move players, change lines or grant development:

- Skaters: at least four of six assessable team fixtures with 8 minutes (senior) or 15 minutes (J20).
- Goalkeepers: at least two of six fixtures with 30 minutes.
- Medical absence/restriction, international duty, loans, forfeited J20 fixtures and partial senior data are excluded. Healthy omissions count; friendlies and games before the promise do not.
- Success gives +3 morale and, if a social profile exists, coach trust. Failure gives −4. Open dialogue gives no automatic reward. Repeated reports cannot repeat the consequence.
- A 100-day review horizon starts no earlier than September 1; insufficient evidence, a season transition, a club move or a change of manager closes the promise neutrally.

These effects use existing morale/relationship systems and actual registered ice time. No NHL contract offer or move is implied by the promise.

## Persistence and validation

`state.nhl` stores the current draft and six historical editions. `p.nhlDraft` stores the choice/expiry; `p.nhlFirstYear` freezes the draft cohort for selected players. The current development plan and four previous plans remain with the player. Completed plans retain at most six fixture keys. New drafts never duplicate players or add a second roster copy. External players leaving the internationally tracked pool keep their original choice in the bounded draft archive; this stage does not simulate their untracked professional careers.

`nhl-draft.test.cjs` covers birth-date boundaries, legacy migration, uncertainty and hidden-potential independence, seven-round pick uniqueness, deterministic reload, contract preservation, season-transition ordering, rights expiry, actual senior/J20 fixture integration, excused absence, plan idempotence, transfers and read-only navigation. Existing international, player-world, academy, relationships, calendar, recruitment and storage tests run alongside it. Full repository CI is required before merging.
