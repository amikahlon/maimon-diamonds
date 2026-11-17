/**
 * Builds an ORIGINAL solitaire ring model and writes public/ring.glb.
 * Everything here is generated from code — no third-party assets, so the
 * model is ours to use commercially.
 *
 * Units: 1 unit = inner radius of the ring (≈ 8.5 mm, US size 7).
 * Nodes:  Band · Head (prongs + gallery) · Beads · CenterStone · Pave (instanced)
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshGPUInstancing, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { quantize, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import fs from 'node:fs';

const D = Math.PI / 180;
const R = 1;                       // inner radius
const TOP = Math.PI / 2;           // the head sits at +Y

/* ---------- band profile: cathedral shoulders that rise to cradle the head ---------- */
const shoulder = (th) => {
  const d = Math.abs(Math.atan2(Math.sin(th - TOP), Math.cos(th - TOP)));
  return Math.exp(-(((d - 0.36) / 0.24) ** 2));          // two arches either side of the head
};
// Slim, tapered cathedral: a fine 1.9 mm shank that rises gently into knife-like
// shoulders. The old 0.30 rise read as a solid wedge under the head.
const thick = (th) => 0.098 + 0.19 * shoulder(th);       // radial thickness
const width = (th) => {
  const d = Math.abs(Math.atan2(Math.sin(th - TOP), Math.cos(th - TOP)));
  return 0.185 - 0.085 * Math.exp(-((d / 0.62) ** 2));    // tapers toward the head
};

