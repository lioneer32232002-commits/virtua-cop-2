import { describe, it, expect } from 'vitest'
import {
  caesarShift, makePuzzle, applyGuess, isSolved, previewText, cribMappingAt,
} from '../../src/darkline/intel/decode.js'

describe('caesarShift', () => {
  it('shifts letters within the alphabet, wrapping past Z', () => {
    expect(caesarShift('ABXYZ', 3)).toBe('DEABC')
  })
  it('leaves spaces and punctuation untouched', () => {
    expect(caesarShift('THE LIST.', 1)).toBe('UIF MJTU.')
  })
  it('is reversible with a negative shift', () => {
    expect(caesarShift(caesarShift('DARKLINE', 5), -5)).toBe('DARKLINE')
  })
  it('wraps the shift amount into 0..25', () => {
    expect(caesarShift('A', 27)).toBe('B')
    expect(caesarShift('B', -1)).toBe('A')
  })
})

describe('makePuzzle', () => {
  it('is deterministic for a given seed', () => {
    const a = makePuzzle(1953)
    const b = makePuzzle(1953)
    expect(a.cipher).toBe(b.cipher)
    expect(a.answer).toBe(b.answer)
  })
  it('scrambles the chosen plaintext with a non-zero shift', () => {
    const p = makePuzzle(0, { fragments: ['THE LIST SAILS NORTH'] })
    expect(p.plain).toBe('THE LIST SAILS NORTH')
    expect(p.answer).toBeGreaterThan(0)
    expect(p.cipher).not.toBe(p.plain)
  })
  it('selects a fragment from the pool by seed', () => {
    const opts = { fragments: ['ALPHA', 'BRAVO', 'CHARLIE'] }
    expect(makePuzzle(0, opts).plain).toBe('ALPHA')
    expect(makePuzzle(4, opts).plain).toBe('BRAVO') // 4 % 3 = 1
  })
  it('provides a crib whose cipher→plain mapping pins the shift', () => {
    const p = makePuzzle(1953)
    expect(caesarShift(p.crib.cipher, -p.answer)).toBe(p.crib.plain)
  })
  it('starts with the dial at 0', () => {
    expect(makePuzzle(1953).dial).toBe(0)
  })
})

describe('applyGuess / isSolved / previewText', () => {
  it('is unsolved at the start', () => {
    expect(isSolved(makePuzzle(1953))).toBe(false)
  })
  it('records the dial guess immutably', () => {
    const p = makePuzzle(1953)
    const q = applyGuess(p, 5)
    expect(q.dial).toBe(5)
    expect(p.dial).toBe(0)
  })
  it('wraps the dial input into 0..25', () => {
    const p = makePuzzle(1953)
    expect(applyGuess(p, 26).dial).toBe(0)
    expect(applyGuess(p, -1).dial).toBe(25)
  })
  it('is solved when the dial matches the encryption shift', () => {
    const p = makePuzzle(1953)
    expect(isSolved(applyGuess(p, p.answer))).toBe(true)
  })
  it('reveals the plaintext via previewText once solved', () => {
    const p = makePuzzle(0, { fragments: ['THE LIST SAILS NORTH'] })
    const solved = applyGuess(p, p.answer)
    expect(previewText(solved)).toBe('THE LIST SAILS NORTH')
  })
  it('shows scrambled text for a wrong dial', () => {
    const p = makePuzzle(0, { fragments: ['THE LIST SAILS NORTH'] })
    const wrong = applyGuess(p, (p.answer + 1) % 26)
    expect(previewText(wrong)).not.toBe('THE LIST SAILS NORTH')
    expect(isSolved(wrong)).toBe(false)
  })
})

describe('cribMappingAt', () => {
  it('decodes the crib cipher letter under the current dial (identity at dial 0)', () => {
    const p = makePuzzle(0, { fragments: ['THE LIST SAILS NORTH'] })
    expect(cribMappingAt(p)).toBe(p.crib.cipher)   // dial 0 → no shift → maps to itself
  })
  it('equals the crib plain letter exactly when the dial reaches the answer', () => {
    const p = makePuzzle(1953)
    expect(cribMappingAt(applyGuess(p, p.answer))).toBe(p.crib.plain)
  })
  it('does not equal the crib plain letter for a wrong dial', () => {
    const p = makePuzzle(1953)
    expect(cribMappingAt(applyGuess(p, (p.answer + 1) % 26))).not.toBe(p.crib.plain)
  })
})
