'use strict';
// Pinned, offline rendering runtime. Rebuild with npm ci && npm run build:3d.
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/vendor');
fs.mkdirSync(out,{recursive:true});
esbuild.buildSync({stdin:{contents:"export { WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, Group, Mesh, SkinnedMesh, Skeleton, Bone, InstancedMesh, BufferGeometry, BufferAttribute, Float32BufferAttribute, Uint16BufferAttribute, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, MeshDepthMaterial, PointsMaterial, Points, CanvasTexture, DataTexture, WebGLRenderTarget, PMREMGenerator, Color, Vector2, Vector3, Vector4, Matrix4, Quaternion, BoxGeometry, SphereGeometry, CylinderGeometry, PlaneGeometry, CircleGeometry, HemisphereLight, DirectionalLight, Fog, DoubleSide, FrontSide, BackSide, SRGBColorSpace, NoColorSpace, ACESFilmicToneMapping, PCFShadowMap, PCFSoftShadowMap, RepeatWrapping, ClampToEdgeWrapping, EquirectangularReflectionMapping, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, UnsignedByteType, DynamicDrawUsage, AdditiveBlending } from 'three';",resolveDir:root},bundle:true,minify:true,format:'iife',globalName:'HockeyThree',target:'es2022',outfile:path.join(out,'hockey-three.js'),legalComments:'eof'});
fs.copyFileSync(path.join(root,'node_modules/three/LICENSE'),path.join(out,'three-LICENSE.txt'));
console.log('Bundled Three.js '+require(path.join(root,'node_modules/three/package.json')).version+' for offline play.');
