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
