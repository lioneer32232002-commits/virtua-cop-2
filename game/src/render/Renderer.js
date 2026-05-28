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
    this.scene.background = new THREE.Color(0x334466)
    this.scene.fog = new THREE.Fog(0x334466, 30, 90)

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)

    this.webgl = new THREE.WebGLRenderer({ antialias: true })
    this.webgl.setPixelRatio(window.devicePixelRatio)
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.shadowMap.enabled = true
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping
    this.webgl.toneMappingExposure = 2.2
    container.appendChild(this.webgl.domElement)

    this._addLights()
    window.addEventListener('resize', () => this._onResize())
  }

  _addLights() {
    // Sky/ground gradient — fills dark areas without washing out highlights
    const hemi = new THREE.HemisphereLight(0x99bbff, 0x443322, 1.5)
    this.scene.add(hemi)

    // Key light from front-upper-left (camera-facing so faces get lit)
    const key = new THREE.DirectionalLight(0xfff5e0, 2.0)
    key.position.set(-5, 15, 8)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    this.scene.add(key)

    // Rim light from behind to separate subjects from background
    const rim = new THREE.DirectionalLight(0x6688bb, 0.8)
    rim.position.set(8, 5, -15)
    this.scene.add(rim)
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
