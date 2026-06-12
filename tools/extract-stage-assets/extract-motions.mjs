#!/usr/bin/env node
// Dump MOTCMN.BIN motions + the EXE character→parts table to game assets:
//   <out-base>/common/motions.bin     (see lib/motion-pack.mjs for layout)
//   <out-base>/common/characters.json ({ characters: [{ index, parts }] })
import fs from 'node:fs'
import path from 'node:path'
import { readMotionDirectory, readMotion, readCharacterTable } from './lib/motion-reader.mjs'
import { encodeMotionPack } from './lib/motion-pack.mjs'

const [,, gameRoot, outBase] = process.argv
if (!gameRoot || !outBase) {
  console.error('Usage: node extract-motions.mjs <game-root> <out-base>')
  console.error('  <game-root>  path to VirtuaCop2 installation (contains ppj2dd.exe and BIN/)')
  console.error('  <out-base>   output base dir (e.g. ../game/public/assets)')
  process.exit(1)
}

const root = path.resolve(gameRoot)
const exe = fs.readFileSync(path.join(root, 'ppj2dd.exe'))
const mot = fs.readFileSync(path.join(root, 'BIN', 'MOTCMN.BIN'))

const directory = readMotionDirectory(exe, mot.length)
const motions = directory.map((entry) => readMotion(mot, entry))
const characters = readCharacterTable(exe)

const outDir = path.join(path.resolve(outBase), 'common')
fs.mkdirSync(outDir, { recursive: true })

const packPath = path.join(outDir, 'motions.bin')
const pack = encodeMotionPack(motions)
fs.writeFileSync(packPath, pack)
const totalFrames = motions.reduce((s, m) => s + m.root.length, 0)
console.log(`Wrote ${packPath}  (${motions.length} motions, ${totalFrames} frames, ${pack.length} bytes)`)

const charPath = path.join(outDir, 'characters.json')
fs.writeFileSync(charPath, JSON.stringify({ characters }, null, 1))
console.log(`Wrote ${charPath}  (${characters.length} characters)`)
