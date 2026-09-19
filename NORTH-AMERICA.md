# NHL contracts, AHL placements and Swedish loans

Access: **Ligorna → NHL & draft → Kontrakt & Nordamerika**. This third international stage connects career draft rights to actual contracts, departures, loanbacks and eventual free-agent returns. Existing saves initialize an empty prospective ledger. No historical signings are invented.

## What the simulation represents

The [official AHL affiliations directory](https://theahl.com/nhl-affiliations), checked September 19, 2026, supplies the 32 real NHL–AHL relationships in `NA_AFFILIATES`. This snapshot includes Hamilton Hammers as the New York Islanders affiliate. These are researched club relationships; the contract terms below are explicitly **game assumptions**, not a reproduction of the NHL/NHLPA CBA or international transfer agreements.

- July–September, the market reviews career-drafted players aged 18–25 with sufficient current role attributes. Active rights determine the negotiating NHL club; expired rights allow a deterministic different organization. Existing future contracts, injuries, international duty and loans block departure. Domestic clubs preserve two available goalkeepers, six defenders, twelve forwards and four capable centers.
- Each NHL club can sign one tracked player per game year, with at most twelve active contracts, 108 million SEK reserved at the NHL wage and six million SEK annual transfer compensation. These limits describe the **tracked prospect group**, not the entire real NHL roster or league salary cap. Annual offer/signing ledgers remain independent of the bounded visible history.
- Contracts last three years for players aged 21 or younger, otherwise two. Game wages are 9 million SEK at NHL placement and 900,000 SEK at AHL placement. Negotiated club compensation is capped at 3 million SEK. Free agents and international development-pool players require no club fee. Signed fees post once to the existing club economy.
- The manager explicitly accepts, accepts with an offered loanback, or rejects an outgoing offer. AI clubs decide within the same constraints. An offer expires after fourteen days. Draft selection itself still changes no club contract or salary.
- Eligible young players can return on loan through June 30, paying half the AHL wage. AHL prospects can also accept Swedish season loans during the domestic window when the receiving role and wage budget fit. The standard loan ledger handles wages, actual ice time, role follow-up, expiry and voluntary recall after 28 days.
- NHL placement requires role strength of at least 14.5 and a place among the tracked organization's top one goalkeeper, two defenders or three forwards. Reviews run on the 1st and 15th. This does not claim real-world depth-chart accuracy.
- Players abroad recover daily and receive registered development sessions September–April. A calendar day processes once, JVM duty excludes duplicate foreign training/recovery, and birthdays occur once each season. The league simulation, registered match statistics and disclosed anonymous depth model are described in NORTH-AMERICA-SEASONS.md.
- At NHL contract expiry the same player enters the shared free-agent market. A return to Sweden uses ordinary wage/role negotiations. An active NHL contract cannot be bypassed through the domestic transfer or future-contract actions.

NHL/AHL calendars, tables and playoffs now run in the league simulation. Complete real senior rosters, CBA waivers, RFA rules, entry-level slides and exact salary-cap accounting remain outside this stage. European league seasons and senior national teams are also later stages.

## Identity, persistence and integration

`p.naContract` stores ownership, dates, level wages, original Swedish club and a bounded personal history. The same player object is held in exactly one physical registry: domestic senior/academy roster, `state.northAmerica.abroad`, international pool or free-agent market. A Swedish loan keeps the player only in the receiving roster, while `state.loans.active` records the NHL owner. International selection sees both domestic and overseas players, preserving JVM eligibility and attributes across moves.

The contract/offer engine runs after calendar progression, separately from read-only rendering. Save/reload preserves offers and decisions without rerolling them. An unfinished live match blocks transfer decisions and daily processing. Overseas transfers close the prior development dialogue neutrally and cancel obsolete domestic offers. Standard club finance and loan accounting own cash and wages; no parallel cash ledger is introduced for Swedish clubs.

State is bounded: 180 world events, 16 events per active contract, four prior contracts per player, 96 closed offers plus current pending offers. Offer, signing and fee ledgers retain the current and previous game year. Expired overseas players use the existing free-agent aging/retirement system.

## Validation

`north-america.test.cjs` exercises explicit offers, identity and fee idempotence, save/reload, loanback wage shares, real loan match-stat integration, recall dates, roster/health/budget/live-match restrictions, development and JVM absence, assignment, protection against domestic contract bypass, season aging, contract expiry, Swedish return and history-independent signing limits. The real draft-to-preseason seam is tested alongside existing NHL draft, international, loan, economy, recruitment, storage and long-career suites in repository CI.
