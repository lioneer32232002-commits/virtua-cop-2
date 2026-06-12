import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  readMotionDirectory, readMotion, readCharacterTable,
  MOTCMN_BASE, P_COMMON_BASE, STAGE_PACK_BASE, ROT_CHANNELS,
} from '../lib/motion-reader.mjs'

// ── synthetic fixtures ───────────────────────────────────────────────────────

function buildFixture() {
  // two motions: A = 2 frames, B = 3 frames
  const F = [2, 3]
  const motSize = F.reduce((s, f) => s + f * (12 + ROT_CHANNELS * 2), 0)
  const mot = Buffer.alloc(motSize)
  const dir = []
  let off = 0
  for (let m = 0; m < F.length; m++) {
    const rootOffset = off
    for (let f = 0; f < F[m]; f++) {
      mot.writeFloatLE(m + f * 0.5, off)        // x
      mot.writeFloatLE(1.0 + f * 0.1, off + 4)  // y
      mot.writeFloatLE(-f, off + 8)             // z
      off += 12
    }
    const rotOffset = off
    for (let f = 0; f < F[m]; f++) {
      for (let c = 0; c < ROT_CHANNELS; c++) {
        mot.writeInt16LE((m * 1000 + f * 10 + c) % 32768, off)
        off += 2
      }
    }
    dir.push({ rootOffset, rotOffset })
  }
  // EXE: motion table at 0x100, char table at 0x300
  const exe = Buffer.alloc(0x400)
  dir.forEach((d, m) => {
    exe.writeUInt32LE(MOTCMN_BASE + d.rootOffset, 0x100 + (2 * m) * 4)
    exe.writeUInt32LE(MOTCMN_BASE + d.rotOffset, 0x100 + (2 * m + 1) * 4)
  })
  // one character: 14 P_COMMON parts + 1 stage part, then NULL, then garbage
  let co = 0x300
  for (let p = 0; p < 14; p++) { exe.writeUInt32LE(P_COMMON_BASE + (20 + p) * 16, co); co += 4 }
  exe.writeUInt32LE(STAGE_PACK_BASE + 7 * 16, co); co += 4
  exe.writeUInt32LE(0, co); co += 4
  exe.writeUInt32LE(0xdeadbeef, co)
  return { exe, mot, motSize }
}

test('readMotionDirectory parses (root, rot) pairs and frame counts', () => {
  const { exe, motSize } = buildFixture()
  const motions = readMotionDirectory(exe, motSize, { tableOffset: 0x100, count: 2 })
  assert.equal(motions.length, 2)
  assert.deepEqual(motions.map(m => m.frames), [2, 3])
  assert.equal(motions[0].rootOffset, 0)
  assert.equal(motions[0].rotOffset, 24)               // 2 frames × 12
})

test('readMotionDirectory rejects a directory that does not tile the file', () => {
  const { exe, motSize } = buildFixture()
  assert.throws(() => readMotionDirectory(exe, motSize + 4, { tableOffset: 0x100, count: 2 }))
})

test('readMotion returns per-frame root positions and 40 int16 channels', () => {
  const { exe, mot, motSize } = buildFixture()
  const [a, b] = readMotionDirectory(exe, motSize, { tableOffset: 0x100, count: 2 })
  const A = readMotion(mot, a)
  assert.equal(A.root.length, 2)
  assert.equal(A.root[1].x, 0.5)
  assert.equal(A.rot[1][3], 13)                        // frame 1, channel 3 → 10+3
  const B = readMotion(mot, b)
  assert.equal(B.root.length, 3)
  assert.equal(B.rot[2][0], 1020)                      // 1000 + 2*10 + 0
})

test('readCharacterTable parses a NULL-terminated 15-part list with a stage part', () => {
  const { exe } = buildFixture()
  const chars = readCharacterTable(exe, { tableOffset: 0x300 })
  assert.equal(chars.length, 1)
  assert.equal(chars[0].parts.length, 15)
  assert.deepEqual(chars[0].parts[0], { model: 20, stage: false })
  assert.deepEqual(chars[0].parts[14], { model: 7, stage: true })
})

// ── real-file integration (skipped when the original game files are absent) ──

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const exePath = join(repoRoot, 'virtuacop2', 'ppj2dd.exe')
const motPath = join(repoRoot, 'virtuacop2', 'BIN', 'MOTCMN.BIN')
const haveReal = existsSync(exePath) && existsSync(motPath)

test('real MOTCMN: 136 motions tile the file byte-exactly', { skip: !haveReal }, () => {
  const exe = readFileSync(exePath)
  const mot = readFileSync(motPath)
  const motions = readMotionDirectory(exe, mot.length)
  assert.equal(motions.length, 136)
  const total = motions.reduce((s, m) => s + m.frames, 0)
  assert.equal(total * 92, mot.length)                 // 12 + 80 bytes per frame
})

test('real EXE: character table yields full and upper-body-only rigs', { skip: !haveReal }, () => {
  const exe = readFileSync(exePath)
  const chars = readCharacterTable(exe)
  assert.ok(chars.length >= 30, `expected >=30 characters, got ${chars.length}`)
  const full = chars.filter(c => c.parts.length === 15)
  const partial = chars.filter(c => c.parts.length < 15)
  assert.ok(full.length >= 20, `expected >=20 full humanoids, got ${full.length}`)
  assert.ok(partial.length >= 1, 'expected at least one upper-body-only rig')
  // the all-in-one-range character (models 21..35) found during the RE
  const compact = full.find(c => c.parts.every(p => !p.stage && p.model >= 21 && p.model <= 35))
  assert.ok(compact, 'expected the contiguous 21..35 character to exist')
})
