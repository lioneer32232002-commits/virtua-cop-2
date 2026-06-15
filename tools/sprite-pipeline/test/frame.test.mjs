import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cropToContent, fitContain, keepLargestComponents } from '../lib/frame.mjs'

function img(w, h, fill = [0, 0, 0, 0]) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1]
    data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = fill[3]
  }
  return { width: w, height: h, data }
}
const setPx = (im, x, y, p) => {
  const o = (y * im.width + x) * 4
  im.data[o] = p[0]; im.data[o + 1] = p[1]; im.data[o + 2] = p[2]; im.data[o + 3] = p[3]
}
const alphaAt = (im, x, y) => im.data[(y * im.width + x) * 4 + 3]

test('keepLargestComponents drops small disconnected specks, keeps the main subject', () => {
  const im = img(10, 10)                              // transparent
  for (let y = 1; y <= 4; y++) for (let x = 1; x <= 4; x++) setPx(im, x, y, [10, 10, 10, 255]) // 16px main
  setPx(im, 9, 9, [10, 10, 10, 255])                 // 1px speck (6.25% of main < 10%)
  const out = keepLargestComponents(im, { minFraction: 0.1 })
  assert.equal(alphaAt(out, 2, 2), 255, 'main subject kept')
  assert.equal(alphaAt(out, 9, 9), 0, 'stray speck dropped')
})

test('cropToContent crops to the opaque bounding box', () => {
  const im = img(6, 6)                 // all transparent
  setPx(im, 2, 1, [10, 20, 30, 255])
  setPx(im, 3, 4, [40, 50, 60, 255])   // bbox = x:2..3, y:1..4
  const out = cropToContent(im)
  assert.equal(out.width, 2)
  assert.equal(out.height, 4)
  assert.equal(out.data[0 * 4 + 0], 10)                 // top-left of crop = the (2,1) pixel
  assert.equal(out.data[((3 * 2) + 1) * 4 + 0], 40)     // bottom-right = the (3,4) pixel
})

test('cropToContent ignores faint fringe below the alpha threshold', () => {
  const im = img(5, 5)
  setPx(im, 2, 2, [200, 0, 0, 255]) // real subject
  setPx(im, 0, 0, [9, 9, 9, 4])     // ghost fringe, alpha 4 < threshold 8
  const out = cropToContent(im, { alphaThreshold: 8 })
  assert.equal(out.width, 1, 'ghost pixel did not enlarge the box')
  assert.equal(out.height, 1)
})

test('fitContain keeps aspect ratio, centres, leaves transparent side margins', () => {
  // a 2-wide, 8-tall opaque bar fit into 8x8 -> stays tall, narrow, centred
  const im = img(2, 8, [120, 120, 120, 255])
  const out = fitContain(im, 8)
  assert.equal(out.width, 8); assert.equal(out.height, 8)
  // longer side (height) fills the frame
  assert.equal(alphaAt(out, 4, 0) > 0 || alphaAt(out, 3, 0) > 0, true, 'content reaches the top row')
  // far-left / far-right columns are transparent (aspect preserved, not stretched)
  assert.equal(alphaAt(out, 0, 4), 0, 'left margin transparent')
  assert.equal(alphaAt(out, 7, 4), 0, 'right margin transparent')
})

test('fitContain honours a margin so the subject does not touch the edge', () => {
  const im = img(8, 8, [50, 50, 50, 255]) // square subject
  const out = fitContain(im, 8, { margin: 2 })
  assert.equal(alphaAt(out, 0, 0), 0, 'corner stays clear with margin')
  assert.equal(alphaAt(out, 4, 4) > 0, true, 'centre still has the subject')
})
