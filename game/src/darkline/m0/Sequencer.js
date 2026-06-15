// M0 的最小任務骨架：固定段落順序。整合層在每次 onEnter 切換相機控制/存檔。
export const SEGMENTS = ['briefing', 'rail', 'free', 'done']

export class Sequencer {
  constructor({ onEnter } = {}) { this._i = 0; this._onEnter = onEnter }
  get current() { return SEGMENTS[this._i] }
  get isDone() { return this.current === 'done' }
  next() {
    if (this._i < SEGMENTS.length - 1) {
      this._i++
      this._onEnter?.(this.current)
    }
    return this.current
  }
}
