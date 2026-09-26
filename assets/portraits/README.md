# Player portraits — HV71, Brynäs, Frölunda Djurgården and Linköping complete, wider production pending

All 28 players in the game's starting HV71 senior roster, all 24 Brynäs players, all 26 Frölunda players, all 25 Djurgården players, all 29 Linköping players and 23 of 24 Färjestad players have individual cartoon portraits: 155 of 715 active real senior players. The other 560 active real senior players and fictional juniors currently have an explicitly labelled initials placeholder, not an invented likeness. This is NOT a complete all-player portrait pack.

The Linköping batch adds 29 individually referenced illustrations. `linkoping-production.json` records exact IDs, source pages and final prompts. Twenty-six references come from the August 2026 Linköping headshot series; Tuomaala, Niku and Wilde Larsen use identified Elite Prospects photos and retain their helmets or goalie mask. Each delivered illustration was visually reviewed and optimized to a transparent 384×384 PNG.

The Djurgården batch adds 25 individually referenced illustrations. `djurgarden-production.json` records exact IDs, source pages and final prompts. Twenty-four references come from the August 2026 Djurgården headshot series; Oliver Wahlstrom uses his NHLPA headshot. Each delivered illustration was visually reviewed and optimized to a transparent 384×384 PNG.

The Färjestad batch adds 23 individually referenced illustrations. `farjestad-production.json` records exact IDs, source pages and final prompts. Twenty-two references come from the August 2026 Färjestad headshot series; Douglas Nilsson uses his identified Elite Prospects photo and retains his goalie mask. Samuel Eriksson (`ep-806192`) remains pending: his identified Elite Prospects image shows his back, and no usable face reference was retrieved. Each delivered illustration was visually reviewed and optimized to a transparent 384×384 PNG.

The Frölunda batch adds 26 individually referenced illustrations. `frolunda-production.json` records exact IDs, source pages and final prompts. Twenty-four references come from the August 2026 Frölunda photo series; Clarke uses an NHLPA headshot and Thegerström uses his identified Elite Prospects photo. Thegerström retains his goalie mask because the reference does not show an unobstructed face or hair. Each output was visually reviewed and optimized to a transparent 384×384 PNG.

The Brynäs batch adds 24 individually referenced illustrations. `brynas-production.json` records exact IDs, source pages and final prompts. Twenty-one references are individual headshots from the August 2026 Brynäs photo series; Bäckström, Järnkrok and Anderson-Dolan use NHLPA headshots. Each output was visually reviewed and optimized to a transparent 384×384 PNG. Only generated illustrations ship in the game, not the reference photographs.

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
