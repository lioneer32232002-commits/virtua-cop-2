import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readModels } from '../lib/model-reader.mjs';

// 建立 synthetic P_*.BIN buffer
// 1 個模型：4 頂點、1 面、1 material
// Header at offset 0 (model 0):
//   verticesOffset=32, facesOffset=56, materialsOffset=96
//   verticesCount=4, facesCount=1, flags=0
function makeSyntheticBin() {
  const buf = new ArrayBuffer(128);
  const view = new DataView(buf);

  // Model 0 header (at offset 0)
  const VERTS_OFF = 32;
  const FACES_OFF = 56;
  const MATS_OFF  = 96;
  view.setUint32(0, VERTS_OFF, true);  // verticesOffset
  view.setUint32(4, FACES_OFF, true);  // facesOffset
  view.setUint32(8, MATS_OFF,  true);  // materialsOffset
  view.setUint16(12, 4, true);          // verticesCount = 4
  view.setUint8(14, 1);                 // facesCount = 1
  view.setUint8(15, 0);                 // flags = 0

  // Model 1 header (at offset 16) = sentinel (verticesOffset == 0)
  view.setUint32(16, 0, true);

  // Vertex 0: (1.0, 2.0, 3.0)
  view.setFloat32(VERTS_OFF + 0, 1.0, true);
  view.setFloat32(VERTS_OFF + 4, 2.0, true);
  view.setFloat32(VERTS_OFF + 8, 3.0, true);
  // Vertex 1: (4.0, 5.0, 6.0)
  view.setFloat32(VERTS_OFF + 12, 4.0, true);
  view.setFloat32(VERTS_OFF + 16, 5.0, true);
  view.setFloat32(VERTS_OFF + 20, 6.0, true);
  // Vertex 2: (7.0, 8.0, 9.0)
  view.setFloat32(VERTS_OFF + 24, 7.0, true);
  view.setFloat32(VERTS_OFF + 28, 8.0, true);
  view.setFloat32(VERTS_OFF + 32, 9.0, true);
  // Vertex 3: (10.0, 11.0, 12.0)
  view.setFloat32(VERTS_OFF + 36, 10.0, true);
  view.setFloat32(VERTS_OFF + 40, 11.0, true);
  view.setFloat32(VERTS_OFF + 44, 12.0, true);

  // Face 0: v1=0, v2=1, v3=2, v4=3, normal=(0,1,0)
  view.setUint16(FACES_OFF + 0, 0, true);  // v1
  view.setUint16(FACES_OFF + 2, 1, true);  // v2
  view.setUint16(FACES_OFF + 4, 2, true);  // v3
  view.setUint16(FACES_OFF + 6, 3, true);  // v4
  view.setFloat32(FACES_OFF + 8,  0.0, true); // normal x
  view.setFloat32(FACES_OFF + 12, 1.0, true); // normal y
  view.setFloat32(FACES_OFF + 16, 0.0, true); // normal z

  // Material 0: Enabled(0x40) | Texture(0x02), textureId=5, texturePackId=1
  view.setUint8(MATS_OFF + 0, 0x42);   // materialFlags = Enabled|Texture
  view.setUint8(MATS_OFF + 1, 0x00);   // textureFlags
  view.setUint8(MATS_OFF + 2, 5);       // textureId
  view.setUint8(MATS_OFF + 3, 1);       // texturePackId
  view.setUint8(MATS_OFF + 4, 0);       // padding
  view.setUint8(MATS_OFF + 5, 0);       // renderFlags
  view.setUint16(MATS_OFF + 6, 0, true); // colorData

  return Buffer.from(buf);
}

test('readModels parses 1 model with 4 vertices and 1 face', () => {
  const bin = makeSyntheticBin();
  const models = readModels(bin);
  assert.equal(models.length, 1);
  const m = models[0];
  assert.equal(m.vertices.length, 4);
  assert.equal(m.faces.length, 1);
  assert.ok(Math.abs(m.vertices[0].x - 1.0) < 1e-5);
  assert.ok(Math.abs(m.vertices[1].y - 5.0) < 1e-5);
  assert.equal(m.faces[0].v1, 0);
  assert.equal(m.faces[0].v4, 3);
  assert.equal(m.faces[0].mat.textureId, 5);
  assert.equal(m.faces[0].mat.texturePackId, 1);
  assert.equal(m.faces[0].mat.enabled, true);
  assert.equal(m.depth, 0);
});
