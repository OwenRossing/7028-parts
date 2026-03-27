# Industrial Standard — Design Brief

## Concept
ISA-101 process control aesthetic. Phosphor amber terminal on near-black. Zero ornamentation. Dense, information-first layout. Built for a shop floor monitor, not a consumer app.

## Color Palette

| Role | Token | Hex |
|---|---|---|
| Background | `--sa-black` | `#080a08` |
| Panel | `--sa-panel` | `#111410` |
| Surface raised | `--sa-raised` | `#181c16` |
| Border | `--sa-border` | `#2a3024` |
| Primary amber | `--sa-amber-400` | `#f59800` |
| Bright amber | `--sa-amber-300` | `#ffb833` |
| Dim amber | `--sa-amber-700` | `#7a4400` |
| Alert red | `--sa-red` | `#cc2200` |
| OK green | `--sa-green` | `#00aa44` |
| Info cyan | `--sa-cyan` | `#00aacc` |

ISA-101 status color conventions strictly followed: amber = normal/active, red = fault/alarm, green = OK/safe, cyan = informational.

## Typography
- All text: `'Courier New', Courier, monospace`
- Tabular numerals everywhere: `font-variant-numeric: tabular-nums`
- No variable-width fonts in any UI element

## Shape
- Border radius: **0px** everywhere — zero exceptions
- Hard borders only, no box shadows
- Dense grid layout — minimal padding

## Aesthetic Rules
- No gradients, no blur effects, no animations
- Status colors are ISA-compliant — do not repurpose them for decoration
- All interactive states use amber brightness shifts only (dim ↔ bright)
- Disabled states use `--sa-amber-700` (dim), never grey

## Applied to
- `app/industrial-standard.css` — CSS custom properties + `html.industrial-standard` scoping
- `components/themes/industrial-standard/` — sidebar, part-card, login-card overrides
