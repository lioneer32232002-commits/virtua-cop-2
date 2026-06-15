// game/src/darkline/combat/buildSprite.js
// 載入一張（Gemini 生的）PNG → 過調色盤量化 → 縮到固定解析度，回傳給 three.js
// CanvasTexture 的 <canvas>。M1 相對 M0 放寬參數：size 96→128、色數 12→24（提清晰度，
// 承 M0「偏暗、臉糊」筆記）。1950s noir 暖灰調 + 諜報冷色點綴。
import { quantize } from './palette.js'

export const DARKLINE_PALETTE = [
  [10, 10, 14], [26, 24, 28], [44, 40, 42], [64, 58, 54], [88, 80, 72], [116, 106, 94],
  [150, 138, 120], [186, 172, 150], [216, 204, 182], [240, 232, 214],
  [70, 26, 24], [120, 40, 34], [168, 64, 46], [78, 64, 40], [128, 108, 60], [180, 156, 84],
  [40, 52, 64], [58, 76, 92], [92, 112, 128], [40, 60, 50], [70, 96, 76], [44, 44, 60],
  [96, 60, 44], [150, 120, 96],
]

export async function loadImage(url) {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

// img: HTMLImageElement; size: 目標方形邊長（M1 預設 128）
export function processToCanvas(img, palette = DARKLINE_PALETTE, size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, size, size)
  const id = ctx.getImageData(0, 0, size, size)
  const q = quantize({ width: size, height: size, data: id.data }, palette)
  ctx.putImageData(new ImageData(q.data, size, size), 0, 0)
  return c
}
