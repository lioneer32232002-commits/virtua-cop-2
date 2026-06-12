#!/usr/bin/env node
// Headless verification: for each wave time in a level JSON, interpolate the
// camera pose from camera.bin (same maths as CameraRig frame-mode) and resolve
// each enemy's spawn world position (same maths as EnemyManager._resolveSpawn),
// then report whether it lands ahead of + in front of the camera at street level.
// No browser / rAF needed. Usage: node verify-waves.mjs <camera.bin> <stageN.json>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , camArg, lvlArg] = process.argv;
if (!camArg || !lvlArg) { console.error('Usage: node verify-waves.mjs <camera.bin> <stageN.json>'); process.exit(1); }

const buf = readFileSync(resolve(camArg));
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const frameCount = dv.getUint32(0, true), fps = dv.getUint32(4, true);
const fr = new Float32Array(buf.buffer, buf.byteOffset + 8, frameCount * 5);
const level = JSON.parse(readFileSync(resolve(lvlArg), 'utf8'));

// CameraRig frame-mode interpolation → {x,y,z,yaw,pitch}
function camAt(t) {
  const raw = t * fps;
  const f0 = Math.min(Math.floor(raw), frameCount - 1);
  const f1 = Math.min(f0 + 1, frameCount - 1);
  const a = raw - Math.floor(raw);
  const L = (i, o) => fr[f0 * 5 + o] + (fr[f1 * 5 + o] - fr[f0 * 5 + o]) * a;
  return { x: L(0, 0), y: L(0, 1), z: L(0, 2), yaw: L(0, 3), pitch: L(0, 4) };
}
// EnemyManager._resolveSpawnPosition: rotate (offX,0,offZ) by yaw about Y, add cam pos
function resolveSpawn(cam, off) {
  const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  // three.js applyAxisAngle(Y, yaw): x' = x*cos + z*sin ; z' = -x*sin + z*cos
  const wx = off[0] * c + off[2] * s + cam.x;
  const wz = -off[0] * s + off[2] * c + cam.z;
  return { wx, wz };
}

const tests = [];
for (const w of level.waves) for (const e of w.enemies) tests.push({ time: w.time, type: e.type, off: e.position });
if (level.boss) tests.push({ time: level.boss.time, type: 'boss', off: level.boss.position });

console.log(`# ${lvlArg}  vs  ${camArg} (${frameCount}f @${fps}fps = ${(frameCount/fps).toFixed(0)}s)\n`);
console.log('time  type      offset         cam(x,z)@yaw       enemy world(x,z)   fwd-dist  lateral  inView');
console.log('-'.repeat(98));
let fails = 0;
for (const t of tests) {
  const cam = camAt(t.time);
  const { wx, wz } = resolveSpawn(cam, t.off);
  // forward direction of camera in world (yaw about Y, -z forward in local)
  const fwdX = -Math.sin(cam.yaw), fwdZ = -Math.cos(cam.yaw);
  const dx = wx - cam.x, dz = wz - cam.z;
  const fwdDist = dx * fwdX + dz * fwdZ;          // >0 = ahead of camera
  const lateral = dx * Math.cos(cam.yaw) - dz * Math.sin(cam.yaw); // signed right
  const dist = Math.hypot(dx, dz);
  const cosAng = fwdDist / (dist || 1);
  const inView = cosAng > 0.5;                    // within ~60° half-cone
  if (!inView || fwdDist <= 0) fails++;
  const f = (n, w = 7) => (n >= 0 ? ' ' : '') + n.toFixed(1).padStart(w);
  console.log(
    `${String(t.time).padStart(4)}  ${t.type.padEnd(8)} [${f(t.off[0],4)},${f(t.off[2],5)}]  (${f(cam.x)},${f(cam.z)})@${(cam.yaw*180/Math.PI).toFixed(0).padStart(4)}°  (${f(wx)},${f(wz)})  ${f(fwdDist,7)}  ${f(lateral,6)}  ${inView ? 'OK' : 'MISS'}`
  );
}
console.log('-'.repeat(98));
console.log(fails === 0
  ? `✓ all ${tests.length} spawns are ahead of + within view cone of the camera at their wave time`
  : `✗ ${fails}/${tests.length} spawns are behind camera or outside view cone`);
process.exit(fails === 0 ? 0 : 1);
