# Player portraits — HV71 complete, wider production pending

All 28 players in the game's starting HV71 senior roster have individual cartoon portraits. The other 687 active real senior players and fictional juniors currently have an explicitly labelled initials placeholder, not an invented likeness. This is NOT a complete all-player portrait pack.

The September 26 batch adds 26 individually referenced avatars to Ang and Liv. `hv71-production.json` records each player's exact ID, source page, output asset, generation method and final prompt. Noel Skarby retains a plain helmet because the identified reference shows him wearing one; hidden hair was not invented. Komuls uses an older ECHL headshot, Hardman and Regenda use NHL headshots, and the other new portraits use the August 2026 HV71 photo series. All outputs were visually reviewed for identity, framing and cartoon treatment. These are stylized interpretations, not exact reproductions.

`player-portraits.js` is the exact-ID registry. Add only reviewed person-specific assets; never match by name, team, ethnicity or nationality. No save migration is needed. Transfers retain the face and show the current club crest separately. Assets are local and included by desktop staging.

Run `node scripts/portrait-coverage.cjs` for the active real-player production queue. Inactive external research registries are outside that report. Each remaining real player needs an identified visual reference, individual generation, likeness/style review and registry entry. Fictional players need a separate stable-ID system and fictional portrait production; no real-player images should be reused for them.

## Production provenance

Generated with the built-in image generation tool, 2026-09-25, from the user's reviewed sculpted/cartoon concepts. Reference photos used for the concepts:

- Herman Liv: https://bildbyran.se/ice-hockey/260804HV71/260804BB817
- Jonathan Ang: https://www.eishockey.info/eishockey/jonathan-ang/spieler/13509

## Final prompts

Liv: Production game avatar of Herman Liv from the approved cartoon sculpted portrait. Preserve his exact illustrated face, brown swept-back hair, expression and clearly cel-shaded angular style. Remove ALL lettering, background, crest and jersey decoration. Plain charcoal hockey undershirt. Single centered head and shoulders bust, full hair visible with 5% top margin, shoulders bottom edge, square canvas. Truly transparent alpha background. No text, frame, logo, pores; not photographic.

Ang: Production game avatar of Jonathan Ang using his approved portrait for identity and the approved Herman Liv concept ONLY for more cartoon, angular cel-shaded sculpted treatment. Preserve Ang's face proportions, spiky black hair, eyes, expression. Flat painterly planes, NOT photographic skin. Remove lettering, background, crests and jersey decorations. Plain charcoal undershirt. Single centered head and shoulders bust, full hair visible, square canvas, transparent alpha. No text, frame or logo. Do not copy Liv's identity.
