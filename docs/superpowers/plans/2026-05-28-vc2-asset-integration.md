# VC2 原始資源整合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 從 PC 版 Virtua Cop 2 的 BIN 檔提取 3D 模型和貼圖，輸出 GLB 後整合進 Three.js 遊戲，取代現有的積木佔位幾何體。

**Architecture:** 獨立的 Node.js CLI 工具讀取 `ppj2dd.exe`（texture metadata）、`P_*.BIN`（模型）、`T_*.BIN` + `L_*.BIN`（貼圖+調色盤），用 `@gltf-transform/core` 組裝 GLB 並輸出到 `game/public/assets/stage1/`。Three.js 遊戲側用 `GLTFLoader` 取代現有的 `BoxGeometry`。

**Tech Stack:** Node.js ESM (.mjs), @gltf-transform/core, pngjs, Three.js GLTFLoader, vitest

---

## 檔案結構

**新建：**
```
tools/extract-stage-assets/
  package.json
  extract.mjs              ← CLI entry（接受 virtuacop2/ 路徑為參數）
  lib/
    model-reader.mjs       ← P_*.BIN → [{vertices, faces, materials}]
    texture-reader.mjs     ← ppj2dd.exe + T_*.BIN + L_*.BIN → RGBA 貼圖
    glb-builder.mjs        ← 組裝 GLB 檔案
  test/
    model-reader.test.mjs
    texture-reader.test.mjs
    glb-builder.test.mjs

game/public/assets/stage1/   ← 輸出目錄（需加進 .gitignore）
```

**修改：**
```
game/src/scene/StageEnvironment.js   ← 換 GLTFLoader
game/src/gameplay/EnemyManager.js    ← 用 GLB clone 代替 BoxGeometry
game/src/main.js                     ← 預載入敵人模型
game/.gitignore                      ← 新增 public/assets/
```

---

## Binary 格式參考（實作時對照）

### P_*.BIN 模型格式
每個模型有 16 bytes header（從 id * 16 讀起）：
```
offset 0:  uint32  verticesOffset   ← 頂點資料的 byte offset
offset 4:  uint32  facesOffset      ← 面資料的 byte offset
offset 8:  uint32  materialsOffset  ← material 資料的 byte offset
offset 12: uint16  verticesCount
offset 14: uint8   facesCount
offset 15: uint8   flags            ← 高4位=depth, 低4位=unk
```
verticesOffset == 0 代表讀完所有模型。

頂點（12 bytes 每個）：`float32 x, float32 y, float32 z`

面（20 bytes 每個）：`uint16 v1, v2, v3, v4, float32 normalX, normalY, normalZ`

Material（10 bytes 每個）：
```
offset 0: uint8 materialFlags  ← bit2=Texture, bit3=Color, bit4=InvertX, bit5=InvertY, bit6=Enabled
offset 1: uint8 textureFlags
offset 2: uint8 textureId
offset 3: uint8 texturePackId
offset 4: (skip)
offset 5: uint8 renderFlags    ← bit0=Transparent
offset 6: uint16 colorData     ← 有貼圖時=paletteId, 無貼圖時=BGR555 色彩
```

### 貼圖格式
**ppj2dd.exe** 在 `toRawAddr(0x00458FD0)` 處有貼圖 metadata table：
```
RDATA_ADDR = 0x0004D400
VDATA_ADDR = 0x0044F000
toRawAddr(vaddr) = vaddr - VDATA_ADDR + RDATA_ADDR

每筆 24 bytes：
offset 0:  uint32  → toRawAddr → ASCII 貼圖檔名（T_STG10.BIN 等，12 bytes）
offset 4:  uint32  → toRawAddr → ASCII 調色盤檔名（L_STG10.BIN 等）
offset 8:  uint32  → toRawAddr → TextureInfo 陣列起點
offset 12: uint8   pageSize
offset 13: uint8   pageOffset（⚠️ 用於貼圖 ID 計算的 n）
offset 16: uint32  → toRawAddr → uint32 texture count
```

**TextureInfo**（16 bytes 每個）：
```
offset 0:  uint16 width
offset 2:  uint16 height
offset 4:  uint32 paletteOffset
offset 12: uint32 flags   ← bit1=Alpha, bit2=UI
```

**L_*.BIN 調色盤**：
```
getPixel(index, paletteOffset):
  byte_offset = paletteOffset * 64 + index * 4
  R = data[byte_offset], G = [+1], B = [+2]
  A = (hasAlpha && index==0) ? data[byte_offset+3] : 0xFF
```

**T_*.BIN 貼圖**：逐個貼圖 width×height 個 bytes，每個 byte 是調色盤索引。

**貼圖 ID 計算**（從 face.material 對應到 TexturePack 裡的 index）：
```javascript
const n = texturePackId - texturePack.pageSize   // texturePack.pageSize 來自 exe metadata
const n2 = n > 0 ? n : n + 1
const i = textureId + (256 * n) - (n2 * texturePack.pageSize)
// 注意：n 用 pageOffset（byte 13），i 的最後乘的才是 pageSize（byte 12）
```

### 座標系與面順序
- Babylon.js 原始程式：`positions = [-v.x, v.y, v.z]`（X 要取負）
- 面索引：
  - `model.depth == 0`：`[0,1,2, 0,2,3]`
  - `model.depth != 0`：`[0,2,1, 0,3,2]`（反向 winding）
