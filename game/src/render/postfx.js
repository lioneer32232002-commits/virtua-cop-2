// Builds the cinematic EffectComposer from a resolved cinematicConfig.
// Uses pmndrs/postprocessing: effects merge into one EffectPass (≈ one
// fullscreen draw) so the whole stack stays cheap on an unlit scene.
import * as THREE from 'three'
import {
  EffectComposer, RenderPass, EffectPass,
  ToneMappingEffect, ToneMappingMode,
  BrightnessContrastEffect, HueSaturationEffect,
  SelectiveBloomEffect, VignetteEffect, NoiseEffect, ChromaticAberrationEffect,
  BlendFunction,
} from 'postprocessing'

// Returns { composer, bloomSelection }. bloomSelection is a postprocessing Selection
// running in INVERTED mode: objects added to it are EXCLUDED from bloom while
// everything else blooms as normal. Enemy billboard sprites go in it so their
// face / lit pixels don't get amplified into all-over white speckle at 128px
// (matte art fixes the asset side; this fixes the bloom-amplification side —
// see DARKLINE-M-E 定調 §2 residual note). Empty selection = everything blooms
// (safe default in menu / segments with no registered sprites).
export function createCinematicComposer(webgl, scene, camera, cfg) {
  const composer = new EffectComposer(webgl)
  composer.addPass(new RenderPass(scene, camera))

  const tone = new ToneMappingEffect({
    mode: ToneMappingMode[cfg.toneMapping] ?? ToneMappingMode.ACES_FILMIC,
  })
  const grade = new BrightnessContrastEffect({
    brightness: cfg.grade.brightness, contrast: cfg.grade.contrast,
  })
  const hueSat = new HueSaturationEffect({ saturation: cfg.grade.saturation })
  const bloom = new SelectiveBloomEffect(scene, camera, {
    luminanceThreshold: cfg.bloom.luminanceThreshold,
    intensity: cfg.bloom.intensity,
    radius: cfg.bloom.radius,
    mipmapBlur: true,
  })
  bloom.inverted = true   // selection = bloom-EXCLUDED set (everything else still blooms)
  const vignette = new VignetteEffect({ offset: cfg.vignette.offset, darkness: cfg.vignette.darkness })
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY })
  noise.blendMode.opacity.value = cfg.noise.opacity
  const ca = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(cfg.chromaticAberration.offset, cfg.chromaticAberration.offset),
  })

  // pmndrs EffectComposer handles final output/colour-space itself — no OutputPass
  // (that symbol is three.js examples/jsm-only; pmndrs auto-renders the last pass to screen).
  composer.addPass(new EffectPass(camera, tone, grade, hueSat, bloom, vignette, noise, ca))
  return { composer, bloomSelection: bloom.getSelection() }
}
