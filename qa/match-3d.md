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

Limitations: original procedural figures, no imported skinned character assets,
no full contact/save animation set, puck elevation, crowd animation or replay director.
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


## Clear playback controls and camera tracking

The match header now separates **Vad visas?** from **Tempo på isen**. Visible
play uses the same 0.5×–8× rate in full matches, both highlight modes and replays;
1× means real-time motion. A short explanation is always visible. The former
90×–360× selector has moved to the coach settings as named fast-forward levels.
Only the simulation-only mode exposes it in the header. Preferences survive
save/reload and new fixtures; valid legacy highlight rates remain readable.
The old full-match 4× default becomes the normal 1× presentation default.

An opaque fast-forward panel explains why the match clock advances quickly.
The hidden 3D frame is retained instead of rebuilt during this interval. Normal
rendering resumes when a highlight starts or the user pauses. Simulation-only
mode also hides the rink while paused. Replay time and speed are independent of
the live match. Changing replay pace neither exits nor restarts the replay,
and slow motion does not change the live pace when returning to the match.

3D adds zoom (80–150%, with a reset) and an optional projected puck marker.
Camera following eases in simulation time, freezes when paused, and resets for
faceoffs, replay rewinds or skipped time. A framing check keeps a fast puck on
screen at close zoom. Camera changes do not invalidate player geometry.

Validation: fixed-clock rate/transition checks, cross-mode match-ledger parity,
legacy/default/save/next-fixture preferences, non-mutating replay pace and
camera controls, and puck framing across board positions and desktop aspect
ratios. Windows smoke uses the real controls, captures settings (36), expanded
zoom (35) and slow replay (34), checks puck projection and GPU fallback, and
confirms that hidden frames avoid drawing and geometry rebuilds.

## Articulated skating and stick rig

Skaters share an original kinematic rig: hip/knee/ankle and shoulder/elbow/hand
chains have fixed bone lengths, the spine leans and turns, and both gloves hold
one fixed-length shaft. The skate runner follows the boot during recovery.
The existing native WebGL renderer draws this rig; no Three.js dependency or
imported glTF model is introduced. Kits, zoom, picking and 2D fallback still use
the same production presentation.

`recordMotion` stores filtered acceleration, travel heading, body heading,
turn rate and backward blend from actual movement. Acceleration drives strides;
steady travel glides; retreating defenders face the puck; turns blend into
crossovers; deceleration turns the skate edges into a stop. These facts never
feed movement, attributes, decisions, fatigue or RNG. Distance drives the gait,
and sampled headings interpolate across the short angular path.

Observed passes, shots, clearances, dumps and pickups record a small action with
its wall timestamp, origin and target. Shot style comes from the engine's actual
wrist/slap/one-timer context, and known L/R shooting hand comes from the roster.
Unknown hand uses the generic rig stance. No wind-up predicts an unmade decision.
Receiving players reach toward a nearby incoming pass, then cushion actual
control. The carrier's blade meets the authoritative puck without moving it.
Follow-through survives a short flight, then the body returns smoothly to its
normal anchor. In stoppages the simulation's wall time can finish the action;
pausing freezes it. Old frames and saves without these optional fields still work.

Replay capture retains up to 0.8 seconds of **observed** recovery after a shot,
stopping before a faceoff reset. Each extended replay replaces the old object
and frame list, so retained recordings remain immutable. An immediate pause
does not synthesize future recovery or advance the match for a replay.

Validation covers outcome/RNG parity with presentation recording disabled,
fixed limb lengths and two-hand grip through real play for L/R stances,
backward/glide/brake/crossover motion, pass receipt, release after resolution,
angular interpolation and release timestamps, save/reload and immutable replay
recovery. Windows smoke checks the actual shot style and rig, native WebGL
geometry/caching, and records `37-match-3d-motion.webm` from the real replay.

## Equipped models, balance recovery and observed tactical clips

The production asset now includes skaters and both goalkeeper handednesses with
15 skin joints. Head, hands, feet and goalie pads follow their joints; names and
numbers include keepers. Full meshes replace the extra procedural equipment in
the production draw, while sticks retain their authoritative contact endpoints.

