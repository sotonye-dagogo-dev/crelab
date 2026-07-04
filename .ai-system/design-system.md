# Design System

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: 2026-07-04
> - staleness-policy: re-verify if UI components or styling dependencies change

> **Overview:** Dark-dominant, video-first design direction. Electric yellow-green accent (#E8FF47) on near-black (#0A0A0A). All tokens defined as CSS custom properties with platform config overridability. The colour, typography, and spacing tables below are the single source of truth for design tokens — components must consume these tokens via Cl* wrappers rather than redeclaring values.

---

## Visual Language

### Colour Palette

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

Note: `--color-accent` must come from platformConfig.primaryColor at runtime (JS sets CSS var on mount). The #E8FF47 value is the hardcoded fallback.

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
