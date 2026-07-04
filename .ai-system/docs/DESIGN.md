# Crelab — DESIGN.md
**Version:** 1.1  
**Pipeline Stage:** PRD -> ROADMAP -> DESIGN -> PROMPTS -> Open Design -> Open Code  
**Design Direction:** Dark-dominant · Video-first · Creative-industry confidence  
**Reference:** Instagram Explore · Fiverr profile depth · Upwork trust signals · Dating-app first impression  

---

## Design Philosophy

Crelab is a platform for creative professionals. The design must feel like it was made by someone who understands creative work — not a generic SaaS tool retrofitted for a marketplace. Every screen should feel like a stage, not a spreadsheet.

One-sentence brief: A dark, cinematic marketplace where video is the first thing you see and quality speaks louder than follower count.

The signature element: Video is everywhere and it moves. The Explore feed is a living reel — cards autoplay as you scroll, the hero of every provider profile is a full-bleed video, and the whole platform feels like browsing a creative portfolio, not filling out a form.

---

## Design Token System

All tokens defined as CSS custom properties on :root. Overridable by platform config — the admin panel can update primaryColor and the entire accent colour system cascades automatically. These are the hardcoded fallbacks for Crelab.

### Colour Palette

```css
:root {
  /* Base */
  --color-bg:              #0A0A0A;   /* Near-black — main background */
  --color-surface:         #141414;   /* Cards, panels, modals */
  --color-surface-raised:  #1C1C1C;   /* Elevated cards, hover states */
  --color-border:          #2A2A2A;   /* Subtle dividers */
  --color-border-mid:      #3D3D3D;   /* Medium-emphasis borders */

  /* Brand — overridable from platformConfig.primaryColor */
  --color-accent:          #E8FF47;   /* Electric yellow-green — primary CTA, highlights */
  --color-accent-dim:      #C8DF3C;   /* Pressed/hover state */
  --color-accent-muted:    #1E2200;   /* Accent-tinted bg (badges, tags) */

  /* Text */
  --color-text-primary:    #F2F2F2;   /* Headings, primary content */
  --color-text-secondary:  #9A9A9A;   /* Body copy, labels */
  --color-text-tertiary:   #5C5C5C;   /* Placeholders, disabled */
  --color-text-inverse:    #0A0A0A;   /* Text on accent buttons */

  /* Semantic */
  --color-success:         #4ADE80;   /* Released, verified, approved */
  --color-warning:         #FACC15;   /* Pending, in progress */
  --color-error:           #F87171;   /* Dispute, error */
  --color-info:            #60A5FA;   /* Informational */

  /* Escrow states */
  --color-escrow-held:     #FACC15;
  --color-escrow-progress: #A78BFA;   /* Purple — active/in-progress */
  --color-escrow-released: #4ADE80;
  --color-escrow-disputed: #F87171;
}
```

Palette rationale: The near-black base is the creative industry's natural habitat — cinema, photography, and design all live in dark environments. The electric yellow-green (#E8FF47) is the only bold colour in the system. It does not appear on Nigerian competitors or generic marketplaces. It reads confident, modern, and creative. It is used with discipline: CTAs, badges, active states only.

### Typography

```css
:root {
  /* Display — Syne (geometric, editorial) */
  --font-display: 'Syne', system-ui, sans-serif;
  /* Body — Inter (neutral, readable) */
  --font-body:    'Inter', system-ui, sans-serif;
  /* Data — JetBrains Mono (prices, IDs, counts, escrow states) */
  --font-mono:    'JetBrains Mono', monospace;

  /* Scale */
  --text-xs:   0.75rem;    /* 12px */
  --text-sm:   0.875rem;   /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg:   1.125rem;   /* 18px */
  --text-xl:   1.25rem;    /* 20px */
  --text-2xl:  1.5rem;     /* 24px */
  --text-3xl:  1.875rem;   /* 30px */
  --text-4xl:  2.25rem;    /* 36px */
  --text-5xl:  3rem;       /* 48px */

  /* Weight */
  --weight-regular:   400;
  --weight-medium:    500;
  --weight-semibold:  600;
  --weight-bold:      700;
  --weight-extrabold: 800;

  /* Leading */
  --leading-tight:   1.2;
  --leading-normal:  1.5;
  --leading-relaxed: 1.7;
}
```

Type rationale: Syne is used for everything a reader sees first — headings, provider names, package titles. It has an editorial, poster-like quality that signals creative industry without cosplaying at luxury. Inter handles all body copy. JetBrains Mono appears only for prices, booking IDs, escrow states, and stats — giving numbers precision and credibility.

### Spacing, Radii, Layout

```css
:root {
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */

  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  24px;
  --radius-full: 9999px;

  --max-width-content: 1200px;
  --max-width-narrow:  720px;
  --sidebar-width:     320px;
  --nav-height:        64px;
}
```

### Motion

```css
:root {
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  --duration-fast:   150ms;
  --duration-base:   250ms;
  --duration-slow:   400ms;
  --duration-slower: 600ms;
}
```

