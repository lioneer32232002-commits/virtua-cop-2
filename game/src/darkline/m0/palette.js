// 把任意 RGB 對應到調色盤中歐氏距離最近的顏色。這是「Duke3D 共用 256 色盤」
// 概念的程式版：不管 Gemini 吐什麼顏色，全部收斂到同一盒蠟筆 → 風格自動統一。

export function nearestColor([r, g, b], palette) {
  let best = palette[0], bestD = Infinity
  for (const c of palette) {
    const dr = r - c[0], dg = g - c[1], db = b - c[2]
    const d = dr*dr + dg*dg + db*db
    if (d < bestD) { bestD = d; best = c }
  }
  return best
}

// img: { width, height, data: Uint8ClampedArray(RGBA) } —— 與 canvas ImageData 同形狀。
// 回傳新的同形狀物件；完全透明（alpha 0）的像素原樣保留。
export function quantize(img, palette) {
  const data = new Uint8ClampedArray(img.data)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const [r, g, b] = nearestColor([data[i], data[i + 1], data[i + 2]], palette)
    data[i] = r; data[i + 1] = g; data[i + 2] = b
  }
  return { width: img.width, height: img.height, data }
}
