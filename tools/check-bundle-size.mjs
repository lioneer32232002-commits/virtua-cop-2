// tools/check-bundle-size.mjs
// Coarse first-load gzip budget: sums all shippable assets in the dist dir.
// Refine to true critical-path first-load later if needed (spec §6).
import { readdirSync, statSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = path.resolve(process.argv[2] || 'dist')
const CEILING = 1_500_000 // bytes gzipped — leaves headroom under the <3MB target
const EXT = new Set(['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.woff2', '.woff', '.ttf', '.cube'])

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (EXT.has(path.extname(p).toLowerCase())) out.push(p)
  }
  return out
}

let total = 0
const rows = []
for (const f of walk(dist)) {
  const gz = gzipSync(readFileSync(f)).length
  total += gz
  rows.push([path.relative(dist, f), gz])
}
rows.sort((a, b) => b[1] - a[1])
for (const [f, gz] of rows.slice(0, 12)) console.log(`${(gz / 1024).toFixed(1).padStart(8)} KB  ${f}`)
console.log(`TOTAL gzip: ${(total / 1024).toFixed(1)} KB  (ceiling ${(CEILING / 1024).toFixed(0)} KB)`)
if (total > CEILING) { console.error('FAIL: first-load gzip budget exceeded'); process.exit(1) }
console.log('OK: under budget')
