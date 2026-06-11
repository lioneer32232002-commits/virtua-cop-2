#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readModels }            from './lib/model-reader.mjs';
import { readTexturePackMeta, decodeTextures, TEXTURE_PACK_COUNT } from './lib/texture-reader.mjs';
import { buildGlb }              from './lib/glb-builder.mjs';

const [,, gamePath, outArg] = process.argv;

if (!gamePath) {
  console.error('Usage: node extract.mjs <path/to/virtuacop2> [out_base_dir]');
  console.error('  writes <out_base_dir>/stage1/*.glb, stage2/, stage3/');
  process.exit(1);
}

const gameDir = resolve(gamePath);
const binDir  = join(gameDir, 'BIN');
const outBase = resolve(outArg ?? './out');
const exePath = join(gameDir, 'ppj2dd.exe');

// Model packs per stage. P_COMMON (characters) ships with every stage so
// each stage folder is self-contained.
const STAGE_MODELS = {
  stage1: ['P_COMMON.BIN', 'P_STG1C.BIN', 'P_STG10.BIN', 'P_STG11.BIN', 'P_STG12.BIN'],
  stage2: ['P_COMMON.BIN', 'P_STG2C.BIN', 'P_STG20.BIN', 'P_STG21.BIN', 'P_STG22.BIN'],
  stage3: ['P_COMMON.BIN', 'P_STG3C.BIN', 'P_STG30.BIN', 'P_STG31.BIN', 'P_STG32.BIN'],
};

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
      console.log(`  [${i}] ${meta.fileName} (${meta.count} textures, pageSize=${meta.pageSize}, pageOffset=${meta.pageOffset})`);
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

  for (const [stageId, packs] of Object.entries(STAGE_MODELS)) {
    const outDir = join(outBase, stageId);
    mkdirSync(outDir, { recursive: true });

    for (const packFileName of packs) {
      const binPath = join(binDir, packFileName);
      console.log(`\n[${stageId}] Processing ${packFileName}...`);
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
  }

  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
