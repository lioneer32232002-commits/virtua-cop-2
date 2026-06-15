// 量「按下到畫面更新」的粗略延遲：mousedown 記時間戳，下一個 rAF 取差值，列出中位數。
// 同步顯示到畫面左下角（Electron 視窗不必開 devtools 也看得到數字）。
export function installLatencyProbe() {
  const samples = []
  let pending = null
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:8px;bottom:8px;color:#6f6;font:12px monospace;z-index:9;text-shadow:0 1px 2px #000;pointer-events:none'
  el.textContent = '[latency] 點畫面數十下開始量測…'
  const attach = () => document.body && document.body.appendChild(el)
  if (document.body) attach(); else window.addEventListener('DOMContentLoaded', attach)
  window.addEventListener('mousedown', () => { pending = performance.now() })
  function tick() {
    if (pending != null) {
      samples.push(performance.now() - pending); pending = null
      const s = [...samples].sort((a, b) => a - b)
      const median = s[s.length >> 1]
      el.textContent = `[latency] n=${s.length} median=${median.toFixed(1)}ms`
      if (samples.length % 10 === 0) console.log(el.textContent)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
