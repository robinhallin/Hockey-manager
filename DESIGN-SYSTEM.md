# Hockey Manager · visual system

`design-system.css` is the shared presentation layer, loaded after the existing workspace styles. Changes concern presentation; routes, decisions, simulation and save schemas retain their existing ownership.

## Typography

Inter Variable is bundled locally as WOFF2, preloaded and displayed with `font-display: swap`. No third-party font request is required. The unmodified font and SIL Open Font License are in `assets/fonts/`; source: https://github.com/rsms/inter/tree/master/docs/font-files. Swedish glyphs and all variable weights are retained. A system sans-serif remains available during loading or if the font cannot load.

Use 28px page titles (25px on narrower layouts), 17px section headings, 13px explanatory text, 12px controls and table content, and 11px table labels. Reserve uppercase 10px text for short category labels. Numeric data uses tabular figures. Preserve the dedicated compact match scale.

## Colour and hierarchy

Use the `--ui-*` tokens for a navy background, two levels of surfaces, readable secondary text, borders and links. Club colours supply a lightened accent for selected navigation and primary actions. Medical/status colours remain semantic. Never use a colour alone to explain an unavailable player or current tab.

Use one solid primary-action family, bordered secondary buttons, and quiet text links. Keep visible keyboard focus and disabled states. Summary strips and nested sections should be quieter than primary panels. Avoid adding a different gradient or card shape for each feature.

## Layout

The desktop navigation is 184px. Standard workspaces share outer spacing, headings, table treatments and form controls. The overview distinguishes the decision list from supporting context; squad tables preserve sticky headers, filters, sorting and player links. Long lists scroll within their existing regions.

Live match geometry and the full-screen match layout remain owned by the match integration stylesheet. The shared layer supplies font and colours only in that workspace. Career-menu geometry also retains its dedicated layout. Existing narrow-screen fallbacks and reduced-motion preferences remain supported.

## Verification

Run the existing interface, squad and match-workspace regression suites for navigation/filter/save continuity. Inspect the public desktop overview, squad, recruitment, development, club, leagues, calendar and paused match, including loaded font, horizontal overflow and browser errors. Do not advance a saved career as part of visual inspection.
