// free 段擊殺掉彈夾：基率 dropRate；連續 pityThreshold 次無掉落則強制掉（保底）。
// rng 注入（() => [0,1)）以保決定性，不在 game loop 用 Math.random。
/**
 * @param {{killsSinceDrop:number, dropRate:number, pityThreshold:number}} s
 * @param {() => number} rng
 * @returns {{drop:boolean}}
 */
export function rollMagDrop({ killsSinceDrop, dropRate, pityThreshold }, rng) {
  if (killsSinceDrop + 1 >= pityThreshold) return { drop: true }
  return { drop: rng() < dropRate }
}
