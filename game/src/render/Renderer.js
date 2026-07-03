import * as THREE from 'three'
import { applyAtmosphere, updateSky } from './sky.js'
import { clampPixelRatio, resolveCinematic } from './cinematicConfig.js'
import { createCinematicComposer } from './postfx.js'

export class Renderer {
  /** @type {THREE.WebGLRenderer} */ webgl
  /** @type {THREE.Scene} */ scene
  /** @type {THREE.PerspectiveCamera} */ camera
  /** @type {THREE.Mesh} */ sky
  /** @type {import('postprocessing').EffectComposer|null} */ composer = null

  constructor(container, opts = {}) {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000)
    this.sky = applyAtmosphere(this.scene)

    this.webgl = new THREE.WebGLRenderer({ antialias: !opts.cinematic })
    this.webgl.setPixelRatio(opts.cinematic ? clampPixelRatio(window.devicePixelRatio) : window.devicePixelRatio)
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.toneMapping = THREE.NoToneMapping
    container.appendChild(this.webgl.domElement)

    if (opts.cinematic) {
      const cfg = resolveCinematic(opts.cinematic === true ? {} : opts.cinematic)
      this.composer = createCinematicComposer(this.webgl, this.scene, this.camera, cfg)
    }

    window.addEventListener('resize', () => this._onResize())
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.webgl.setSize(w, h)
    if (this.composer) this.composer.setSize(w, h)
  }

  render() {
    updateSky(this.sky, this.camera)
    if (this.composer) this.composer.render()
    else this.webgl.render(this.scene, this.camera)
  }
}
