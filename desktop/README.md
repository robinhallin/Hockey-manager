# Desktop beta

The existing static game runs unchanged inside a sandboxed Electron renderer.
`stage.cjs` copies runtime JS/CSS, index and assets into `game/`; no server is needed.

```
npm ci --prefix desktop
npm run desktop:start
npm run desktop:windows
```

Windows installers are built by `.github/workflows/windows-beta.yml`. The workflow
installs the actual NSIS package and runs Playwright against the installed app.
Only a successful installed-app smoke test publishes the installer artifact (30-day
retention). The separate test-results artifact contains screenshots and a JSON test
record. GitHub login is needed to download Actions artifacts. These are private-beta
build artifacts, not an automatically published release or update channel.

`storage.cjs` owns disk I/O. `career-storage.js` routes the same existing career format
through a narrow preload bridge or the original browser storage. Desktop saves use
an outer version-1 envelope with SHA-256; the game save version remains 0.2. Writes
use temp-file + fsync + rename. Recovery is explicit through the existing import
validation/confirmation. No automatic crash reporting or remote code is loaded.
The synchronous bridge preserves the game's existing save success/failure contract.

`main.cjs` serves only staged resources through the secure `hockey://app` protocol,
validates IPC sender/frame and blocks external navigation. HTTPS source links open
in the default browser. Existing inline event handlers require CSP unsafe-inline;
Node integration, eval, webviews, permissions and remote connections remain disabled.
The profile directory and appId are stable across versions. A second app instance
focuses the first, preventing two simultaneous save writers.

The beta is unsigned; public distribution needs a signing/release process. No
publisher certificate is invented or embedded. Tests don't disable the production
renderer sandbox. Local development uses a separate profile. `HM_TEST_USER_DATA`
only overrides that development profile; installed builds always use the real app
profile (CI's Windows runner is disposable).

Validation:
- `node --test desktop-beta.test.cjs career-storage.test.cjs career-save-integrity.test.cjs`
- `npm run test:ui --prefix desktop` (requires an interactive desktop)
- Existing root regression suite and career-workflow CI remain enabled.

A native close waits for renderer pause/save acknowledgment. A failed or hung save
keeps the app open unless the user explicitly chooses to exit without a new save.
Force termination/power failure can only retain the latest completed disk write.
