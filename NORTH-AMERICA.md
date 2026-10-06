# North America: European-career market (v2)

NHL is a background market, **not a playable manager league**. Draft rights, contract ownership and playing registration are separate. The match engine and league simulation are unchanged.

## Outgoing transfers

1. During the game model's July–September window, organizations assess available prospects and established European players. Drafted players can qualify from 18; players without recorded draft rights can qualify from 22. The older-player quality threshold is higher. Missing historical rights are not invented.
2. Active contract or retained negotiating rights take precedence over draft rights. Otherwise the destination is selected by tracked positional competition and a stable organization preference.
3. Each organization can make multiple signings. The tracked group retains **game limits**, not real NHL salary-cap rules: twelve contracts, 108 million SEK of annual NHL wages and six million SEK of annual transfer fees. Pending offers reserve capacity, wages and fees.
4. The European club approves a move, approves an available loanback, or declines. A depleted manager roster produces a warning, not an artificial prohibition. AI clubs decline departures which leave inadequate coverage. Medical unavailability, international duty, existing loans and future contracts still block this simplified negotiated route.
5. The player and agent decide three calendar days later. Ambition, loyalty, likely NHL/AHL opportunity, development and likely placement salary affect acceptance. The player may refuse despite club approval. No money or ownership moves during deliberation.
6. At settlement, the original club, rights, availability, registration window, loanback affordability and NHL capacity are checked again. Fees post once through existing club finance; obsolete domestic offers are closed; lines and roster registries are repaired.

Offers normally expire after fourteen days. Approval on the last day extends deliberation, but does **not** extend the registration window. Failed or rejected cases release their reservations. AI and manager transactions use the same player-decision stage.

## Contract model

First career NHL deals use age-based entry-level terms: three years through 21, two at 22–23, one at 24. Returning players do not restart entry-level eligibility. Older players receive one- or two-way deals based on current quality, with shorter terms for veterans. Wages are variable **game estimates in SEK**, not verified real contracts or currency conversions. One-way means equal NHL/AHL pay, not a guaranteed NHL roster position.

Saved legacy terms remain intact. Pending v1 offers migrate to club-decision stage without inventing historical decisions or fees.

NHL/AHL assignment remains the disclosed tracked-group model (quality and positional competition, reviewed twice monthly), not a full real depth chart. An injury or national-team call does not itself trigger administrative demotion. Contract salary type and assignment are separate. Full waiver eligibility, claims, entry-level slides and salary-cap accounting are **not implemented**.

## Loans and return

An AHL loan request reserves the manager's wage room immediately. It does not attach a player immediately. After three days the NHL organization assesses whether it needs the player as a call-up option and the player evaluates the receiving role. Ownership, placement, availability, current budget and registration window are rechecked. A cancelled request releases its reservation.

Successful loans use the existing loan ledger: half the contracted AHL wage, season/contract end, actual minutes, role follow-up and the existing 28-day voluntary-return rule. This is a game loan agreement, not a statement of international transfer law.

On expiry, the same player enters the ordinary free-agent market. The game can retain NHL-only negotiating rights for one further season for a player younger than 27 with sufficient quality, or release them. This is explicitly **not a complete RFA/UFA determination**: qualifying offers, service-year exceptions, arbitration and offer-sheet compensation are not modeled. Retained NHL rights do not block a European contract. Subsequent NHL offers respect those rights.

## User interface

The existing recruitment overview, negotiations and loans screens share a compact expandable NHL summary. It contains pending outgoing cases, loan requests with withdrawal controls and available returnees. Player contract dialogs distinguish current registration, contract owner and NHL rights. Existing World → NHL controls handle approvals and detailed history; no new main navigation tab is added.

## Persistence and safeguards

Player identity stays in exactly one physical registry (domestic roster/academy, international pool, abroad or free-agent market). Loans retain the NHL owner in the existing loan record. Save/reload preserves stage, due date, terms, player decision and pending wage reservations.

Daily work is idempotent and blocked during unfinished live matches. Archives remain bounded: 180 market events, 16 events per contract, four prior contracts per player, 96 closed outgoing offers and 48 closed loan requests. Current requests remain available until resolved.

## Rule evidence and limits

Checked October 6, 2026:

- [NHLPA 2025 MOU](https://cdn.nhlpa.com/img/assets/file/NHLPA-NHL-MOU-June-27-2025.pdf), items 18–19: entry-level deals have separate minor-league compensation; the special entry-level requirement for European players aged 25–27 is removed.
- [NHL/NHLPA original CBA](https://cdn.nhlpa.com/img/assets/file/NHL_NHLPA_2013_CBA.pdf), article 9.1(b): age-based entry-level term lengths. Read with later amendments, not alone.
- [NHLPA ratification notice](https://www.nhlpa.com/news/nhl-nhlpa-ratify-four-year-collective-bargaining-agreement/): the four-year extension was ratified in July 2025.
- Existing [AHL affiliation snapshot](https://theahl.com/nhl-affiliations), checked September 19, 2026, is retained, not re-imported by this change.

The indexed MOU/CBA provisions were retrievable; full PDF downloads through the research tool exceeded its size limit. No claim of a complete CBA audit is made. Actual birth-date age definitions, international transfer deadlines, compensation allocation and release clauses require further source-backed implementation. The July–September window, negotiated fee formula, tracked budgets and retained-rights formula remain prominently disclosed game assumptions.

## Verification

`nhl-market.test.cjs` covers delayed approval, rejection, exact-once settlement, changed rights, variable contracts, saved pending decisions, loan reservations, cancellation, affordability, European return and read-only views. Updated North America regression tests cover real league stats, loans, idempotent training, season changes and nine-season uniqueness/budget/history invariants.

`scripts/nhl-market-browser-checks.cjs` is wired into desktop smoke testing for actual approval clicks, confirmation, delayed settlement and screenshots. Execution status must be reported separately; adding the check is not evidence that it has run.
