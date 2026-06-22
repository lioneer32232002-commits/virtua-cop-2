// game/tests/darkline/asset-discipline.test.js
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { MISSION } from '../../src/darkline/mission/missions/first-island-chain.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const darklineSrc = path.resolve(here, '../../src/darkline')

function jsFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'm0') continue // m0 spike is being retired in this phase
      out.push(...jsFiles(p))
    } else if (name.endsWith('.js')) {
      out.push(p)
    }
  }
  return out
}

const FORBIDDEN = ['/scene/StageEnvironment', '/level/', '/character/', '/render/CameraPathLoader', '/main.js']

describe('asset discipline', () => {
  it('mission asset paths live under /darkline/', () => {
    const found = []
    const walk = (o) => {
      for (const v of Object.values(o ?? {})) {
        if (typeof v === 'string' && /\.(png|jpe?g|webp)$/.test(v)) found.push(v)
        else if (v && typeof v === 'object') walk(v)
      }
    }
    walk(MISSION)
    expect(found.length).toBeGreaterThan(0)
    for (const p of found) expect(p.startsWith('/darkline/')).toBe(true)
  })

  it('DARKLINE source does not import retired VC2 modules', () => {
    const offenders = []
    for (const file of jsFiles(darklineSrc)) {
      const src = readFileSync(file, 'utf8')
      const re = /\bfrom\s+['"]([^'"]+)['"]/g
      let m
      while ((m = re.exec(src))) {
        if (FORBIDDEN.some(f => m[1].includes(f))) offenders.push(`${path.relative(darklineSrc, file)} -> ${m[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
