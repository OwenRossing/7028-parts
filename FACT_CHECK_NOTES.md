# Fact Check Notes — Industrial Standard Theme

## Animation / Gimmick Removal
- CRT scanline overlay: **removed** in prior pass
- Blinking/flashing text effects: **removed** in prior pass
- Phosphor persistence/afterglow animation: **never added**

## Current State
- All color values are static CSS custom properties — no `@keyframes` in theme CSS
- No `animation:` or `transition:` declarations that simulate CRT behavior
- ISA-101 status colors applied correctly: amber primary, red fault, green safe, cyan info
- Zero border-radius confirmed throughout component files

## Token Naming
- All tokens use `--sa-` prefix (scada-amber legacy naming, kept for backwards compat)
- Theme class selector: `html.industrial-standard`
