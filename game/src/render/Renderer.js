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
    this.scene.fog = new THREE.Fog(0x88aacc, 60, 140)

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)

    this.webgl = new THREE.WebGLRenderer({ antialias: true })
    this.webgl.setPixelRatio(window.devicePixelRatio)
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.shadowMap.enabled = true
    this.webgl.toneMapping = THREE.ReinhardToneMapping
    this.webgl.toneMappingExposure = 1.8
    container.appendChild(this.webgl.domElement)

    this._addLights()
    window.addEventListener('resize', () => this._onResize())
  }

  _addLights() {
    // Flat base — prevents any mesh face from going pitch-black (arcade look)
    const ambient = new THREE.AmbientLight(0xffffff, 1.5)
    this.scene.add(ambient)

    // Sky/ground gradient for colour temperature variation
    const hemi = new THREE.HemisphereLight(0xccddf5, 0x887766, 1.5)
    this.scene.add(hemi)

    // Key light — warm sun from upper-front
    const key = new THREE.DirectionalLight(0xfffae8, 2.0)
    key.position.set(-5, 20, 10)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    this.scene.add(key)

    // Fill from behind-right — softens back-face shadows
    const fill = new THREE.DirectionalLight(0xaabbcc, 0.8)
    fill.position.set(8, 8, -10)
    this.scene.add(fill)
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