---

## Component Design Specs

### Navigation
Minimal floating bar. Dark glass effect (background: rgba(10,10,10,0.85); backdrop-filter: blur(12px)). Full-width. Logo left, primary links centre (desktop), CTA right.

Logo: Platform name in Syne ExtraBold. Preceded by a small accent geometric mark. Platform name sourced from platformConfig.name — never hardcoded.

Links: Explore · For Creators · Blog  
CTAs: "Get Hired" (providers) + "Find Talent" (clients)  
Mobile: Hamburger → full-screen overlay, dark background.

### ExploreVideoCard
The most important component — the entire first impression.

```
Aspect ratio: 4:5 (portrait, Instagram grid proportions)

┌─────────────────────────────┐
│                             │
│     VIDEO / THUMBNAIL       │  Autoplay on viewport entry, muted, looped
│     (full card fill)        │  Smooth fade thumbnail → video (300ms)
│                             │
│  ┌──────────────────────┐   │
│  │ [badge] Content      │   │  Category badge: accent bg, dark text
│  │                      │   │
│  │ Adunola O.       ★4.9│   │  Name (Syne medium) + star (mono)
│  │ From ₦45,000         │   │  Price in JetBrains Mono, accent colour
│  └──────────────────────┘   │  Gradient overlay: transparent → 60% black
└─────────────────────────────┘

Hover / focus:
- Scale: 1.02 (subtle lift)
- Accent border glow (box-shadow: 0 0 0 1px var(--color-accent), 0 0 16px rgba(accent, 0.2))
- "View Profile" CTA button appears (accent bg, full width)
```

Grid: Masonry (CSS columns). 2-col mobile, 3-col tablet, 4-5-col desktop. var(--space-2) gap.

### Provider Profile Page
Single column (max 840px). No sidebar on mobile.

Hero section:
```
┌──────────────────────────────────────────────────────────┐
│              COVER VIDEO (16:9, full width)              │
│              Provider's best reel / showreel             │
├──────────────────────────────────────────────────────────┤
│  [Avatar 72px]  Adunola Okonkwo           [Available Now]│
│  Content Creator · Lagos · 3 years · ★4.9 (24 reviews)  │
│                                                          │
│  "I make brand content that actually gets watched."      │
│                                                          │
│  [Book This Creator →]   [View Packages ↓]              │
└──────────────────────────────────────────────────────────┘
```

Service packages (3 cards):
```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  BASIC           │ │  STANDARD        │ │  PREMIUM         │
│                  │ │  ⭐ Most Popular  │ │                  │
│  ₦45,000         │ │  ₦85,000         │ │  ₦150,000        │
│  • 1 video       │ │  • 3 videos      │ │  • 5 videos      │
│  • Basic edit    │ │  • Full edit     │ │  • Full edit     │
│  • 7 days        │ │  • Captions      │ │  • 2 revisions   │
│  [Book Basic]    │ │  • 5 days        │ │  • 3 days        │
└──────────────────┘ │  [Book Standard] │ │  [Book Premium]  │
                     └──────────────────┘ └──────────────────┘
```
Prices in JetBrains Mono. Standard highlighted with accent border.

Mobile: Sticky bottom bar "Book [Name]" (accent, full width).  
Desktop: Sticky right sidebar (320px) with booking CTA + package selector.

### Booking Flow (3-Step Drawer / Sheet)
Mobile: slides up from bottom (90vh, spring easing, overscroll to dismiss).  
Desktop: right-side sheet (480px wide).

```
Step 1 — Review & Confirm
  Package: Standard
  Service date: [date picker]
  Scope notes: [textarea]
  ─────────────────────────
  Subtotal:       ₦85,000
  Platform fee:    ₦4,250  (5% — sourced from platformConfig.feeRate)
  ─────────────────────────
  Total:          ₦89,250  (JetBrains Mono)
  
  [How does escrow work? ▾] (collapsible accordion)
  [Proceed to Payment →]

Step 2 — Payment
  Paystack inline checkout (card data never touches Crelab servers)
  Trust message: "Funds held securely. [Provider] won't receive payment until you confirm delivery."
  Platform name in trust message from config — not hardcoded.

Step 3 — Confirmation
  Accent checkmark (Framer Motion spring, scale 0→1)
  Booking ID in JetBrains Mono
  "What happens next" timeline: Provider notified / Service delivered / You confirm / Payment released
  Each step fades in sequentially (stagger 100ms)
  [View Booking →]
```

Closing mid-flow: confirmation dialog before dismiss.

### Escrow Status Timeline
```
●──────────────●──────────────●──────────────●
HELD           IN PROGRESS   RELEASE IN 3d   RELEASED
(₦89,250)      Aug 12        Aug 17          ✓

Node states:
- Future:  empty circle, --color-border
- Current: pulsing accent dot (CSS animation)
- Done:    green checkmark circle
- DISPUTED: red exclamation circle
```

