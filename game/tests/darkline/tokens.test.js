// Phase C guard：design token 層存在、UI 區塊吃 token、無裸色值殘留。
// 直接讀 index.html 原文做字串斷言（jsdom 不解析 <style> cascade，字串守衛最穩）。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

// jsdom 環境下 new URL(…, import.meta.url) 非 file: scheme，
// 走既有 asset-discipline.test.js 的 fileURLToPath 模式解析路徑。
const here = path.dirname(fileURLToPath(import.meta.url))
const html = readFileSync(path.resolve(here, '../../index.html'), 'utf8')

describe('design tokens (index.html)', () => {
  it('defines the espionage token set in :root', () => {
    for (const t of ['--dl-amber:', '--dl-amber-bright:', '--dl-amber-rgb:', '--dl-paper:',
                     '--dl-red:', '--dl-intel-bg:', '--dl-scanline:', '--dl-ease:', '--dl-dur:',
                     '--dl-glow:', '--dl-font:']) {
      expect(html, `missing token ${t}`).toContain(t)
    }
  })
  it('UI blocks consume tokens, not raw palette values', () => {
    const afterRoot = html.slice(html.indexOf('}', html.indexOf(':root')))   // :root 區塊之後
    expect(afterRoot).not.toContain('#e8c87a')     // 琥珀一律走 var(--dl-amber)
    expect(afterRoot).not.toContain('#f4e2b0')     // 紙白一律走 var(--dl-paper)
    expect(afterRoot).not.toContain('232,200,122') // 半透明琥珀一律走 rgba(var(--dl-amber-rgb),…)
    expect(afterRoot).not.toContain('#c8b074')     // 次級琥珀一律走 var(--dl-amber-dim)
    expect(afterRoot).not.toContain('#b59a5e')     // 註腳提示一律走 var(--dl-amber-faint)
    expect(afterRoot).not.toContain('#0a0a12')     // 實心深底一律走 var(--dl-intel-bg-solid)
    expect(afterRoot).not.toContain('system-ui')   // 字型一律走 var(--dl-font)
    expect(afterRoot).toContain('var(--dl-amber)')
    expect(afterRoot).toContain('var(--dl-font)')
  })
  it('has the viewport meta (mobile holding-state 前置)', () => {
    expect(html).toContain('name="viewport"')
  })
  it('mobile holding-state: breakpoint 以下顯示 #holding（guard, spec §5.6）', () => {
    expect(html).toContain('id="holding"')
    expect(html).toContain('@media (orientation:portrait) and (max-width:719px)')
  })
})