function bandGeometry(seg = 224, cs = 28) {
  const pos = [], idx = [];
  const n = 5; // superellipse exponent → soft-square comfort-fit section
  for (let i = 0; i < seg; i++) {
    const th = i / seg * Math.PI * 2;
    const t = thick(th), w = width(th), rc = R + t / 2;
    for (let j = 0; j < cs; j++) {
      const ph = j / cs * Math.PI * 2, c = Math.cos(ph), s = Math.sin(ph);
      const u = Math.sign(c) * Math.abs(c) ** (2 / n) * t / 2;
      const v = Math.sign(s) * Math.abs(s) ** (2 / n) * w / 2;
      // slightly domed inner surface (comfort fit)
      const comfort = u < 0 ? -0.012 * (1 - (2 * v / w) ** 2) : 0;
      const r = rc + u + comfort;
      pos.push(Math.cos(th) * r, Math.sin(th) * r, v);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < cs; j++) {
    const a = i * cs + j, b = ((i + 1) % seg) * cs + j, c = ((i + 1) % seg) * cs + (j + 1) % cs, d = i * cs + (j + 1) % cs;
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ---------- round brilliant, ideal-cut proportions (57 facets) ---------- */
function brilliant() {
  const P = (r, a, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  const tableR = .56, crownA = 34.5 * D, pavA = 40.75 * D, gird = .014;
  const hc = (1 - tableR) * Math.tan(crownA), pd = Math.tan(pavA);
  const T = [], S = [], GT = [], GB = [], L = [];
  for (let k = 0; k < 8; k++) {
    T.push(P(tableR, k * 45 * D, hc + gird));
    S.push(P(.79, (k * 45 + 22.5) * D, (1 - .79) * Math.tan(crownA) * 1.06 + gird));
    L.push(P(.24, k * 45 * D, -gird - (1 - .24) * pd));
  }
  for (let j = 0; j < 16; j++) { GT.push(P(1, j * 22.5 * D, gird)); GB.push(P(1, j * 22.5 * D, -gird)); }
  const C = new THREE.Vector3(0, hc + gird, 0), cul = new THREE.Vector3(0, -gird - pd, 0);
  const tri = [];
  const add = (a, b, c) => {
    const nn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (nn.dot(a.clone().add(b).add(c)) < 0) tri.push(a, c, b); else tri.push(a, b, c);
  };
  for (let k = 0; k < 8; k++) {
    const k1 = (k + 1) % 8, km = (k + 7) % 8, g = 2 * k, g1 = (g + 1) % 16, g2 = (g + 2) % 16;
    add(C, T[k], T[k1]); add(T[k], T[k1], S[k]);
    add(T[k], S[km], GT[g]); add(T[k], GT[g], S[k]);
    add(S[k], GT[g], GT[g1]); add(S[k], GT[g1], GT[g2]);
    add(GB[g], GB[g1], L[k]); add(GB[g1], GB[g2], L[k1]); add(GB[g1], L[k1], L[k]);
    add(L[k], L[k1], cul);
  }
  for (let j = 0; j < 16; j++) { const j1 = (j + 1) % 16; add(GT[j], GB[j], GB[j1]); add(GT[j], GB[j1], GT[j1]); }
  const geo = new THREE.BufferGeometry().setFromPoints(tri);
  geo.computeVertexNormals();
  return { geo, hc: hc + gird, depth: gird + pd };
}

/* ---------- head: six claw prongs, gallery rail, basket ---------- */
const STONE_R = 0.43;                         // ≈ 7.3 mm → ~1.3 ct
const { geo: stoneGeo, hc, depth } = brilliant();
const GIRDLE_Y = R + 0.17 + depth * STONE_R + 0.05;
function headGeometry() {
  const parts = [];
  for (let k = 0; k < 6; k++) {
    const a = (30 + k * 60) * D;
    const p = (r, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const curve = new THREE.CatmullRomCurve3([
      p(0.10, R + 0.13), p(0.22, R + 0.30), p(0.36, GIRDLE_Y - 0.16),
      p(STONE_R + 0.035, GIRDLE_Y), p(STONE_R - 0.01, GIRDLE_Y + hc * STONE_R * 0.55),
    ]);
    const tube = new THREE.TubeGeometry(curve, 28, 0.031, 12, false);
    parts.push(tube);
    const tip = new THREE.SphereGeometry(0.036, 24, 16);
    const e = curve.getPoint(1); tip.translate(e.x, e.y, e.z); parts.push(tip);
  }
  const rail = new THREE.TorusGeometry(STONE_R * 0.86, 0.022, 14, 96); rail.rotateX(Math.PI / 2); rail.translate(0, GIRDLE_Y - 0.15, 0); parts.push(rail);
  const basket = new THREE.TorusGeometry(0.2, 0.026, 14, 64); basket.rotateX(Math.PI / 2); basket.translate(0, R + 0.24, 0); parts.push(basket);
  parts.forEach(g => { g.deleteAttribute('uv'); });
  return mergeGeometries(parts);
}

/* ---------- pavé: a row of melee stones down each shoulder, with beads ---------- */
const MELEE_R = 0.043;
const pave = [], beads = [];
for (const side of [-1, 1]) {
  for (let th = 0.46; th < 1.30; th += (MELEE_R * 2.15) / (R + 0.2)) {
    const ang = TOP + side * th;
    const out = R + thick(ang) - 0.012;
    const n = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    pave.push({ t: n.clone().multiplyScalar(out), q, s: MELEE_R });
    for (const z of [-1, 1]) {
      const bt = th + (MELEE_R * 1.07) / (R + 0.2);
      const ba = TOP + side * bt;
      const bn = new THREE.Vector3(Math.cos(ba), Math.sin(ba), 0).multiplyScalar(R + thick(ba) + 0.004);
      bn.z = z * (MELEE_R + 0.008);
      beads.push(bn);
    }
  }
}
function beadGeometry() {
  const parts = beads.map(b => { const g = new THREE.SphereGeometry(0.017, 8, 6); g.deleteAttribute('uv'); g.translate(b.x, b.y, b.z); return g; });
  return mergeGeometries(parts);
}

/* ---------- write glTF ---------- */
const doc = new Document();
const buffer = doc.createBuffer();
const metal = doc.createMaterial('Metal').setBaseColorFactor([0.95, 0.78, 0.5, 1]).setMetallicFactor(1).setRoughnessFactor(0.12);
const stone = doc.createMaterial('Diamond').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(0);
const scene = doc.createScene('Ring');

function prim(geo, mat) {
  const p = doc.createPrimitive().setMaterial(mat);
  for (const [name, key] of [['POSITION', 'position'], ['NORMAL', 'normal']]) {
    const a = geo.getAttribute(key);
    p.setAttribute(name, doc.createAccessor().setType('VEC3').setArray(new Float32Array(a.array)).setBuffer(buffer));
  }
  if (geo.index) p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(geo.index.array)).setBuffer(buffer));
  return p;
}
function node(name, geo, mat) {
  const n = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim(geo, mat)));
  scene.addChild(n); return n;
}
node('Band', bandGeometry(), metal);
node('Head', headGeometry(), metal);
node('Beads', beadGeometry(), metal);
node('CenterStone', stoneGeo, stone).setTranslation([0, GIRDLE_Y, 0]).setScale([STONE_R, STONE_R, STONE_R]);

// instanced melee
const inst = doc.createExtension(EXTMeshGPUInstancing).setRequired(true);
const paveNode = node('Pave', brilliant().geo, stone);
const T = new Float32Array(pave.length * 3), Q = new Float32Array(pave.length * 4), Sx = new Float32Array(pave.length * 3);
pave.forEach((p, i) => { T.set([p.t.x, p.t.y, p.t.z], i * 3); Q.set([p.q.x, p.q.y, p.q.z, p.q.w], i * 4); Sx.set([p.s, p.s, p.s], i * 3); });
paveNode.setExtension('EXT_mesh_gpu_instancing', inst.createInstancedMesh()
  .setAttribute('TRANSLATION', doc.createAccessor().setType('VEC3').setArray(T).setBuffer(buffer))
  .setAttribute('ROTATION', doc.createAccessor().setType('VEC4').setArray(Q).setBuffer(buffer))
  .setAttribute('SCALE', doc.createAccessor().setType('VEC3').setArray(Sx).setBuffer(buffer)));

doc.getRoot().getAsset().generator = 'Maimon Diamonds — original procedural ring';
doc.getRoot().getAsset().copyright = 'Original model, generated from code. Free for commercial use by the site owner.';

await MeshoptEncoder.ready;
doc.createExtension(KHRMeshQuantization);
// Quantized (KHR_mesh_quantization) but not meshopt-compressed: it loads with no
// decoder or WebAssembly, so it works under strict content-security policies.
await doc.transform(dedup(), prune(), quantize({ quantizePosition: 14, quantizeNormal: 10 }));
const io = new NodeIO().registerExtensions([EXTMeshGPUInstancing, EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync('models', { recursive: true });
const glb = await io.writeBinary(doc);
fs.writeFileSync('models/ring.glb', glb);
fs.writeFileSync('src/ringMeta.json', JSON.stringify({ girdleY: GIRDLE_Y, stoneR: STONE_R, tableY: hc, culetDepth: depth, innerR: R, pave: pave.length }, null, 2));
console.log(`ring.glb ${(glb.byteLength / 1024).toFixed(1)} KB · ${pave.length} pavé stones · ${beads.length} beads`);

// The artifact host serves only text/code files, so the GLB also ships as a
// base64 ES module that is parsed in memory (no fetch, no decoder).
fs.writeFileSync('src/three/ringModel.js',
  `// Generated by scripts/build-ring.mjs — original ring model (GLB, base64)\nexport default '${Buffer.from(glb).toString('base64')}';\n`);
