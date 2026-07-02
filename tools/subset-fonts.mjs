// 字型子集管線（spec §5.1 / §6）：原始檔 gitignored（game/fonts-src/），只 commit 子集 woff2。
//   Latin  = Cutive Mono（OFL 電報打字機體）→ ASCII 可列印區
//   CJK    = Noto Serif TC variable（OFL 思源宋）→ glyph allow-list + ASCII 保底，pin wght 400
// 用法：cd game && npm run fonts:build（原始檔下載指令見下方 SRC 註解 / CREDITS.md）
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { collectGlyphs, LATIN_PRINTABLE } from './glyph-allowlist.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
// subset-font（CJS）裝在 game/node_modules；本檔在 repo 根 tools/，ESM 解析走檔案位置
// 而非 cwd → 用 createRequire 錨定 game/ 解析。
const subsetFont = createRequire(path.join(here, '../game/package.json'))('subset-font')
const SRC = {
  // curl -L -o game/fonts-src/CutiveMono-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/cutivemono/CutiveMono-Regular.ttf"
  latin: path.join(here, '../game/fonts-src/CutiveMono-Regular.ttf'),
  // curl -L -o game/fonts-src/NotoSerifTC-Variable.ttf "https://github.com/google/fonts/raw/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf"
  cjk: path.join(here, '../game/fonts-src/NotoSerifTC-Variable.ttf'),
}
const OUT = path.join(here, '../game/public/darkline/fonts')
const BUDGET = { latin: 40 * 1024, cjk: 300 * 1024 }

mkdirSync(OUT, { recursive: true })
const glyphs = [...collectGlyphs()].sort()

const latinBuf = await subsetFont(readFileSync(SRC.latin), LATIN_PRINTABLE, { targetFormat: 'woff2' })
writeFileSync(path.join(OUT, 'dl-latin.woff2'), latinBuf)

const cjkBuf = await subsetFont(readFileSync(SRC.cjk), glyphs.join('') + LATIN_PRINTABLE, {
  targetFormat: 'woff2',
  variationAxes: { wght: 400 },   // variable → 定重 instance
})
writeFileSync(path.join(OUT, 'dl-cjk.woff2'), cjkBuf)
writeFileSync(path.join(OUT, 'dl-cjk.glyphs.json'), JSON.stringify(glyphs))

for (const [name, cap] of [['dl-latin.woff2', BUDGET.latin], ['dl-cjk.woff2', BUDGET.cjk]]) {
  const size = statSync(path.join(OUT, name)).size
  console.log(`${name}: ${(size / 1024).toFixed(1)} KB (cap ${(cap / 1024).toFixed(0)} KB)`)
  if (size > cap) { console.error(`FAIL: ${name} over budget`); process.exit(1) }
}
console.log(`glyphs: ${glyphs.length}`)
