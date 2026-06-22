// Pure cinematic-postfx params + helpers. No three.js / WebGL here so it unit-tests
// cleanly; postfx.js turns these numbers into real effects.

export function clampPixelRatio(dpr, max = 2) {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1
  return Math.min(dpr, max)
}

// Warm-amber dusk noir, tuned to bloom the lit windows / lamps / muzzle / amber UI
// without washing out the keeper's flat block shading. All Electron-tunable.
export const DEFAULT_CINEMATIC = {
  toneMapping: 'ACES_FILMIC',
  bloom: { luminanceThreshold: 0.62, intensity: 0.9, radius: 0.72 },
  grade: { brightness: -0.015, contrast: 0.10, saturation: 0.12 },
  vignette: { offset: 0.30, darkness: 0.72 },
  noise: { opacity: 0.055 },
  chromaticAberration: { offset: 0.0009 },
}

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v) }

export function resolveCinematic(overrides = {}) {
  const merge = (base, ov) => {
    const out = Array.isArray(base) ? [...base] : { ...base }
    for (const k of Object.keys(ov || {})) {
      out[k] = isObj(base[k]) && isObj(ov[k]) ? merge(base[k], ov[k]) : ov[k]
    }
    return out
  }
  return merge(DEFAULT_CINEMATIC, overrides)
}
