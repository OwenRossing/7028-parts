# Cinnamon Bun — Design Brief

## Concept
Warm bakery dark theme. Espresso backgrounds, cinnamon wood tones, cream text, soft amber highlights. The antithesis of cold-steel industrial — this is the theme you use at 11pm with a warm drink.

## Color Palette

| Role | Token | Hex |
|---|---|---|
| Background | `--cb-bg` | `#1C0A00` |
| Surface | `--cb-surface` | `#2A1200` |
| Raised | `--cb-raised` | `#3A1E08` |
| Border | `--cb-border` | `#5C3317` |
| Primary text | `--cb-ink` | `#FFF8F0` |
| Secondary text | `--cb-ink-dim` | `#C8A882` |
| Accent / highlight | `--cb-amber` | `#D2691E` |
| Accent bright | `--cb-amber-hot` | `#CD853F` |
| Cinnamon mid | `--cb-cinnamon` | `#A0522D` |
| Cinnamon deep | `--cb-cinnamon-dark` | `#8B4513` |

## Typography
- Headings: warm serif (Georgia, `serif`)
- Body / UI: system sans (`-apple-system, BlinkMacSystemFont, sans-serif`)
- Monospace where needed: `'Courier New', monospace`

## Shape & Texture
- Border radius: 8–12px (softer than default, not pill-shaped)
- Subtle inner glow on focused elements using `--cb-amber` at low opacity
- No hard sharp edges — everything slightly rounded

## Aesthetic Rules
- Never use pure white — always warm cream (`#FFF8F0` or warmer)
- No blue tones in UI chrome
- Shadows use warm brown tints, not neutral grey
- Hover states shift toward `--cb-amber-hot`, not lighter versions of the base

## Applied to
- `app/cinnamon-bun.css` — CSS custom properties + `html.cinnamon-bun` scoping
- `components/themes/cinnamon-bun/` — sidebar, part-card, login-card overrides
