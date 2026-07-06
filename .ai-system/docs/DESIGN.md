# Design System — CreLab

## Overview

CreLab uses a dark-first, cinematic design language with full light theme support.  
All tokens are defined as CSS custom properties in `app/globals.css` and referenced throughout the codebase.

---

## Theme Architecture

| Theme    | Variables prefix     | Default |
|----------|----------------------|---------|
| **Dark** | `--color-*` (native) | Yes     |
| **Light** | `.light` overrides  | Toggle  |

The theme is managed via a React context (`ThemeProvider`) that reads from:
- User preference (localStorage)
- `prefers-color-scheme` media query (system)
- Fallback to dark

A tabbed **ThemeToggler** with `system / light / dark` options is available in the navbar.

---

## Colour Tokens

### Dark Theme (default)
- `--color-bg`: `#0A0A0A`
- `--color-surface`: `#141414`
- `--color-surface-raised`: `#1C1C1C`
- `--color-border`: `#2A2A2A`
- `--color-accent`: `#E8FF47`
- `--color-text-primary`: `#F2F2F2`
- `--color-text-secondary`: `#9A9A9A`

### Light Theme
- `--color-bg`: `#FAFAF9`
- `--color-surface`: `#FFFFFF`
- `--color-surface-raised`: `#F2F2F0`
- `--color-border`: `#E4E4E0`
- `--color-accent`: `#A3B800`
- `--color-text-primary`: `#161615`
- `--color-text-secondary`: `#6B6B68`

---

## Typography

| Role   | Font stack                          |
|--------|-------------------------------------|
| Display | `Syne`, system-ui, sans-serif      |
| Body    | `Inter`, system-ui, sans-serif     |
| Mono    | `JetBrains Mono`, monospace        |

---

## Component Palette

| Component | Variants                          |
|-----------|-----------------------------------|
| Button    | primary, outlined, ghost, accent-outlined |
| Card      | default, interactive              |
| Input     | text, number, color, toggle       |
| Tabs      | tabbed segments (used in theme toggler) |
| Badge     | default, accent, success, error, warning |

---

## Layout

- **Navbar**: Fixed top, contains logo + nav links + theme toggler + auth buttons  
- **Footer**: Contained at bottom, contains links + social + dev credit  
- Both are rendered in `RootLayout` and visible on all pages.

---

## Icons

Use inline SVGs (no icon library). See `components/ui/` for examples.
