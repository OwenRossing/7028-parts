# Theme Switcher Integration Guide

## Overview

The 7028 Parts Tracker supports four visual themes via a runtime theme switcher. The active theme is stored in `localStorage` under the key `7028-theme` and applied as a CSS class on the `<html>` element.

## Supported Themes

| Theme ID | CSS class on `<html>` | Description |
|---|---|---|
| `default` | _(no class)_ | Valve/Steam dark industrial — the original look |
| `liquid-glass` | `html.liquid-glass` | Apple iOS 26 Liquid Glass — light, translucent |
| `android17` | `html.android17` | Material 3 Expressive — frosted glass, dark blue tones |
| `shop-floor` | `html.shop-floor` | Industrial SCADA — phosphor amber on warm black |

## How Theme CSS Works

Each theme defines its styles scoped under its `<html>` class. This means all theme-specific CSS rules use the theme class as a parent selector:

```css
/* Example: liquid-glass overrides */
html.liquid-glass body {
  background: linear-gradient(160deg, #dce8f8, #e8dff5, #fde8d8);
  color: rgba(20, 20, 40, 0.90);
}

html.liquid-glass .some-component {
  /* theme-specific styles */
}
```

When `default` is selected, no class is added to `<html>`, so the base styles in `globals.css` apply as-is.

## Adding a New Theme

1. **Register the theme ID** — Add the new theme string to the `Theme` type in `components/theme-switcher/theme-context.tsx`:
   ```tsx
   export type Theme = "liquid-glass" | "android17" | "shop-floor" | "my-theme" | "default";
   ```

2. **Add the class name to `THEME_CLASSES`** in the same file so it gets toggled on `<html>`:
   ```tsx
   const THEME_CLASSES: Theme[] = ["liquid-glass", "android17", "shop-floor", "my-theme"];
   ```

3. **Add a switcher entry** in `components/theme-switcher/theme-switcher.tsx` in the `THEME_OPTIONS` array:
   ```tsx
   {
     id: "my-theme",
     label: "My Theme",
     swatchColors: ["#111", "#f0f", "#0ff"],
   },
   ```

4. **Create your CSS file** (e.g. `app/my-theme.css`) with all rules scoped under `html.my-theme`.

5. **Import the CSS** in `app/globals.css` (or in `app/layout.tsx`):
   ```css
   @import "./my-theme.css";
   ```

## CSS Structure Convention

Theme CSS files should:

- Scope **all** rules under `html.<theme-id>` so they only apply when active
- Override CSS custom properties (variables) where possible rather than duplicating property declarations
- Provide overrides for the base component classes used in the app (`.glass-panel`, status chips, cards, etc.)
- Be importable as a single file — either eagerly in `globals.css` or lazily via dynamic import

## Architecture

```
components/theme-switcher/
  theme-context.tsx    — React context, provider, useTheme hook
  theme-switcher.tsx   — Floating UI toggle + theme picker panel
  index.ts             — Barrel exports

app/
  theme-provider-wrapper.tsx — Client wrapper (ThemeProvider + ThemeSwitcher)
  layout.tsx                 — Root layout, wraps children with ThemeProviderWrapper
  liquid-glass.css           — Liquid Glass theme styles
  globals.css                — Base styles (default theme)
```

## Persistence

- Key: `localStorage["7028-theme"]`
- Values: `"default"`, `"liquid-glass"`, `"android17"`, `"shop-floor"`
- Applied on mount via `useEffect` in `ThemeProvider`
