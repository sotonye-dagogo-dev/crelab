# Design System

> **Metadata**
> - last-updated-by: pull-template-update (v3 migration)
> - last-verified-against-code: 2026-08-13
> - staleness-policy: re-verify if UI components or styling dependencies change

> **Overview:** Dark-dominant, video-first design direction with a full light theme alternative. Electric yellow-green accent (#E8FF47) on near-black (#0A0A0A) for dark mode, earthier olive accent (#A3B800) on near-white (#FAFAF9) for light mode. Theme switching via tabbed toggler (System/Light/Dark) with localStorage persistence. All tokens defined as CSS custom properties with platform config overridability. The colour, typography, and spacing tables below are the single source of truth for design tokens — components must consume these tokens via Cl* wrappers rather than redeclaring values.

---

## Visual Language

### Theme System

The app supports three theme modes controlled by `ThemeContext`:

| Mode | Behaviour |
|------|-----------|
| **System** | Follows OS `prefers-color-scheme` media query via `matchMedia` listener |
| **Light** | Applies `.light` class to `<html>`, uses light colour tokens |
| **Dark** | Default; uses `:root` colour tokens (no class needed) |

- `ThemeToggler` component: tabbed radiogroup with System / Light / Dark buttons
- Persisted in `localStorage` under key `app-theme`
- `ThemeContext` exposes `{ mode, resolved, setMode }` — `resolved` is the computed "light" or "dark" value

### Dark Palette (`:root` — default)

```css
:root {
  --color-bg:              #0A0A0A;
  --color-surface:         #141414;
  --color-surface-raised:  #1C1C1C;
  --color-border:          #2A2A2A;
  --color-border-mid:      #3D3D3D;
  --color-accent:          #E8FF47;
  --color-accent-dim:      #C8DF3C;
  --color-accent-muted:    #1E2200;
  --color-text-primary:    #F2F2F2;
  --color-text-secondary:  #9A9A9A;
  --color-text-tertiary:   #5C5C5C;
  --color-text-inverse:    #0A0A0A;
  --color-success:         #4ADE80;
  --color-warning:         #FACC15;
  --color-error:           #F87171;
  --color-info:            #60A5FA;
  --color-escrow-held:     #FACC15;
  --color-escrow-progress: #A78BFA;
  --color-escrow-released: #4ADE80;
  --color-escrow-disputed: #F87171;
}
```

| Token | Value | Usage |
|-------|-------|-------|
| primary / accent | #E8FF47 | CTAs, highlights, active states |
| bg | #0A0A0A | Main page background |
| surface | #141414 | Cards, panels, modals |
| surface-raised | #1C1C1C | Elevated cards, hover states |
| border | #2A2A2A | Subtle dividers |
| text-primary | #F2F2F2 | Headings, primary content |
| text-secondary | #9A9A9A | Body copy, labels |
| text-tertiary | #5C5C5C | Placeholders, disabled |
| success | #4ADE80 | Released, verified |
| warning | #FACC15 | Pending, in progress |
| error | #F87171 | Dispute, error |
| info | #60A5FA | Informational |

### Light Palette (`.light` class)

```css
.light {
  --color-bg:              #FAFAF9;
  --color-surface:         #FFFFFF;
  --color-surface-raised:  #F2F2F0;
  --color-border:          #E4E4E0;
  --color-border-mid:      #D4D4D0;
  --color-accent:          #A3B800;
  --color-accent-dim:      #8FA000;
  --color-accent-muted:    #F0F4D0;
  --color-text-primary:    #161615;
  --color-text-secondary:  #6B6B68;
  --color-text-tertiary:   #9C9C98;
  --color-text-inverse:    #FAFAF9;
  --color-success:         #16A34A;
  --color-warning:         #CA8A04;
  --color-error:           #DC2626;
  --color-info:            #2563EB;
  --color-escrow-held:     #CA8A04;
  --color-escrow-progress: #7C3AED;
  --color-escrow-released: #16A34A;
  --color-escrow-disputed: #DC2626;
}
```

| Token | Value | Usage |
|-------|-------|-------|
| primary / accent | #A3B800 | CTAs, highlights, active states |
| bg | #FAFAF9 | Main page background |
| surface | #FFFFFF | Cards, panels, modals |
| surface-raised | #F2F2F0 | Elevated cards, hover states |
| border | #E4E4E0 | Subtle dividers |
| text-primary | #161615 | Headings, primary content |
| text-secondary | #6B6B68 | Body copy, labels |
| text-tertiary | #9C9C98 | Placeholders, disabled |
| success | #16A34A | Released, verified |
| warning | #CA8A04 | Pending, in progress |
| error | #DC2626 | Dispute, error |
| info | #2563EB | Informational |

Note: `--color-accent` must come from platformConfig.primaryColor at runtime (JS sets CSS var on mount). The #E8FF47 / #A3B800 values are the hardcoded fallbacks.

### Logos & Branding

Brand assets are config-driven via `platformConfig`:

| Asset | Config Key | Default Path | Usage |
|-------|-----------|-------------|-------|
| Full Logo | `logoPath` | `/primary-logo.png` | Desktop navbar, hero/landing page, footer |
| Icon | `iconPath` | `/icon.png` | Mobile navbar, auth pages (login/register/forgot-password), admin sidebar, favicon |

**Logo placement rules:**
- **full logo** (`logoPath`): expanded desktop navbars, hero sections, landing pages, footer — anywhere there's horizontal space
- **icon** (`iconPath`): collapsed/mobile navbars, auth modals, admin sidebar, favicon/Apple touch icon — anywhere the layout is compact

Both paths are configured in `config/platform.config.ts` as `logoPath` and `iconPath`. Changing brand assets requires only updating the config and placing new files in `public/`.

### Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| Display (headings, names, titles) | Syne (geometric, editorial) | var(--text-2xl) to var(--text-5xl) | 700-800 |
| Body (copy, labels, descriptions) | Inter (neutral, readable) | var(--text-base) | 400-500 |
| Mono (prices, IDs, escrow states, stats) | JetBrains Mono | var(--text-sm) to var(--text-lg) | 400 |

Size scale: 0.75rem / 0.875rem / 1rem / 1.125rem / 1.25rem / 1.5rem / 1.875rem / 2.25rem / 3rem

### Spacing Scale

4px base unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 (--space-1 through --space-20)

### Radii

| Token | Value |
|-------|-------|
| radius-sm | 4px |
| radius-md | 8px |
| radius-lg | 12px |
| radius-xl | 16px |
| radius-2xl | 24px |
| radius-full | 9999px |

### Motion

```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-fast:   150ms;
--duration-base:   250ms;
--duration-slow:   400ms;
--duration-slower: 600ms;
```

---

## Component Patterns

### Navigation
- Minimal floating bar, dark glass effect (rgba(10,10,10,0.85), backdrop-filter: blur(12px))
- Logo: platform name in Syne ExtraBold from platformConfig.name
- Links: Explore, For Creators, Blog
- CTAs: "Get Hired" (providers) + "Find Talent" (clients)
- Mobile: hamburger -> full-screen overlay

### ExploreVideoCard (most important component)
- Aspect ratio 4:5 (portrait)
- Thumbnail -> autoplay muted looped video on 50% viewport entry (IntersectionObserver)
- Smooth fade thumbnail -> video (300ms)
- Overlay: gradient bottom, provider name (Syne), category badge (accent), star rating, price-from (JetBrains Mono, accent)
- Hover: scale 1.02, accent border glow, "View Profile" CTA
- prefers-reduced-motion: static thumbnail always

### Buttons
- Primary: accent bg (#E8FF47), dark text, bold
- Secondary: transparent, border, text-primary
- Destructive: error bg (#F87171)
- Disabled: reduced opacity, no pointer events, text-tertiary

### Forms
- Input fields: dark surface bg, border, focus accent ring
- Error messages: below field, error colour, small text
- Validation on blur and submit

### Cards / Containers
- bg: var(--color-surface), border: var(--color-border)
- border-radius: var(--radius-lg) (12px)
- padding: var(--space-4) (16px)

### Modals / Dialogs
- Dark overlay with backdrop blur
- Scale 0.95 -> 1 + fade in (200ms)
- Sheet/drawer: slide from bottom (mobile, 90vh) or right (desktop, 480px), spring easing

### Escrow Timeline
- Visual state machine: HELD -> IN_PROGRESS -> RELEASE IN Nd -> RELEASED
- Nodes: empty circle (future), pulsing accent dot (current), green checkmark (done), red exclamation (disputed)
- Live countdown when IN_PROGRESS: "Auto-releases in X days Y hours"

---

## UX Principles

1. Video is always the first thing the user sees (Explore feed, profile hero)
2. Always show loading state for async actions (auth, booking, payment)
3. Destructive actions require confirmation dialog
4. Error messages must explain what the user can do
5. Auth gates are modals, not page redirects (preserves context)
6. Closing mid-flow shows confirmation dialog

---

## Responsive Breakpoints

| Breakpoint | Value | Target |
|------------|-------|--------|
| sm | 640px | Mobile — 2-col grid, sticky bottom CTA, full-screen sheets |
| md | 768px | Tablet — 3-col grid, side-by-side packages |
| lg | 1024px | Desktop — 4-5 col grid, full nav, sidebar booking widget |
| xl | 1280px | Wide screens |

Design is mobile-first. Primary use case: brand marketing manager browsing on phone.

---

## Accessibility Requirements

- All interactive elements must have keyboard focus states (2px accent outline)
- Colour contrast must meet WCAG AA (4.5:1 for text). Accent #E8FF47 on #0A0A0A: ~13:1
- Images must have alt text
- Forms must have associated labels
- Video cards: aria-label includes provider name and category
- Booking flow: full keyboard navigation, no mouse-only interactions
- prefers-reduced-motion: all animations and video autoplay respect this

---

## Config-Driven Design Notes

The following visual properties must always come from platformConfig — never hardcoded:
- --color-accent -> platformConfig.primaryColor
- Platform name in nav, page titles, trust messages -> platformConfig.name
- Platform tagline in hero -> platformConfig.tagline
- Fee percentage display -> platformConfig.feeRate
- Category labels -> platformConfig.categories
- Feature visibility (Drive sync, blog) -> platformConfig.features

A name or colour change requires only an admin panel update. Zero component changes.

---

## Reference Library

External design languages — competitor, inspiration, or reference sites — pulled into `design-references/<name>/DESIGN.md` (Tier 4, read when explicitly relevant). The `generate-design-md` command creates them.

These are **inputs to be reconciled**, never the project's source of truth. The token tables in this file remain the single source of truth per engineering principles §5. Promotion from a reference into the project's real tokens is a human decision, not an agent write.

See `design-references/README.md` for the folder contract.

---

## Design Asset Viewer (dev-only entry point)

A human-facing route to browse design assets — HTML mocks, images, PDFs — without those assets touching the app's real route table when deployed. This is a dev tool, not an agent workflow, and it is itself governed by the engineering principles like any other page.

**Hard rules (not conventions):**
- Mounted at a distinct, configurable base path (e.g. `/__design/*`) on its own router/middleware branch — never nested under app routes.
- **Gated:** only mountable when the env flag is set (e.g. `ENABLE_DESIGN_VIEWER=true`), defaulting off. **Never enabled in a production build regardless of the flag** — this is a hard rule, not a convention.
- Reads a config manifest (engineering principles §1) listing which local folders/paths it is allowed to serve — never an open filesystem browser.
- No hardcoded asset lists in code.

**Rendering by type:**
- HTML → sandboxed iframe
- Images → `<img>`
- PDF → render pages; where text/structure extraction is needed, use the classify-then-extract approach from the `pdf-html-asset-inspection` skill (detect text vs scanned, extract with position awareness, convert to Markdown) via a small internal utility or thin wrapper.

**Extraction backend decision:** chooses between the two registered extraction candidates (see `tools/registry.md` → PDF-extraction-tooling rows; approach documented in `tools/integrations/`) based on the project stack; the choice is documented in `memory/project-decisions.md`.

**Where it lives:** see also the `system-architecture.md` configuration points template (the `ENABLE_DESIGN_VIEWER` flag) and the viewer's security isolation note for the deployment platform.
