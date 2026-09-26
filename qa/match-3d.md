# Match 3D preview

Opt-in presentation of production `studioFrame` snapshots and the existing
replay buffer. No second simulation, new RNG, scoring, save schema or physics.
Default stays 2D; view and camera are session-local. Offline, no dependencies,
remote assets or additional Electron privileges. Primitives are original code.

`match-3d.js`: batched static rink mesh and dynamic skater geometry in native
WebGL. Perspective projection, depth testing, directional shading, ice markings,
rounded boards, nets, two cameras, team colors, puck carrier label, projected
player picking. Frames interpolate by actor ID, including changes and penalties.
Puck uses actual XY data at ice level; no speculative vertical trajectory.
Motion uses simulation time and speed, so paused frames do not keep skating.

One renderer/context at a time, reused between animation frames and disposed
on view changes, canvas replacement and leaving match. GPU failure/loss exposes
2D and a visible message without advancing or modifying match data.

Verification:
- `node --test match-3d.test.cjs`: snapshot immutability, actor-ID interpolation,
  camera bounds and public view controls preserving real career match state.
- Existing `career-match.test.cjs`: deterministic save/reload and full game ledger.
- `desktop/match-3d-ui.cjs`, invoked by desktop and installed Windows smoke:
  real WebGL pixels/error status, both cameras, live engine progress, GPU loss,
  recovery, resource disposal, screenshots 31/32 at 1366×768.

Limitations: simple procedural figures, no skeletal contact/save animations,
no puck elevation, no crowd animation or close-up/replay camera director.
This change does not claim improvements to hockey decisions or AI balance.

## Beta 7 motion

`Match.presentationFrame()` is shared by live snapshots and replay capture.
Flight metadata whitelists actor IDs, side and elapsed/duration; it never sends
finish rolls or unobserved outcomes. `travelled` accumulates actual actor
displacement during movement and survives saves; older actors default to zero.
It affects only presentation, not decisions, fatigue, puck physics or RNG.

Pure pose evaluation uses distance for stride phase, speed for amplitude,
observed puck direction for goalie facing, approaching opposing shots for a
low blocking attempt and actual release identity for stick follow-through.
The carrier model shifts slightly behind its engine anchor to reach the puck.
No puck displacement/height is invented. A short trail follows real flight.

Interpolation avoids faceoff teleports and skipped-highlight sweeps.
Follow camera has a bounded target from the sampled puck, including replays;
no wall-clock easing can diverge at different playback speeds.

Tests add motion determinism, stationary pose, shooter identity, keeper
response, old-frame compatibility and snapshot/save parity. Windows smoke
reaches a real shot, captures Follow view and plays its real replay without
changing the match ledger.

## Models and large rink (development, no version bump)

Rounded helmets/faces/gloves and a shaped jersey replace the cuboid silhouette.
Goalkeepers have a mask cage and pad details. A contrasting alternate kit is
used for the second side when primary colors are too similar. These are generic
club-colored models, not claimed replicas of licensed equipment or official kits.
Per-fragment key/fill lighting, material highlights, contact shadows and static
seating improve depth. Unit sphere vertices and typed mesh buffers reduce CPU
work; identical paused geometry is retained on the GPU.

**Stor rink** hides the coach/stat/lineup panels while retaining score, clock,
playback and strength/penalty status. **Visa coachbänken** restores controls.
Clicking a player restores the coach panel with that player's task and pauses
as before. Focus is session-local, applies only to active 3D and desktop width,
and never changes the saved match.

Validation adds finite geometry and a <50,000 dynamic-vertex budget for a normal
on-ice unit, alternate kit contrast, read-only focus controls and actual Windows
UI checks for layout, caching, GPU errors, player picking and returning to coach.
Screenshot 35 and `3d-graphics-result.json` document the expanded surface.
