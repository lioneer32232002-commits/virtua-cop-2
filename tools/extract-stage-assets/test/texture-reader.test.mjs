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

test('decodePalette applies alpha for index 0 when hasAlpha=true', () => {
  const palette = Buffer.alloc(256);
  palette[0] = 255; palette[1] = 0; palette[2] = 0; palette[3] = 128; // index 0: alpha=128

  const indices = new Uint8Array([0, 1]);
  const rgba = decodePalette(indices, palette, 0, true);

  assert.equal(rgba[3], 128); // pixel 0 A = transparent
  assert.equal(rgba[7], 255); // pixel 1 A = opaque (index != 0)
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

test('decodeTextures handles multiple textures sequentially', () => {
  // 2 textures: 1x1 each
  // TextureInfo: both width=1, height=1, paletteOffset=0, no alpha
  const texInfoBuf = Buffer.alloc(32); // 2 * 16 bytes
  const texInfoView = new DataView(texInfoBuf.buffer);
  // Texture 0
  texInfoView.setUint16(0, 1, true);   // width
  texInfoView.setUint16(2, 1, true);   // height
  texInfoView.setUint32(4, 0, true);   // paletteOffset
  texInfoView.setUint32(12, 0, true);  // flags
  // Texture 1
  texInfoView.setUint16(16, 1, true);  // width
  texInfoView.setUint16(18, 1, true);  // height
  texInfoView.setUint32(20, 0, true);  // paletteOffset
  texInfoView.setUint32(28, 0, true);  // flags

  // Texture data: 2 bytes (1 pixel each)
  const texData = Buffer.from([0, 1]); // tex0=index0, tex1=index1

  // Palette: index 0=red, index 1=blue
  const palData = Buffer.alloc(256);
  palData[0] = 255; palData[1] = 0; palData[2] = 0; palData[3] = 255;   // index 0: red
  palData[4] = 0; palData[5] = 0; palData[6] = 255; palData[7] = 255;   // index 1: blue

  const textures = decodeTextures(texData, palData, texInfoBuf, 2);
  assert.equal(textures.length, 2);
  assert.equal(textures[0].pixels[0], 255); // tex0: red
  assert.equal(textures[0].pixels[2], 0);
  assert.equal(textures[1].pixels[0], 0);   // tex1: blue
  assert.equal(textures[1].pixels[2], 255);
});
