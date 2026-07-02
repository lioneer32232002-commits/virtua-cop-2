// tofu guard：每個 user-facing glyph 都要在已 commit 的 CJK 子集 manifest 裡；
// 體積走 §6 預算。manifest 由 tools/subset-fonts.mjs 與字型同時生成（同源不漂移）。
// jsdom 環境下 new URL(…, import.meta.url) 非 file: scheme，
// 走既有 asset-discipline.test.js 的 fileURLToPath 模式解析路徑。
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { collectGlyphs } from '../../../tools/glyph-allowlist.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fontsDir = path.resolve(here, '../../public/darkline/fonts')

describe('font subset budget + tofu guard', () => {
  it('every user-facing glyph is inside the committed CJK subset', () => {
    const manifest = new Set(JSON.parse(readFileSync(path.join(fontsDir, 'dl-cjk.glyphs.json'), 'utf8')))
    const missing = [...collectGlyphs()].filter(ch => !manifest.has(ch))
    expect(missing, `文案長了新字，請重跑 npm run fonts:build：${missing.join('')}`).toEqual([])
  })
  it('subset files stay inside the §6 budget', () => {
    expect(statSync(path.join(fontsDir, 'dl-cjk.woff2')).size).toBeLessThanOrEqual(300 * 1024)
    expect(statSync(path.join(fontsDir, 'dl-latin.woff2')).size).toBeLessThanOrEqual(40 * 1024)
  })
})
