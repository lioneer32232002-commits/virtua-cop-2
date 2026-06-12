// Reader for Virtua Cop 2's SE/SOUND1x.WVP sound-effect banks.
//
// Layout (reverse-engineered from the file headers; see ROADMAP G):
//   0x00  char[4]  "WVP\0"
//   0x04  uint32   clip count N
//   0x08  uint32   N or N-1 (not reliable; ignored)
//   0x0C  uint32   0
//   0x10  directory of N records, stride 40 bytes:
//           +0x00  16-byte PCMWAVEFORMAT (wFormatTag, nChannels, nSamplesPerSec,
//                  nAvgBytesPerSec, nBlockAlign, wBitsPerSample)
//           +0x10  uint32 fieldA (always 0)
//           +0x14  uint32 dataBytes
//           +0x18  trailing bytes (running index; unused)
//   data: concatenated raw PCM, beginning at 0x10 + N*40 - 4
//         (the final record drops its 4-byte trailing field — verified exact
//          against all four non-empty banks).

const HEADER = 16
const ENTRY = 40

/**
 * @param {Buffer} buf  raw bytes of a SOUND1x.WVP file
 * @returns {{ count: number, clips: { formatTag, channels, sampleRate, bitsPerSample, dataBytes, pcm: Buffer }[] }}
 */
export function readWvp(buf) {
  if (buf.length < HEADER || buf.toString('latin1', 0, 3) !== 'WVP') {
    throw new Error('not a WVP file (bad magic)')
  }
  const count = buf.readUInt32LE(4)
  const dataStart = HEADER + count * ENTRY - 4
  const clips = []
  let cursor = dataStart
  for (let i = 0; i < count; i++) {
    const off = HEADER + i * ENTRY
    const formatTag     = buf.readUInt16LE(off)
    const channels      = buf.readUInt16LE(off + 2)
    const sampleRate    = buf.readUInt32LE(off + 4)
    const bitsPerSample = buf.readUInt16LE(off + 14)
    const dataBytes     = buf.readUInt32LE(off + 20)
    const pcm = buf.subarray(cursor, cursor + dataBytes)
    cursor += dataBytes
    clips.push({ formatTag, channels, sampleRate, bitsPerSample, dataBytes, pcm })
  }
  return { count, clips }
}

/**
 * Wrap raw PCM samples in a standard 44-byte RIFF/WAVE container.
 * @param {{ pcm: Buffer, channels: number, sampleRate: number, bitsPerSample: number }} opts
 * @returns {Buffer}
 */
export function pcmToWav({ pcm, channels, sampleRate, bitsPerSample }) {
  const blockAlign = channels * (bitsPerSample / 8)
  const byteRate = sampleRate * blockAlign
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'latin1')
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8, 'latin1')
  header.write('fmt ', 12, 'latin1')
  header.writeUInt32LE(16, 16)              // PCM fmt chunk size
  header.writeUInt16LE(1, 20)               // audio format = PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36, 'latin1')
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}
