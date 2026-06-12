import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { readWvp, pcmToWav } from '../lib/wvp-reader.mjs'

// Build a synthetic WVP: 16-byte header + N*40-byte directory (data starts at
// 0x10 + N*40 - 4, verified against the real SOUND1x.WVP files) + concatenated PCM.
function buildWvp(clips) {
  const HEADER = 16, ENTRY = 40
  const dataStart = HEADER + clips.length * ENTRY - 4
  const pcmTotal = clips.reduce((n, c) => n + c.pcm.length, 0)
  const buf = Buffer.alloc(dataStart + pcmTotal)
  buf.write('WVP\0', 0, 'latin1')
  buf.writeUInt32LE(clips.length, 4)
  buf.writeUInt32LE(clips.length, 8)
  let cursor = dataStart
  clips.forEach((c, i) => {
    const off = HEADER + i * ENTRY
    buf.writeUInt16LE(1, off)                 // wFormatTag = PCM
    buf.writeUInt16LE(c.channels ?? 1, off + 2)
    buf.writeUInt32LE(c.sampleRate, off + 4)
    buf.writeUInt32LE(c.sampleRate * 2, off + 8)  // avg bytes/sec
    buf.writeUInt16LE(2, off + 12)            // block align
    buf.writeUInt16LE(16, off + 14)           // bits/sample
    buf.writeUInt32LE(0, off + 16)            // fieldA (always 0)
    buf.writeUInt32LE(c.pcm.length, off + 20) // dataBytes
    c.pcm.copy(buf, cursor)
    cursor += c.pcm.length
  })
  return buf
}

describe('readWvp', () => {
  test('parses clip count and per-clip PCMWAVEFORMAT', () => {
    const wvp = buildWvp([
      { sampleRate: 22050, pcm: Buffer.from([1, 2, 3, 4]) },
      { sampleRate: 11025, pcm: Buffer.from([5, 6, 7, 8, 9, 10]) },
    ])
    const { count, clips } = readWvp(wvp)
    assert.strictEqual(count, 2)
    assert.strictEqual(clips.length, 2)
    assert.strictEqual(clips[0].sampleRate, 22050)
    assert.strictEqual(clips[1].sampleRate, 11025)
    assert.strictEqual(clips[0].channels, 1)
    assert.strictEqual(clips[0].bitsPerSample, 16)
    assert.strictEqual(clips[0].formatTag, 1)
  })

  test('slices each clip PCM sequentially from the data section', () => {
    const wvp = buildWvp([
      { sampleRate: 22050, pcm: Buffer.from([1, 2, 3, 4]) },
      { sampleRate: 11025, pcm: Buffer.from([5, 6, 7, 8, 9, 10]) },
    ])
    const { clips } = readWvp(wvp)
    assert.deepStrictEqual([...clips[0].pcm], [1, 2, 3, 4])
    assert.deepStrictEqual([...clips[1].pcm], [5, 6, 7, 8, 9, 10])
  })

  test('rejects a buffer that is not a WVP', () => {
    assert.throws(() => readWvp(Buffer.from('NOPE............')), /not a WVP/)
  })
})

describe('pcmToWav', () => {
  test('wraps PCM in a valid 44-byte RIFF/WAVE header', () => {
    const pcm = Buffer.from([0, 0, 1, 0, 2, 0, 3, 0]) // 4 samples, 16-bit mono
    const wav = pcmToWav({ pcm, channels: 1, sampleRate: 22050, bitsPerSample: 16 })
    assert.strictEqual(wav.toString('latin1', 0, 4), 'RIFF')
    assert.strictEqual(wav.toString('latin1', 8, 12), 'WAVE')
    assert.strictEqual(wav.toString('latin1', 12, 16), 'fmt ')
    assert.strictEqual(wav.readUInt32LE(16), 16)       // fmt size
    assert.strictEqual(wav.readUInt16LE(20), 1)        // PCM
    assert.strictEqual(wav.readUInt16LE(22), 1)        // mono
    assert.strictEqual(wav.readUInt32LE(24), 22050)    // rate
    assert.strictEqual(wav.readUInt32LE(28), 44100)    // byte rate
    assert.strictEqual(wav.readUInt16LE(32), 2)        // block align
    assert.strictEqual(wav.readUInt16LE(34), 16)       // bits
    assert.strictEqual(wav.toString('latin1', 36, 40), 'data')
    assert.strictEqual(wav.readUInt32LE(40), pcm.length)
    assert.strictEqual(wav.readUInt32LE(4), 36 + pcm.length)
    assert.deepStrictEqual([...wav.subarray(44)], [...pcm])
  })
})
