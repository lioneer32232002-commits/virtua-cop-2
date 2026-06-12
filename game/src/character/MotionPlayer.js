// Plays extracted MOT motions on a CharacterAssembler: 30 fps frame stepping
// with linear interpolation between frames (CAMMOV and MOT share the
// original game's 30 fps timebase).

export const MOTION_FPS = 30

export class MotionPlayer {
  /** @type {{ applyPose(motion, f0, f1, t): void }} */
  assembler
  motion = null
  loop = true
  done = false
  _time = 0

  constructor(assembler) {
    this.assembler = assembler
  }

  /**
   * @param {{ frames: number, root: Float32Array, rot: Int16Array }} motion
   * @param {{ loop?: boolean }} [opts]
   */
  play(motion, opts = {}) {
    this.motion = motion
    this.loop = opts.loop ?? true
    this.done = false
    this._time = 0
  }

  /** @param {number} dt seconds since last update */
  update(dt) {
    if (!this.motion) return
    this._time += dt
    const F = this.motion.frames
    let pos = this._time * MOTION_FPS
    if (this.loop) {
      pos %= F // last frame blends back into frame 0
      const f0 = Math.floor(pos)
      this.assembler.applyPose(this.motion, f0, (f0 + 1) % F, pos - f0)
    } else if (pos >= F - 1) {
      this.done = true
      this.assembler.applyPose(this.motion, F - 1, F - 1, 0)
    } else {
      const f0 = Math.floor(pos)
      this.assembler.applyPose(this.motion, f0, f0 + 1, pos - f0)
    }
  }
}
