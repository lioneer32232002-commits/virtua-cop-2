// game/src/darkline/combat/BillboardSprite.js
import * as THREE from 'three'

// sprite sheet：cols 欄 = 視角方向，rows 列 = 動畫格。回傳貼圖 UV 視窗。
// 視覺上 row 由上往下數；WebGL 紋理 v=0 在底部，故 oy 用 (rows-1-row)。
// M1 敵人單格（cols=1,rows=1）；保留多格能力供 M2（多角度 sheet 若需要）。
export function frameUV(col, row, cols, rows) {
  return { ox: col / cols, oy: (rows - 1 - row) / rows, rx: 1 / cols, ry: 1 / rows }
}

// rel：敵人「面向」相對於「敵人→相機」的夾角（弧度）。0 = 正對相機 → 第 0 欄。
export function angleToColumn(rel, cols) {
  const seg = (2 * Math.PI) / cols
  let a = rel + seg / 2
  a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return Math.floor(a / seg) % cols
}

export class BillboardSprite {
  constructor(texture, { cols = 1, rows = 1, worldSize = 2 } = {}) {
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.colorSpace = THREE.SRGBColorSpace
    this.cols = cols; this.rows = rows
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(worldSize, worldSize, 1)
    this.setCell(0, 0)
  }
  setCell(col, row) {
    const { ox, oy, rx, ry } = frameUV(col, row, this.cols, this.rows)
    const t = this.sprite.material.map
    t.offset.set(ox, oy); t.repeat.set(rx, ry); t.needsUpdate = true
  }
  faceFrame(facing, camPos, selfPos, animRow = 0) {
    const toCam = Math.atan2(camPos.x - selfPos.x, camPos.z - selfPos.z)
    this.setCell(angleToColumn(facing - toCam, this.cols), animRow)
  }
}
