// free 段敵人是單張 billboard：用 raycast 命中點相對 sprite 中心的 local 座標
// （除以 worldSize 正規化）判定部位。上=head、下=leg、中段外側=hand、其餘=body。
const HEAD_ABOVE = 0.25
const LEG_BELOW = -0.25
const HAND_OUTSIDE = 0.18

/**
 * @param {{x:number,y:number,z:number}} hitPoint world-space ray hit
 * @param {{x:number,y:number,z:number}} spritePos sprite world centre
 * @param {{worldSize:number}} opts
 * @returns {'head'|'body'|'hand'|'leg'}
 */
export function billboardZone(hitPoint, spritePos, { worldSize }) {
  const ly = (hitPoint.y - spritePos.y) / worldSize
  const lx = (hitPoint.x - spritePos.x) / worldSize
  if (ly > HEAD_ABOVE) return 'head'
  if (ly < LEG_BELOW) return 'leg'
  if (Math.abs(lx) > HAND_OUTSIDE) return 'hand'
  return 'body'
}
