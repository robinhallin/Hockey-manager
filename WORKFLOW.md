# Coherent manager workflow

The office has three primary blocks: today, decisions and next fixture. Supporting coach focus, opponent context, stories and finances are expandable. Duplicate generic calendar/training links have been removed; contextual tasks remain. The persistent header owns advancing time, including on the calendar.

Calendar owns team sessions, individual development owns individual focus/load and observed development. Analysis owns choosing a coaching focus, calendar owns scheduling its session, and development displays its follow-up instead of repeating the whole editor.

Lineup is one workspace with even-strength rink, match squad/reserves and PP/PK rink views; old specialTeams links resolve to it. Recruitment has Needs, Search, Scouting, Shortlist and Negotiations. Free agents are a search filter; old free links still work. Scouting's legacy route resolves to the shared recruitment page. Existing loan/world/history functions remain under More.

Shared navigation pauses a running fixture without advancing it. Player profile back actions restore their originating list, filters, lineup view and desktop/document scroll. History is bounded, session-only and resets when the career state is replaced. This is in-game back navigation, not URL/browser-history synchronization. Existing selected inbox detail is restored on back. Reports link to the archived match by ID; new transfer rejection/counter messages carry a deal ID. Older generic transfer messages still open the negotiations overview. Existing player and story links remain contextual.

Validation: workflow.test.cjs covers all primary routes and recruitment/lineup tabs, player return and scroll/filter preservation, exact report/deal selection, aliases, live clock/pause isolation and save compatibility. Development and coaching-cycle tests pass. Browser: new HV71 career, office desktop and 390×844 iframe, continue after reload, lineup and PP/PK navigation. Oversized SVG arrows and cramped task text found visually and corrected. This is not native iPhone testing or exhaustive visual testing of every page.
