import * as THREE from 'three'

const STAGE_THEMES = {
  harbor:    { floor: 0x334455, wall: 0x445566, accent: 0x667788 },
  factory:   { floor: 0x443322, wall: 0x554433, accent: 0x886644 },
  citynight: { floor: 0x222233, wall: 0x333344, accent: 0x4466aa },
}

export class StageEnvironment {
  /** @type {THREE.Object3D[]} */ objects = []

  /**
   * @param {THREE.Scene} scene
   * @param {{ type: string }} config
   */
  constructor(scene, config) {
    this.scene = scene
    const theme = STAGE_THEMES[config.type] ?? STAGE_THEMES.harbor
    this._build(theme)
  }

  _mesh(geo, color, castShadow = false, receiveShadow = true) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }))
    m.castShadow = castShadow
    m.receiveShadow = receiveShadow
    this.scene.add(m)
    this.objects.push(m)
    return m
  }

  _build(theme) {
    // Floor strip 8 wide, 60 long
    const floor = this._mesh(new THREE.BoxGeometry(8, 0.2, 60), theme.floor)
    floor.position.set(0, -0.1, -25)

    // Left wall
    const wallL = this._mesh(new THREE.BoxGeometry(0.3, 5, 60), theme.wall)
    wallL.position.set(-4, 2.5, -25)

    // Right wall
    const wallR = this._mesh(new THREE.BoxGeometry(0.3, 5, 60), theme.wall)
    wallR.position.set(4, 2.5, -25)

    // Ceiling beams every 8 units
    for (let z = -4; z >= -48; z -= 8) {
      const beam = this._mesh(new THREE.BoxGeometry(8, 0.3, 0.4), theme.accent)
      beam.position.set(0, 4.8, z)
    }

    // Cover objects (crates/barriers)
    const coverPos = [
      [ 2.5, 0.4, -10], [-2.5, 0.4, -10],
      [ 3,   0.4, -22], [-2,   0.4, -22],
      [ 2,   0.4, -34], [-3,   0.4, -36],
    ]
    for (const [x, y, z] of coverPos) {
      const crate = this._mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), theme.accent, true)
      crate.position.set(x, y, z)
    }
  }

  dispose() {
    for (const obj of this.objects) {
      this.scene.remove(obj)
      obj.geometry?.dispose()
      obj.material?.dispose()
    }
    this.objects = []
  }
}
