export class MissionSequencer {
  constructor(segments, { onEnter, onExit } = {}) {
    if (!segments?.length) throw new Error('MissionSequencer needs at least one segment')
    this.segments = segments
    this._i = 0
    this._onEnter = onEnter
    this._onExit = onExit
  }
  get current() { return this.segments[this._i] }
  get isDone() { return this._i === this.segments.length - 1 }
  next() {
    if (this.isDone) return this.current
    const from = this.segments[this._i]
    this._i++
    this._onExit?.(from)
    this._onEnter?.(this.current)
    return this.current
  }
  /**
   * Jump straight to a segment (resume-from-checkpoint). Sets the index and fires
   * onEnter(target) ONCE — no onExit and no intermediate onEnter, so skipped
   * segments never run their (possibly heavy/async) setup. Throws on unknown seg.
   * @param {string} segment
   * @returns {string} the now-current segment
   */
  jumpTo(segment) {
    const i = this.segments.indexOf(segment)
    if (i < 0) throw new Error(`MissionSequencer: unknown segment "${segment}"`)
    this._i = i
    this._onEnter?.(this.current)
    return this.current
  }
}
