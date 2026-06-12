#!/usr/bin/env node
// Analyze an extracted camera.bin: speed & turn-rate profile to locate combat
// nodes (slow/stationary stretches) and corners. Read-only, prints a timeline.
// Usage: node analyze-path.mjs <path/to/camera.bin> [--bin=2]   (bin = seconds per row)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , fileArg, ...flags] = process.argv;
if (!fileArg) { console.error('Usage: node analyze-path.mjs <camera.bin> [--bin=2]'); process.exit(1); }
const binSec = Number((flags.find(f => f.startsWith('--bin=')) ?? '--bin=2').split('=')[1]);

const buf = readFileSync(resolve(fileArg));
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const frameCount = dv.getUint32(0, true);
const fps = dv.getUint32(4, true);
const frames = new Float32Array(buf.buffer, buf.byteOffset + 8, frameCount * 5);
const dur = frameCount / fps;
console.log(`# ${fileArg}`);
console.log(`# frameCount=${frameCount} fps=${fps} duration=${dur.toFixed(1)}s\n`);

const get = i => ({ x: frames[i*5], y: frames[i*5+1], z: frames[i*5+2], yaw: frames[i*5+3], pitch: frames[i*5+4] });

// Per-frame speed (world units/sec) and yaw turn-rate (deg/sec)
const step = Math.max(1, Math.round(binSec * fps));
console.log(`t(s)    pos(x,y,z)                 speed(u/s)  turn(deg/s)  note`);
console.log('-'.repeat(86));
let totDist = 0;
const speeds = [];
for (let i = 0; i + step < frameCount; i += step) {
  const a = get(i), b = get(i + step);
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const dist = Math.hypot(dx, dy, dz);
  const dt = step / fps;
  const speed = dist / dt;
  let dyaw = (b.yaw - a.yaw) * 180 / Math.PI;
  while (dyaw > 180) dyaw -= 360; while (dyaw < -180) dyaw += 360;
  const turn = dyaw / dt;
  totDist += dist;
  speeds.push(speed);
}
// classify with thresholds derived from the distribution
const sorted = [...speeds].sort((a,b)=>a-b);
const med = sorted[Math.floor(sorted.length/2)] || 1;
const slowThresh = med * 0.35;
let idx = 0;
for (let i = 0; i + step < frameCount; i += step) {
  const a = get(i), b = get(i + step);
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const dist = Math.hypot(dx, dy, dz);
  const dt = step / fps;
  const speed = dist / dt;
  let dyaw = (b.yaw - a.yaw) * 180 / Math.PI;
  while (dyaw > 180) dyaw -= 360; while (dyaw < -180) dyaw += 360;
  const turn = dyaw / dt;
  const t = i / fps;
  let note = '';
  if (speed < slowThresh) note += 'SLOW/STOP ';
  if (Math.abs(turn) > 25) note += (turn > 0 ? 'turn-L ' : 'turn-R ');
  const f = n => (n>=0?' ':'') + n.toFixed(1);
  console.log(
    `${t.toFixed(1).padStart(5)}  (${f(a.x).padStart(7)},${f(a.y).padStart(6)},${f(a.z).padStart(8)})  ${speed.toFixed(2).padStart(8)}  ${turn.toFixed(1).padStart(9)}   ${note}`
  );
  idx++;
}
console.log('-'.repeat(86));
console.log(`total path length ≈ ${totDist.toFixed(0)} world units, median speed ${med.toFixed(2)} u/s, slow threshold ${slowThresh.toFixed(2)}`);
