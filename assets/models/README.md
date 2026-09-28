# Articulated hockey players

`hockey-uniform.gltf` contains original project models, authored by
`scripts/build-hockey-model.cjs`. No external model, texture, motion capture or
licensed equipment design is included. Run `node scripts/build-hockey-model.cjs`
to reproduce the glTF and its bundled offline copy, `match-player-asset.js`.

There are three selectable glTF scenes: a skater, a left-catching goalkeeper
and a right-catching goalkeeper. All use the same 15-joint skeleton: pelvis,
chest, upper/lower arms and legs, head, hands and feet. Compact model vertex counts are
2,142 / 2,308 / 2,308, with 2,954 / 3,138 / 3,138 triangles respectively.

The torso, sleeves and legs have blended skin weights. Helmets, visors/masks,
segmented gloves, skate boots/laces/runners and goalkeeper pads are attached to
their corresponding joints. The goalie jersey and sleeves deform with the
actual pose. Sticks remain procedural to meet the authoritative puck and keep
the two-hand grip. The old procedural figures remain available to isolated
renderer tests without the bundled asset; production renders the complete skin.

The jersey tapers at the waist and has a separate collar. The narrower helmet
and shorter visor expose the original facial geometry. Head yaw follows the
observed play within neck limits; both skater gloves follow the actual shaft.
Skinning writes into a reusable typed buffer, retaining joint weights and the
same indexed surface layout without allocating a new actor mesh every frame.

`match-player-model.js` reads this bundled subset: one embedded buffer,
three indexed triangle meshes, float/unsigned-short accessors, vertex colors,
UVs and one skin. It is not a general external-model importer. Team colors,
names and numbers are generated offline at runtime in a cached texture atlas.
Each actor's model and handedness determine the index offsets; all actors,
including goalkeepers, are skinned in the normal draw path.

The renderer uploads a separate, cached surface buffer per model layout.
Original bind-mesh colors and joint attachment identify cloth, skin, helmet
shells, gloves/pads, skate boots and steel. Their roughness/metal response is
independent of the club kit color and uses the existing original asset. This
keeps material properties attached to the equipment as it moves without
duplicating vertex geometry or adding downloaded textures.

Poses come from recorded match facts. Contact imbalance affects the engine's
acceleration, control and decision readiness, and the displayed body follows
that state. Replays never reroll a contact or fabricate a later outcome.

Windows verification records the production rig, render diagnostics, an actual
match video, a physical balance recovery and an observation clip opened through
the game's analysis tab. Frame-time measurements describe the CI machine and
are not a guaranteed frame rate on every player's computer.

The arena-graphics refinement smooths helmet/head contours, fits skates more
closely and bevels keeper pads. The skater has 2,142 vertices and each keeper
2,308, under the existing per-model budget. Club crests, outlined back numbers,
names and waist/shoulder striping are cached in the runtime uniform atlas.


## Motion/contact revision, 28 September 2026

The broadcast model has 4,682 skater vertices and 5,216 goalkeeper vertices;
its distant LOD has 2,281 and 2,447 respectively. Reproduce both broadcasts with
`node scripts/build-hockey-model.cjs --broadcast`. Head, helmet, visor and mask
geometry are resized together around their bind pivot, keeping the 15 joints
and equipment attachment intact. Skate joints now include return-stroke pitch.

`match-broadcast-motion.js` is an original set of authored hockey curves, loaded
before the simulation. Fixed simulation steps record the distance-driven gait
phase; both ice contacts and the rig sample that same phase. Steady skating,
coasting, braking, backwards skating and crossovers blend from observed motion.
This is a stylized, programmatically authored asset set, **not motion capture or
a finished photorealistic character library**. Hand and leg IK remain analytic;
there are no licensed external clips hidden in the bundle.

Origin/use rights: these models and movement curves are produced by the
project's checked-in authoring code for Hockey Manager. No third-party model or
animation license is required; no separate open-source license is assigned to
the original project assets here. The third-party Three.js runtime retains its
MIT license at `assets/vendor/three-LICENSE.txt`. Existing club identity assets
and their provenance are unchanged by this revision.
