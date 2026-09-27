# Hockey uniform

`hockey-uniform.gltf` is an original project asset, authored by
`scripts/build-hockey-model.cjs`. No external models, textures or motion capture
are included. Run `node scripts/build-hockey-model.cjs` to reproduce both the glTF
and its offline JavaScript copy, `match-player-asset.js`.

The model has 613 shared vertices, 1,032 triangles and ten skin joints. The torso,
sleeves and leg garments use blended joint weights. Equipment and goalkeeper
geometry continue to use the game's connected procedural poses. Club colors,
names and shirt numbers are drawn into a cached transparent texture atlas at
runtime. The renderer uses an indexed mesh and shares vertices across triangles.

`match-player-model.js` reads the bundled glTF subset: one embedded buffer,
one indexed triangle primitive, float/unsigned-short accessors, vertex colors,
UVs and a single skin. It is not a general-purpose external model importer.
Pose matrices come from actual match snapshots; the glTF contains a rest skeleton
and skin, not pre-recorded match outcomes or canned skating clips.

Windows UI verification records `3d-rig-result.json`, `3d-frame-times.json`, the
normal match screenshots and a video of an actual match. Frame interval samples
exclude pauses and hidden views. They describe the CI machine, not a guaranteed
frame rate on every player's computer.
