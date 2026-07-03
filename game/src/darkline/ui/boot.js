// boot gate（spec §5.4）：#boot 是 index.html 靜態節點（inline CSS + 系統字 fallback → LCP=boot 文字），
// 這裡只管「何時可以收掉」：字型 ready + 首幀已渲染 + 預載資產完成 + 至少顯示 minMs。
export function createBootGate({ minMs = 900 } = {}) {
  const seen = new Set()
  let t0 = null
  return {
    begin(now) { t0 = now },
    signal(name) { seen.add(name) },
    ready(now) {
      return t0 != null && seen.has('fonts') && seen.has('frame') && seen.has('assets')
        && (now - t0) >= minMs
    },
  }
}
