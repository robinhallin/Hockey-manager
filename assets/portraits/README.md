# Player portraits — incomplete production batch

Two real-player avatars are ready: Jonathan Ang (`ep-251447.png`) and Herman Liv (`ep-796339.png`). Remaining real players and fictional juniors currently have an explicitly labelled initials placeholder, not an invented likeness. This is NOT a complete all-player portrait pack.

`player-portraits.js` is the exact-ID registry. Add only reviewed person-specific assets; never match by name, team, ethnicity or nationality. No save migration is needed. Transfers retain the face and show the current club crest separately. Assets are local and included by desktop staging.

Run `node scripts/portrait-coverage.cjs` for the active real-player production queue. Inactive external research registries are outside that report. Each remaining real player needs an identified visual reference, individual generation, likeness/style review and registry entry. Fictional players need a separate stable-ID system and fictional portrait production; no real-player images should be reused for them.

## Production provenance

Generated with the built-in image generation tool, 2026-09-25, from the user's reviewed sculpted/cartoon concepts. Reference photos used for the concepts:

- Herman Liv: https://bildbyran.se/ice-hockey/260804HV71/260804BB817
- Jonathan Ang: https://www.eishockey.info/eishockey/jonathan-ang/spieler/13509

## Final prompts

Liv: Production game avatar of Herman Liv from the approved cartoon sculpted portrait. Preserve his exact illustrated face, brown swept-back hair, expression and clearly cel-shaded angular style. Remove ALL lettering, background, crest and jersey decoration. Plain charcoal hockey undershirt. Single centered head and shoulders bust, full hair visible with 5% top margin, shoulders bottom edge, square canvas. Truly transparent alpha background. No text, frame, logo, pores; not photographic.

Ang: Production game avatar of Jonathan Ang using his approved portrait for identity and the approved Herman Liv concept ONLY for more cartoon, angular cel-shaded sculpted treatment. Preserve Ang's face proportions, spiky black hair, eyes, expression. Flat painterly planes, NOT photographic skin. Remove lettering, background, crests and jersey decorations. Plain charcoal undershirt. Single centered head and shoulders bust, full hair visible, square canvas, transparent alpha. No text, frame or logo. Do not copy Liv's identity.
