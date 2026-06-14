import * as THREE from 'three'
import { applyAtmosphere, updateSky } from './sky.js'

export class Renderer {
  /** @type {THREE.WebGLRenderer} */
  webgl
  /** @type {THREE.Scene} */
  scene
  /** @type {THREE.PerspectiveCamera} */
  camera
  /** @type {THREE.Mesh} */
  sky

  constructor(container) {
    this.scene = new THREE.Scene()

    // Far plane sized for the original game world (stage 1 spans ~1300 units)
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000)

    // A flat blue background read as a "blue void" wherever stage geometry
    // didn't fill the view. Replace it with a gradient sky dome + horizon-matched
    // distance fog so empty view reads as sky and distant geometry hazes out.
    // (Geometry is still unlit — MeshBasicMaterial honours scene.fog; the dome
    // is fog-exempt and never raycast. See render/sky.js.)
    this.sky = applyAtmosphere(this.scene)

    // Original VC2 (Model 2 port) has no real-time lighting — all shading is
    // baked into the textures, so the whole pipeline is unlit: no lights,
    // no tone mapping, no shadows. Textures render as authored.
    this.webgl = new THREE.WebGLRenderer({ antialias: true })
    this.webgl.setPixelRatio(window.devicePixelRatio)
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.toneMapping = THREE.NoToneMapping
    container.appendChild(this.webgl.domElement)

    window.addEventListener('resize', () => this._onResize())
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.webgl.setSize(w, h)
  }

  render() {
    updateSky(this.sky, this.camera)
    this.webgl.render(this.scene, this.camera)
  }
}
