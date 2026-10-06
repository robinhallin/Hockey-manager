# North America: European-career market (v3)

NHL is a background market, **not a playable manager league**. Draft rights, contract ownership and playing registration are separate. The match engine and league simulation are unchanged.

## Outgoing transfers

1. Weekly during the game model's July–September window, organizations assess available prospects and established European players. A valid negotiated release clause can also open its own period. Swedish players drafted in the current calendar year are restricted to July 15–August 15 inclusive, following SIF 2026/27 §4:9. Drafted players can qualify from 18; players without recorded draft rights can qualify from 22. The older-player quality threshold is higher. Missing historical rights are not invented.
2. Active contract or retained negotiating rights take precedence over draft rights. Otherwise the destination is selected by tracked positional competition and a stable organization preference.
3. Each organization can make multiple signings. The tracked group retains **game limits**, not real NHL salary-cap rules: twelve contracts, 108 million SEK of annual NHL wages and six million SEK of annual transfer fees. Pending offers reserve capacity, wages and fees.
4. The European club approves a move, approves an available loanback, or declines. A depleted manager roster produces a warning, not an artificial prohibition. AI clubs decline departures which leave inadequate coverage. Medical unavailability, international duty, existing loans and future contracts still block this simplified negotiated route.
5. The player and agent decide three calendar days later. Ambition, loyalty, likely NHL/AHL opportunity, development and likely placement salary affect acceptance. The player may refuse despite club approval. No money or ownership moves during deliberation.
6. At settlement, the original club, rights, availability, registration window, loanback affordability and NHL capacity are checked again. Fees post once through existing club finance; obsolete domestic offers are closed; lines and roster registries are repaired.

Offers normally expire after fourteen days. Approval on the last day extends deliberation, but does **not** extend the registration window. Failed or rejected cases release their reservations. AI and manager transactions use the same player-decision stage.

## Contract model

An employed manager can grant an adult player a dated NHL release clause from the existing player profile. It records the current club, contract end, release period and fixed game compensation. Inside that period the prior agreement replaces a new club veto; the player still decides and financing, rights, availability and dates are checked at settlement. Pending negotiations block clause changes. Expired clauses can be replaced. The fee is a negotiated game value, not the real SIF compensation table.

During the last 60 days of a contract, organizations assess renewal using quality and tracked positional competition. Offers reserve wage increases; the player decides after three days. An agreed renewal starts only when the old deal expires, retaining player identity and archiving the old terms. Otherwise the existing simplified retained/released NHL-rights model applies. This is not a qualifying-offer or arbitration implementation.

First career NHL deals use age-based entry-level terms: three years through 21, two at 22–23, one at 24. Returning players do not restart entry-level eligibility. Older players receive one- or two-way deals based on current quality, with shorter terms for veterans. Wages are variable **game estimates in SEK**, not verified real contracts or currency conversions. One-way means equal NHL/AHL pay, not a guaranteed NHL roster position.

Saved legacy terms remain intact. Pending v1 offers migrate to club-decision stage without inventing historical decisions or fees.

NHL/AHL assignment remains the disclosed tracked-group model (quality and positional competition, reviewed twice monthly), not a full real depth chart. An injury or national-team call does not itself trigger administrative demotion. Contract salary type and assignment are separate. Full waiver eligibility, claims, entry-level slides and salary-cap accounting are **not implemented**.

Recorded current-season production adds a bounded placement adjustment. Every 28 days, actual games and ice time inform a development review. Too little evidence produces no invented judgement. An ambitious established AHL player with no NHL opportunity, or an AHL player with little ice time, can seek a European loan and decline a renewal. Reviews skip injury and international duty and display their evidence in the contract panel.

## Loans and return

An AHL loan request reserves the manager's wage room immediately. It does not attach a player immediately. After three days the NHL organization assesses whether it needs the player as a call-up option and the player evaluates the receiving role. Ownership, placement, availability, current budget and registration window are rechecked. A cancelled request releases its reservation.

Successful loans use the existing loan ledger: half the contracted AHL wage, season/contract end, actual minutes, role follow-up and the existing 28-day voluntary-return rule. This is a game loan agreement, not a statement of international transfer law.

On expiry, the same player enters the ordinary free-agent market. The game can retain NHL-only negotiating rights for one further season for a player younger than 27 with sufficient quality, or release them. This is explicitly **not a complete RFA/UFA determination**: qualifying offers, service-year exceptions, arbitration and offer-sheet compensation are not modeled. Retained NHL rights do not block a European contract. Subsequent NHL offers respect those rights.

## User interface

### European club planning

Recruitment → squad planning includes an NHL contingency section, not another main tab. It distinguishes an actual pending offer, a valid dated release clause and a draft-rights watch. None is a completed departure or a probability forecast. The explanation uses current lineup/special-team references, healthy available positional alternatives and a hypothetical annual wage change. It does not change the real squad, projected signed contracts or available budget.

Managers can save a watch-only plan or a plan to negotiate after a confirmed departure, prepare a linked scouting brief and select up to eight candidates from scouting/watch lists. Scouting retains its normal cost and uncertainty. Editing the brief preserves its plan link. The plan opens an ordinary offer form only after a registered NHL departure; approval alone, a failed offer or a loanback does not activate it. Managers still review terms and submit the offer themselves. Plans are scoped to the employing club and survive saves; daily status notifications are deduplicated. Closing a plan does not cancel independently purchased scouting work.