- UV（全貼圖，InvertX/Y 翻轉）：
  ```
  // 不翻轉：v1=(0,0), v2=(1,0), v3=(1,1), v4=(0,1)
  // InvertX：u 左右對調
  // InvertY：v 上下對調
  ```

---

## Task 1: 建立 extractor package

**Files:**
- Create: `tools/extract-stage-assets/package.json`
- Create: `tools/extract-stage-assets/lib/model-reader.mjs`（空 placeholder）
- Create: `tools/extract-stage-assets/test/model-reader.test.mjs`（空 placeholder）

- [ ] **Step 1: 建立目錄和 package.json**

```bash
mkdir -p "tools/extract-stage-assets/lib" "tools/extract-stage-assets/test"
```

建立 `tools/extract-stage-assets/package.json`：
```json
{
  "name": "vc2-extractor",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "extract": "node extract.mjs"
  },
  "dependencies": {
    "@gltf-transform/core": "^4.0.0",
    "pngjs": "^7.0.0"
  }
}
```

- [ ] **Step 2: 安裝依賴**

```bash
cd tools/extract-stage-assets && npm install
```

Expected output: `node_modules/` 建立，`package-lock.json` 產生。

- [ ] **Step 3: 新增 .gitignore 排除大型輸出**

在 `game/.gitignore`（若不存在則建立）追加：
```
/public/assets/
```

也在 `tools/extract-stage-assets/.gitignore` 建立：
```
node_modules/
```

- [ ] **Step 4: Commit**

```bash
git add tools/extract-stage-assets/ game/.gitignore
git commit -m "chore: scaffold vc2 extractor package"
```

---

## Task 2: Model Reader

**Files:**
- Create: `tools/extract-stage-assets/lib/model-reader.mjs`
- Create: `tools/extract-stage-assets/test/model-reader.test.mjs`

**說明：** 讀 P_*.BIN，輸出每個模型的 `{ vertices, faces, depth }` 陣列。

- [ ] **Step 1: 寫失敗測試**

建立 `tools/extract-stage-assets/test/model-reader.test.mjs`：
```javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readModels } from '../lib/model-reader.mjs';

// 建立 synthetic P_*.BIN buffer
// 1 個模型：2 頂點、1 面、1 material
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
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
cd tools/extract-stage-assets && node --test test/model-reader.test.mjs
```

Expected: `Error: Cannot find module '../lib/model-reader.mjs'`

- [ ] **Step 3: 實作 model-reader.mjs**

建立 `tools/extract-stage-assets/lib/model-reader.mjs`：
```javascript
const HEADER_BYTES = 16;
const VERTEX_BYTES = 12;
const FACE_BYTES   = 20;
const MAT_BYTES    = 10;

const MAT_FLAG_TEXTURE  = 0x02;
const MAT_FLAG_COLOR    = 0x04;
const MAT_FLAG_INVERT_X = 0x10;
const MAT_FLAG_INVERT_Y = 0x20;
const MAT_FLAG_ENABLED  = 0x40;
const RENDER_FLAG_TRANSPARENT = 0x01;

/**
 * @param {Buffer} binBuffer  raw bytes of a P_*.BIN file
 * @returns {{ id, vertices, faces, depth, unk }[]}
 *   vertices: [{x,y,z}]
 *   faces:    [{v1,v2,v3,v4, normal:{x,y,z}, mat:{...}}]
 */
export function readModels(binBuffer) {
  const buf = binBuffer.buffer.slice(
    binBuffer.byteOffset,
    binBuffer.byteOffset + binBuffer.byteLength
  );
  const view = new DataView(buf);
  const models = [];

  for (let id = 0; ; id++) {
    const headerOff = id * HEADER_BYTES;
    const verticesOffset  = view.getUint32(headerOff,      true);
    if (!verticesOffset) break;                       // sentinel

    const facesOffset     = view.getUint32(headerOff + 4,  true);
    const materialsOffset = view.getUint32(headerOff + 8,  true);
    const verticesCount   = view.getUint16(headerOff + 12, true);
    const facesCount      = view.getUint8 (headerOff + 14);
    const flags           = view.getUint8 (headerOff + 15);
    const depth           = (flags & 0xf0) >> 4;
    const unk             = (flags & 0x0f);

    const vertices = [];
    for (let i = 0; i < verticesCount; i++) {
      const off = verticesOffset + i * VERTEX_BYTES;
      vertices.push({
        x: view.getFloat32(off,     true),
        y: view.getFloat32(off + 4, true),
        z: view.getFloat32(off + 8, true),
      });
    }

    const faces = [];
    for (let i = 0; i < facesCount; i++) {
      const fOff = facesOffset     + i * FACE_BYTES;
      const mOff = materialsOffset + i * MAT_BYTES;

      const mFlags = view.getUint8(mOff);
      faces.push({
        v1: view.getUint16(fOff,      true),
        v2: view.getUint16(fOff +  2, true),
        v3: view.getUint16(fOff +  4, true),
        v4: view.getUint16(fOff +  6, true),
        normal: {
          x: view.getFloat32(fOff +  8, true),
          y: view.getFloat32(fOff + 12, true),
          z: view.getFloat32(fOff + 16, true),
        },
        mat: {
          materialFlags: mFlags,
          textureFlags:  view.getUint8(mOff + 1),
          textureId:     view.getUint8(mOff + 2),
          texturePackId: view.getUint8(mOff + 3),
          renderFlags:   view.getUint8(mOff + 5),
          colorData:     view.getUint16(mOff + 6, true),
          enabled:   Boolean(mFlags & MAT_FLAG_ENABLED),
          hasTexture:Boolean(mFlags & MAT_FLAG_TEXTURE),
          hasColor:  Boolean(mFlags & MAT_FLAG_COLOR),
          invertX:   Boolean(mFlags & MAT_FLAG_INVERT_X),
          invertY:   Boolean(mFlags & MAT_FLAG_INVERT_Y),
          transparent: Boolean(view.getUint8(mOff + 5) & RENDER_FLAG_TRANSPARENT),
        },
      });
    }

    models.push({ id, vertices, faces, depth, unk });
  }

  return models;
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
cd tools/extract-stage-assets && node --test test/model-reader.test.mjs
```

