// 打字機字卡（spec §5.5）：純 stepper——GameLoop 每幀餵 step(dt 秒)，jsdom 決定性可測。
// prefers-reduced-motion → start 即完成（無動畫直出全文）。
export function typedCount(len, elapsed, cps) {
  return Math.min(len, Math.floor(elapsed * cps))
}

export function createTypewriter({ cps = 45 } = {}) {
  let el = null, text = '', t = 0, done = true, onDone = null
  const api = {
    get active() { return !done },
    start(targetEl, fullText, opts = {}) {
      el = targetEl; text = fullText; t = 0; onDone = opts.onDone; done = false
      el.textContent = ''
      el.classList.add('typing')
      if (text.length === 0 || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) api.finish()
    },
    step(dt) {
      if (done || !el) return
      t += dt
      const n = typedCount(text.length, t, cps)
      el.textContent = text.slice(0, n)
      if (n >= text.length) api.finish()
    },
    finish() {
      if (done) return
      done = true
      if (el) { el.textContent = text; el.classList.remove('typing') }
      onDone?.()
    },
  }
  return api
}
