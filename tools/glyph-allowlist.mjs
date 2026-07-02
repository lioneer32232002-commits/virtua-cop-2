// glyph allow-list：CJK 子集要涵蓋的全部非 ASCII 字元。
// 來源＝locale JSON 全部值 + 不在 locale 裡的 UI 字面量。文案長新字 → 這裡自動長 →
// glyphs.test.js 比對 manifest 抓到「忘記重跑 fonts:build」。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// ASCII 可列印區（Latin 子集固定範圍；也一併塞進 CJK 子集當保底）
export const LATIN_PRINTABLE = (() => {
  let s = ''
  for (let c = 0x20; c <= 0x7e; c++) s += String.fromCharCode(c)
  return s
})()

// UI 字面量（code 裡直接寫、不經 i18n 的 user-facing 字元）：
// 選單語言鈕「中文」、解碼轉盤 ◀▶、備彈匣 ◖×、hint「段落：（）」、打字機游標 ▌。
export const LITERALS = '中文◀▶◖×▌段落：（）'

export function collectGlyphs({ localesDir = path.join(here, '../game/src/locales') } = {}) {
  const out = new Set()
  const add = str => { for (const ch of str) if (ch.codePointAt(0) > 0x7e) out.add(ch) }
  for (const f of ['zh.json', 'en.json']) {
    const dict = JSON.parse(readFileSync(path.join(localesDir, f), 'utf8'))
    for (const v of Object.values(dict)) add(v)
  }
  add(LITERALS)
  return out
}