Expected: `▶ readModels parses 1 model ... ok`

- [ ] **Step 5: Commit**

```bash
git add tools/extract-stage-assets/lib/model-reader.mjs \
        tools/extract-stage-assets/test/model-reader.test.mjs
git commit -m "feat(extractor): add model-reader for P_*.BIN parsing"
```

---

## Task 3: Texture Reader

**Files:**
- Create: `tools/extract-stage-assets/lib/texture-reader.mjs`
- Create: `tools/extract-stage-assets/test/texture-reader.test.mjs`

**說明：** 讀 `ppj2dd.exe` 取得 metadata，再讀 T_*.BIN + L_*.BIN 產生每個貼圖的 RGBA pixel 陣列。

- [ ] **Step 1: 寫失敗測試**

建立 `tools/extract-stage-assets/test/texture-reader.test.mjs`：
```javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodePalette, decodeTextures } from '../lib/texture-reader.mjs';

test('decodePalette converts indexed pixels to RGBA', () => {
  // Palette: color 0 = (100,150,200,255), color 1 = (10,20,30,255)
  const palette = Buffer.alloc(256);
  // paletteOffset=0, so we read from byte 0
  palette[0] = 100; palette[1] = 150; palette[2] = 200; palette[3] = 255; // index 0
  palette[4] = 10;  palette[5] = 20;  palette[6] = 30;  palette[7] = 255; // index 1

  // 2 pixels: index 0 and index 1
  const indices = new Uint8Array([0, 1]);
  const rgba = decodePalette(indices, palette, /*paletteOffset=*/0, /*hasAlpha=*/false);

  assert.equal(rgba.length, 8); // 2 pixels * 4 channels
  assert.equal(rgba[0], 100);   // pixel 0 R
  assert.equal(rgba[1], 150);   // pixel 0 G
  assert.equal(rgba[2], 200);   // pixel 0 B
  assert.equal(rgba[3], 255);   // pixel 0 A
  assert.equal(rgba[4], 10);    // pixel 1 R
  assert.equal(rgba[7], 255);   // pixel 1 A
});

test('decodeTextures produces RGBA pixel arrays', () => {
  // 1 texture: 2x2 pixels, paletteOffset=0, no alpha
  // TextureInfo: width=2, height=2, paletteOffset=0, flags=0
  const texInfoBuf = Buffer.alloc(16);
  const texInfoView = new DataView(texInfoBuf.buffer);
  texInfoView.setUint16(0, 2, true);  // width
  texInfoView.setUint16(2, 2, true);  // height
  texInfoView.setUint32(4, 0, true);  // paletteOffset
  texInfoView.setUint32(12, 0, true); // flags (no alpha, no UI)

  // Texture data: 4 pixels (2x2), all index 0
  const texData = Buffer.alloc(4, 0);

  // Palette: color 0 = red (255,0,0,255)
  const palData = Buffer.alloc(256);
  palData[0] = 255; palData[1] = 0; palData[2] = 0; palData[3] = 255;

  const textures = decodeTextures(texData, palData, texInfoBuf, 1);
  assert.equal(textures.length, 1);
  assert.equal(textures[0].width, 2);
  assert.equal(textures[0].height, 2);
  assert.equal(textures[0].pixels[0], 255); // R
  assert.equal(textures[0].pixels[1], 0);   // G
  assert.equal(textures[0].pixels[2], 0);   // B
  assert.equal(textures[0].pixels[3], 255); // A
});
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
cd tools/extract-stage-assets && node --test test/texture-reader.test.mjs
```

Expected: `Error: Cannot find module '../lib/texture-reader.mjs'`

- [ ] **Step 3: 實作 texture-reader.mjs**

