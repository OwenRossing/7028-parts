# Thread Transfer — 7028 Parts Tracker UI Themes

## Project
FRC Parts Tracker for team 7028. Next.js 15 App Router, React 19, TypeScript, Prisma + PostgreSQL, Tailwind, TanStack Query v5. Valve/Steam dark industrial aesthetic as the default theme.

## What We're Building
A runtime **theme switcher** with 4 themes applied via a class on `<html>`. Each theme lives in its own git worktree and is being built by an independent agent.

| Theme ID | Theme Name | Owner | Status |
|---|---|---|---|
| `default` | Dark Steel (existing app) | — | Shipped |
| `liquid-glass` | Liquid Glass | Sprint Squad | **DONE** — committed to worktree |
| `cinnamon-bun` | Cinnamon Bun | Byte Me | In progress — still `android17` folder name |
| `industrial-standard` | Industrial Standard | Java the Hut | In progress — still `scada-amber` folder name |

## Agent Team: The Gooner Gang
Team name to use next time: **the-gooner-gang**

Current team registered as `theme-squads`. Three background agents running:

| Agent | Model | Worktree Branch |
|---|---|---|
| `sprint-squad@theme-squads` | Sonnet | `worktree-agent-ae8dc909` |
| `byte-me@theme-squads` | Sonnet | `worktree-agent-a6480444` |
| `java-the-hut@theme-squads` | Haiku 4.5 | `worktree-agent-a30e3cda` |

## Worktree Paths

```
C:\Users\Owen\Repositories\7028-parts\.claude\worktrees\
  agent-ae8dc909\   ← Sprint Squad (Liquid Glass)
  agent-a6480444\   ← Byte Me (Frosted Fantasy)
  agent-a30e3cda\   ← Java the Hut (Industrial Standard)
```

## What Sprint Squad Already Delivered (committed: `03f81c2`)

```
components/theme-switcher/
  theme-context.tsx       ← ThemeContext + ThemeProvider + useTheme()
  theme-switcher.tsx      ← Fixed bottom-right floating pill UI
  index.ts                ← Barrel export

app/theme-provider-wrapper.tsx  ← Client wrapper for layout.tsx
app/liquid-glass.css            ← Full liquid glass CSS
components/themes/liquid-glass/
  login-card.tsx
  part-card.tsx
  sidebar.tsx
  svg-defs.tsx            ← SVG filter defs for glass refraction

LIQUID_GLASS_DESIGN_BRIEF.md
THEME_SWITCHER_INTEGRATION.md
```

Theme type: `"default" | "liquid-glass" | "cinnamon-bun" | "industrial-standard"`
Stored in localStorage key: `"7028-theme"`
Applied as class on `<html>` element.

## What Byte Me Is Working On
- Rename `components/themes/android17/` → `components/themes/cinnamon-bun/`
- Rename/scope CSS under `html.cinnamon-bun { ... }`
- Write `CINNAMON_BUN_DESIGN_BRIEF.md`
- Existing files: `ANDROID17_DESIGN_BRIEF.md`, `FACT_CHECK_REPORT.md`
- Aesthetic: warm cinnamon browns, cream whites, soft amber highlights — bakery-warm dark theme

## What Java the Hut Is Working On
- Rename `components/themes/scada-amber/` → `components/themes/industrial-standard/`
- Scope CSS under `html.industrial-standard { ... }`
- Strip any remaining gimmicks (CRT scanlines/blink were already removed last round)
- Write `INDUSTRIAL_STANDARD_DESIGN_BRIEF.md`, `FACT_CHECK_NOTES.md`
- Key aesthetic: phosphor amber `#f59800` on `#080a08`, zero border-radius, monospace, ISA-101 colors
- Existing files: `SCADA_AMBER_DESIGN_BRIEF.md`, `RESEARCH_BRIEF.md`

## Next Steps After Agents Finish
1. Review each worktree's output
2. Merge all three worktrees into main (or cherry-pick the theme files)
3. Wire `theme-provider-wrapper.tsx` into `app/layout.tsx`
4. Import each theme's CSS in `app/globals.css` (scoped under their html class)
5. Test theme switching end-to-end in browser

## Integration Pattern (from THEME_SWITCHER_INTEGRATION.md)
```tsx
// app/layout.tsx
import ThemeProviderWrapper from "@/app/theme-provider-wrapper";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
      </body>
    </html>
  );
}
```

```css
/* app/globals.css — each theme scoped */
html.liquid-glass { /* imports or inlines liquid-glass.css */ }
html.cinnamon-bun { /* cinnamon bun vars */ }
html.industrial-standard { /* amber industrial vars */ }
```

## Decisions Made
- Chinese thinking language rejected — savings only on prose, not on code. Not worth it.
- Java the Hut on Haiku 4.5 for token savings (simplest/most mechanical task)
- Sprint Squad and Byte Me on Sonnet (more complex implementation)
- Theme switcher UI uses fixed dark surface, not theme-dependent styling, so it works across all themes
