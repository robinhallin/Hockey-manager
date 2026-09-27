# Articulated hockey players

`hockey-uniform.gltf` contains original project models, authored by
`scripts/build-hockey-model.cjs`. No external model, texture, motion capture or
licensed equipment design is included. Run `node scripts/build-hockey-model.cjs`
to reproduce the glTF and its bundled offline copy, `match-player-asset.js`.

There are three selectable glTF scenes: a skater, a left-catching goalkeeper
and a right-catching goalkeeper. All use the same 15-joint skeleton: pelvis,
chest, upper/lower arms and legs, head, hands and feet. Model vertex counts are
1,890 / 2,104 / 2,104, with 2,516 / 2,820 / 2,820 triangles respectively.

The torso, sleeves and legs have blended skin weights. Helmets, visors/masks,
segmented gloves, skate boots/laces/runners and goalkeeper pads are attached to
their corresponding joints. The goalie jersey and sleeves deform with the
actual pose. Sticks remain procedural to meet the authoritative puck and keep
the two-hand grip. The old procedural figures remain available to isolated
renderer tests without the bundled asset; production renders the complete skin.

`match-player-model.js` reads this bundled subset: one embedded buffer,
three indexed triangle meshes, float/unsigned-short accessors, vertex colors,
UVs and one skin. It is not a general external-model importer. Team colors,
names and numbers are generated offline at runtime in a cached texture atlas.
Each actor's model and handedness determine the index offsets; all actors,
including goalkeepers, are skinned in the normal draw path.

Poses come from recorded match facts. Contact imbalance affects the engine's
acceleration, control and decision readiness, and the displayed body follows
that state. Replays never reroll a contact or fabricate a later outcome.

Windows verification records the production rig, render diagnostics, an actual
match video, a physical balance recovery and an observation clip opened through
the game's analysis tab. Frame-time measurements describe the CI machine and
are not a guaranteed frame rate on every player's computer.
