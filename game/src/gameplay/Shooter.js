import * as THREE from 'three'

export class Shooter {
  /** @type {THREE.PerspectiveCamera|null} */ camera
  /** @type {THREE.Raycaster} */ raycaster

  /** @param {THREE.PerspectiveCamera|null} camera */
  constructor(camera) {
    this.camera = camera
    this.raycaster = new THREE.Raycaster()
  }

  /**
   * @param {{ x: number, y: number }} normalizedMouse - in [-1, 1]
   * @param {THREE.Object3D[]} objects - meshes to test against
   * @returns {THREE.Intersection[]}
   */
  getHits(normalizedMouse, objects) {
    this.raycaster.setFromCamera(
      new THREE.Vector2(normalizedMouse.x, normalizedMouse.y),
      this.camera
    )
    return this.raycaster.intersectObjects(objects, false)
  }
}
