// 最小 mobile holding-state（spec §5.6）：直向窄屏第一畫面 intentional 非破版。
// 顯示/隱藏交給 CSS media query；這裡只填 i18n 內容（HTML 內建英文 fallback 會被覆蓋）。
export function renderHolding(el, i18n) {
  el.innerHTML = ''
  const mk = (tag, cls, key) => {
    const n = document.createElement(tag)
    n.className = cls
    n.textContent = i18n.t(key)
    return n
  }
  el.append(
    mk('div', 'holding-title', 'holding.title'),
    mk('p', 'holding-body', 'holding.body'),
    mk('div', 'holding-rotate', 'holding.rotate'),
  )
}
