// 載入一張（Gemini 生的）PNG，過調色盤量化 + 縮到固定解析度，
// 回傳一個可丟給 three.js CanvasTexture 的 <canvas>。風格一致性靠這裡收斂。
// （描邊先不做——列為 Phase A 檢查點「收斂不夠再加」的備選，見 plan。）
import { quantize } from './palette.js'

// M0 用的固定調色盤（1950s noir 暖灰調，先粗略，之後再調）。
export const M0_PALETTE = [
  [12,12,16], [40,36,40], [88,78,70], [140,128,112], [196,182,160], [236,228,210],
  [120,30,28], [180,60,40], [60,70,90], [110,120,140], [70,90,60], [150,150,60],
]

export async function loadImage(url) {
  // 用 onload 而非 img.decode()：decode() 在背景/隱藏分頁會被瀏覽器延遲（卡住），
  // onload 一律觸發，且之後 drawImage 照樣可用。先綁 handler 再設 src。
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error(`failed to load image: ${url}`))
    img.src = url
  })
  return img
}

// img: HTMLImageElement;  size: 目標方形邊長（如 96）
export function processToCanvas(img, palette = M0_PALETTE, size = 96) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, size, size)
  // 先移除背景（從四角 flood-fill），再量化。順序不能反——量化後白色變暖灰，
  // 那個暖灰也可能出現在角色身上（白襯衫），flood-fill 就會誤吃。
  _removeBackground(ctx, size)
  const id = ctx.getImageData(0, 0, size, size)
  const q = quantize({ width: size, height: size, data: id.data }, palette)
  const out = new ImageData(q.data, size, size)
  ctx.putImageData(out, 0, 0)
  return c
}

// BFS flood-fill 從邊緣把與角落顏色相近的像素設為透明。threshold 單位是 RGB 歐氏距離。
function _removeBackground(ctx, size, threshold = 32) {
  const id = ctx.getImageData(0, 0, size, size)
  const d = id.data
  // 取四個角平均色作為背景色
  const corners = [0, size - 1, size * (size - 1), size * size - 1]
  let r = 0, g = 0, b = 0
  for (const p of corners) { r += d[p*4]; g += d[p*4+1]; b += d[p*4+2] }
  const bg = [r/4|0, g/4|0, b/4|0]
  const t2 = threshold * threshold
  const match = p => {
    const dr = d[p*4]-bg[0], dg = d[p*4+1]-bg[1], db = d[p*4+2]-bg[2]
    return dr*dr + dg*dg + db*db <= t2
  }
  const vis = new Uint8Array(size * size)
  const queue = []
  // 播種：上下邊 + 左右邊
  for (let x = 0; x < size; x++) {
    for (const y of [0, size-1]) { const p=y*size+x; if (!vis[p]&&match(p)){vis[p]=1;queue.push(p)} }
  }
  for (let y = 1; y < size-1; y++) {
    for (const x of [0, size-1]) { const p=y*size+x; if (!vis[p]&&match(p)){vis[p]=1;queue.push(p)} }
  }
  // BFS
  let qi = 0
  while (qi < queue.length) {
    const p = queue[qi++]
    d[p*4+3] = 0
    for (const dp of [-1, 1, -size, size]) {
      const np = p + dp
      if (np < 0 || np >= size*size) continue
      if (vis[np]) continue
      if (!match(np)) continue
      vis[np] = 1; queue.push(np)
    }
  }
  ctx.putImageData(id, 0, 0)
}
