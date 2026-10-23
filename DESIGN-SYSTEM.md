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

## Clubhouse theme · selected direction 3

The selected visual target is [the clubhouse cutaway](docs/clubhouse-theme/reference.jpg).
`clubhouse-theme.js` is a deferred presentation module: it runs after all classic
career modules. `clubhouse-theme.css` supplies the full-screen navy frame, warm
gold actions, illustrated spatial overview, real daily agenda and shared work
dialog. Keep these materials and the locally bundled Inter font consistent
across squad, tactics, recruitment, development, club and world workspaces.

The room navigation is always available from the overview. Analytical screens
open in the same frame, keep their existing sorting, filters, decisions and
player links, and close with Escape or the return button. Long recruitment
lists scroll inside the work surface; never allow headers and inspectors to
squeeze the candidate table to zero height.

The overview is a raster environment with interactive HTML controls. Its people
are atmospheric illustration, not a live projection of the current roster.
Real player information and conversations use the career-backed player list.
The existing animated rooms remain available through **Utforska i 3D**, with a
route back to the illustrated overview. The overview and generic portrait are
generated assets, converted to WebP; club crests and player portraits reuse the
existing assets. The coach portrait is a fictional character, not a likeness of
the player. Bootstrap Icons are vendored with their MIT license in `assets/icons`.

The theme performs one local presentation migration (`hm-clubhouse-theme-version`)
and then preserves explicit presentation choices. It does not migrate career
saves or create decisions, training effects, statistics or a second match engine.
The dates, priority, training session and fixture in the mock are replaced by
actual career evidence. Do not reproduce the mock's example appointment times
or junior scenario as fabricated gameplay.

Validation: `clubhouse-theme.test.cjs` covers read-only views, all rooms/work routes,
required-decision priority, guarded day continuation, persistence and fixture
entry. `checkClubhouseTheme` in the Windows browser suite additionally checks
image loading, usable candidate-table height, room return and narrow layouts.
See `design-qa.md` for the local browser evidence and remaining test limits.
