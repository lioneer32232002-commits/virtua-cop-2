import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGlb, resolvePackName } from '../lib/glb-builder.mjs';

test('buildGlb returns non-empty Buffer with GLB magic', async () => {
  // Minimal: 1 model, 1 face with color (no texture)
  const models = [{
    id: 0,
    depth: 0,
    unk: 0,
    packName: 'P_STG10.BIN',
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 0, y: 1, z: 0 },
    ],
    faces: [{
      v1: 0, v2: 1, v3: 2, v4: 3,
      normal: { x: 0, y: 0, z: 1 },
      mat: {
        enabled: true,
        hasTexture: false,
        hasColor: true,
        invertX: false,
        invertY: false,
        transparent: false,
        textureId: 0,
        texturePackId: 0,
        colorData: 0x7fff,   // BGR555 white
        materialFlags: 0x44, // Enabled|Color
        textureFlags: 0,
        renderFlags: 0,
      },
    }],
  }];

  const glb = await buildGlb(models, new Map(), new Map());
  assert.ok(glb instanceof Buffer);
  assert.ok(glb.length > 0);
  // GLB magic bytes: "glTF"
  assert.equal(glb[0], 0x67); // 'g'
  assert.equal(glb[1], 0x6C); // 'l'
  assert.equal(glb[2], 0x54); // 'T'
  assert.equal(glb[3], 0x46); // 'F'
});

test('buildGlb skips disabled faces', async () => {
  const models = [{
    id: 0, depth: 0, unk: 0, packName: 'P_STG10.BIN',
    vertices: [
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
    ],
    faces: [{
      v1: 0, v2: 1, v3: 2, v4: 3,
      normal: { x: 0, y: 0, z: 1 },
      mat: {
        enabled: false, hasTexture: false, hasColor: true,
        invertX: false, invertY: false, transparent: false,
        textureId: 0, texturePackId: 0, colorData: 0x7fff,
        materialFlags: 0x04, textureFlags: 0, renderFlags: 0,
      },
    }],
  }];

  // Should still return valid GLB even with no enabled faces
  const glb = await buildGlb(models, new Map(), new Map());
  assert.ok(glb instanceof Buffer);
  assert.equal(glb[0], 0x67);
});

test('resolvePackName returns T_COMMON.BIN for packId=0', () => {
  const model = { id: 0, depth: 0, unk: 0, packName: 'P_STG10.BIN' };
  assert.equal(resolvePackName(model, 0), 'T_COMMON.BIN');
});

test('resolvePackName returns matching T_*.BIN for stage pack', () => {
  const model = { id: 0, depth: 0, unk: 0, packName: 'P_STG10.BIN' };
  assert.equal(resolvePackName(model, 1), 'T_STG10.BIN');
});
