import * as THREE from 'three'
import { Renderer } from './render/Renderer.js'

const container = document.getElementById('canvas-container')
const renderer = new Renderer(container)

const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0x00ff88 })
)
renderer.scene.add(box)

renderer.camera.position.set(0, 2, 5)
renderer.camera.lookAt(0, 0, 0)

function animate() {
  requestAnimationFrame(animate)
  box.rotation.y += 0.01
  renderer.render()
}
animate()
