// game/src/darkline/combat/projectThreats.js
// 把「有 lock-on 相位的敵人」投影成 HUD.updateLockOns 吃的螢幕圈 payload。
// 純函式：投影器（NDC 取得）由呼叫端注入（真接線餵 mesh.project(camera)，測試餵假投影），
// 讓本模組不吊 three.js 也可測。phaseClass 是相位→CSS class 的接縫（目前枚舉即 class）。

/** @param {'green'|'yellow'|'red'} lockPhase @returns {'green'|'yellow'|'red'} */
export function phaseClass(lockPhase) {
  return lockPhase
}

/**
 * @param {Array<{lockPhase:?string, lockRemaining?:number}>} enemies
 * @param {(enemy:any)=>({x:number,y:number,size?:number}|null)} projectNdc 回該敵的 NDC
 *        （x/y∈[-1,1]）＋可選 size（圈直徑 px，投影器依敵 bbox 算→大目標大圈），
 *        或 null（無 mesh / 在相機後方）→ 該敵略過。
 * @param {{width:number, height:number}} viewport 視窗像素尺寸
 * @returns {Array<{x:number,y:number,phase:string,remaining:number,size?:number}>} 螢幕像素的圈
 */
export function projectThreats(enemies, projectNdc, viewport) {
  const out = []
  for (const e of enemies) {
    if (!e.lockPhase) continue          // 無鎖（含 innocent / disarmed / 非 VISIBLE）→ 不畫
    const ndc = projectNdc(e)
    if (!ndc) continue                  // 在相機後方或無 mesh → 略過
    out.push({
      x: (ndc.x * 0.5 + 0.5) * viewport.width,
      y: (-ndc.y * 0.5 + 0.5) * viewport.height,
      phase: phaseClass(e.lockPhase),
      remaining: e.lockRemaining ?? 0,
      size: ndc.size,                   // 投影器算的圈直徑（px）；undefined → HUD 用倒數預設尺寸
    })
  }
  return out
}
