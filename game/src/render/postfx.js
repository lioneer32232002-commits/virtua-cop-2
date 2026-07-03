// Builds the cinematic EffectComposer from a resolved cinematicConfig.
// Uses pmndrs/postprocessing: effects merge into one EffectPass (≈ one
// fullscreen draw) so the whole stack stays cheap on an unlit scene.
import * as THREE from 'three'
import {
  EffectComposer, RenderPass, EffectPass,
  ToneMappingEffect, ToneMappingMode,
  BrightnessContrastEffect, HueSaturationEffect,
  BloomEffect, VignetteEffect, NoiseEffect, ChromaticAberrationEffect,
  BlendFunction,
} from 'postprocessing'

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
  const bloom = new BloomEffect({
    luminanceThreshold: cfg.bloom.luminanceThreshold,
    intensity: cfg.bloom.intensity,
    radius: cfg.bloom.radius,
    mipmapBlur: true,
  })
  const vignette = new VignetteEffect({ offset: cfg.vignette.offset, darkness: cfg.vignette.darkness })
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY })
  noise.blendMode.opacity.value = cfg.noise.opacity
  const ca = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(cfg.chromaticAberration.offset, cfg.chromaticAberration.offset),
  })

  // pmndrs EffectComposer handles final output/colour-space itself — no OutputPass
  // (that symbol is three.js examples/jsm-only; pmndrs auto-renders the last pass to screen).
  composer.addPass(new EffectPass(camera, tone, grade, hueSat, bloom, vignette, noise, ca))
  return composer
}
