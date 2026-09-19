# Locker-room relationships

Open **Laget → Omklädningsrum → Relationer**. Individual conversation memory also appears in the existing player inspector. Public responses remain in **Översikt → Press & supportrar**.

## Leadership and introductions

Up to three informal leaders are derived from leadership and actual social-pair bonds. A bond of 45 indicates an established connection; the system never invents a friendship or real-world personality. After three consecutive competitive losses, a trusted non-captain leader can reassure up to three connected players (+0.5 trust each), once per four matches. Existing captain effects remain separate. A connected leader can question an unresolved colleague's role situation once per escalating case (−1 trust), or mediate once (−5 tension, no trust reward).

Actual roster additions become eligible for an introduction mentor for eight competitive matches. A trusted leader mentors at most one active newcomer. Three fixtures with at least five minutes for each complete the assignment: newcomer trust +2, pair bond +3. Partial data and medical unavailability do not supply participation; after eight attempts an incomplete assignment ends neutrally. Departure ends it without penalty.

## Conversation memory and conflicts

Each player has twelve retained conversation records. Repeated topics within eight competitive matches reduce positive conversation gains by two per repetition, floored at zero. An ambitious skater repeatedly denied the promised role does not gain trust from another bench explanation. Two unresolved public disappointments limit a positive conversation to +1. Existing three-match individual conversation cooldown and evidence requirements still apply.

A new role conflict requires two actual missed-role assessments for an available skater. Goalkeeper rotation remains governed by the existing dedicated role system. Tension increases only with further eligible failures and falls when minutes match the role. Three consecutive eligible matches meeting the role calm the case. Existing role follow-up owns trust restoration, preventing a second reward.

Acknowledgement reduces tension by three once and uses the existing individual conversation cooldown. An explicit four-match plan adds a disclosed −2 trust consequence if it does not deliver three consecutive eligible matches at the promised minutes. Medical, loan, rest and partial-data exceptions apply. The underlying role promise is not silently changed. Role changes, transfers, season boundaries and unemployment close affected cases neutrally; recorded history remains.

## Public/private consistency

A new public option lets the manager take responsibility and defend the team. Players with sufficient existing trust and loyalty or sensitivity can gain +1; repeated protection requires four competitive matches without another such message. Public result and youth commitments create personality-specific journal reactions without an instant attribute or morale bonus.

Fulfilled public commitments give +1 trust to the relevant players; missed ones give −1, or −2 after repeated disappointments. Youth commitments concern young skaters, never implicitly remove a veteran's agreed role. Fulfilled commitments gradually reduce the memory of previous public disappointments. Outcomes and responses have separate once-only identities, surviving save/reload.

## Persistence and checks

`state.relationships` stores current club profiles, fixture boundaries, cases, mentor assignments, event history and public-response identities. New careers and old saves establish a roster baseline; archived games do not generate new events. The module consumes no match randomness. Event, case archive, per-player dialogue, mentor history and fixture/press identity lists are bounded. Existing social journals carry the individual explanations.

`locker-relationships.test.cjs` covers once-only effects, dialogue memory, action-based reconciliation, qualified plan failure, mediation and peer influence, newcomer introduction, public response and outcome memory, career boundaries, reload, escaping, all 28 clubs and the production locker-match hook. Existing locker, role-promise, press, storage and manager suites verify integration.
