# International player world and JVM · first stage

## Delivered

A shared player-identity layer, a persistent international development pool, and a calendar-driven simulated U20 tournament under **Ligorna → Landslag & JVM**. Existing senior players, managed juniors, AI academies and free agents compete within the same national selection pools. Player identity, birth cohort and international history survive promotion, transfers and seasons.

Every season: selection on December 15, medical replacements and departure on December 20, group matches December 26/27/29/30/31, quarter-finals January 2, semi-finals January 4, medal matches January 5, and return January 6. Fixtures resolve when the date ends, not when a report is opened. The calendar includes a link and duty context. Individual senior profiles retain international appearances and medals.

## Scope and authenticity

This is explicitly a **career simulation**, not a researched reproduction of an official year's squads, groups, schedule or rulebook. Ten real national identities are used: Sweden, Canada, USA, Finland, Czechia, Slovakia, Switzerland, Germany, Latvia and Norway. The groups are seeded from the previous simulated podium. Standings use points, overall goal difference, goals scored and country-code order. Fifth-placed teams play for positions 9–10; there is no lower-division promotion/relegation yet. Playoff overtime and shootouts are simplified. The interface explains these assumptions.

Known birth dates use their actual birth year. Older records with only an age receive an anchored, explicitly estimated birth year; identity does not drift when age changes. The game uses birth cohorts tournament-year minus 20 through minus 16. Nationality represents one national identity; dual citizenship, federation transfers and the full legal eligibility rules are not implemented.

The international pool contains clearly fictional players with stable IDs and country-appropriate names. It does not pretend to be NHL/AHL or a real European club database. Each country has 32 development players across positions. The pool ages annually; over-20 players enter the existing free-agent market and normal contract process. The main club world remains authoritative for employed players. NHL, AHL, draft rights, European league seasons and senior national teams are later stages.

## Selection and effects

Select 3 goalkeepers, 8 defenders, 4 centres and 10 additional forwards. Roles prioritize defensive attributes, creation or scoring; registered production gives a small capped contribution after at least three games. Fatigue and injuries affect eligibility and ranking. Potential does not buy a place. Medical withdrawals before departure can be replaced by eligible reserves of the same position group.

Duty belongs to the player and has explicit dates. Medical availability gates also respect duty, while status text distinguishes national absence from an injury. Club training, J20 training, guest-training records and AI training exclude those players. Duty is excused for role/playing-time follow-up. National workload and medical recovery are advanced once by the international calendar process. There is no parallel club development or recovery credit while away.

Tournament games use a separate deterministic summary simulation with an independent seed, current attributes, role-based selection and weighted ice-time allocation, rotating fit goalkeepers, shot events, assists, saves, workload and injury risk. Normal-time skater seconds total 18,000 per side; overtime adds three-skater time. Shootout winner goals are separated from player goals. International statistics never enter club/league totals. Reports and squad statistics are derived from recorded appearances.

On return, participants retain a bounded history and receive a small morale acknowledgement if they played; no automatic attribute increase. The user can explicitly replace a returning senior player's current training plan with three days of rest, using the existing training-return system. Injury clearance is still handled medically. Club lineup repair fills vacant slots without restoring obsolete pre-tournament orders.

## Persistence and verification

Versioned state lives in `state.international`; duty and bounded personal history live on the same player objects used by clubs. Six tournament summaries and eight personal tournament records are retained. A save first activated after the selection date skips that edition instead of inventing past results, injuries or absences. Read-only views do not run match simulation. A daily guard prevents repeated processing and a running club match cannot be advanced by this system.

`international-juniors.test.cjs` exercises eligibility, role composition, immutable birth years, full 29-game tournament conservation, return idempotence, exact save reload, withdrawal, legacy activation, calendar integration, junior/club absence and next-season market entry. Existing medical, J20 calendar, guest-training, interface, match-workspace, relationships and storage suites provide regression coverage. Full CI runs before merge.
