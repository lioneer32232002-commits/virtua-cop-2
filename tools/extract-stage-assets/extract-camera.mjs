#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { readCammovBin } from './lib/camera-reader.mjs'

// Camera↔stage pairing is empirical, NOT by file number: each CAMMOV path must
// fall inside its stage's geometry bbox. Measured frame-containment proved the
// naive 0/1/2→1/2/3 mapping swaps stage2 and stage3 — CAMMOV1's frames sit 100%
// inside stage3 (large city) geometry and only 6% inside stage2 (small harbour),
// while CAMMOV2 fits stage2 fully. So stage2←CAMMOV2, stage3←CAMMOV1. (CAMMOV3 is
// a ~6s clip, not a stage.) Without this, the camera flies outside the geometry.
const STAGE_MAP = [
  { bin: 'CAMMOV0.BIN', stageId: 'stage1' },
  { bin: 'CAMMOV2.BIN', stageId: 'stage2' },
  { bin: 'CAMMOV1.BIN', stageId: 'stage3' },
]

const [,, gameRoot, outBase] = process.argv
if (!gameRoot || !outBase) {
  console.error('Usage: node extract-camera.mjs <game-root> <out-base>')
  console.error('  <game-root>  path to VirtuaCop2 installation (contains BIN/ folder)')
  console.error('  <out-base>   output base dir (e.g. ../game/public/assets)')
  process.exit(1)
}

const binDir = path.join(path.resolve(gameRoot), 'BIN')
const outDir = path.resolve(outBase)

for (const { bin, stageId } of STAGE_MAP) {
  const srcPath = path.join(binDir, bin)
  if (!fs.existsSync(srcPath)) {
    console.log(`Skipping ${bin} (not found at ${srcPath})`)
    continue
  }
  const raw    = fs.readFileSync(srcPath)
  const frames = readCammovBin(raw)
  const count  = frames.length
  const FPS    = 30

  // 8-byte header + 20 bytes per frame (5 × float32)
  const outBuf = Buffer.alloc(8 + count * 20)
  outBuf.writeUInt32LE(count, 0)
  outBuf.writeUInt32LE(FPS, 4)
  for (let i = 0; i < count; i++) {
    const off = 8 + i * 20
    const f   = frames[i]
    outBuf.writeFloatLE(f.x,         off)
    outBuf.writeFloatLE(f.y,         off + 4)
    outBuf.writeFloatLE(f.z,         off + 8)
    outBuf.writeFloatLE(f.yaw_rad,   off + 12)
    outBuf.writeFloatLE(f.pitch_rad, off + 16)
  }

  const stageOutDir = path.join(outDir, stageId)
  fs.mkdirSync(stageOutDir, { recursive: true })
  const outPath = path.join(stageOutDir, 'camera.bin')
  fs.writeFileSync(outPath, outBuf)
  console.log(`Wrote ${outPath}  (${count} frames, ${outBuf.length} bytes)`)
}