A real check records a bounded balance disturbance derived from closing speed,
mass, strength, skating, energy and puck protection. It limits acceleration,
control and immediate decisions, then recovers in simulation wall time. The
same recorded state controls torso lean, stance and knee flexion; no new random
roll is used for the recovery. Legacy actors simply have no disturbance.

Attack intentions reread actual lanes and can retain up to six changes of puck
holder over 14 seconds. Blocked routes can become a point feed, cycle, diagonal
or give-and-go. The original pass/shot choice still decides the action. PP can
exchange the weak flank and bumper, or rotate low in the umbrella setup, while
retaining the net-front screen. BP can press an observed bobble/miss with one
leader and a second forward closing an outlet, leaving the far side available.
Personnel/strength changes, turnovers and whistles end inapplicable plans.

Six short observation clips and up to 96 recent factual observations are saved.
Only two clips per kind/side/strength are retained, so frequent turnovers do not
immediately erase every other type. Clips use real recorded frames, quantized
to four decimal places for bounded storage; the simulation keeps full precision.
They include completed diagonals, possession lost on a pass/battle, missing
nearby passing support, open slot receptions, PP rotation passes and BP pressure.
Faceoff wins are not labeled puck losses. Three-on-three overtime is separated.

The coach can link repeated observations to these recordings. Manual tactical
changes and accepted coach orders retain their clip query and exact simulation
timestamp, allowing comparable examples before/after within the current match.
Archived reports cannot accidentally display another match's clips. Playback
uses each clip's actual timestamps, including events between regular captures.
It pauses the live game, restores the previous view on exit and reveals the
annotation only once its recorded moment is reached. Missing/old observations
produce no invented recording. The existing shot replay remains separate.

## Connected motion, supported battles and graphics quality

Recorded drive/brake/turn weights ease between skating states. A contacting
blade slides along its recorded edge while resisting lateral drift; contact
weight blends out before the recovery stride. Windup returns to the actual
puck at release and remains available when replay interpolation crosses that
timestamp. These animation fields do not influence simulation decisions.

One nearby helper per side can join a duel by physically reaching stick range.
A board contest with support can release a moving loose puck. The two engaged
players have a short pickup delay; the ordinary loose-puck race decides who
collects it. Bench-bound players and distant helpers do not contribute.

Goalkeepers carry butterfly depth, facing and lateral load between shots.
Turning and recovery take time; low posture limits lateral skating speed.
Lateral load reduces the remaining pad spread in both contact geometry and
the visible stance, so a sliding keeper cannot retain full leg extension.
Sharp-angle play adds a post stance. New shots reuse the actual posture and
equipment positions, and 3D uses the same recorded body state. Old recordings
without this state retain the earlier compatible presentation.

Five-on-five marking changes are adopted as a complete assignment after a
skill-dependent read interval, keeping one defender per threat. A forward can
cover inside a back pressing at the boards, at the cost of leaving a higher
opponent more room. Plans expire or reset after personnel/strength changes,
possession and whistles.

Original bind-mesh equipment determines roughness and metal response, independent
of club colors. Cloth, helmet shells, gloves/pads and steel use different
surfaces. Normal/high add fill-light highlights; high adds restrained ceiling
light reflections in the ice. This is local shading, not scene ray tracing.
The graphics setting persists with the career and applies to live/replay:
low uses fewer spectators and reduced resolution, normal retains the standard
budget, and high permits higher pixel density. All players remain present.

`match-flow-materials.test.cjs` covers these mechanics, immutable recordings,
graphics preferences and saved continuation. Windows smoke opens every quality
through the actual settings control and records a real joined duel (44), all
three quality settings (45), and goalie body/pose equality alongside match video.

## Physical carrying, routes and continuous presentation

The live foreground loop advances the fixed 100 ms engine steps from the
animation callback and samples the remaining fraction on every screen frame.
The timer still advances hidden windows and non-graphical clients. Ordinary
entry/attack/possession changes preserve interpolation and camera tracking;
an explicit faceoff epoch, skipped interval or rewind resets them. Automatic
camera zoom eases inward while retaining immediate room for an outgoing puck.
Snapshots are cached per engine tick, sampled once, and the skinned vertex
buffer is reused. Pauses and reduced-motion preferences remain explicit.

