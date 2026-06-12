#!/usr/bin/env node
// Extract Virtua Cop 2 sound effects (SE/SOUND1x.WVP) to standard .wav files.
//
//   node extract-audio.mjs <path/to/virtuacop2> [out_dir]
//
// Default out_dir = ../../game/public/assets/audio (gitignored). The extracted
// WAVs are original game assets — never commit them, never ship them in CI /
// public deploy (same IP rule as the GLB models). BGM (SE/SONG*.MDS, RIFF/MIDS
// streaming-MIDI) is NOT handled here — see ROADMAP G.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readWvp, pcmToWav } from './lib/wvp-reader.mjs'

const BANKS = ['SOUND11.WVP', 'SOUND12.WVP', 'SOUND13.WVP', 'SOUND14.WVP', 'SOUND15.WVP']

const [, , gamePath, outArg] = process.argv
if (!gamePath) {
  console.error('Usage: node extract-audio.mjs <path/to/virtuacop2> [out_dir]')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const seDir = join(resolve(gamePath), 'SE')
const outDir = resolve(outArg ?? join(here, '..', '..', 'game', 'public', 'assets', 'audio'))
mkdirSync(outDir, { recursive: true })

const manifest = []
for (const bank of BANKS) {
  const bankPath = join(seDir, bank)
  let buf
  try {
    buf = readFileSync(bankPath)
  } catch {
    console.warn(`  skip ${bank} (not found)`)
    continue
  }
  if (buf.length === 0) {
    console.warn(`  skip ${bank} (empty)`)
    continue
  }
  const prefix = bank.replace('.WVP', '').toLowerCase()   // e.g. "sound11"
  const { count, clips } = readWvp(buf)
  console.log(`${bank}: ${count} clips`)
  clips.forEach((c, i) => {
    const name = `${prefix}_${String(i).padStart(2, '0')}.wav`
    const wav = pcmToWav(c)
    writeFileSync(join(outDir, name), wav)
    manifest.push({
      file: name, bank: prefix, index: i,
      sampleRate: c.sampleRate, bitsPerSample: c.bitsPerSample,
      channels: c.channels, pcmBytes: c.dataBytes,
    })
  })
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\nWrote ${manifest.length} WAVs + manifest.json to ${outDir}`)
