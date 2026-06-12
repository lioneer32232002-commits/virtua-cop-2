#!/usr/bin/env node
// Scouting analyzer for MOT*.BIN (skeleton/motion) format. Read-only, prints stats.
// Usage: node analyze-mot.mjs <path/to/MOTCMN.BIN>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , fileArg] = process.argv;
if (!fileArg) { console.error('Usage: node analyze-mot.mjs <MOT*.BIN>'); process.exit(1); }
const buf = readFileSync(resolve(fileArg));
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const N = buf.length;
console.log(`# ${fileArg}  (${N} bytes)\n`);

const f32 = o => dv.getFloat32(o, true);
const u32 = o => dv.getUint32(o, true);
const u16 = o => dv.getUint16(o, true);
const i16 = o => dv.getInt16(o, true);

// --- 1. Header as candidate pointer table -------------------------------
// A pointer table = run of uint32 that are valid, in-range, mostly monotonic offsets.
console.log('## Header as uint32 (first 32 dwords)');
let ptrRun = 0;
for (let i = 0; i < 32; i++) {
  const v = u32(i * 4);
  const inRange = v < N && v >= 0;
  const looksPtr = inRange && v > 0 && v % 4 === 0;
  if (looksPtr) ptrRun++;
  const asF = f32(i * 4);
  console.log(`  [${String(i).padStart(2)}] @0x${(i*4).toString(16).padStart(4,'0')}  u32=${String(v).padStart(10)}  ${inRange?'(in-range)':'         '}  f32=${asF.toFixed(5)}`);
}

// --- 2. Detect a leading offset table -----------------------------------
// Heuristic: read uint32s from 0 until value stops being a valid increasing offset.
console.log('\n## Leading offset-table probe (uint32, in-range & non-decreasing)');
let off = 0, prev = -1, table = [];
while (off + 4 <= N) {
  const v = u32(off);
  if (v < N && v >= prev && v % 2 === 0 && v !== 0) { table.push(v); prev = v; off += 4; }
  else if (v === 0 && table.length === 0) { off += 4; } // skip leading zeros
  else break;
}
console.log(`  table length=${table.length}, ends at 0x${off.toString(16)}; first/last: ${table.slice(0,4)} ... ${table.slice(-4)}`);

// --- 3. Record-stride autocorrelation -----------------------------------
// For candidate strides, measure how often byte[i] == byte[i+stride] (structural repetition).
console.log('\n## Stride autocorrelation (higher = repeating record of that size)');
const strides = [4, 6, 8, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 64, 128];
const results = [];
for (const s of strides) {
  let same = 0, tot = 0;
  for (let i = 0; i + s < N; i += 1) { if (buf[i] === buf[i + s]) same++; tot++; }
  results.push([s, same / tot]);
}
results.sort((a,b)=>b[1]-a[1]);
for (const [s, r] of results) console.log(`  stride ${String(s).padStart(3)}: ${(r*100).toFixed(1)}% byte-match`);

// --- 4. Float vs int16 plausibility across the file ---------------------
// Count how many 4-byte words are "small floats" (|v| in [1e-4, 1e4]) — typical of
// transforms/quaternions. And scan int16 stream for angle-like distribution.
console.log('\n## Data-type plausibility');
let smallF = 0, totF = 0, nanF = 0;
for (let o = 0; o + 4 <= N; o += 4) {
  const v = f32(o); totF++;
  if (Number.isNaN(v)) { nanF++; continue; }
  const a = Math.abs(v);
  if (a > 1e-4 && a < 1e4) smallF++;
}
console.log(`  float32 words: ${totF}, "small float" [1e-4,1e4]: ${(smallF/totF*100).toFixed(1)}%, NaN: ${(nanF/totF*100).toFixed(1)}%`);

// int16 angle hypothesis: count of values in full range, fraction near 0 (idle joints)
let i16near0 = 0, i16tot = 0;
for (let o = 0; o + 2 <= N; o += 2) { const v = i16(o); i16tot++; if (Math.abs(v) < 1024) i16near0++; }
console.log(`  int16 words: ${i16tot}, |v|<1024 (small-angle): ${(i16near0/i16tot*100).toFixed(1)}%`);

// --- 5. Frame-0 region dump (after any offset table) as Vec3 ------------
const start = table.length ? table[0] : 0;
console.log(`\n## Vec3 dump from 0x${start.toString(16)} (first 12 triplets, f32)`);
for (let i = 0; i < 12; i++) {
  const o = start + i * 12;
  if (o + 12 > N) break;
  console.log(`  [${i}] (${f32(o).toFixed(4)}, ${f32(o+4).toFixed(4)}, ${f32(o+8).toFixed(4)})`);
}

// --- 6. Look for repeated small-int count fields (e.g. boneCount) -------
console.log('\n## Small uint16 values in first 64 bytes (possible counts)');
const counts = [];
for (let o = 0; o < 64 && o + 2 <= N; o += 2) { const v = u16(o); if (v > 0 && v < 512) counts.push(`@0x${o.toString(16)}=${v}`); }
console.log('  ' + (counts.join('  ') || '(none)'));
