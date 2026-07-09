// tools/sprite-pipeline/compose-sheet.mjs
// Stack N full-body poses of the SAME character into one vertical sprite sheet
// (128 wide × 128*N tall; frame 0 on top). Unlike process-sprite.mjs — which
// fit-contains EACH frame by its own bbox and so resizes a wide pose smaller —
// this composes all frames with ONE SHARED scale and aligns them by the FEET,
// horizontally anchored on the STANCE centre (not the bbox centre, which an
// extended aiming arm would skew). That keeps the head/torso put and grounded
// across frames, so swapping cells doesn't pop.
//
//   node compose-sheet.mjs <frame0.png> <frame1.png> [...] --out <sheet.png> [--size 128] [--tolerance 60] [--margin 8]
//
// frame0 = idle (BillboardSprite row 0), frame1 = raised gun (row 1), etc.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { PNG } from 'pngjs'
import { floodFillCutout } from './lib/floodfill.mjs'
import { keepLargestComponents } from './lib/frame.mjs'
import { areaDownscale } from './lib/resize.mjs'
import { quantize } from '../../game/src/darkline/combat/palette.js'
import { DARKLINE_PALETTE } from '../../game/src/darkline/combat/buildSprite.js'

function parseArgs(argv) {
  const inputs = []
  const opts = { out: null, size: 128, tolerance: 60, margin: 8 }
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

// alpha bbox + stance centre (horizontal midpoint of the bottom `footBand` of rows).
function measure(img, { alphaThreshold = 8, footBand = 0.15 } = {}) {
  const { width: w, height: h, data } = img
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
  // feet stance centre: scan the bottom band of the bbox
  const bandTop = Math.max(minY, Math.round(maxY - (maxY - minY) * footBand))
  let fMin = w, fMax = -1
  for (let y = bandTop; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++)
      if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
        if (x < fMin) fMin = x; if (x > fMax) fMax = x
      }
  const footCx = fMax >= 0 ? (fMin + fMax) / 2 : (minX + maxX) / 2
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1, footCx }
}

function cropRegion(img, minX, minY, cw, ch) {
  const { width: w, data } = img
  const out = new Uint8ClampedArray(cw * ch * 4)
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const so = ((minY + y) * w + (minX + x)) * 4, to = (y * cw + x) * 4
      out[to] = data[so]; out[to + 1] = data[so + 1]
      out[to + 2] = data[so + 2]; out[to + 3] = data[so + 3]
    }
  return { width: cw, height: ch, data: out }
}

const { inputs, opts } = parseArgs(process.argv.slice(2))
if (inputs.length < 2 || !opts.out) {
  console.error('usage: node compose-sheet.mjs <frame0.png> <frame1.png> [...] --out <sheet.png> [--size 128] [--margin 8]')
  process.exit(1)
}

// 1) cut out + despeckle + measure every frame
const frames = inputs.map(p => {
  const raw = PNG.sync.read(readFileSync(p))
  const cut = keepLargestComponents(
    floodFillCutout({ width: raw.width, height: raw.height, data: raw.data }, { tolerance: opts.tolerance }),
    { minFraction: 0.05 })
  return { path: p, img: cut, m: measure(cut) }
})

// 2) ONE shared scale so the tallest AND widest frame fit the inner box → all frames identical scale
const inner = opts.size - opts.margin * 2
const maxH = Math.max(...frames.map(f => f.m.h))
const maxW = Math.max(...frames.map(f => f.m.w))
const scale = Math.min(inner / maxH, inner / maxW)

// 3) render each frame feet-aligned to the cell bottom, stance-centre to the cell centre
const cell = opts.size
const sheet = new PNG({ width: cell, height: cell * frames.length })
frames.forEach((f, idx) => {
  const { minX, minY, w: cw, h: ch, footCx } = f.m
  const dw = Math.max(1, Math.round(cw * scale)), dh = Math.max(1, Math.round(ch * scale))
  const scaled = areaDownscale(cropRegion(f.img, minX, minY, cw, ch), dw, dh)
  const quant = quantize({ width: dw, height: dh, data: scaled.data }, DARKLINE_PALETTE)
  // horizontal: stance centre → cell centre (clamped so nothing spills off the cell)
  const footInScaled = (footCx - minX) * scale
  let ox = Math.round(cell / 2 - footInScaled)
  ox = Math.max(Math.min(ox, cell - dw), Math.min(0, cell - dw))
  const oy = cell * idx + (cell - opts.margin - dh)   // feet at bottom margin of this cell
  for (let y = 0; y < dh; y++)
    for (let x = 0; x < dw; x++) {
      const px = ox + x; if (px < 0 || px >= cell) continue
      const so = (y * dw + x) * 4, to = ((oy + y) * cell + px) * 4
      sheet.data[to] = quant.data[so]; sheet.data[to + 1] = quant.data[so + 1]
      sheet.data[to + 2] = quant.data[so + 2]; sheet.data[to + 3] = quant.data[so + 3]
    }
  console.log(`frame ${idx}  ${f.path}  bbox ${cw}x${ch}  -> ${dw}x${dh}  ox=${ox}`)
})

mkdirSync(dirname(opts.out), { recursive: true })
writeFileSync(opts.out, PNG.sync.write(sheet))
console.log(`sheet ${cell}x${cell * frames.length}  scale=${scale.toFixed(4)}  -> ${opts.out}`)
