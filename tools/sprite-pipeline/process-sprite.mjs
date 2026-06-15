#!/usr/bin/env node
// tools/sprite-pipeline/process-sprite.mjs
// Build-time sprite pipeline: raw Gemini PNG
//   -> flood-fill cutout (alpha) -> area downscale -> DARKLINE palette quantise
//   -> small, committable PNG (with alpha).
//
// Reuses the GAME's canonical palette so build-time and runtime converge on the
// same "shared crayon box" (Duke3D-style colour unification):
//   - quantize         from game/src/darkline/combat/palette.js
//   - DARKLINE_PALETTE  from game/src/darkline/combat/buildSprite.js
// (game/ is "type":"module", so these pure exports import cleanly into Node.)
//
// IP discipline: raw Gemini originals (4-5 MB) stay gitignored; only the processed
// small PNGs (tens of KB) are committed. Log every source in CREDITS.
//
// Usage:
//   node process-sprite.mjs <in.png ...> [--out <dir>] [--size 128] [--tolerance 60]
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { basename, join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { floodFillCutout } from './lib/floodfill.mjs'
import { cropToContent, fitContain, keepLargestComponents } from './lib/frame.mjs'
import { quantize } from '../../game/src/darkline/combat/palette.js'
import { DARKLINE_PALETTE } from '../../game/src/darkline/combat/buildSprite.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_OUT = join(HERE, '../../game/public/darkline/sprites')

function parseArgs(argv) {
  const inputs = []
  const opts = { out: DEFAULT_OUT, size: 128, tolerance: 60, margin: 8 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out') opts.out = argv[++i]
    else if (a === '--size') opts.size = Number(argv[++i])
    else if (a === '--tolerance') opts.tolerance = Number(argv[++i])
    else if (a === '--margin') opts.margin = Number(argv[++i])
    else inputs.push(a)
  }
  return { inputs, opts }
}

function opaqueRatio(data) {
  let n = 0
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) n++
  return n / (data.length / 4)
}

export function processOne(inPath, opts) {
  const raw = PNG.sync.read(readFileSync(inPath))
  const cut = floodFillCutout({ width: raw.width, height: raw.height, data: raw.data }, { tolerance: opts.tolerance })
  const clean = keepLargestComponents(cut, { minFraction: 0.05 }) // drop corner specks
  const cropped = cropToContent(clean, { pad: 2 })               // tight to the subject
  const framed = fitContain(cropped, opts.size, { margin: opts.margin }) // aspect-preserved square
  const quant = quantize(framed, DARKLINE_PALETTE)
  const out = new PNG({ width: opts.size, height: opts.size })
  out.data = Buffer.from(quant.data)
  mkdirSync(opts.out, { recursive: true })
  const outPath = join(opts.out, basename(inPath))
  writeFileSync(outPath, PNG.sync.write(out))
  return { outPath, inDims: [raw.width, raw.height], opaque: opaqueRatio(quant.data), bytes: statSync(outPath).size }
}

const { inputs, opts } = parseArgs(process.argv.slice(2))
if (!inputs.length) {
  console.error('usage: node process-sprite.mjs <in.png ...> [--out <dir>] [--size 128] [--tolerance 60]')
  process.exit(1)
}
for (const inp of inputs) {
  const r = processOne(resolve(inp), opts)
  console.log(
    `${basename(inp).padEnd(12)} ${r.inDims[0]}x${r.inDims[1]} -> ${opts.size}x${opts.size}  ` +
    `opaque ${(r.opaque * 100).toFixed(1).padStart(5)}%  ${(r.bytes / 1024).toFixed(1).padStart(6)} KB  -> ${r.outPath}`
  )
}
