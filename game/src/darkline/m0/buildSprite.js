// 載入一張（Gemini 生的）PNG，過調色盤量化 + 1px 描邊 + 縮到固定解析度，
// 回傳一個可丟給 three.js CanvasTexture 的 <canvas>。風格一致性靠這裡收斂。
import { quantize } from './palette.js'

// M0 用的固定調色盤（1950s noir 暖灰調，先粗略，之後再調）。
export const M0_PALETTE = [
  [12,12,16], [40,36,40], [88,78,70], [140,128,112], [196,182,160], [236,228,210],
  [120,30,28], [180,60,40], [60,70,90], [110,120,140], [70,90,60], [150,150,60],
]

export async function loadImage(url) {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

// img: HTMLImageElement;  size: 目標方形邊長（如 96）
export function processToCanvas(img, palette = M0_PALETTE, size = 96) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, size, size)
  const id = ctx.getImageData(0, 0, size, size)
  const q = quantize({ width: size, height: size, data: id.data }, palette)
  const out = new ImageData(q.data, size, size)
  ctx.putImageData(out, 0, 0)
  return c
}
