const RDATA_ADDR     = 0x0004D400;
const VDATA_ADDR     = 0x0044F000;
const TEXTURES_VADDR = 0x00458FD0;
const TEX_ITEM_BYTES = 24;
const TEXINFO_BYTES  = 16;
const PALETTE_PAGE   = 64;   // bytes per palette page

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
 * 將索引像素轉成 RGBA
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
 * @param {Buffer} metaBuf  TextureInfo 陣列（count * 16 bytes）
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
    const width  = metaView.getUint16(off,      true);
    const height = metaView.getUint16(off +  2, true);
    const palOff = metaView.getUint32(off +  4, true);
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
 * @returns {{ fileName, paletteName, count, texInfoBuf, pageSize, pageOffset }}
 */
export function readTexturePackMeta(exeBuf, index) {
  const view = new DataView(exeBuf.buffer, exeBuf.byteOffset, exeBuf.byteLength);
  const base = toRawAddr(TEXTURES_VADDR) + index * TEX_ITEM_BYTES;

  const fileNameVAddr   = view.getUint32(base,      true);
  const palNameVAddr    = view.getUint32(base +  4, true);
  const texMetaVAddr    = view.getUint32(base +  8, true);
  const pageSize        = view.getUint8( base + 12);
  const pageOffset      = view.getUint8( base + 13);
  const countVAddr      = view.getUint32(base + 16, true);

  const fileName    = readAscii(view, toRawAddr(fileNameVAddr));
  const paletteName = readAscii(view, toRawAddr(palNameVAddr));
  const count       = view.getUint32(toRawAddr(countVAddr), true);
  const texMetaOff  = toRawAddr(texMetaVAddr);
  const texInfoBuf  = Buffer.from(
    exeBuf.buffer,
    exeBuf.byteOffset + texMetaOff,
    count * TEXINFO_BYTES
  );

  return { fileName, paletteName, count, texInfoBuf, pageSize, pageOffset };
}

/** PC 版 Virtua Cop 2 的 texture pack 數量（enum TexturePackName 的長度） */
export const TEXTURE_PACK_COUNT = 22;