建立 `tools/extract-stage-assets/lib/texture-reader.mjs`：
```javascript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RDATA_ADDR     = 0x0004D400;
const VDATA_ADDR     = 0x0044F000;
const TEXTURES_VADDR = 0x00458FD0;
const TEX_ITEM_BYTES = 24;
const TEXINFO_BYTES  = 16;
const PALETTE_PAGE   = 64;

const TEX_FLAG_ALPHA = 0x2;

function toRawAddr(vaddr) {
  return vaddr - VDATA_ADDR + RDATA_ADDR;
}

function readAscii(view, offset, maxLen = 12) {
  let s = '';
  for (let i = 0; i < maxLen; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

/**
 * 將索引像素轉成 RGBA（可直接導出或提供給 decodeTextures）
 * @param {Uint8Array} indices  1 byte per pixel, palette index
 * @param {Buffer}     palBuf   L_*.BIN raw bytes
 * @param {number}     paletteOffset
 * @param {boolean}    hasAlpha
 * @returns {Uint8ClampedArray} RGBA
 */
export function decodePalette(indices, palBuf, paletteOffset, hasAlpha) {
  const pixels = new Uint8ClampedArray(indices.length * 4);
  const base   = paletteOffset * PALETTE_PAGE;
  let   out    = 0;
  for (const index of indices) {
    const pos = base + index * 4;
    pixels[out]   = palBuf[pos];
    pixels[out+1] = palBuf[pos+1];
    pixels[out+2] = palBuf[pos+2];
    pixels[out+3] = (hasAlpha && index === 0) ? palBuf[pos+3] : 0xff;
    out += 4;
  }
  return pixels;
}

/**
 * 從 T_*.BIN、L_*.BIN、TextureInfo metadata 解出所有貼圖
 * @param {Buffer} texBuf   T_*.BIN
 * @param {Buffer} palBuf   L_*.BIN
 * @param {Buffer} metaBuf  TextureInfo 陣列（從 ppj2dd.exe 擷取的 count*16 bytes）
 * @param {number} count
 * @returns {{ id, width, height, pixels: Uint8ClampedArray, hasAlpha }[]}
 */
export function decodeTextures(texBuf, palBuf, metaBuf, count) {
  const metaView = new DataView(
    metaBuf.buffer,
    metaBuf.byteOffset,
    metaBuf.byteLength
  );
  const textures = [];
  let filePos = 0;

  for (let i = 0; i < count; i++) {
    const off    = i * TEXINFO_BYTES;
    const width  = metaView.getUint16(off,     true);
    const height = metaView.getUint16(off + 2, true);
    const palOff = metaView.getUint32(off + 4, true);
    const flags  = metaView.getUint32(off + 12, true);
    const hasAlpha = Boolean(flags & TEX_FLAG_ALPHA);

    const indices = new Uint8Array(texBuf.buffer, texBuf.byteOffset + filePos, width * height);
    const pixels  = decodePalette(indices, palBuf, palOff, hasAlpha);

    textures.push({ id: i, width, height, pixels, hasAlpha });
    filePos += width * height;
  }

  return textures;
}

/**
 * 從 ppj2dd.exe 讀出第 index 筆 texture pack 的 metadata
 * @param {Buffer} exeBuf
 * @param {number} index   0-based
 * @returns {{ fileName, paletteName, count, texInfoBuf, pageSize }}
 */
export function readTexturePackMeta(exeBuf, index) {
  const view = new DataView(exeBuf.buffer, exeBuf.byteOffset, exeBuf.byteLength);
  const base = toRawAddr(TEXTURES_VADDR) + index * TEX_ITEM_BYTES;

  const fileNameAddr    = toRawAddr(view.getUint32(base,      true));
  const palNameAddr     = toRawAddr(view.getUint32(base + 4,  true));
  const texMetaVAddr    = view.getUint32(base + 8,  true);
  const pageSize        = view.getUint8(base + 12);
  const countVAddr      = view.getUint32(base + 16, true);

  const fileName    = readAscii(view, fileNameAddr);
  const paletteName = readAscii(view, palNameAddr);
  const count       = view.getUint32(toRawAddr(countVAddr), true);
  const texMetaOff  = toRawAddr(texMetaVAddr);
  const texInfoBuf  = Buffer.from(
    exeBuf.buffer,
    exeBuf.byteOffset + texMetaOff,
    count * TEXINFO_BYTES
  );

  const pageOffset = view.getUint8(base + 13);
  return { fileName, paletteName, count, texInfoBuf, pageSize, pageOffset };
}

/**
 * 讀出全部 texture packs 的數量（enum TexturePackName 有幾個）
 * 目前 PC 版 = 22 個
 */
export const TEXTURE_PACK_COUNT = 22;
```

- [ ] **Step 4: 跑測試確認通過**

```bash
cd tools/extract-stage-assets && node --test test/texture-reader.test.mjs
```

Expected: 兩個 test 都 `ok`

- [ ] **Step 5: Commit**

```bash
git add tools/extract-stage-assets/lib/texture-reader.mjs \
        tools/extract-stage-assets/test/texture-reader.test.mjs
git commit -m "feat(extractor): add texture-reader for T_*.BIN + L_*.BIN decoding"
```

---

## Task 4: GLB Builder

**Files:**
- Create: `tools/extract-stage-assets/lib/glb-builder.mjs`
- Create: `tools/extract-stage-assets/test/glb-builder.test.mjs`

**說明：** 接收 `readModels()` 和 `decodeTextures()` 的輸出，用 `@gltf-transform/core` 組裝成 GLB Buffer。一個 P_*.BIN 的所有模型都進同一個 GLB，face 依照 `(texturePackId, textureId)` 分組成不同 primitive，共用貼圖 instance。

