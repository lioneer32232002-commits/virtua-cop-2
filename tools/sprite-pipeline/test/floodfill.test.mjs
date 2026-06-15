import { test } from 'node:test'
import assert from 'node:assert/strict'
import { floodFillCutout } from '../lib/floodfill.mjs'
import { areaDownscale } from '../lib/resize.mjs'

// --- tiny RGBA fixtures (same spirit as the extractor's synthetic-buffer tests) ---
function img(w, h, fill = [255, 255, 255, 255]) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1]
    data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = fill[3]
  }
  return { width: w, height: h, data }
}
function setPx(im, x, y, [r, g, b, a]) {
  const o = (y * im.width + x) * 4
  im.data[o] = r; im.data[o + 1] = g; im.data[o + 2] = b; im.data[o + 3] = a
}
const alphaAt = (im, x, y) => im.data[(y * im.width + x) * 4 + 3]

test('floodFillCutout removes the corner-connected background, keeps the subject', () => {
  const im = img(6, 6, [255, 255, 255, 255])
  for (const [x, y] of [[2, 2], [3, 2], [2, 3], [3, 3]]) setPx(im, x, y, [10, 20, 200, 255])
  const out = floodFillCutout(im, { tolerance: 30 })
  assert.equal(alphaAt(out, 0, 0), 0, 'corner cut')
  assert.equal(alphaAt(out, 5, 5), 0, 'opposite corner cut')
  assert.equal(alphaAt(out, 2, 2), 255, 'subject kept')
  let opaque = 0
  for (let i = 0; i < 6 * 6; i++) if (out.data[i * 4 + 3] === 255) opaque++
  assert.equal(opaque, 4, 'exactly the 4 subject pixels remain opaque')
})

test('floodFillCutout keeps a background-coloured hole enclosed by the subject (connectivity, not colour)', () => {
  const im = img(7, 7, [255, 255, 255, 255])
  // subject ring (2,2)-(4,4), centre (3,3) stays white -> enclosed, unreachable from any corner
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) {
    if (!(x === 3 && y === 3)) setPx(im, x, y, [180, 40, 30, 255])
  }
  const out = floodFillCutout(im, { tolerance: 30 })
  assert.equal(alphaAt(out, 0, 0), 0, 'border cut')
  assert.equal(alphaAt(out, 3, 3), 255, 'enclosed white hole NOT cut')
})

test('floodFillCutout tolerance: near-bg pixels cut, distinct colours act as a barrier', () => {
  const im = img(5, 5, [255, 255, 255, 255])
  setPx(im, 0, 2, [240, 240, 240, 255]) // near-white, within tol 30
  setPx(im, 2, 2, [200, 0, 0, 255])     // clearly subject
  const out = floodFillCutout(im, { tolerance: 30 })
  assert.equal(alphaAt(out, 0, 2), 0, 'near-bg cut')
  assert.equal(alphaAt(out, 2, 2), 255, 'distinct subject kept')
})

test('areaDownscale box-averages source regions (premultiplied alpha)', () => {
  const im = img(4, 4, [0, 0, 0, 255])
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) setPx(im, x, y, [100, 100, 100, 255])
  const out = areaDownscale(im, 2, 2)
  assert.equal(out.width, 2); assert.equal(out.height, 2)
  assert.equal(out.data[0], 100, 'top-left target = avg of the bright 2x2 block')
  assert.equal(out.data[1 * 4], 0, 'top-right target = dark')
})

test('areaDownscale does not let transparent pixels bleed colour into the edge', () => {
  const im = img(2, 1, [0, 0, 0, 255])
  setPx(im, 0, 0, [200, 100, 50, 255]) // opaque
  setPx(im, 1, 0, [9, 9, 9, 0])        // transparent (cut) — its RGB must not pull the average down
  const out = areaDownscale(im, 1, 1)
  assert.equal(out.data[0], 200, 'R from the opaque pixel only')
  assert.equal(out.data[1], 100, 'G from the opaque pixel only')
  assert.equal(out.data[3], Math.round(255 / 2), 'alpha is the plain average of both')
})
