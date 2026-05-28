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
    this.scene.background = new THREE.Color(0x111122)
    this.scene.fog = new THREE.Fog(0x111122, 20, 80)

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)

    this.webgl = new THREE.WebGLRenderer({ antialias: true })
    this.webgl.setPixelRatio(window.devicePixelRatio)
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.shadowMap.enabled = true
    container.appendChild(this.webgl.domElement)

    this._addLights()
    window.addEventListener('resize', () => this._onResize())
  }

  _addLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(10, 20, 10)
    sun.castShadow = true
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0x8899bb, 0.6)
    fill.position.set(-10, 5, -10)
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
