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
