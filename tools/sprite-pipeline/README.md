# sprite-pipeline

Build-time tool that turns a raw (Gemini-generated) sprite PNG into a small,
committable DARKLINE billboard sprite. Pure-function core, `node:test` covered.

## Pipeline

```
raw PNG ─▶ flood-fill cutout ─▶ despeckle ─▶ crop to subject ─▶ aspect-fit square ─▶ palette quantise ─▶ small PNG
        (lib/floodfill)     (lib/frame)    (lib/frame)        (lib/frame+resize)   (game palette*)
```

\* Reuses the game's canonical palette so build-time and runtime converge on the
same colours: `quantize` + `DARKLINE_PALETTE` from `game/src/darkline/combat/*`.

## Usage

```
npm install                       # one-time (pngjs)
npm test                          # run the unit tests
node process-sprite.mjs <in.png ...> [--out <dir>] [--size 128] [--tolerance 60] [--margin 8]
```

Default output dir is `game/public/darkline/sprites/` (committed). Raw inputs under
`game/public/m0/` are gitignored. Each output keeps the input's basename.

### Tunables (Phase 3 checkpoint knobs)
- `--tolerance` — flood-fill background colour distance (higher = removes more, risks eating subject edges).
- `--size` — output square px (M2 range 128–160).
- `--margin` — transparent px kept around the subject inside the square.

## IP discipline
Only the processed small PNGs (tens of KB) are committed; raw multi-MB originals stay
out of version control. Log every asset in `/CREDITS.md`.
