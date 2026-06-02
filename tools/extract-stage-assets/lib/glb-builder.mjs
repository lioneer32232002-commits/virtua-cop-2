import { Document, NodeIO } from '@gltf-transform/core';
import { PNG } from 'pngjs';

// BGR555 to [r,g,b] 0-255
function bgr555ToRgb(v) {
  const b = ((v >> 10) & 0x1f) * 8;
  const g = ((v >>  5) & 0x1f) * 8;
  const r = ( v        & 0x1f) * 8;
  return [r, g, b];
}

function makeUvs(invertX, invertY) {
  let left = 0, right = 1, top = 0, bottom = 1;
  if (invertX) { [left, right] = [right, left]; }
  if (invertY) { [top, bottom] = [bottom, top]; }
  // quad verts: v1=top-left, v2=top-right, v3=bot-right, v4=bot-left
  return [
    left,  top,
    right, top,
    right, bottom,
    left,  bottom,
  ];
}

function makeIndices(depth) {
  if (depth) {
    return [0,2,1, 0,3,2];
  }
  return [0,1,2, 0,2,3];
}

function rgbaToPngBuffer(pixels, width, height) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(pixels);
  return PNG.sync.write(png);
}

/**
 * @param {{ id, vertices, faces, depth, unk, packName }[]}  models
 * @param {Map<string, { id, width, height, pixels }[]>} texturePacks
 *   key = TexturePackName (e.g. "T_STG10.BIN"), value = texture array from decodeTextures()
 * @param {Map<string, { pageSize: number, pageOffset: number }>} packMeta
 *   key = TexturePackName, value = { pageSize, pageOffset }
 * @returns {Promise<Buffer>}
 */
export async function buildGlb(models, texturePacks, packMeta) {
  const doc    = new Document();
  const buf    = doc.createBuffer();
  const scene  = doc.createScene('Scene');
  const io     = new NodeIO();

  // Cache textures already added to the doc to avoid duplicates
  const texCache = new Map(); // key: "packName/texId" → doc texture

  function getOrCreateTexture(packName, texIdx, textures) {
    const key = `${packName}/${texIdx}`;
    if (texCache.has(key)) return texCache.get(key);

    const t = textures[texIdx];
    if (!t) return null;

    const pngBuf = rgbaToPngBuffer(t.pixels, t.width, t.height);
    const docTex = doc.createTexture(key).setImage(pngBuf).setMimeType('image/png');
    texCache.set(key, docTex);
    return docTex;
  }

  for (const model of models) {
    const meshNode = doc.createNode(`model_${model.id}`);
    scene.addChild(meshNode);
    const mesh = doc.createMesh(`mesh_${model.id}`);
    meshNode.setMesh(mesh);

    // Group enabled faces by material key
    const groups = new Map(); // key → face[]
    for (const face of model.faces) {
      if (!face.mat.enabled) continue;
      const transparentSuffix = face.mat.transparent ? ':t' : ':o';
      const key = face.mat.hasTexture
        ? `tex:${face.mat.texturePackId}:${face.mat.textureId}:${face.mat.invertX}:${face.mat.invertY}${transparentSuffix}`
        : `col:${face.mat.colorData}${transparentSuffix}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(face);
    }

    for (const [groupKey, faces] of groups) {
      const allPos  = [];
      const allIdx  = [];
      const allUvs  = [];
      let   baseVtx = 0;

      for (const face of faces) {
        const vs = [face.v1, face.v2, face.v3, face.v4].map(vi => model.vertices[vi]);
        for (const v of vs) {
          allPos.push(-v.x, v.y, v.z); // X negated (Babylon.js convention)
        }
        const idx = makeIndices(model.depth);
        for (const i of idx) allIdx.push(baseVtx + i);
        const fUvs = makeUvs(face.mat.invertX, face.mat.invertY);
        for (const u of fUvs) allUvs.push(u);
        baseVtx += 4;
      }

      const prim = doc.createPrimitive();

      const posAcc = doc.createAccessor()
        .setArray(new Float32Array(allPos)).setType('VEC3').setBuffer(buf);
      prim.setAttribute('POSITION', posAcc);

      const idxAcc = doc.createAccessor()
        .setArray(new Uint16Array(allIdx)).setType('SCALAR').setBuffer(buf);
      prim.setIndices(idxAcc);

      const mat = doc.createMaterial(`mat_${groupKey}`);

      if (groupKey.startsWith('tex:')) {
        const face      = faces[0];
        const packName  = resolvePackName(model, face.mat.texturePackId);
        const textures  = texturePacks.get(packName);
        const meta      = packMeta.get(packName);

        if (textures && meta) {
          const n  = face.mat.texturePackId - meta.pageOffset;
          const n2 = n > 0 ? n : n + 1;
          const i  = face.mat.textureId + 256 * n - n2 * meta.pageSize;
          const docTex = getOrCreateTexture(packName, i, textures);
          if (docTex) {
            mat.setBaseColorTexture(docTex);
            mat.setDoubleSided(true);
          }
        }

        const uvAcc = doc.createAccessor()
          .setArray(new Float32Array(allUvs)).setType('VEC2').setBuffer(buf);
        prim.setAttribute('TEXCOORD_0', uvAcc);
      } else {
        const [r, g, b] = bgr555ToRgb(faces[0].mat.colorData);
        mat.setBaseColorFactor([r/255, g/255, b/255, 1]);
        mat.setDoubleSided(true);
      }

      if (faces[0].mat.transparent) mat.setAlphaMode('BLEND');
      prim.setMaterial(mat);
      mesh.addPrimitive(prim);
    }
  }

  const glb = await io.writeBinary(doc);
  return Buffer.from(glb);
}

/**
 * 根據 model.packName 和 texturePackId 推算 TexturePackName
 * @param {{ packName?: string, depth: number, unk: number }} model
 * @param {number} packId
 * @returns {string}  e.g. "T_STG10.BIN"
 */
export function resolvePackName(model, packId) {
  if (packId === 0) return 'T_COMMON.BIN';
  const packName = model.packName ?? '';
  // P_STG10.BIN → T_STG10.BIN
  return `T_${packName.slice(2)}`;
}