Client CTAs below timeline: "Confirm Completion" (early release) + "Raise Dispute" (opens modal, only within window).

Provider view: same timeline read-only. Shows "You'll receive ₦X,XXX on release" (net of fee, JetBrains Mono).

### Auth Gate Modal
Triggered when a guest attempts to book or message. Not a page redirect — a modal overlay.

```
┌────────────────────────────────────────────┐
│                                            │
│   To book [provider name], create a free   │
│   [platformConfig.name] account            │
│                                            │
│   [Sign up with Email]                     │
│   [Sign up with Phone]                     │
│                                            │
│   Already have an account? Sign in         │
└────────────────────────────────────────────┘
```

Stores pending action in sessionStorage. After auth, executes stored action — user is not dropped at a generic dashboard.

### Blog Post Layout
Max content width 720px, centred. Dark background continues.

- Hero image (full-width if present)
- Metadata: author, date, read time, tags
- Body: Inter 18px, --leading-relaxed
- Headers: Syne Bold
- Creator spotlight embed: mini provider card (avatar, name, category, star rating, "View Profile" CTA)
- Related posts: 3 cards at bottom
- End-of-post CTA: "Looking for a creator? Browse [platformConfig.name] →"

### Admin Panel
Functional and clear over visually ambitious. Same dark theme, higher information density.

- Left sidebar (240px, fixed) with nav
- Data tables: tight row height, alternating --color-surface / --color-surface-raised
- Config editor: type-aware inputs (colour picker, number, toggle, text)

---

## Page-Level Layouts

### Landing / Explore (/)
Guest view:
```
[Nav: Logo · Explore · Blog · Get Hired · Find Talent]
─────────────────────────────────────────────────────
  Get hired for your creativity,      [autoplay reel]
  not your follower count.

  [Browse Creators →]   [Join as Creator]
─────────────────────────────────────────────────────
[Category: All ▾]  [Location ▾]  [Budget ▾]  [Sort ▾]
─────────────────────────────────────────────────────
  Masonry video grid (infinite scroll)
```

Logged-in provider: redirects to /dashboard.  
Logged-in client: shows Explore directly (no hero — grid is full page).

### Provider Profile (/profile/[slug])
Cover video → Identity bar → Portfolio grid → Drive section (if linked) → Service packages → Work history → Reviews  
[Sticky booking bar — mobile bottom / sidebar — desktop]

### Booking Detail (/bookings/[id])
Booking header (provider, package, date, ID) → Escrow timeline → Scope notes → Message thread (P1) → Action zone

---

## Interaction & Motion

### Video Autoplay (Explore Feed)
- IntersectionObserver threshold: 0.5 (card 50% visible)
- Fade: thumbnail opacity 1 → 0 over 300ms as video begins
- Video: autoplay muted loop playsInline
- On exit: pause, reset to thumbnail
- prefers-reduced-motion: static thumbnail always, no autoplay

### Booking Confirmation
- Checkmark: scale 0 → 1, spring easing (--ease-spring), 400ms
- Booking ID: monospace typewriter effect, 200ms
- "What happens next" steps: staggered fade-in, 100ms per step

### Page Transitions
- Route change: fade out 150ms → fade in 200ms
- Sheet/drawer: slide up from bottom, spring easing
- Modals: scale 0.95 → 1 + fade in, 200ms

### Filter Interaction
- Applying a filter immediately re-queries and updates grid
- New cards entering: fade in + translateY(-8px) → 0, staggered 30ms per card
- Removed cards: fade out, remaining cards reflow

---

## Responsive Breakpoints

```
Mobile:  < 640px   — 2-col grid, sticky bottom CTA, full-screen sheets
Tablet:  640-1024px — 3-col grid, side-by-side packages
Desktop: > 1024px  — 4-5 col grid, full nav, sidebar booking widget on profile
```

Design is mobile-first. Primary use case: a brand marketing manager browsing on their phone between meetings.

---

## Accessibility

- All text combinations pass WCAG AA (4.5:1 minimum). Accent #E8FF47 on #0A0A0A: ~13:1.
- All interactive elements keyboard-focusable with 2px --color-accent outline
- Video cards: aria-label includes provider name and category
- Booking flow: full keyboard navigation, no mouse-only interactions
- prefers-reduced-motion: all animations and video autoplay respect this

---

## Config-Driven Design Notes

The following visual properties must always come from platformConfig — never hardcoded in component styles:

- --color-accent → from platformConfig.primaryColor (JS sets CSS var on mount)
- Platform name in nav, page titles, trust messages → platformConfig.name
- Platform tagline in hero → platformConfig.tagline
- Fee percentage display → platformConfig.feeRate (formatted as %)
- Category labels and badge colours → platformConfig.categories
- Feature visibility (Drive sync, blog) → platformConfig.features

A name or colour change requires only an admin panel update. Zero component changes.

---

*DESIGN.md v1.1 — Crelab — July 2026*
