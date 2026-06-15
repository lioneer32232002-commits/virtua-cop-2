import { SEGMENT_MODES } from './missions/first-island-chain.js'

export function savePayloadFor(segment, score) {
  return SEGMENT_MODES[segment]?.save ? { segment, score } : null
}