- [ ] **Step 1: 寫失敗測試**

建立 `tools/extract-stage-assets/test/glb-builder.test.mjs`：
```javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGlb } from '../lib/glb-builder.mjs';

test('buildGlb returns non-empty Buffer with GLB magic', async () => {
  // Minimal: 1 model, 1 face with color (no texture)
  const models = [{
    id: 0,
    depth: 0,
    unk: 0,
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

  // texturePacks: empty map (color-only face)
  const glb = await buildGlb(models, new Map());
  assert.ok(glb instanceof Buffer);
  assert.ok(glb.length > 0);
  // GLB magic bytes: 0x46546C67 = "glTF"
  assert.equal(glb[0], 0x67); // 'g'
  assert.equal(glb[1], 0x6C); // 'l'
  assert.equal(glb[2], 0x54); // 'T'
  assert.equal(glb[3], 0x46); // 'F'
});
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
cd tools/extract-stage-assets && node --test test/glb-builder.test.mjs
```

Expected: `Error: Cannot find module '../lib/glb-builder.mjs'`

- [ ] **Step 3: 實作 glb-builder.mjs**

建立 `tools/extract-stage-assets/lib/glb-builder.mjs`：
```javascript
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
  return new Float32Array([
    left,  top,
    right, top,
    right, bottom,
    left,  bottom,
  ]);
}

function makeIndices(depth) {
  if (depth) {
    return new Uint16Array([0,2,1, 0,3,2]);
  }
  return new Uint16Array([0,1,2, 0,2,3]);
}

function rgbaToPngBuffer(pixels, width, height) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(pixels);
  return PNG.sync.write(png);
}

/**
 * @param {{ id, vertices, faces, depth, unk }[]}  models
 * @param {Map<string, { id, width, height, pixels }[]>} texturePacks
 *   key = TexturePackName (e.g. "T_STG10.BIN"), value = texture array from decodeTextures()
 * @param {Map<string, { pageSize: number }>} packMeta
 *   key = TexturePackName, value = { pageSize }
 * @returns {Promise<Buffer>}
 */
export async function buildGlb(models, texturePacks, packMeta = new Map()) {
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
      const key = face.mat.hasTexture
        ? `tex:${face.mat.texturePackId}:${face.mat.textureId}:${face.mat.invertX}:${face.mat.invertY}`
        : `col:${face.mat.colorData}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(face);
    }

    for (const [groupKey, faces] of groups) {
      const allPos  = [];
      const allIdx  = [];
      let   uvs     = [];
      let   baseVtx = 0;

      for (const face of faces) {
        const vs = [face.v1, face.v2, face.v3, face.v4].map(vi => model.vertices[vi]);
        for (const v of vs) {
          allPos.push(-v.x, v.y, v.z); // X negated (Babylon.js convention)
        }
        const idx = makeIndices(model.depth);
        for (const i of idx) allIdx.push(baseVtx + i);
        const fUvs = makeUvs(face.mat.invertX, face.mat.invertY);
        for (const u of fUvs) uvs.push(u);
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
        const [, packIdStr, texIdStr] = groupKey.split(':');
        // Resolve TexturePackName from packId using first face
        const face      = faces[0];
        const packName  = resolvePackName(model, face.mat.texturePackId);
        const textures  = texturePacks.get(packName);
        const meta      = packMeta.get(packName);

        if (textures && meta) {
          const n  = face.mat.texturePackId - meta.pageOffset; // pageOffset = EXE byte 13
          const n2 = n > 0 ? n : n + 1;
          const i  = face.mat.textureId + 256 * n - n2 * meta.pageSize;
          const docTex = getOrCreateTexture(packName, i, textures);
          if (docTex) {
            mat.setBaseColorTexture(docTex);
            mat.setDoubleSided(true);
          }
        }

        const uvAcc = doc.createAccessor()
          .setArray(new Float32Array(uvs)).setType('VEC2').setBuffer(buf);
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
 * 根據 model 的 parent pack 和 texturePackId 推算 TexturePackName
 * 這個邏輯對應 TypeScript Model.getTexturePack()
 * @param {{ id }} model
 * @param {number} packId
 * @returns {string}  e.g. "T_STG10.BIN"
 */
export function resolvePackName(model, packId) {
  if (packId === 0) return 'T_COMMON.BIN';
  // model.packName 由 CLI 傳入（例如 "P_STG10.BIN"）
  const packName = model.packName ?? '';
  if (packName.startsWith('P_STG') && !packName.endsWith('C.BIN')) {
    if (model.depth || model.unk) {
      // e.g. P_STG10.BIN → T_STG1C.BIN
      return `T_${packName.substring(2, 6)}C.BIN`;
    }
    return `T_${packName.substring(2)}`; // P_STG10.BIN → T_STG10.BIN
  }
  if (packName === 'P_SEL.BIN') return 'T_SELECT.BIN';
  return `T_${packName.substring(2)}`;
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
cd tools/extract-stage-assets && node --test test/glb-builder.test.mjs
```

Expected: `▶ buildGlb returns non-empty Buffer with GLB magic ok`

- [ ] **Step 5: Commit**

```bash
git add tools/extract-stage-assets/lib/glb-builder.mjs \
        tools/extract-stage-assets/test/glb-builder.test.mjs
git commit -m "feat(extractor): add GLB builder using @gltf-transform/core"
```

---

## Task 5: CLI Entry Point + 跑 Stage 1

**Files:**
- Create: `tools/extract-stage-assets/extract.mjs`

**說明：** 組合前三個模組，讀取 `virtuacop2/` 目錄，輸出 Stage 1 的 GLB 到 `game/public/assets/stage1/`。

- [ ] **Step 1: 建立 extract.mjs**

建立 `tools/extract-stage-assets/extract.mjs`：
```javascript
#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readModels }            from './lib/model-reader.mjs';
import { readTexturePackMeta, decodeTextures, TEXTURE_PACK_COUNT } from './lib/texture-reader.mjs';
import { buildGlb }              from './lib/glb-builder.mjs';

const [,, gamePath, outArg] = process.argv;

if (!gamePath) {
  console.error('Usage: node extract.mjs <path/to/virtuacop2> [out_dir]');
  process.exit(1);
}

const gameDir = resolve(gamePath);
const binDir  = join(gameDir, 'BIN');
const outDir  = resolve(outArg ?? './out');
const exePath = join(gameDir, 'ppj2dd.exe');

// Stage 1 BIN files we want
const STAGE1_MODELS = [
  'P_COMMON.BIN',
  'P_STG1C.BIN',
  'P_STG10.BIN',
  'P_STG11.BIN',
  'P_STG12.BIN',
];

async function main() {
  console.log(`Reading EXE: ${exePath}`);
  const exeBuf = readFileSync(exePath);

  // Load all texture packs metadata from EXE
  console.log('Loading texture pack metadata from EXE...');
  const allPackMeta = new Map();
  for (let i = 0; i < TEXTURE_PACK_COUNT; i++) {
    try {
      const meta = readTexturePackMeta(exeBuf, i);
      allPackMeta.set(meta.fileName, meta);
      console.log(`  [${i}] ${meta.fileName} (${meta.count} textures)`);
    } catch (e) {
      console.warn(`  [${i}] failed: ${e.message}`);
    }
  }

  // Load all texture packs data
  console.log('\nLoading texture data...');
  const texturePacks = new Map(); // fileName → decoded textures[]
  for (const [packName, meta] of allPackMeta) {
    try {
      const texBuf = readFileSync(join(binDir, meta.fileName));
      const palBuf = readFileSync(join(binDir, meta.paletteName));
      const textures = decodeTextures(texBuf, palBuf, meta.texInfoBuf, meta.count);
      texturePacks.set(packName, textures);
      console.log(`  ${packName}: ${textures.length} textures decoded`);
    } catch (e) {
      console.warn(`  ${packName}: skipped (${e.message})`);
    }
  }

  // Process each Stage 1 model pack
  mkdirSync(outDir, { recursive: true });

  for (const packFileName of STAGE1_MODELS) {
    const binPath = join(binDir, packFileName);
    console.log(`\nProcessing ${packFileName}...`);
    try {
      const binBuf = readFileSync(binPath);
      const models = readModels(binBuf);
      // Attach packName to each model for texture resolution
      for (const m of models) m.packName = packFileName;
      console.log(`  ${models.length} models parsed`);

      const glb = await buildGlb(models, texturePacks, allPackMeta);
      const outPath = join(outDir, packFileName.replace('.BIN', '.glb'));
      writeFileSync(outPath, glb);
      console.log(`  → ${outPath} (${(glb.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      console.error(e.stack);
    }
  }

  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 跑 Stage 1 提取（需要 virtuacop2/ 目錄在本機）**

```bash
cd tools/extract-stage-assets
node extract.mjs "C:\Users\oneda\OneDrive\02_創作\14_AI TEST\VirtuaCop2\virtuacop2" \
  "../../game/public/assets/stage1"
```

Expected output（類似）：
```
Reading EXE: ...ppj2dd.exe
Loading texture pack metadata from EXE...
  [0] T_COMMON.BIN (N textures)
  [1] T_STG1C.BIN  (N textures)
  ...
Loading texture data...
  T_COMMON.BIN: N textures decoded
  ...
Processing P_COMMON.BIN...
  M models parsed
  → .../game/public/assets/stage1/P_COMMON.glb (XX KB)
Processing P_STG10.BIN...
  M models parsed
  → .../game/public/assets/stage1/P_STG10.glb (XX KB)
...
Done!
```

若有 ERROR，先 check 該 BIN 檔案是否存在。

- [ ] **Step 3: 驗證 GLB 可讀（用 gltf-validator 或 online viewer）**

快速確認方式：用 https://gltf.report/ 上傳其中一個 GLB（例如 P_STG10.glb），確認可以顯示 3D 模型。

- [ ] **Step 4: Commit**

```bash
git add tools/extract-stage-assets/extract.mjs
git commit -m "feat(extractor): CLI entry point, outputs Stage 1 GLBs"
```

---

## Task 6: 更新 StageEnvironment.js

**Files:**
- Modify: `game/src/scene/StageEnvironment.js`
- Test: `game/tests/StageEnvironment.test.js`（若存在則更新，若不存在則跳過——environment 的視覺測試靠手動驗證）

**說明：** 把 `BoxGeometry` 全換成 `GLTFLoader`，非同步載入對應關卡的 GLB 檔案。

- [ ] **Step 1: 確認 Three.js GLTFLoader 的 import 路徑**

Three.js v0.168.0 的 GLTFLoader 在：
```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
```

Vite 可以 resolve 這個路徑，不需額外設定。

- [ ] **Step 2: 改寫 StageEnvironment.js**

取代 `game/src/scene/StageEnvironment.js` 全部內容：
```javascript
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Stage 1 用 P_STG10.glb（主場景），Stage 2 用 P_STG20，Stage 3 用 P_STG30
const STAGE_SCENE_MAP = {
  stage1: 'stage1/P_STG10.glb',
  stage2: 'stage2/P_STG20.glb',
  stage3: 'stage3/P_STG30.glb',
}

const loader = new GLTFLoader()

export class StageEnvironment {
  /** @type {THREE.Object3D|null} */
  root = null
  /** @type {THREE.Scene} */
  scene

  constructor(scene) {
    this.scene = scene
  }

  /**
   * 非同步工廠方法——先 await 這個再繼續
   * @param {THREE.Scene} scene
   * @param {{ type: string }} config   type 和 stageId 任一都行
   * @param {string} stageId            'stage1' | 'stage2' | 'stage3'
   * @returns {Promise<StageEnvironment>}
   */
  static async create(scene, config, stageId = 'stage1') {
    const env = new StageEnvironment(scene)
    const glbPath = `/assets/${STAGE_SCENE_MAP[stageId] ?? STAGE_SCENE_MAP.stage1}`
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(glbPath, resolve, undefined, reject)
      })
      env.root = gltf.scene
      scene.add(env.root)
    } catch (err) {
      console.warn(`StageEnvironment: failed to load ${glbPath}, using fallback`, err)
      env._buildFallback()
    }
    return env
  }

  _buildFallback() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 60),
      new THREE.MeshLambertMaterial({ color: 0x334455 })
    )
    mesh.position.set(0, -0.1, -25)
    this.root = mesh
    this.scene.add(mesh)
  }

  dispose() {
    if (!this.root) return
    this.scene.remove(this.root)
    this.root.traverse(obj => {
      obj.geometry?.dispose()
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose())
      } else {
        obj.material?.dispose()
      }
    })
    this.root = null
  }
}
```

- [ ] **Step 3: 更新 main.js 的 loadStage 呼叫**

`game/src/main.js` 第 74 行原本是：
```javascript
environment = new StageEnvironment(renderer.scene, level.environment)
```

改成：
```javascript
environment = await StageEnvironment.create(renderer.scene, level.environment, stageId)
```

（`loadStage` 已經是 `async function`，所以 `await` 直接可用）

- [ ] **Step 4: 在 game/ 跑 vitest 確認現有測試通過**

```bash
cd game && npm test
```

Expected: 所有現有測試通過（StageEnvironment 相關測試若依賴 BoxGeometry 則需更新，見下 step）

- [ ] **Step 5: 若有 StageEnvironment.test.js 需更新**

如果 `game/tests/StageEnvironment.test.js` 測試了特定幾何體形狀，改成測試：
```javascript
// 驗證 StageEnvironment 可以建立並 dispose 而不出錯
test('StageEnvironment.create returns instance in test env', async () => {
  const scene = new THREE.Scene()
  // 測試環境無法載入 GLB，預期 fallback 被呼叫
  const env = await StageEnvironment.create(scene, { type: 'harbor' }, 'stage1')
  expect(env).toBeDefined()
  env.dispose()
  expect(env.root).toBeNull()
})
```

- [ ] **Step 6: Commit**

```bash
git add game/src/scene/StageEnvironment.js game/src/main.js game/tests/
git commit -m "feat(game): replace StageEnvironment BoxGeometry with GLTFLoader"
```

---

## Task 7: 更新 EnemyManager.js

**Files:**
- Modify: `game/src/gameplay/EnemyManager.js`
- Modify: `game/src/main.js`（傳入預載模型）
- Test: `game/tests/EnemyManager.test.js`

**說明：** 預先載入 `P_COMMON.glb`（含角色模型），spawnWave 時 clone 第 0 個模型作為敵人 mesh。

- [ ] **Step 1: 新增 EnemyModelLoader.js**

建立 `game/src/gameplay/EnemyModelLoader.js`：
```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const loader = new GLTFLoader()

