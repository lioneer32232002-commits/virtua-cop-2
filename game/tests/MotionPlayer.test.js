import { describe, it, expect, vi } from 'vitest'
import { MotionPlayer, MOTION_FPS } from '../src/character/MotionPlayer.js'
import { ROT_CHANNELS } from '../src/character/MotionData.js'

function makeMotion(frames) {
  const m = { frames, root: new Float32Array(frames * 3), rot: new Int16Array(frames * ROT_CHANNELS) }
  for (let f = 0; f < frames; f++) {
    m.root[f * 3] = f          // x = frame index, easy to assert
    m.root[f * 3 + 1] = 1
    for (let c = 0; c < ROT_CHANNELS; c++) m.rot[f * ROT_CHANNELS + c] = f * 100
  }
  return m
}

// minimal assembler stub recording applyPose calls
function makeAssembler() {
  return { applyPose: vi.fn() }
}

describe('MotionPlayer', () => {
  it('advances at 30 fps and interpolates between frames', () => {
    const asm = makeAssembler()
    const player = new MotionPlayer(asm)
    const motion = makeMotion(4)
    player.play(motion)
    player.update(0) // initial pose
    expect(asm.applyPose).toHaveBeenLastCalledWith(motion, 0, 1, 0)
    player.update(1.5 / MOTION_FPS)
    const [, f0, f1, t] = asm.applyPose.mock.lastCall
    expect(f0).toBe(1)
    expect(f1).toBe(2)
    expect(t).toBeCloseTo(0.5)
  })

  it('loops by default, wrapping the last frame to the first', () => {
    const asm = makeAssembler()
    const player = new MotionPlayer(asm)
    const motion = makeMotion(3)
    player.play(motion)
    player.update(2.5 / MOTION_FPS) // frame 2.5 of 3 → wraps toward frame 0
    const [, f0, f1, t] = asm.applyPose.mock.lastCall
    expect(f0).toBe(2)
    expect(f1).toBe(0)
    expect(t).toBeCloseTo(0.5)
    expect(player.done).toBe(false)
  })

  it('clamps at the final frame and reports done when loop=false', () => {
    const asm = makeAssembler()
    const player = new MotionPlayer(asm)
    const motion = makeMotion(3)
    player.play(motion, { loop: false })
    player.update(10 / MOTION_FPS)
    const [, f0, f1, t] = asm.applyPose.mock.lastCall
    expect(f0).toBe(2)
    expect(f1).toBe(2)
    expect(t).toBe(0)
    expect(player.done).toBe(true)
  })

  it('does nothing before play() is called', () => {
    const asm = makeAssembler()
    const player = new MotionPlayer(asm)
    expect(() => player.update(0.1)).not.toThrow()
    expect(asm.applyPose).not.toHaveBeenCalled()
  })
})
