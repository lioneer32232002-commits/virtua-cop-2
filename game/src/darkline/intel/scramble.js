// 招牌時刻（spec §0）：解碼成功 → 亂碼由左至右「收斂」成明文。
// scrambleFrame 純函式（rng 注入 → 決定性測試）；createScramble 是 GameLoop 餵 dt 的 stepper。
export const SCRAMBLE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/#-'

export function scrambleFrame(plain, t, rng = Math.random) {
  const locked = Math.floor(Math.max(0, Math.min(1, t)) * plain.length)
  let out = ''
  for (let i = 0; i < plain.length; i++) {
    const ch = plain[i]
    out += (i < locked || ch === ' ')
      ? ch
      : SCRAMBLE_CHARSET[Math.floor(rng() * SCRAMBLE_CHARSET.length)]
  }
  return out
}

export function createScramble({ duration = 1.4, rng = Math.random } = {}) {
  let el = null, plain = '', t = 0, active = false, onDone = null
  const api = {
    get active() { return active },
    start(targetEl, text, opts = {}) {
      el = targetEl; plain = text; t = 0; onDone = opts.onDone; active = true
      el.classList.add('converging')
      el.classList.remove('ok')
      el.textContent = scrambleFrame(plain, 0, rng)
      if (plain.length === 0 || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) api.finish()
    },
    step(dt) {
      if (!active) return
      t += dt / duration
      if (t >= 1) { api.finish(); return }
      el.textContent = scrambleFrame(plain, t, rng)
    },
    finish() {
      if (!active) return
      active = false
      el.textContent = plain
      el.classList.remove('converging')
      el.classList.add('ok')      // 琥珀 ignition（既有 .ok 樣式）在收斂完成那一刻點亮
      onDone?.()
    },
  }
  return api
}
