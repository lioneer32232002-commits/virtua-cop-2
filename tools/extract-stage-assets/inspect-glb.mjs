#!/usr/bin/env node
// Dev helper: dump per-node geometry stats of a GLB (bbox/center/size/tris/materials).
// Usage: node inspect-glb.mjs <path/to/file.glb> [--sort=volume|y|tris|id]
import { NodeIO } from '@gltf-transform/core';
import { resolve } from 'node:path';

const [, , fileArg, ...flags] = process.argv;
if (!fileArg) {
  console.error('Usage: node inspect-glb.mjs <file.glb> [--sort=volume|y|tris|id]');
  process.exit(1);
}
const sortKey = (flags.find(f => f.startsWith('--sort=')) ?? '--sort=id').split('=')[1];

const io = new NodeIO();
const doc = await io.read(resolve(fileArg));
const root = doc.getRoot();

function bboxOfNode(node) {
  const mesh = node.getMesh();
  if (!mesh) return null;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let tris = 0;
  const mats = new Set();
  const tex = new Set();
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (pos) {
      const arr = pos.getArray();
      const count = pos.getCount();
      for (let i = 0; i < count; i++) {
        const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
    }
    const idx = prim.getIndices();
    if (idx) tris += idx.getCount() / 3;
    const mat = prim.getMaterial();
    if (mat) {
      mats.add(mat.getName());
      const t = mat.getBaseColorTexture();
      if (t) tex.add(t.getName());
    }
  }
  return {
    min: [minX, minY, minZ], max: [maxX, maxY, maxZ],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    tris, mats: [...mats], tex: [...tex],
  };
}

const rows = [];
for (const node of root.listNodes()) {
  const b = bboxOfNode(node);
  if (!b) continue;
  rows.push({ name: node.getName(), ...b });
}

const f = n => (n >= 0 ? ' ' : '') + n.toFixed(1).padStart(7);
function vol(r) { return r.size[0] * r.size[1] * r.size[2]; }
const sorters = {
  id: (a, b) => (parseInt(a.name.split('_')[1]) || 0) - (parseInt(b.name.split('_')[1]) || 0),
  volume: (a, b) => vol(b) - vol(a),
  y: (a, b) => b.center[1] - a.center[1],
  tris: (a, b) => b.tris - a.tris,
};
rows.sort(sorters[sortKey] ?? sorters.id);

console.log(`# ${fileArg}`);
console.log(`# ${rows.length} nodes with geometry, sorted by ${sortKey}\n`);
console.log('node             size(w×h×d)                 center(x,y,z)               tris  tex');
console.log('-'.repeat(100));
for (const r of rows) {
  console.log(
    r.name.padEnd(14),
    `${f(r.size[0])}×${f(r.size[1])}×${f(r.size[2])}`,
    ` (${f(r.center[0])},${f(r.center[1])},${f(r.center[2])})`,
    String(r.tris).padStart(5),
    r.tex.join(',') || '(color)',
  );
}

// Overall bbox
let gMin = [Infinity, Infinity, Infinity], gMax = [-Infinity, -Infinity, -Infinity];
for (const r of rows) for (let i = 0; i < 3; i++) {
  if (r.min[i] < gMin[i]) gMin[i] = r.min[i];
  if (r.max[i] > gMax[i]) gMax[i] = r.max[i];
}
console.log('-'.repeat(100));
console.log(`overall bbox min(${gMin.map(n => n.toFixed(1))}) max(${gMax.map(n => n.toFixed(1))}) size(${gMax.map((m, i) => (m - gMin[i]).toFixed(1))})`);
console.log(`total nodes=${root.listNodes().length}  total meshes=${root.listMeshes().length}  total textures=${root.listTextures().length}`);
