# National League career — beta 5

The National League is an opt-in, separate 14-club career. Existing Swedish saves and new Swedish worlds retain their 28 teams and original schedule. Shared match, recruitment, development, finances, save and job systems are reused. Job offers stay inside the saved world's membership.

## Data and scope

412 real source players, 14 packaged crests. `scripts/build-swiss-data.cjs --check` verifies the reproducible runtime snapshot against the retained European source pack. No network is needed by the installed game. Unknown nationality remains null; no citizenship is inferred from a name. Unknown contracts use explicitly labelled one-year game agreements. Ratings and financial scenarios are estimates, not measured facts.

Corrections checked 2026-09-26:
- Sami Niku (`nationalleague:345020`) is excluded from Lausanne following the club's 14 September departure announcement: https://lausannehc.ch/2026/09/14/le-lhc-et-sami-niku-se-separent-dun-commun-accord-2/
- Curtis Lazar (`nationalleague:352058`) is a forward in the federation's line-up: https://www.sihf.ch/fr/game-center/game/composition/20271105000028
- Sevan Ferrari (`nationalleague:327657`) is a forward in federation statistics: https://www.sihf.ch/de/game-center/team/spielerstatistiken/117-4-103570
- Reto Berra's Kloten affiliation agrees with the club's transfer announcement: https://www.ehc-kloten.ch/aktuell/transferberra/

The calendar generates 52 balanced rounds from 15 September to 1 March, preserving leap-year dates. It is not the published fixture list. Play-in uses 7–8 and 9–10 over two legs; the first winner qualifies and the first loser faces the second winner for the last spot. The first leg can finish level. In the return, only a level aggregate triggers continuous five-on-five overtime; an individual game may finish drawn or be won by the eliminated team. The same predicate controls live and background engines. Quarterfinals, semifinals and final use best-of-seven and reseeding.

Rules basis: https://www.nationalleague.ch/media/cmegdmgp/modusnl_25-26.pdf and https://www.scb.ch/news/news/artikel/neuerungen-in-der-national-league/ . The 2026/27 format is described as unchanged by https://www.evz.ch/news/teams/men/2026/06/der-spielplan-2026-27-ist-da/ . Further seasons repeat the game rules, not a prediction of future regulations.

## Explicit beta limitations

Swiss League and relegation are outside this career. Import licences are not enforced because the input does not establish registration eligibility. Shared transfer windows, points/goal-difference tiebreaking, budgets, wages and contracts are game assumptions, with all amounts displayed in SEK. The initial player-list association is not certified ownership. The career selector, league screen, profiles and beta guide disclose these limitations. Finland and Czechia remain preparation only. The original Europe readiness report still describes the unmodified staging pack, not this runtime career.

## Verification

- Swiss onboarding, minimum positional coverage for all 14 clubs, generated dates, source exclusion, save/export/reload and return to a Swedish career.
- Aggregate draws, inverse result/qualifier, duplicate result guards, second-chance route and best-of-seven quarterfinals.
- Actual background match rows, conserved league points and idempotent statistics.
- Actual manager live match and drawn first-leg finalization through the production engine.
- `CAREER_LEAGUE=CH_NL CAREER_SEASONS=2 node scripts/career-long-run.cjs`: two seasons with actual AI games, calendar, contracts, transfers, financial ledgers, ageing and new-season reload. This is a background soak; it cancels friendlies through the normal public action and does not claim a two-season UI playthrough. No job protection, fabricated contract extensions or synthetic match scores.
- Installed Windows UI checks select National League/Kloten, accept the job, verify August onboarding/five friendlies, league workspace and disk reload. The existing Swedish installed-game checks still run first.

Home ice follows the current 2026/27 published play-in order (8–7 and 10–9 first, reversed in leg two; the second-chance higher seed also hosts the return): https://www.zsclions.ch/fileadmin/user_upload/www.zsclions.ch/news/26-27/Spielplan_ZSC_Lions_2026_2027_V4.pdf . Best-of-seven home ice alternates, higher seed hosting games 1/3/5/7, as documented in https://www.zsclions.ch/news/artikel/informationen-playoff-final-vs-lausanne/ . The Swedish home-ice sequence is retained unchanged.