/**
 * 載入 P_COMMON.glb，回傳各 enemy type 對應的 THREE.Object3D
 * 目前全部 type 共用 model index 0
 * @returns {Promise<Map<string, import('three').Object3D>>}
 */
export async function loadEnemyModels(stageId = 'stage1') {
  const glbPath = `/assets/${stageId}/P_COMMON.glb`
  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(glbPath, resolve, undefined, reject)
    })

    // 取第一個 mesh node 作為敵人模板
    const template = gltf.scene.children[0] ?? gltf.scene

    const types = ['grunt', 'gunman', 'heavy', 'boss', 'innocent']
    const map = new Map()
    for (const type of types) {
      map.set(type, template)
    }
    return map
  } catch (err) {
    console.warn(`EnemyModelLoader: failed to load ${glbPath}, enemies will be boxes`, err)
    return new Map() // fallback: EnemyManager 回退到 BoxGeometry
  }
}
```

- [ ] **Step 2: 更新 EnemyManager.js 支援模型 map**

在 `game/src/gameplay/EnemyManager.js` 頂部加 import：
```javascript
import * as THREE from 'three'
import { Enemy, EnemyState } from './Enemy.js'
```
（保持不變）

把 constructor 改成接受 models 參數：
```javascript
constructor(scene, models = new Map()) {
  this.scene = scene
  this.models = models   // Map<type, THREE.Object3D> 預載的模型
  this.onEnemyAttack = null
}
```

把 `spawnWave` 裡建立 mesh 的部分改成：
```javascript
spawnWave(waveData) {
  for (const data of waveData) {
    const emergeTime     = data.type === 'heavy'    ? 1.5 : 0.8
    const attackInterval = data.type === 'innocent' ? 999 : 2.5
    const enemy = new Enemy({ type: data.type, hp: data.hp, emergeTime, attackInterval })
    enemy.onDamageDealt = () => { if (this.onEnemyAttack) this.onEnemyAttack(1) }

    let mesh
    const template = this.models.get(data.type)
    if (template) {
      mesh = template.clone(true)   // deep clone
      const scale = data.type === 'heavy' ? 1.5 : data.type === 'boss' ? 2.5 : 1.0
      mesh.scale.setScalar(scale)
    } else {
      // Fallback: BoxGeometry（測試環境或 GLB 未載入時使用）
      const COLORS = { grunt:0xcc4444, gunman:0x4444cc, heavy:0x888844, boss:0x222222, innocent:0xffccaa }
      const size   = data.type === 'heavy' ? 0.8 : data.type === 'boss' ? 1.5 : 0.5
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size * 2, size),
        new THREE.MeshLambertMaterial({ color: COLORS[data.type] ?? 0xff0000 })
      )
    }

    mesh.position.set(...data.position)
    mesh.userData.enemyRef = enemy
    enemy.mesh = mesh
    this.scene.add(mesh)
    this.enemies.push(enemy)
    enemy.emerge()
  }
}
```

- [ ] **Step 3: 更新 main.js 預載模型**

在 `game/src/main.js` 加 import：
```javascript
import { loadEnemyModels } from './gameplay/EnemyModelLoader.js'
```

把 `EnemyManager` 初始化改為在 `loadStage` 裡預載：
```javascript
// main.js loadStage 函數的開頭加入：
async function loadStage(stageId, difficulty) {
  const level = await LevelLoader.load(stageId)

  if (environment) environment.dispose()
  enemyMgr.clear()
  hideOverlay()

  // 預載模型（Stage 1 先硬寫 stage1，之後可動態用 stageId）
  const enemyModels = await loadEnemyModels(stageId)
  enemyMgr.setModels(enemyModels)       // ← 加這行

  environment = await StageEnvironment.create(renderer.scene, level.environment, stageId)
  // ... 其餘不變
```

並在 `EnemyManager` 加一個 `setModels` 方法：
```javascript
setModels(models) {
  this.models = models
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
cd game && npm test
```

Expected: 全部通過（EnemyManager 的測試不傳 models，走 fallback BoxGeometry）

- [ ] **Step 5: Commit**

```bash
git add game/src/gameplay/EnemyManager.js \
        game/src/gameplay/EnemyModelLoader.js \
        game/src/main.js
git commit -m "feat(game): load enemy meshes from P_COMMON.glb, fallback to BoxGeometry"
```

---

## Task 8: 端對端驗證

**Files:** 無新建，全為手動驗證

- [ ] **Step 1: 確認 game/public/assets/stage1/ 有 GLB 檔案**

```bash
ls game/public/assets/stage1/
# Expected: P_COMMON.glb P_STG10.glb P_STG11.glb P_STG12.glb P_STG1C.glb
```

- [ ] **Step 2: 本地啟動遊戲**

```bash
cd game && npm run dev
```

打開瀏覽器，選 Stage 1，確認：
- [ ] 場景有 3D 模型（不再是純色積木）
- [ ] 敵人有 3D 模型
- [ ] 射擊仍然有效（raycast 命中）
- [ ] dispose 後沒有 console error
- [ ] Stage 2 / Stage 3 仍可正常進入（會顯示 fallback 積木，因為 Stage 2/3 的 GLB 尚未提取）

- [ ] **Step 3: 確認 GLB 未進入 git**

```bash
git status game/public/
# Expected: 看不到 assets/ 目錄（被 .gitignore 排除）
```

- [ ] **Step 4: Commit 最終清理**

```bash
git add .gitignore tools/extract-stage-assets/.gitignore
git commit -m "chore: finalize Stage 1 asset pipeline, exclude GLBs from git"
```

---

## 已知限制 / 後續工作

- **Stage 2/3**：對應 `P_STG20-22.BIN`, `P_STG30-32.BIN`，執行相同 extract CLI 即可
- **敵人模型辨識**：用 TypeScript Explorer 開啟 `P_COMMON.glb` 確認哪個 model index 對應哪個角色類型，再更新 `EnemyModelLoader.js` 的映射
- **場景分段**：目前 Stage 1 只載入第一個場景（P_STG10），可依 CameraRig 進度切換到 P_STG11, P_STG12
- **音效**：WVP 庫切割是獨立任務（待另一個 PR）
