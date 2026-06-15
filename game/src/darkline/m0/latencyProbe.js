// 量「按下到畫面更新」的粗略延遲：mousedown 記時間戳，下一個 rAF 取差值，列出中位數。
export function installLatencyProbe() {
  const samples = []
  let pending = null
  window.addEventListener('mousedown', () => { pending = performance.now() })
  function tick() {
    if (pending != null) { samples.push(performance.now() - pending); pending = null
      if (samples.length % 10 === 0) {
        const s = [...samples].sort((a, b) => a - b)
        console.log(`[latency] n=${s.length} median=${s[s.length >> 1].toFixed(1)}ms`)
      }
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
