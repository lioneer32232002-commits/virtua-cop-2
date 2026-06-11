import * as THREE from 'three'

export class Renderer {
  /** @type {THREE.WebGLRenderer} */
  webgl
  /** @type {THREE.Scene} */
  scene
  /** @type {THREE.PerspectiveCamera} */
  camera

  constructor(container) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x88aacc)

    // Far plane sized for the original game world (stage 1 spans ~1300 units)
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000)

    // Original VC2 (Model 2 port) has no real-time lighting — all shading is
    // baked into the textures, so the whole pipeline is unlit: no lights,
    // no tone mapping, no shadows, no fog. Textures render as authored.
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
    this.webgl.render(this.scene, this.camera)
  }
}