Adult owned players can discuss NHL ambitions without receiving a bonus for simply talking. A promise to approve a viable NHL move, or request an available viable loanback, is evaluated against the club's actual decision. Honouring it gives +2 trust, deliberately breaking it −6; a viable refusal without a promise can cost an ambitious player −2. Medical, financial, rights or window blockers do not break the promise. Player refusal and expiry without a viable club decision do not cause penalties. Active promises cannot be overwritten, and new talks have a 28-day cooldown. Existing clause rights and match-based development promises remain separate.

At departure the game records the known home-club relationship. On European return, recorded club-specific history contributes a bounded −12 to +12 to the shared offer score used by AI and manager competition, and half that amount to package acceptance. A strained relationship can therefore reject a marginal offer even without a rival. Personal salary, role and length floors cannot be bought away by relationship bonuses. Missing legacy evidence receives no invented homecoming bonus. Salary, agent, role credibility, contract length and ordinary financial checks still apply. Other clubs do not inherit the manager's trust score. The ordinary offer form explains this context and shows the number of competing offers, not hidden rival terms.

Players abroad can be watched for a European return, and actual scout reports can be requested from the contract panel. Weekly returnee processing notifies watchers and invites up to two interested AI clubs through the ordinary recruitment system, using its squad needs, funding, offers and player decisions. Pending competition is visible in the existing recruitment overview.

The existing recruitment overview, negotiations and loans screens share a compact expandable NHL summary. It contains pending outgoing cases, loan requests with withdrawal controls and available returnees. Player contract dialogs distinguish current registration, contract owner and NHL rights. Existing World → NHL controls handle approvals and detailed history; no new main navigation tab is added.

## Persistence and safeguards

Player identity stays in exactly one physical registry (domestic roster/academy, international pool, abroad or free-agent market). Loans retain the NHL owner in the existing loan record. Save/reload preserves stage, due date, terms, player decision and pending wage reservations.

Daily work is idempotent and blocked during unfinished live matches. Archives remain bounded: 180 market events, 16 events per contract, four prior contracts per player, 96 closed outgoing offers and 48 closed loan requests. Current requests remain available until resolved.

Career storage v4 losslessly encodes UTF-8 before LZW compression, preserving all history. Readers retain compatibility with v1–v3; an actual v3 fixture covers migration. The three-season storage failure shrank from 5.54 MB to 4.32 MB in the captured regression state, with an exact JSON roundtrip.

## Rule evidence and limits

Checked October 6, 2026:

- [SIF 2026/27 competition regulations](https://www.swehockey.se/media/r1ickxrh/taevlingsbestaemmelser-2026-2027.pdf), §4:9: current-year drafted players' July 15–August 15 transfer period. The game does not yet model the full international release paperwork or compensation allocation.

- [NHLPA 2025 MOU](https://cdn.nhlpa.com/img/assets/file/NHLPA-NHL-MOU-June-27-2025.pdf), items 18–19: entry-level deals have separate minor-league compensation; the special entry-level requirement for European players aged 25–27 is removed.
- [NHL/NHLPA original CBA](https://cdn.nhlpa.com/img/assets/file/NHL_NHLPA_2013_CBA.pdf), article 9.1(b): age-based entry-level term lengths. Read with later amendments, not alone.
- [NHLPA ratification notice](https://www.nhlpa.com/news/nhl-nhlpa-ratify-four-year-collective-bargaining-agreement/): the four-year extension was ratified in July 2025.
- Existing [AHL affiliation snapshot](https://theahl.com/nhl-affiliations), checked September 19, 2026, is retained, not re-imported by this change.

The indexed MOU/CBA provisions were retrievable; full PDF downloads through the research tool exceeded its size limit. No claim of a complete CBA audit is made. Actual birth-date age definitions, other international transfer deadlines and compensation allocation require further source-backed implementation. The general July–September window, negotiated clauses and fees, tracked budgets and retained-rights formula remain disclosed game assumptions.

## Verification

`nhl-club-planning.test.cjs` covers risk without fictional income, conditional activation, loanback exclusion, saved candidates and linked scouting, promise consequences and idempotence, live-match guards, club-specific return preferences, bounded salary tradeoffs and read-only views. `scripts/nhl-club-planning-browser-checks.cjs` exercises the new planning controls, dialogue and candidate-to-offer navigation inside the existing desktop smoke suite.

`nhl-career-market.test.cjs` covers inclusive draft-window boundaries, automatic clause approval, exact-once compensation, invalid clauses, renewal timing, released veterans, actual-minute development reviews and AI competition for watched returnees.

`nhl-market.test.cjs` covers delayed approval, rejection, exact-once settlement, changed rights, variable contracts, saved pending decisions, loan reservations, cancellation, affordability, European return and read-only views. Updated North America regression tests cover real league stats, loans, idempotent training, season changes and nine-season uniqueness/budget/history invariants.

`scripts/nhl-market-browser-checks.cjs` is wired into desktop smoke testing for actual approval clicks, confirmation, delayed settlement and screenshots. Execution status must be reported separately; adding the check is not evidence that it has run.