The authoritative carried puck moves toward a forehand, backhand or protected
blade position at a control-dependent rate. Pressure chooses the protected
side. A player pushed beyond reach releases a moving loose puck, and shots
start at the same observed puck position. The body no longer shifts behind an
invented carrier anchor in new recordings. Older frames retain their fallback.

Skaters have speed-dependent turning radius, braking before a reversal and a
physical heading/backward state. Swept goal-volume constraints and waypoints
route bodies around either goal. Bodies remain inside the rendered rounded
boards, and two symmetric contact passes preserve tangential skating motion.
Loose pucks reflect off the rounded corners with normal/tangential energy loss.

Nearby attackers seek the screen line and then the actual rebound. A defender
must reach the inside position within stick range to reduce the attacker's
reception and pickup reach. Active PP rotations retain their assigned players;
whistles clear the net-front contest. Posture/control/contest state survives
saved continuation with bounded validation.

An opposing close carrier causes the goalkeeper to lower gradually into a
partial ready stance before release. The stance uses observed puck distance,
not a future shot target; moving the threat away lets the goalkeeper recover.
This covers the actual short reaction window introduced by physical carrying.

`match-physical-flow.test.cjs` covers both rink directions, release identity,
reach loss, turn/brake behavior, goal routes, corner/body contact, physical
stick control, phase/reset interpolation, frame-clock progression, buffer reuse
and exact save continuation. Windows smoke requires motion to advance on over
80% of the actual live rendered frames, writes moving-frame diagnostics and
records the unmodified live rink in `46-match-3d-live-flow.webm`. Frame time
describes that CI machine, rather than promising a universal frame rate.

## Puck boundaries and release geometry

Airborne passes, dumps and clearances now sweep against the rounded rink and
the goal net's back, sides and sloping roof. The goal mouth remains open.
Surface contacts reflect the actual incoming velocity with energy loss; the
remaining time continues as a loose puck rather than finishing an impossible
flight through the boards. Loose pucks use the same surfaces, including legacy
rim waypoints. New dumps bounce from the actual wall instead of snapping onto
a prescribed route outside its corner. The visible net now includes its sides.

Passing speed, passing lanes, shot blocking and goalkeeper alignment use the
carried puck's actual release position. A windup invalidated behind the goal
line is cancelled so the carrier can make another decision. No team bonuses,
attribute changes or relaxed balance thresholds are introduced.

`match-puck-boundaries.test.cjs` reproduces the original net pass and four-corner
dump failures, preserves the open mouth and air above the net, checks loose
continuation, energy loss, fixed-step subdivision, serialization and release
geometry. The existing SHL club matrix remains an unchanged gate. Its failing
Brynäs/Linköping quality ratio improved from 0.694 to 0.975 in the original
five-period sample during validation. A separate 20-period paired home/away
sample gave 0.993, with 11.3 vs 10.35 shots per period. These small samples are
regression evidence, not a claim of complete league calibration; the existing
96-period calibration suite remains required as well.

## Arena graphics

The renderer now separates cool arena light, cloth, helmet shells, equipment,
paint and worn ice. A cached 2048×1024 procedural ice texture carries restrained
skate marks and the actual home crest; board panels and jersey crests use the
same bundled club artwork. More closely spaced spectators, end stands, glass,
aisles, a concourse ribbon and rear lighting replace the sparse first arena.
The original player asset has smoother head/helmet contours, fitted skate
proportions and bevelled goalie pads, retaining its 15-joint rig and fewer than
2,400 vertices per model.

Normal quality adds a 1024px light-space depth map for player, stick and goal
shadows; high uses 2048px and nine shadow taps. Low and GPUs without depth
textures use feathered contact shadows. Glass is drawn after opaque geometry
with depth writes disabled. Paused geometry, textures and the depth map are
cached; camera movement alone does not rebuild the shadow map. All additional
GPU resources are released when leaving 3D. Texture generation never consumes
simulation randomness, and arena identity follows the actual home club.
The depth pass contains only rink-side casters, with seating and ice excluded;
shadow filtering also skips spectators and concourse surfaces. Opaque draws
avoid blending and the static ice/kit textures use mipmaps for distant detail.

Native Windows checks exercise shader compilation, shadow allocation, each
quality level, paused resource reuse, exact match-state preservation and
context re-creation. The screenshots and recorded live/replay sequences must
be inspected for legibility, shadow alignment and frame pacing before merge.
