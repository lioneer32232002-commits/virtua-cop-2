# CREDITS — DARKLINE / 暗線

Per design spec §8, every shipped asset is logged here with its source and licence.

## Sprites (enemy billboards, free segment)

| File (committed) | Source | Processing | Notes |
|---|---|---|---|
| `game/public/darkline/sprites/enemy.png`  | AI-generated original (Google Gemini), prompt by project author | `tools/sprite-pipeline` (flood-fill cutout → despeckle → aspect-fit → DARKLINE palette quantise → 128px) | 1950s noir agent — fedora + trench coat |
| `game/public/darkline/sprites/enemy2.png` | AI-generated original (Google Gemini), prompt by project author | same pipeline | 1950s agent — flat cap + coat |
| `game/public/darkline/sprites/enemy3.png` | AI-generated original (Google Gemini), prompt by project author | same pipeline | armed combatant (rifle) — M2 placeholder |
| `game/public/darkline/sprites/agent.png` | AI-generated original (Google Gemini), prompt per `docs/DARKLINE-M-E-美術定調-E0.md` §4 | same pipeline (matte source → no clamp/hack needed) | **內勤科 secret-police** (fedora + matte Zhongshan tunic, hidden revolver) — Milestone E1 authored art, wired as the free-segment enemy |

Raw originals (`game/public/m0/*.png`, 4–5 MB each) are **gitignored** — they are not
distributed. Regenerate the committed sprites at any time with:

```
cd tools/sprite-pipeline
node process-sprite.mjs ../../game/public/m0/agent.png   # (or enemy.png / enemy2.png / enemy3.png)
```

> `enemy*.png` are M2 first-pass placeholders. `agent.png` onward = Milestone E authored art
> (E0 定調 → E1 per-faction billboards). Multi-angle sheets / animation are later E phases.

## Fonts (Phase C — UI espionage layer)

| File (committed) | Source | Licence | Processing |
|---|---|---|---|
| `game/public/darkline/fonts/dl-latin.woff2` | [Cutive Mono](https://fonts.google.com/specimen/Cutive+Mono) (google/fonts `ofl/cutivemono`) | SIL OFL 1.1 | `tools/subset-fonts.mjs` → ASCII printable subset, woff2 |
| `game/public/darkline/fonts/dl-cjk.woff2` | [Noto Serif TC](https://fonts.google.com/noto/specimen/Noto+Serif+TC) (google/fonts `ofl/notoseriftc`, variable) | SIL OFL 1.1 | same tool → glyph allow-list subset (locales + UI literals), wght pinned 400, woff2 |

Raw originals live in `game/fonts-src/` (**gitignored**, download URLs in `tools/subset-fonts.mjs`).
Regenerate any time with `cd game && npm run fonts:build`; `dl-cjk.glyphs.json` is the
committed manifest that `tests/darkline/glyphs.test.js` checks new copy against (tofu guard).

## Libraries

| Package | Licence | Use |
|---|---|---|
| `gsap` | Standard "no charge" GreenSock/Webflow licence (GSAP is 100% free incl. plugins since 3.13) | Phase C segment-wipe transitions (self-hosted via npm bundle) |
