# CREDITS — DARKLINE / 暗線

Per design spec §8, every shipped asset is logged here with its source and licence.

## Sprites (enemy billboards, free segment)

| File (committed) | Source | Processing | Notes |
|---|---|---|---|
| `game/public/darkline/sprites/enemy.png`  | AI-generated original (Google Gemini), prompt by project author | `tools/sprite-pipeline` (flood-fill cutout → despeckle → aspect-fit → DARKLINE palette quantise → 128px) | 1950s noir agent — fedora + trench coat |
| `game/public/darkline/sprites/enemy2.png` | AI-generated original (Google Gemini), prompt by project author | same pipeline | 1950s agent — flat cap + coat |
| `game/public/darkline/sprites/enemy3.png` | AI-generated original (Google Gemini), prompt by project author | same pipeline | armed combatant (rifle) — wired as the first-pass free-segment enemy |

Raw originals (`game/public/m0/*.png`, 4–5 MB each) are **gitignored** — they are not
distributed. Regenerate the committed sprites at any time with:

```
cd tools/sprite-pipeline
node process-sprite.mjs ../../game/public/m0/enemy3.png   # (or enemy.png / enemy2.png)
```

> First-pass (M2 functional) art — style bible / multi-angle sheets / animation are M3.
