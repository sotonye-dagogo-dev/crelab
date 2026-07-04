# Crelab AI Tool Prompts

**Version:** 1.2  
**Pipeline Stage:** PRD -> ROADMAP -> DESIGN -> PROMPTS -> Open Design -> Open Code  
**Stack:** Next.js 15.3.x · TypeScript 5 · Better Auth 1.6.x · Supabase · Drizzle ORM · Paystack · Cloudinary · Mux · Tailwind 4 · Framer Motion 12 · Sanity 7 · Resend 6

---

## How to Use This File

> Feed these prompts in sequence. Each section is labelled by tool and stage.
> Always attach the files listed under "Attach" before submitting the prompt.
> Design prompts → Open Design (output: HTML files). Development prompts → Open Code (with .ai-system active).

---

## ─── OPEN DESIGN ─────────────────────────────────────────────────────────────

### PROMPT OD-1 — Design System Bootstrap

**Attach:** `DESIGN.md`
**Purpose:** Establish the full Crelab design system as HTML reference files before any screens are built.

```
You are a senior UI/UX designer working on Crelab — a dark-themed, video-first creative services marketplace for Nigerian creators and brands. The platform is where creative professionals win work based on the quality of their portfolios, not the size of their following. Think Instagram Explore × Fiverr × Upwork, built for Nigeria.

Read the attached DESIGN.md in full before doing anything. It is the single source of truth for all visual and interaction decisions.

Your task: Generate two self-contained HTML files that constitute the Crelab design system reference.

FILE 1: 01-design-system-tokens.html
This file documents every design token in the system.

Sections (annotate each with <!-- DESIGN.md §reference -->):

1. COLOUR TOKENS
   Render each colour as a swatch (64×64px card, border-radius 8px, hex label below in JetBrains Mono 11px, token name above in Inter 11px). Organised into groups:
   - Base: --color-bg, --color-surface, --color-surface-raised, --color-border, --color-border-mid
   - Brand: --color-accent, --color-accent-dim, --color-accent-muted (show text-inverse on accent swatch)
   - Text: --color-text-primary, --color-text-secondary, --color-text-tertiary, --color-text-inverse
   - Semantic: --color-success, --color-warning, --color-error, --color-info
   - Escrow states: --color-escrow-held, --color-escrow-progress, --color-escrow-released, --color-escrow-disputed
   Use the exact hex values from DESIGN.md. No raw hex anywhere else in the HTML — only in the swatch definition and the CSS :root block.

2. TYPOGRAPHY SPECIMENS
   Render one specimen row per type style. Each row: style name (Inter 11px muted), live text at correct size/weight/font, token reference. Cover: Syne ExtraBold 48px ("Your creativity gets hired"), Syne Bold 36px, Syne Bold 28px, Syne Bold 22px, Syne Bold 18px, Syne Bold 16px — then Inter 18px, 16px, 15px, 14px, 13px, 12px at Regular and Medium — then JetBrains Mono 28px ("₦85,000"), 16px ("CLB-20260812-4F9A"), 13px ("★ 4.9 · 24 reviews"), 11px.

3. SPACING SCALE
   Horizontal ruler: each spacing value (--space-1 through --space-20) shown as a filled accent rectangle with its token name and px value. Label above each in Inter 10px.

4. BORDER RADIUS SCALE
   Row of squares (48×48px) each with a different border-radius value, labelled with token name and px value.

5. MOTION TOKENS
   Table: token name | value | description. Easings and durations from DESIGN.md.

6. BREAKPOINTS
   Annotated bar diagram showing the three breakpoints (mobile <640px, tablet 640–1024px, desktop >1024px) with descriptions of layout behaviour at each.

FILE 2: 02-design-system-components.html
This file renders every reusable component at full fidelity.

For each component, show all states side by side with a label above each state in Inter 11px uppercase var(--color-text-tertiary). Annotate each component's section with <!-- Component: [name] -->.

Components to render:

ClButton — 4 variants × all states:
  Primary (accent bg): default, hover (scale 1.01, accent-dim bg), active, disabled (opacity 0.4, cursor not-allowed), loading (spinner replaces label, accent bg maintained).
  Outlined (border var(--color-border-mid), text var(--color-text-primary)): same states.
  Ghost (no border, text var(--color-text-secondary)): same states.
  Destructive (border var(--color-error), text var(--color-error)): same states.
  Sizes: default (40px height, px 16px, Inter SemiBold 14px), sm (32px height, px 12px, Inter SemiBold 13px), lg (48px height, px 24px, Inter SemiBold 15px).

ClCard — 3 variants:
  Default (bg var(--color-surface), border 1px var(--color-border), border-radius 12px, padding 20px).
  Raised (bg var(--color-surface-raised), same border).
  Accent-bordered (border 1px var(--color-accent), bg var(--color-surface)).
  Show hover state for each: border-color var(--color-border-mid), transition 200ms.

ClInput / ClTextarea / ClSelect — all input states:
  Default, focus (border var(--color-accent), no outline), error (border var(--color-error) + error message below in Inter 12px var(--color-error)), disabled (opacity 0.4). Show with label above (Inter SemiBold 12px var(--color-text-secondary)) and optional helper text below (Inter 12px var(--color-text-tertiary)). Inputs: bg var(--color-surface-raised), border 1px var(--color-border), border-radius 8px, height 40px, px 12px, Inter 14px var(--color-text-primary), placeholder var(--color-text-tertiary).
  Special: char counter textarea (shows "247 / 300" Inter 12px var(--color-text-tertiary) bottom-right when near limit, turns var(--color-warning) at 280, var(--color-error) at 300).

ClBadge — category badges, experience level badges, status badges, "New" badge, "Drive" badge, "Verified" badge, "Most Popular" badge, "Sponsored" badge. All in context with correct colours per DESIGN.md.

ExploreVideoCard — the single most important component in the system:
  Default state: dark card (bg var(--color-surface), border-radius 12px, overflow hidden), 4:5 aspect ratio. Video area: dark placeholder (bg var(--color-surface-raised)) with a centred ▶ icon (24px, rgba(255,255,255,0.5)). Gradient overlay (transparent → rgba(0,0,0,0.85)) from 50% bottom. On gradient: category badge pill bottom-left, then provider name (Syne Medium 14px var(--color-text-primary)), then flex row: star rating (JetBrains Mono 12px var(--color-warning)) + price-from (Inter 12px var(--color-text-secondary) "from " + JetBrains Mono 12px var(--color-accent)).
  Hover state: scale 1.02, box-shadow 0 0 0 1px var(--color-accent) + 0 0 16px rgba(232,255,71,0.15), "View Profile →" pill fades in at card centre-top (bg var(--color-accent), text var(--color-text-inverse), Inter SemiBold 12px, border-radius 9999px, px 12px py 6px).
  Drive variant: same card but with a small "Drive" badge (bottom-right, bg var(--color-surface), border 1px var(--color-border), Inter 10px var(--color-text-tertiary), px 5px py 2px, border-radius 4px).
  Show 4 cards in a row at varying heights (240px / 300px / 260px / 320px) to demonstrate the masonry texture.

ServicePackageCard — Basic / Standard / Premium variants:
  All three side by side. Standard: border-top 3px var(--color-accent), "Most Popular" badge (absolute top-right, bg var(--color-accent), text var(--color-text-inverse), Inter Bold 10px). Each card: tier label (Inter SemiBold 11px uppercase var(--color-text-tertiary)), package name (Syne Bold 16px), price (JetBrains Mono 28px var(--color-accent)), turnaround (Inter 12px var(--color-text-secondary)), divider, deliverables list ("✓" prefix var(--color-success)), CTA button (Basic/Premium: outlined; Standard: filled accent).

EscrowStatusPill — 5 variants (one for each escrow state):
  HELD (bg rgba(250,204,21,0.1), border 1px var(--color-escrow-held), text var(--color-escrow-held), "● Funds Held"),
  IN PROGRESS (purple tint, "● In Progress"),
  RELEASED (green tint, "✓ Released"),
  DISPUTED (red tint, "⚠ Under Review"),
  REFUNDED (blue tint, "↩ Refunded").
  Each: Inter SemiBold 12px, border-radius 9999px, px 10px py 4px.

AvailabilityBadge — 3 variants: "● Available Now" (green), "● Booking in 2 weeks" (warning), "● Unavailable" (error-dimmed).

ExperienceLevelBadge — 3 variants: "Emerging" / "Established" / "Veteran". Pill style, subtle bg from each semantic colour family.

ConsentCheckbox — checked and unchecked states. Custom styled: bg var(--color-surface-raised), border 1px var(--color-border), border-radius 4px, 18px. Checked: bg var(--color-accent), border var(--color-accent), ✓ in var(--color-text-inverse).

RoleSelectCard — Provider and Client variants side by side. Selectable cards with icon, name, description. Selected: border 2px var(--color-accent), bg var(--color-accent-muted).

EXPORT REQUIREMENTS for both files:
- Fully self-contained: all CSS in a <style> tag, Google Fonts via @import (Syne, Inter, JetBrains Mono), zero external dependencies.
- CSS :root block at top of every <style> tag with all tokens from DESIGN.md.
- All colours via CSS custom properties — no raw hex values in component CSS, only in the :root block.
- Interactive states via CSS :hover, :focus, :disabled selectors or JS class toggles for complex states.
- Comment every major section: <!-- Component: ClButton -->, <!-- Token group: Escrow States -->, etc.
- Include in each file's <head>:
  <meta name="crelab-design" content="design-system">
  <meta name="crelab-component" content="[comma-separated component names in this file]">
- Page background: #0A0A0A. All components rendered on dark background.
Save to: .ai-system/designs/01-design-system-tokens.html and .ai-system/designs/02-design-system-components.html
Create .ai-system/designs/README.md with index table: | File | Screen | Components | OD Prompt | OC Prompt | Status |
```

---

### PROMPT OD-2 — Auth Flow (Registration, Login, Auth Gate)

**Attach:** `DESIGN.md`, `.ai-system/designs/01-design-system-tokens.html`, `.ai-system/designs/02-design-system-components.html`
**Purpose:** Generate the full auth experience including the NDPR consent flow and guest-to-user conversion gate.

```
Using the Crelab design system from OD-1 and DESIGN.md, generate one HTML file covering the complete auth experience.

Context: Auth is handled by Better Auth (self-hosted). Registration captures NDPR-compliant consent. The Auth Gate is a modal that appears when a guest (unauthenticated user) attempts to book or message — it preserves their intent and returns them to the action post-auth. After registration, providers are routed to profile setup; clients are routed back to wherever they came from.

The HTML file must render four switchable views (JS tab buttons at the top of the page):
"Auth Gate" | "Register — Step 1" | "Register — Step 2" | "Login"

All views: centred on a dark page (bg #0A0A0A) with a blurred Explore-page backdrop behind the modal (bg rgba(10,10,10,0.85), backdrop-filter blur(4px), full viewport). Modal card: bg var(--color-surface), border 1px var(--color-border), border-radius 20px, padding 32px, max-width 420px.

VIEW: Auth Gate Modal
Context: This appears when a guest clicks "Request Booking" on a provider profile. The provider's name must appear in the heading — this is not a generic sign-up prompt.
- Platform logo mark centred at top (12px rotated square in accent + "Crelab" Syne Bold 16px, centred).
- Heading (Syne Bold 20px, centred, line-height 1.3): "To book Adunola, create a free Crelab account" — note in HTML comment that "Adunola" and "Crelab" are injected from state/config in production, never hardcoded.
- Sub (Inter 14px var(--color-text-secondary), centred, max-width 300px): "Join thousands of brands and creators on Nigeria's creative marketplace."
- Two full-width buttons (gap 10px, flex column, margin-top 28px):
  "Sign up with Email" — Primary ClButton, 48px height, border-radius 10px, envelope icon 16px left.
  "Sign up with Phone" — Outlined ClButton, same sizing, phone icon 16px left.
- Divider row: thin lines + "or" Inter 12px var(--color-text-tertiary) centred.
- "Already have an account? Sign in →" Inter 13px var(--color-text-secondary), centred — "Sign in →" in var(--color-accent), cursor pointer → switches to Login view.
- Footer: "By continuing, you agree to Crelab's Terms of Service and Privacy Policy." Inter 11px var(--color-text-tertiary) centred, line-height 1.5 — both links underlined.

VIEW: Register — Step 1 (Account Details)
- Step progress: two dots (8px circles, gap 6px, centred). Active: var(--color-accent). Inactive: var(--color-border).
- Heading: "Create your account" Syne Bold 20px centred.
- Form (flex column, gap 14px, margin-top 24px):
  Email input (label "Email", ClInput styled from design system).
  Phone input (label "Phone", optional label suffix "(optional)" Inter 12px var(--color-text-tertiary)).
  Password input (label "Password", type password, show/hide toggle eye icon inset right 12px, Inter 14px var(--color-text-tertiary) cursor pointer).
  Confirm Password input (label "Confirm Password").
  Password strength row (flex row, gap 6px, flex-wrap wrap, margin-top 4px): four requirement pills — "8+ chars" / "Uppercase" / "Number" / "Special char". Each pill: Inter 11px, border-radius 9999px, px 8px py 3px. Unmet: bg var(--color-surface-raised), border 1px var(--color-border), text var(--color-text-tertiary). Met: bg rgba(74,222,128,0.1), border 1px var(--color-success), text var(--color-success). Show 2 as met, 2 as unmet for the reference state.
- "Continue →" Primary ClButton (full width, 48px, margin-top 8px).
- "Already have an account? Sign in" text link (Inter 13px var(--color-text-secondary), centred, margin-top 16px).

VIEW: Register — Step 2 (Role Selection + NDPR Consent — combined in a taller modal)
- Step progress: dot 1 complete (var(--color-success) checkmark), dot 2 active (var(--color-accent)).
- Heading: "Almost there" Syne Bold 20px centred.

Role selection (margin-top 20px): "I'm joining as..." Inter SemiBold 13px var(--color-text-secondary) label. Two selectable cards (gap 10px):
  "A Creator" — icon: camera SVG 24px var(--color-accent), name Syne Bold 15px var(--color-text-primary), description Inter 13px var(--color-text-secondary) "Showcase your work and get hired by brands". "A Brand / Client" — icon: briefcase SVG 24px, same structure. Show "A Creator" as selected: border 2px var(--color-accent), bg var(--color-accent-muted). Unselected: border 1px var(--color-border), bg var(--color-surface-raised).

Consent section (margin-top 24px, border-top 1px var(--color-border), padding-top 20px):
"Before you start" Inter SemiBold 13px var(--color-text-secondary) label.
Three ConsentCheckbox items (flex column, gap 14px, margin-top 12px). Each: flex row, gap 12px, align-items flex-start.
  Item 1 (required, pre-checked): label "Terms of Service & Privacy Policy" Inter SemiBold 13px var(--color-text-primary). Sub: "I've read and agree to Crelab's Terms and Privacy Policy, including data handling under NDPR 2023." Inter 12px var(--color-text-secondary), line-height 1.5.
  Item 2 (optional, unchecked): label "Marketing emails" Inter SemiBold 13px var(--color-text-primary). Sub: "Receive tips, updates, and offers from Crelab. Unsubscribe any time." Inter 12px var(--color-text-secondary).
  Item 3 (optional, unchecked): label "Analytics" Inter SemiBold 13px var(--color-text-primary). Sub: "Help us improve Crelab with anonymous usage data." Inter 12px var(--color-text-secondary).

"Create Account" Primary ClButton (full width, 48px, margin-top 20px). Disabled state (opacity 0.4, cursor not-allowed) active until Item 1 is checked — implement via JS.
"← Back" ghost button (Inter 14px var(--color-text-secondary), padding 0, left-aligned, margin-top 8px).

VIEW: Login
- Heading: "Welcome back" Syne Bold 20px centred.
- Method tab toggle (2 pills below heading, margin-top 16px): "Email" | "Phone". Active: bg var(--color-accent), text var(--color-text-inverse). Inactive: bg var(--color-surface-raised), text var(--color-text-secondary). JS switches content.
  Email tab: Email input + Password input ("Forgot password?" Inter 12px var(--color-accent) floated right, positioned above password input).
  Phone tab: Phone input + "Send OTP" outlined ClButton (accent border/text, px 14px py 8px, border-radius 8px) side by side, then 6-digit OTP input row (6 individual 44px×52px boxes, bg var(--color-surface-raised), border 1px var(--color-border), border-radius 8px, JetBrains Mono 22px centred, focus: border var(--color-accent)) — paste into first fills all six via JS.
- "Sign In →" Primary ClButton (full width, 48px, margin-top 20px).
- "Don't have an account? Sign up" text link (Inter 13px var(--color-text-secondary), centred, margin-top 16px).

All view switching: fade 150ms out → swap → fade 200ms in via JS class toggle. Checkbox toggling, disabled button state, password strength pills, OTP paste, and tab switching fully functional in JS. Responsive (all modals max-width 420px, stack naturally on mobile). Background #0A0A0A.

Save to: .ai-system/designs/03-auth-flow.html
Update .ai-system/designs/README.md.
```

---

### PROMPT OD-3 — Explore Feed + Provider Onboarding Wizard

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`
**Purpose:** Generate the core discovery surface and provider entry flow.

```
Using the Crelab design system and DESIGN.md, generate two self-contained HTML files.

FILE 1: 04-explore-feed.html
Context: The Explore page is Crelab's homepage for all users — authenticated and guest. Instagram Explore is the aesthetic reference: a dense, living masonry grid of video content. On scroll, video cards autoplay (muted, looped). The filter bar is sticky and admin-configurable (rendered from platformConfig, not hardcoded).

Include the nav bar (from DESIGN.md "Navigation" spec) inline. Page bg #0A0A0A.

Nav bar (position fixed, top 0, full width, height 64px, bg rgba(10,10,10,0.85), backdrop-filter blur(12px), border-bottom 1px var(--color-border), z-index 50):
  Top: 5px accent bar (bg var(--color-accent), position fixed above nav).
  Logo: 12px square rotated 45° in var(--color-accent) + "Crelab" Syne ExtraBold 18px var(--color-text-primary). Note in comment: <!-- platformConfig.name — never hardcoded in production -->.
  Centre links (desktop only): "Explore" · "For Creators" · "Blog" — Inter Medium 14px var(--color-text-secondary), hover var(--color-text-primary) 150ms.
  Right: "Find Talent" outlined ClButton + "Get Hired" primary ClButton.
  Mobile (<640px): logo left, hamburger right. Clicking hamburger opens full-screen overlay (bg #0A0A0A, z-index 60, fade 250ms) with stacked links + buttons.

Guest hero (visible only when logged-out, full width, min-height 220px, bg linear-gradient(to bottom, var(--color-surface), var(--color-bg)), display flex, align-items centre):
  Left block (max-width 1200px centred, px 24px, flex row space-between on desktop, stacked on mobile):
    Heading: "Get hired for your creativity, not your follower count." Syne ExtraBold 42px var(--color-text-primary), max-width 560px, line-height 1.15. Note in comment: <!-- platformConfig.tagline in production -->.
    Buttons: "Browse Creators" Primary ClButton (44px, px 24px) + "Join as Creator" Outlined ClButton (same sizing). Gap 12px, flex row.
  Right block (desktop only): 360×200px placeholder video rectangle (bg var(--color-surface-raised), border-radius 12px, border 1px var(--color-border), centred ▶ icon 36px rgba(255,255,255,0.4)). Note: <!-- Cover reel autoplay in production -->.

Filter bar (sticky below nav/hero, position sticky, top 64px, full width, height 56px, bg rgba(10,10,10,0.95), backdrop-filter blur(8px), border-bottom 1px var(--color-border), z-index 40):
  Inside (max-width 1200px, centred, px 24px, flex row, gap 12px, height 100%, align-items centre):
  Search: flex-grow 1, bg var(--color-surface), border 1px var(--color-border), border-radius 8px, height 36px, px 12px, Inter 14px, placeholder "Search creators...", magnifier icon inset left 10px var(--color-text-tertiary).
  Four selects (each 140px): "All Categories ▾" / "Location ▾" / "Budget ▾" / "Sort: Newest ▾". Styled: bg var(--color-surface), border 1px var(--color-border), border-radius 8px, height 36px, px 12px, Inter 14px var(--color-text-secondary), custom chevron. Active filter (non-default value): border var(--color-accent), text var(--color-text-primary).
  Note in comment: <!-- Filter schema rendered from platformConfig.categories in production. Never hardcoded. -->

Masonry grid (max-width 1200px, centred, px 24px, padding-top 24px, CSS columns: 2-col mobile, 3-col tablet, 4-col desktop, 5-col >1440px, column-gap 8px):
  Render 14 ExploreVideoCards with varied heights (alternating ~240px and ~320px to create organic masonry texture). Use realistic Nigerian names, categories (Content Creator / Cinematographer), ratings 4.6–5.0, prices ₦35,000–₦180,000 in JetBrains Mono.
  Cards: display inline-block, width 100%, margin-bottom 8px, break-inside avoid.
  Video area: dark placeholder — use alternating bg values (#141414, #0D0D1A, #0A0A14) for visual variety. Centred ▶ icon.
  Gradient overlay and card overlay content exactly as defined in the ExploreVideoCard component spec from OD-1.
  Hover: CSS :hover for scale + border glow + "View Profile →" pill.
  Note in comment: <!-- IntersectionObserver triggers autoplay in production. Muted looped <video> replaces placeholder. -->

Below grid: "Load more" outlined ClButton (px 32px py 12px, Inter Medium 14px var(--color-text-secondary), centred, margin-top 32px, margin-bottom 48px).

Implement scroll-to-top button (fixed bottom-right, 44px circle, appears after 300px scroll, smooth scroll on click).

FILE 2: 05-provider-onboarding.html
Context: A 5-step wizard that takes a creator from account creation to a live profile. The wizard renders as a centred panel (max-width 560px, bg var(--color-surface), border-radius 16px, border 1px var(--color-border)) on a dark blurred backdrop (representing the Explore page behind it). Category-specific fields are driven by fieldSchema from platformConfig — never hardcoded.

Step indicator (top of panel): 5 numbered circles (28px diameter) connected by thin lines. Active: bg var(--color-accent), text var(--color-text-inverse), Syne Bold. Complete: bg var(--color-surface-raised), text var(--color-success), ✓ icon. Future: border 1px var(--color-border), text var(--color-text-tertiary). Progress label: "Step X of 5" Inter 12px var(--color-text-tertiary) above the indicator.

All 5 steps navigable via "Continue →" (Primary ClButton) and "← Back" (Ghost ClButton). Transitions: fade 150ms out, swap, fade 200ms in.

Step 1 — Choose Your Category:
  Heading "Choose your category" Syne Bold 20px.
  Two RoleSelectCard-style cards (stacked, full width, border-radius 12px, padding 20px, cursor pointer):
    "Content Creator" — video-camera icon SVG 24px var(--color-accent), name Syne Bold 16px, description "UGC, lifestyle, brand content, social media" Inter 14px var(--color-text-secondary).
    "Cinematographer / Videographer" — film icon SVG 24px var(--color-accent), name, description "Events, commercials, narrative, documentary".
  Selected: border 2px var(--color-accent), bg var(--color-accent-muted). Unselected: border 1px var(--color-border), bg var(--color-surface-raised). JS toggle.
  Note in comment: <!-- Categories rendered from platformConfig.categories in production. These cards are generated, not hardcoded. -->

Step 2 — Your Details (render Content Creator variant):
  Heading "Tell us about yourself" Syne Bold 20px.
  Fields (flex column, gap 16px): Bio textarea (label "Bio", 300 char limit, live counter — turns warning at 280, error at 300, Inter 11px var(--color-text-tertiary) bottom-right), Location ClInput (label "Location", placeholder "e.g. Lagos, Nigeria"), Years Active ClInput (type number, label "Years Active"), Experience Level (label "Experience Level", three pill buttons in a flex row: "Emerging" / "Established" / "Veteran" — selected: bg var(--color-accent-muted), border var(--color-accent), text var(--color-accent); unselected: bg var(--color-surface-raised), border var(--color-border), text var(--color-text-secondary), Inter SemiBold 13px, px 16px py 8px, border-radius 9999px), Content Niche (label "Content Niche", tags input showing chips like "Beauty" "Fashion" "Tech" as accent-muted pills with × remove, input for adding), Active Platforms (same tags input style).
  Note: <!-- Step 2 fields are rendered from category fieldSchema JSONB in production. The Content Creator variant is shown here. -->

Step 3 — Set Your Packages:
  Heading "Set your packages" Syne Bold 20px. Sub "Define what you offer at each tier." Inter 14px var(--color-text-secondary).
  Three package editor cards (BASIC / STANDARD / PREMIUM) — same ServicePackageCard layout from OD-1 but each field is now an input/textarea: Package name ClInput, Price ClInput with "₦" prefix in JetBrains Mono (value e.g. "45,000"), Deliverables ClTextarea, Turnaround days ClInput (type number + "days" suffix). Standard card: accent top border + "Most Popular" badge as in component spec.

Step 4 — Upload Your Portfolio:
  Heading "Upload your portfolio" Syne Bold 20px. Sub "Show your best work. Videos, images, or PDFs." Inter 14px var(--color-text-secondary).
  Two upload panels side by side (50/50 desktop, stacked mobile):
    Left — Native Upload: dashed border 2px var(--color-border), border-radius 12px, bg var(--color-surface-raised), min-height 140px, centred: upload icon SVG 32px var(--color-text-tertiary), "Drag files here" Inter 14px var(--color-text-secondary), "or Browse Files" link var(--color-accent) Inter 13px. Below (4 mock portfolio thumbnails in a 2×2 grid, each 80px, bg var(--color-surface) with a ▶ icon and a caption in Inter 10px var(--color-text-tertiary)).
    Right — Google Drive: same dashed border style, Google Drive icon SVG 28px, "Paste your Drive folder link" Inter 14px var(--color-text-secondary), URL ClInput (full width below), "Sync Folder" primary ClButton (full width, 40px). Note in comment: <!-- DriveService.ingestFolder() is called on sync. No OAuth required for public folders. -->
  After items appear: reorder instruction "Drag to reorder" Inter 12px var(--color-text-tertiary), with a row of 2 portfolio cards with drag handles (⠿ left, × right, 36px accent-muted, Inter 11px).

Step 5 — Preview & Go Live:
  Heading "Your profile is ready" Syne Bold 20px centred. Sub "Here's how creators will see you in the Explore feed." Inter 14px var(--color-text-secondary) centred.
  Centred ExploreVideoCard (280px wide, matching spec from OD-1 exactly) showing the data from Steps 1–4.
  Below card: info banner (bg rgba(96,165,250,0.08), border 1px rgba(96,165,250,0.2), border-radius 8px, padding 12px 16px): "ℹ Your profile will go live with a 'New' badge and be reviewed by our team within 48 hours." Inter 13px var(--color-info).
  "Go Live →" Primary ClButton (full width, 48px). Note in comment: <!-- Profile active=true, verified=false, new badge displayed until admin review. -->

All steps fully navigable in JS. Char counter live. Experience level pills toggle. Tags input functional (type + Enter to add, × to remove). Package pricing and name inputs editable. Upload dropzone hover state (border var(--color-accent), bg rgba(232,255,71,0.04)).

Save to: .ai-system/designs/04-explore-feed.html and .ai-system/designs/05-provider-onboarding.html
Update README.md.
```

---

### PROMPT OD-4 — Provider Profile Page

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`, `.ai-system/designs/04-explore-feed.html`
**Purpose:** Generate the full provider profile page — the creative's stage on Crelab.

```
Using the Crelab design system and DESIGN.md, generate one HTML file for the full provider profile page.

Context: The profile page is a curated stage for the creative professional. It must feel cinematic and deliberate — not like a form or a CV. The cover video is the hero. Packages are priced clearly. Reviews build trust. The booking CTA is always within reach. Reference the ExploreVideoCard component for portfolio cards. Reference the ServicePackageCard component for packages. This page is the destination after clicking any card in the Explore feed.

Include the nav bar (inline from OD-3's nav spec). Page bg #0A0A0A.

Section 1 — Cover Video Hero (full viewport width, 56vw height max-height 520px, position relative):
  bg var(--color-surface), border-bottom 1px var(--color-border).
  Video placeholder: full-fill dark rectangle bg #0D0D1A, centred ▶ icon 48px rgba(255,255,255,0.4) with "Showreel" Inter 12px var(--color-text-tertiary) below.
  Gradient overlay (position absolute, bottom 0, full width, height 60%, linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 100%)).
  Note: <!-- <video autoplay muted loop playsInline> in production. Cover video from provider.coverVideoUrl. -->

Section 2 — Identity Bar (max-width 960px, centred, px 24px, padding-top 24px, padding-bottom 32px):
  Row 1: Avatar (72px circle, bg var(--color-surface-raised), border 2px var(--color-border), Syne Bold 24px initials) + name (Syne ExtraBold 28px var(--color-text-primary)).
  Row 2 (flex row, flex-wrap, gap 8px, margin-top 10px): Category ClBadge (accent-muted bg, accent border, accent text) + location (Inter 13px var(--color-text-secondary), "📍" replaced with pin SVG 12px) + years active (Inter 13px var(--color-text-secondary)) + ExperienceLevelBadge + star rating (★ JetBrains Mono 13px var(--color-warning) + review count Inter 13px var(--color-text-secondary)) + AvailabilityBadge ("● Available Now" green).
  Row 3: Bio text (Inter 15px var(--color-text-secondary), max-width 560px, line-height 1.65, margin-top 12px). Use a real 2-sentence bio about a Nigerian content creator.
  Row 4 (margin-top 20px, flex row, gap 12px): "Request Booking" Primary ClButton (44px px 20px) + "View Packages ↓" Outlined ClButton (same sizing, smooth scroll to packages section on click via JS).

Section 3 — Portfolio Grid (max-width 960px, centred, px 24px, padding-top 40px):
  "Portfolio" Syne Bold 18px var(--color-text-primary), padding-bottom 16px.
  3-column masonry (CSS columns, column-gap 8px). 8 ExploreVideoCards at varied heights. Same exact spec as in 04-explore-feed.html.

  Google Drive sub-section (below, margin-top 28px, only if driveFolderUrl is set):
  Row: "Portfolio via Google Drive" Inter SemiBold 14px var(--color-text-secondary) + Drive icon SVG 14px var(--color-text-tertiary) + "Last synced 3h ago" Inter 11px var(--color-text-tertiary) + "Refresh ↻" link var(--color-accent) Inter 11px — all in one flex row space-between.
  3 Drive-sourced cards in a single row (same cards as above but with "Drive" badge bottom-right).
  Note: <!-- source: DRIVE items from PortfolioService.getByProvider(). DriveService.ingestFolder() populates these. -->

Section 4 — Service Packages (max-width 960px, centred, px 24px, padding-top 40px):
  "Packages" Syne Bold 18px, padding-bottom 16px.
  Three ServicePackageCards side by side (flex row, gap 16px, each flex:1, min-width 200px, wraps on mobile) — exact component spec from OD-1. Use realistic Crelab-appropriate package content: UGC package names, ₦ prices in JetBrains Mono, deliverables like "3 short-form videos (30–60s)", "Basic colour grading", "2 revision rounds".

Section 5 — Work History (max-width 960px, centred, px 24px, padding-top 40px):
  "Work History" Syne Bold 18px, padding-bottom 16px.
  3 list items (border-bottom 1px var(--color-border), padding 16px 0):
    Each: left — client name (Inter SemiBold 14px var(--color-text-primary), first one shows "Confidential") + deliverable type below (Inter 13px var(--color-text-secondary)). Right — date (Inter 12px var(--color-text-tertiary)) + "Verified on Crelab" badge on 2 of the 3 (Inter 11px var(--color-success), border 1px rgba(74,222,128,0.25), border-radius 9999px, px 8px py 2px).
  Note: <!-- isVerifiedBooking=true entries show the Verified badge. booking.id links to /bookings/[id]. -->

Section 6 — Reviews (max-width 960px, centred, px 24px, padding-top 40px, padding-bottom 100px):
  Heading row: "Reviews" Syne Bold 18px + "★ 4.9" JetBrains Mono 24px var(--color-warning) + "(24 reviews)" Inter 14px var(--color-text-secondary) — flex space-between.
  3 review ClCards (bg var(--color-surface), border 1px var(--color-border), border-radius 12px, padding 20px, margin-top 12px):
    Top row: reviewer name (Inter SemiBold 14px var(--color-text-primary)) + "Verified Booking" badge (same style as work history) + date (Inter 12px var(--color-text-tertiary)) right-aligned.
    Stars: "★★★★★" JetBrains Mono 14px var(--color-warning), margin-top 8px.
    Review text: Inter 14px var(--color-text-secondary), line-height 1.6, margin-top 8px. Use realistic Nigerian-brand-voice review text.

Desktop sticky sidebar (position sticky, top 88px, width 300px, float right, visible >1024px via CSS, bg var(--color-surface), border 1px var(--color-border), border-radius 16px, padding 24px, margin-left 32px):
  "Select Package" Syne Bold 15px.
  3 package radio pills (flex column, gap 8px, margin-top 12px): "Basic · ₦45,000" / "Standard · ₦85,000" / "Premium · ₦150,000" — each pill: flex row space-between, bg var(--color-surface-raised), border 1px var(--color-border), border-radius 8px, padding 10px 14px, Inter 13px var(--color-text-primary), price JetBrains Mono 13px var(--color-accent), cursor pointer. Selected: border var(--color-accent), bg var(--color-accent-muted). JS toggle updates price display.
  Price display (margin-top 20px): selected package price in JetBrains Mono 32px var(--color-accent) centred.
  "Request Booking" Primary ClButton (full width, 48px, margin-top 16px, border-radius 10px).
  Trust note (Inter 11px var(--color-text-tertiary), centred, margin-top 10px): "Funds held securely until you confirm delivery."
  Note in comment: <!-- ClBookingDrawer opens on button click. Package pre-populated from selected radio. -->

Mobile sticky booking bar (position fixed, bottom 0, full width, height 72px, bg rgba(10,10,10,0.95), backdrop-filter blur(12px), border-top 1px var(--color-border), z-index 30, hidden on >640px):
  "Book Adunola Okonkwo →" Primary ClButton (full width minus 32px margin, height 48px, margin 12px 16px, border-radius 10px).
  Note: <!-- Provider displayName injected. ClBookingDrawer opens as bottom sheet. -->

Sections 3–6 and the sidebar are in a flex container (flex-row on desktop, flex-column on mobile), sidebar on the right with flex-shrink:0.

Fully responsive. Sidebar package radio selection with live price update in JS. "View Packages ↓" smooth scrolls to packages section.

Save to: .ai-system/designs/06-provider-profile.html
Update README.md.
```

---

### PROMPT OD-5 — Booking Flow + Escrow Timeline

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`, `.ai-system/designs/06-provider-profile.html`
**Purpose:** Generate the booking drawer and escrow state timeline — the core transactional interface.

```
Using the Crelab design system and DESIGN.md, generate two HTML files.

FILE 1: 07-booking-drawer.html
Context: A 3-step drawer triggered from the provider profile. On desktop it slides in from the right (480px wide, full viewport height). On mobile it slides up from the bottom (full width, 90vh, border-radius 24px 24px 0 0). The booking flow is modelled on Fiverr's order flow adapted for service-date creative work. The key trust element: escrow is explained plainly at the point of payment, not buried in terms.

Background: Crelab provider profile page blurred behind the drawer (full viewport, bg rgba(10,10,10,0.85), backdrop-filter blur(4px)).

Drawer shell: bg var(--color-surface), border-left 1px var(--color-border) (desktop) / border-top (mobile). X close button (top-right inside drawer, 28px, Inter 18px var(--color-text-secondary), hover var(--color-text-primary), cursor pointer). On close: show ClDialog-style confirmation inline: "Leave booking? Your progress will be lost." with "Stay" (Primary) and "Leave" (Ghost) buttons.

3 steps navigable via JS. Transitions: 150ms fade out, swap, 200ms fade in.

Step 1 — Review & Confirm (drawer padding 24px):
  Header: "Book Adunola Okonkwo" Syne Bold 18px. Sub: selected package name, Inter 14px var(--color-text-secondary). Divider 1px var(--color-border) margin 16px 0.
  Package summary ClCard (bg var(--color-surface-raised), border-radius 12px, padding 16px): tier label (Inter SemiBold 11px uppercase var(--color-text-tertiary) letter-spacing 0.06em), package name (Syne Bold 15px), deliverables list ("✓ " prefix in var(--color-success) Inter 13px), turnaround (Inter 12px var(--color-text-secondary) margin-top 8px).
  Service date (margin-top 20px): label "Service Date" Inter SemiBold 13px var(--color-text-secondary), date input (bg var(--color-surface-raised), border 1px var(--color-border), border-radius 8px, height 40px, px 12px, Inter 14px var(--color-text-primary), color-scheme dark).
  Scope notes (margin-top 16px): label "Scope Notes" Inter SemiBold 13px, ClTextarea (80px height, placeholder "Describe exactly what you need...").
  Price breakdown (margin-top 20px, bg var(--color-surface-raised), border-radius 12px, padding 16px): "Subtotal" + "₦85,000" (row), "Platform fee (5%)" + "₦4,250" (row, text var(--color-text-tertiary)), divider 1px var(--color-border) my 10px, "Total" Inter SemiBold 14px + "₦89,250" JetBrains Mono 18px var(--color-accent) bold (row). Note: <!-- feeRate from platformConfig — never hardcoded. Fee = Math.round(price * platformConfig.feeRate) in kobo. -->
  Escrow explainer (margin-top 16px): collapsible row (flex space-between, cursor pointer). Header: "How does escrow work?" Inter 13px var(--color-text-secondary) + chevron. On click: body expands (max-height transition 250ms), bg var(--color-surface-raised), border-radius 0 0 10px 10px, padding 12px: "Your payment is held by Crelab and only released to the creator after you confirm delivery — or automatically after 5 days if you raise no dispute." Inter 13px var(--color-text-secondary), line-height 1.6. Note: <!-- escrowReleaseDays from platformConfig. -->
  "Proceed to Payment →" Primary ClButton (full width, 48px, border-radius 10px, margin-top 24px).

Step 2 — Payment (drawer padding 24px):
  Header: "Secure Payment" Syne Bold 18px. Sub: "Handled by Paystack. Your card details are never seen by Crelab." Inter 13px var(--color-text-secondary). Note: <!-- Paystack inline checkout. Card data never touches Crelab servers. PCI SAQ A scope. -->
  Trust banner (bg rgba(74,222,128,0.08), border 1px rgba(74,222,128,0.2), border-radius 8px, padding 12px 16px, margin-top 16px, flex row gap 10px): shield-check SVG 16px var(--color-success) + "Funds are held securely. Adunola won't receive payment until you confirm delivery." Inter 13px var(--color-success), line-height 1.5.
  Paystack simulation panel (margin-top 20px, bg var(--color-surface-raised), border-radius 12px, padding 24px):
    "Paystack" wordmark (Inter Bold 14px, colour #00C3F7) + lock SVG 12px var(--color-text-tertiary) right-aligned in top row.
    Amount: "₦89,250" JetBrains Mono 28px var(--color-text-primary) centred, "to Crelab — Standard Package" Inter 12px var(--color-text-secondary) centred, margin-top 4px. Note: <!-- Provider displayName and package name injected. -->
    Card inputs (margin-top 20px, flex column gap 12px): Card number (placeholder "1234  5678  9012  3456"), Expiry + CVV (flex row, gap 12px), Name on card. All: bg rgba(255,255,255,0.06), border 1px var(--color-border-mid), border-radius 8px, height 44px, px 12px, Inter 14px var(--color-text-primary).
    "Pay ₦89,250 Securely" (bg #00C3F7, text #0A0A0A, Inter Bold 14px, full width, 48px, border-radius 8px, margin-top 16px).
    "🔒 Secured by Paystack · PCI DSS Compliant" — replace emoji with lock SVG 11px inline — Inter 11px var(--color-text-tertiary) centred, margin-top 10px.

Step 3 — Confirmation (drawer padding 24px, centred layout):
  Checkmark circle: 64px, bg var(--color-accent-muted), border 2px var(--color-accent), border-radius 9999px, centred ✓ Syne Bold 28px var(--color-accent). CSS @keyframes popIn (scale 0→1.1→1, 400ms var(--ease-spring)). Note: <!-- Framer Motion spring in production. -->
  "Booking Confirmed!" Syne ExtraBold 22px var(--color-text-primary) centred, margin-top 20px.
  Booking ID: "CLB-20260812-4F9A" JetBrains Mono 12px var(--color-text-tertiary), bg var(--color-surface-raised), px 12px py 6px, border-radius 8px, inline-block, margin-top 8px. Note: <!-- booking.id formatted as CLB-{date}-{shortId}. -->
  "What happens next" timeline (margin-top 28px, position relative): vertical connecting line (2px var(--color-border), position absolute, left 10px, top 11px, height calc(100% - 22px)). 4 items, each flex row, gap 12px, padding-bottom 20px. Node circle (22px, border-radius 9999px): items 1-2 bg var(--color-accent), ✓ Inter Bold 12px var(--color-text-inverse); items 3-4 bg var(--color-surface-raised), border 1px var(--color-border), ○ Inter 12px var(--color-text-tertiary). Right: label (Inter SemiBold 14px var(--color-text-primary)) + sub (Inter 12px var(--color-text-secondary)). Items: "Provider notified" / "Adunola delivers your content" / "Confirm delivery" / "Payment released to Adunola".
  "View Booking →" Outlined ClButton (full width, 44px, margin-top 24px). Note: <!-- Routes to /bookings/[booking.id]. -->
  CSS popIn animation on page load for confirmation step.

FILE 2: 08-escrow-timeline.html
Context: This component appears on the /bookings/[id] detail page. Both the client and provider can see it. The client has action CTAs (Confirm or Dispute). The provider sees read-only state with their expected payout amount. There are 5 possible escrow states — all must be shown.

Page bg #0A0A0A, padding 40px 24px. Heading "Escrow Status — All States" Syne Bold 20px var(--color-text-primary) margin-bottom 8px. Sub "Toggle CLIENT / PROVIDER view using the switch above each group." Inter 13px var(--color-text-secondary) margin-bottom 32px.

View toggle (sticky top, 56px from top, z-index 10): "CLIENT VIEW" | "PROVIDER VIEW" pill toggle (JS — switching toggles visibility of role-specific elements across all 5 instances).

Render 5 timeline instances (each in a ClCard: bg var(--color-surface), border 1px var(--color-border), border-radius 16px, padding 28px, max-width 680px, centred, margin-bottom 32px). Each card: state label above (Inter SemiBold 12px uppercase var(--color-text-tertiary) letter-spacing 0.08em, margin-bottom 16px).

Timeline: horizontal (flex row, position relative, justify-content space-between) on desktop, vertical (flex column) on mobile. Connecting line: position absolute, top 16px (desktop) / left 16px (mobile), bg var(--color-border), height 2px (desktop) / width 2px (mobile), width/height connecting all nodes. Each node: flex column, align-items centre, gap 8px.
Node circle (32px):
  Future: border 1.5px var(--color-border), bg transparent.
  Current: border 2px var(--color-accent), bg var(--color-accent-muted), inner dot 12px bg var(--color-accent) with CSS @keyframes pulseDot (scale 1→1.3→1, opacity 1→0.5→1, 2s infinite).
  Complete: bg var(--color-success), ✓ Inter Bold 14px white.
  Disputed node: bg var(--color-error), ! Inter Bold 14px white.
  Refunded node: bg var(--color-info), ↩ Inter 14px white.
Node label: Inter SemiBold 12px var(--color-text-secondary). Node sub-label: Inter 11px var(--color-text-tertiary).

INSTANCE 1 — "State: HELD":
  Nodes: HELD (current, pulsing, sub "₦89,250" JetBrains Mono 11px var(--color-escrow-held)) → IN PROGRESS (future) → RELEASE IN 5d (future) → RELEASED (future).
  Below: info banner (bg rgba(96,165,250,0.08), border 1px rgba(96,165,250,0.2), border-radius 8px, padding 10px 14px): info SVG 14px var(--color-info) + "Funds secured. Service scheduled for Aug 12, 2026." Inter 12px var(--color-info).

INSTANCE 2 — "State: IN_PROGRESS":
  Nodes: HELD (complete) → IN PROGRESS (current, sub "Aug 12, 2026" Inter 11px) → RELEASE IN 3d (future, sub live countdown "3d 14h 22m" JetBrains Mono 12px var(--color-escrow-progress) — JS setInterval updates every second) → RELEASED (future).
  CLIENT VIEW CTAs (flex row, gap 12px, margin-top 20px): "Confirm Completion" Primary ClButton (accent bg, Inter SemiBold 13px, px 16px py 8px) + "Raise Dispute" (border 1px var(--color-error), text var(--color-error), Inter SemiBold 13px, same sizing, bg transparent).
  PROVIDER VIEW element (visible only in provider mode): "You'll receive ₦84,987 on release" Inter 12px var(--color-text-secondary), JetBrains Mono on the amount, margin-top 12px. Note: <!-- netKobo = amountKobo - feeKobo. Displayed formatted as ₦X,XXX. -->

INSTANCE 3 — "State: RELEASED":
  All 4 nodes complete. RELEASED node: 40px diameter, bg var(--color-success), ✓ 18px white.
  Success banner: success SVG 14px var(--color-success) + "Payment of ₦84,987 has been released to Adunola." Inter 12px var(--color-success), JetBrains Mono on amount.

INSTANCE 4 — "State: DISPUTED":
  Nodes: HELD (complete) → IN PROGRESS (complete) → DISPUTED (current, red ! node, label "DISPUTED") → RESOLVED (future).
  Error banner: warning SVG 14px var(--color-error) + "Dispute raised. An admin will review within 24 hours. Payment is on hold." Inter 12px var(--color-error).

INSTANCE 5 — "State: REFUNDED":
  Nodes: HELD (complete) → IN PROGRESS (complete) → DISPUTED (complete, red) → REFUNDED (complete, blue ↩ node).
  Info banner: ↩ SVG 14px var(--color-info) + "₦89,250 has been refunded to your original payment method." Inter 12px var(--color-info), JetBrains Mono on amount.

View toggle JS: CLIENT VIEW shows action CTAs on Instance 2, hides provider payout line. PROVIDER VIEW hides CTAs, shows payout line. Toggle updates both simultaneously across all instances.
Live countdown on Instance 2 active from page load.

Save to: .ai-system/designs/07-booking-drawer.html and .ai-system/designs/08-escrow-timeline.html
Update README.md.
```

---

### PROMPT OD-6 — Google Drive Portfolio + Admin Panel

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`
**Purpose:** Generate the Drive integration UI and the admin panel where platform config, categories, and disputes are managed.

```
Using the Crelab design system and DESIGN.md, generate two HTML files.

FILE 1: 09-drive-portfolio.html
Context: Providers link a publicly shared Google Drive folder. Crelab's DriveService fetches the file list via the Google Drive Files API v3 (no OAuth required for public folders), generates Cloudinary thumbnails, and upserts items into portfolio_items with source=DRIVE. The UI has two surfaces: the settings panel (in /profile/edit) and the display section (on the public profile page).

Page bg #0A0A0A, max-width 760px centred, padding 40px 24px. State toggle pills at the top: "Disconnected" | "Syncing" | "Synced" | "Error — Private" | "Error — Empty" — JS switches all state-dependent elements simultaneously.

PART 1 — Provider Settings Panel (heading "Connect Google Drive" Syne Bold 18px, margin-bottom 24px):
  Description: "Paste the link to a publicly shared Google Drive folder. Crelab will automatically import your videos, images, and PDFs." Inter 14px var(--color-text-secondary), line-height 1.6, max-width 520px.
  Note: <!-- Folder must be shared with 'Anyone with the link'. DriveService reads files via Google Drive Files API v3, key=GOOGLE_API_KEY. No OAuth. -->

  Input row (flex, gap 10px, margin-top 20px): ClInput (flex:1, placeholder "https://drive.google.com/drive/folders/...") + "Sync Folder" Primary ClButton (40px, px 16px, no-shrink, accent bg).

  State: DISCONNECTED — input empty, button enabled. No status card below.
  State: SYNCING — button shows spinner (border 2px var(--color-accent) / border-top transparent, 14px circle spinning via CSS @keyframes rotate 0.8s linear infinite) + "Syncing..." text replacing "Sync Folder". Input disabled.
  State: SYNCED — Status ClCard below input (bg var(--color-surface), border 1px var(--color-border), border-radius 12px, padding 16px, margin-top 16px, flex row, gap 12px): Drive icon SVG 32px + right block: "8 files imported" Inter SemiBold 14px var(--color-text-primary) + "Last synced: Today at 2:14 PM" Inter 12px var(--color-text-tertiary) + "Refresh ↻" link var(--color-accent) Inter 12px SemiBold.
  State: ERROR — PRIVATE — Same card structure, red tint (border 1px rgba(248,113,113,0.3)): warning SVG 20px var(--color-error) + "Folder is not publicly accessible" Inter SemiBold 14px var(--color-error) + "Set sharing to 'Anyone with the link' in Google Drive, then try again." Inter 12px var(--color-text-secondary).
  State: ERROR — EMPTY — Info tint card: info SVG 20px var(--color-info) + "No supported files found" Inter SemiBold 14px var(--color-info) + "Add MP4, MOV, JPG, PNG, or PDF files to your Drive folder and sync again." Inter 12px var(--color-text-secondary).

  Validation error (below input, shown when URL doesn't match drive.google.com/drive/folders/ pattern): "⚠ This doesn't look like a valid Google Drive folder link." — replace ⚠ with warning SVG 12px — Inter 13px var(--color-error), margin-top 6px.

PART 2 — Profile Display Section (below HR 1px var(--color-border) margin-top 40px):
  Section header row (flex, space-between, margin-bottom 16px): "Portfolio via Google Drive" Inter SemiBold 14px var(--color-text-secondary) + Drive icon SVG 14px var(--color-text-tertiary) (left) | "Last synced 3h ago" Inter 11px var(--color-text-tertiary) + "Refresh ↻" link var(--color-accent) Inter 11px (right).
  3-column masonry grid (CSS columns, column-gap 8px). 6 Drive portfolio cards: ExploreVideoCard spec from OD-1 but each has a "Drive" badge (position absolute, bottom 8px right 8px, bg var(--color-surface), border 1px var(--color-border), border-radius 4px, px 5px py 2px, Inter 10px var(--color-text-tertiary), Drive icon SVG 8px inline). 2 of the 6 are PDFs (document icon instead of ▶, bg var(--color-surface-raised) with slight blue tint).

  On card click: media embed overlay (position fixed, full viewport, bg rgba(0,0,0,0.92), z-index 100, flex centred). Content area: max-width 800px, max-height 80vh. Video card shows video player rectangle (bg #000, border-radius 12px, aspect 16:9, native controls). Image card shows image (object-fit contain). PDF shows iframe (full height). X close button (top right, 28px, var(--color-text-secondary)). ← → navigation arrows (40px circles, bg rgba(10,10,10,0.8), border 1px var(--color-border), positioned flanking the content). Keyboard: Escape closes, arrow keys navigate — note in comment: <!-- JS keydown listener: Escape → close, ArrowLeft/ArrowRight → prev/next. -->

  Empty state variant (toggle via state pills "Error — Empty"): dashed border 1px var(--color-border), border-radius 12px, padding 40px, centred Inter 14px var(--color-text-secondary): "No files found in your linked Drive folder. Add supported files (MP4, MOV, JPG, PNG, PDF) and click Refresh."

All state transitions via JS toggle. Modal fully functional. Responsive.

FILE 2: 10-admin-panel.html
Context: The admin panel lets non-technical admins manage Crelab's config, categories, provider review, and disputes without code deploys. Same dark palette but with higher information density. All config changes cascade site-wide immediately. Adding a category requires zero code changes — it's a DB entry.

Full-page layout: sidebar (240px, fixed, full height) + content area (margin-left 240px, bg #0A0A0A, min-height 100vh, padding 32px).

Sidebar (bg var(--color-surface), border-right 1px var(--color-border)):
  Top: Logo (same as nav, px 20px, py 20px).
  Nav links (margin-top 16px): Dashboard / Config / Categories / Providers / Disputes / Analytics. Each: flex row, gap 10px, px 20px, py 10px, Inter Medium 13px var(--color-text-secondary), hover bg var(--color-surface-raised) transition 150ms. Simple SVG icons (14px) per link. Active link (Config): left border 3px var(--color-accent), bg var(--color-surface-raised), text var(--color-text-primary).
  Bottom: admin user row (px 20px, py 16px, border-top 1px var(--color-border)): avatar circle 28px (initials, bg var(--color-surface-raised)) + "Admin" Inter 12px var(--color-text-secondary) + "Sign out" link Inter 11px var(--color-text-tertiary) right-aligned.

Content area: Tab bar (flex row, border-bottom 1px var(--color-border), margin-bottom 28px): "Platform Config" | "Categories" | "Providers" | "Disputes" — Inter SemiBold 14px, px 20px py 10px. Active: border-bottom 2px var(--color-accent), text var(--color-text-primary). Inactive: transparent border, text var(--color-text-secondary). JS tab switching.

TAB: Platform Config
  Page heading: "Platform Configuration" Syne Bold 22px. Sub: "Changes apply immediately across the entire platform." Inter 13px var(--color-text-secondary). Save + change log row at top-right: "Save Changes" Primary ClButton (px 20px py 8px) + "Revert" Ghost ClButton.
  Note: <!-- PlatformConfigService.set(key, value, adminId) → revalidateTag('platform-config'). Changes reflected on next request. -->

  Config sections (3 sections, each with a heading row (Inter SemiBold 12px uppercase var(--color-text-tertiary) letter-spacing 0.08em, margin-bottom 10px) and a ClCard (bg var(--color-surface), border 1px var(--color-border), border-radius 12px, overflow hidden)):
    Each field row: flex row, border-bottom 1px var(--color-border) (last has none), px 16px py 12px. Columns: label (Inter Medium 13px var(--color-text-primary), min-width 180px) | editable control (flex:1) | fallback (Inter 11px var(--color-text-tertiary), "Default: [value]", min-width 120px right-aligned).

  Section "Branding": Platform Name (ClInput, value "Crelab", note: <!-- platformConfig.name -->), Tagline (ClInput, value truncated), Primary Colour (flex row, gap 8px: <input type="color" value="#E8FF47" 36px 36px border-radius 6px cursor pointer> + ClInput 80px JetBrains Mono 13px "#E8FF47", synced via JS).
  Section "Fees & Escrow": Platform Fee Rate (ClInput type number, value "5", "%" suffix inset right), Escrow Release Days (ClInput type number, value "5", "days" suffix), Client Cancel Threshold (ClInput type number, value "48", "hours" suffix). Note: <!-- feeRate stored as decimal 0.05. Displayed as % for admin. All in kobo at transaction time. -->
  Section "Features": 3 rows with toggle switches. "Guest Browse" ON, "Google Drive Sync" ON, "Blog" OFF. Toggle: 36px×20px, border-radius 9999px, bg (on: var(--color-accent), off: var(--color-border-mid)), thumb 16px circle white, transitions 200ms. JS toggles on click.

  Change log (margin-top 28px): "Recent Changes" Inter SemiBold 14px. Compact table (bg var(--color-surface), border-radius 12px, overflow hidden): header row (bg var(--color-surface-raised), border-bottom 2px var(--color-accent), Inter SemiBold 11px uppercase var(--color-text-tertiary), px 14px py 10px): Key | Old Value | New Value | Changed By | Timestamp. 4 data rows: Inter 12px var(--color-text-primary), timestamps JetBrains Mono 11px var(--color-text-tertiary), alternating bg var(--color-surface) / var(--color-surface-raised).

TAB: Categories
  "Add Category" Outlined ClButton (accent border/text, float right, margin-bottom 16px). Note: <!-- New category = DB insert into categories table with fieldSchema JSONB. Zero code changes. -->
  Categories table (same structure): columns: Slug / Label / Field Count / Active / Actions. 2 rows for content-creator and cinematographer. Slug in JetBrains Mono 12px. Active: toggle switch (same as features). Actions: "Edit" var(--color-accent) + "Disable" var(--color-error), Inter 12px.

  Category modal (shown on "Add Category" click — JS toggle): ClDialog overlay. Modal card (bg var(--color-surface), border 1px var(--color-border), border-radius 16px, padding 28px, max-width 500px): "Add Category" Syne Bold 16px. Slug ClInput (prefix "/" span inside, placeholder "e.g. photographer"). Label ClInput. Active toggle. Field schema builder: "Fields" heading Inter SemiBold 13px margin-top 20px. 2 existing field rows (drag handle ⠿ 20px var(--color-text-tertiary) | key ClInput 120px | label ClInput 140px | type ClSelect 100px (text/number/select/tags/boolean) | required toggle 36px | × remove 20px var(--color-error), each row flex, gap 8px, py 8px, border-bottom 1px var(--color-border)). "+ Add Field" link var(--color-accent) Inter 13px margin-top 10px. Footer: "Cancel" Ghost + "Save Category" Primary.

TAB: Providers (brief — show the review queue pattern)
  Heading "New Providers — Pending Review (3)" Syne Bold 18px. Table: columns: Name / Category / Submitted / Portfolio Items / Actions. 3 rows. Actions: "Approve ✓" (var(--color-success) ClButton outlined, small) + "Flag ⚠" (var(--color-warning) ClButton outlined, small). Note: <!-- active=true, verified=false → review queue. Admin sets verified=true on approve. -->

TAB: Disputes (brief)
  Heading "Open Disputes (2)" Syne Bold 18px. Two dispute ClCards: booking ID (JetBrains Mono 12px) + provider + client + escrow amount + dispute reason (truncated) + date raised + "Resolve" Primary ClButton (small). On "Resolve" click: inline resolution form appears below the card: "Outcome" radio (Release to Provider / Refund to Client) + Admin Notes ClTextarea + "Confirm Resolution" Primary ClButton. Note: <!-- EscrowService.resolveDispute(disputeId, outcome, adminNotes, adminId). Idempotent — 409 if already resolved. -->

Sidebar link clicking switches active state. All 4 tabs functional. Category modal open/close. Colour picker syncs. Toggle switches work. Dispute resolution form expands inline.

Save to: .ai-system/designs/09-drive-portfolio.html and .ai-system/designs/10-admin-panel.html
Update README.md.
```

---

### PROMPT OD-7 — Blog System (Index + Article Page)

**Attach:** `DESIGN.md`, `.ai-system/designs/04-explore-feed.html`
**Purpose:** Generate the SEO blog that drives organic discovery and converts readers into bookings.

```
Using the Crelab design system and DESIGN.md, generate one HTML file with two switchable views: blog index and article page.

Context: The blog targets long-tail Nigerian creative industry search terms: "how to hire a content creator Nigeria", "UGC creator rates Lagos", "best videographers for brand content". Creator spotlight posts embed a mini provider card that links directly to the provider's profile page, converting SEO traffic into bookings. All blog content is managed via Sanity CMS — no developer involvement to publish.

Include the nav bar (inline from OD-3). Page bg #0A0A0A. View toggle at top (above nav content): "Blog Index" | "Article Page" pill toggle, JS switches view.

VIEW 1 — Blog Index (/blog):
  Hero (max-width 1200px, centred, px 24px, padding-top 80px, padding-bottom 48px):
    "Insights for Nigerian Creators & Brands" Syne ExtraBold 40px var(--color-text-primary), max-width 520px, line-height 1.15.
    "Hiring guides, pricing tips, and spotlights on the creators making Nigeria's best content." Inter 16px var(--color-text-secondary), margin-top 12px, max-width 440px.

  Category tabs (max-width 1200px, centred, px 24px, flex row, gap 8px, flex-wrap wrap, margin-top 32px):
    Pills: "All" (active: bg var(--color-accent), text var(--color-text-inverse)) · "Content Creation" · "Hiring Guides" · "Creator Spotlights" · "Pricing" · "Industry News" (inactive: bg var(--color-surface), border 1px var(--color-border), text var(--color-text-secondary)). All: Inter SemiBold 13px, px 16px py 7px, border-radius 9999px, cursor pointer. JS active toggle.

  Article grid (max-width 1200px, centred, px 24px, margin-top 32px, padding-bottom 64px, CSS grid 3-col >1024px / 2-col 640-1024px / 1-col <640px, gap 24px):
    6 article ClCards (bg var(--color-surface), border 1px var(--color-border), border-radius 16px, overflow hidden, cursor pointer, hover border-color var(--color-border-mid) transition 200ms):
      Cover image area: 200px height, bg — use these varied subtle gradients to suggest categories: linear-gradient(135deg, #0D1A1A, #0A1A10) for Content Creation, linear-gradient(135deg, #1A0D1A, #100A1A) for Hiring Guides, linear-gradient(135deg, #1A1A0D, #0A0A00) for Pricing — all very dark, near-black but tinted.
      Content (padding 20px):
        Category pill: per category — Content Creation: bg rgba(96,165,250,0.1) border rgba(96,165,250,0.3) text var(--color-info). Hiring Guides: bg rgba(74,222,128,0.08) border rgba(74,222,128,0.2) text var(--color-success). Creator Spotlights: bg var(--color-accent-muted) border var(--color-accent) text var(--color-accent). Pricing: bg rgba(250,204,21,0.08) border rgba(250,204,21,0.2) text var(--color-warning). Inter SemiBold 11px px 8px py 3px border-radius 9999px.
        Title (Syne Bold 16px var(--color-text-primary), line-height 1.3, margin-top 8px, -webkit-line-clamp 2 overflow hidden).
        Excerpt (Inter 13px var(--color-text-secondary), line-height 1.6, margin-top 6px, -webkit-line-clamp 2 overflow hidden display -webkit-box -webkit-box-orient vertical).
        Meta row (margin-top 12px, flex, space-between): author name (Inter 12px var(--color-text-tertiary)) + "X min read" (Inter 12px var(--color-text-tertiary)).
    Use these 6 realistic article titles: "How to Hire a UGC Creator in Lagos (2026 Guide)" / "What Nigerian Brands Actually Pay Content Creators" / "Creator Spotlight: Adunola Okonkwo, Content Creator" / "5 Things to Include in a Creator Brief" / "Why Your Brand Needs Video-First Content" / "How to Price Your Creative Services in Nigeria".
    Third card is the Creator Spotlight — add: avatar circle (32px, initials, bg var(--color-surface-raised)) above the category pill; "View Profile →" Inter 12px SemiBold var(--color-accent) at bottom of card content.

VIEW 2 — Article Page (/blog/[slug]) — render the Creator Spotlight article:
  Full-width cover area (380px height, bg linear-gradient(135deg, #0A0A0A, #1E2200), position relative):
    Centred content: category pill (var(--color-accent) style). "Creator Spotlight: Adunola Okonkwo, Content Creator" Syne ExtraBold 36px var(--color-text-primary), max-width 640px, line-height 1.2, margin-top 12px.

  Article content (max-width 720px, centred, px 24px, margin-top 32px):
    Meta row (flex, gap 16px, flex-wrap): author name (Inter 13px var(--color-text-secondary)) + date "Jul 2026" (Inter 13px var(--color-text-tertiary)) + "5 min read" (Inter 13px var(--color-text-tertiary)) + tag pills (bg var(--color-surface-raised), border 1px var(--color-border), Inter 11px var(--color-text-secondary), px 8px py 3px border-radius 9999px, "Creator Spotlights" + "Lagos").
    Divider 1px var(--color-border) margin-top 20px.

    ToC (desktop only, position fixed, left 20px, top 88px, width 200px, hidden <1200px via CSS): "Contents" Inter SemiBold 11px uppercase var(--color-text-tertiary) margin-bottom 10px. 4 links: Inter 13px var(--color-text-secondary), padding 4px 0, hover var(--color-text-primary), border-left 2px transparent, active: border-left var(--color-accent), text var(--color-accent). Smooth scroll to sections on click.

    Body (Inter 18px var(--color-text-secondary), line-height 1.7, margin-top 24px):
      Paragraph: "Behind every great piece of brand content is a creator who understood the brief better than the client expected. We sat down with Adunola Okonkwo, a Lagos-based content creator specialising in beauty and lifestyle UGC, to understand how she built her career without waiting for her follower count to make the decisions for her."
      h2 "The Brief is Everything" (Syne Bold 24px var(--color-text-primary), margin-top 36px, margin-bottom 12px).
      Paragraph: "Adunola's philosophy is simple: brands don't hire you for your audience. They hire you for your ability to tell their story. She lists the 3-step brief framework she uses with every brand — and why she never starts a shoot without a written scope."
      Blockquote (border-left 3px var(--color-accent), padding-left 20px, margin 24px 0): "The brief is your contract. If it's vague, the feedback will be, too." Inter 16px var(--color-text-secondary) italic.
      h2 "Pricing Without Apology" (Syne Bold 24px, same style).
      Paragraph: "When asked about rates, Adunola is direct. She shares how she determined her package pricing and why transparent packages on Crelab have increased her booking quality over volume."

    Creator spotlight embed (margin-top 40px, bg var(--color-surface), border 1px var(--color-border), border-radius 16px, padding 20px):
      Flex row, gap 16px. Left: avatar 56px (initials). Right: "Adunola Okonkwo" Syne Bold 17px var(--color-text-primary). Category badge (accent style, margin-top 4px). Stars + review count (JetBrains Mono 13px var(--color-warning) + Inter 12px var(--color-text-secondary)). "View Full Profile →" Outlined ClButton (accent, px 14px py 7px, border-radius 8px, Inter SemiBold 13px, float right on desktop). Note: <!-- spotlightProviderSlug links to /profile/[slug]. Mini IProvider card, data fetched from /api/providers/[slug]. -->

    Related posts (margin-top 48px): "More Articles" Syne Bold 18px. 3-col grid (gap 16px), same card style as index but without excerpt (title only, smaller cover image area 120px).
    End-of-article CTA (margin-top 48px, margin-bottom 80px, bg var(--color-surface), border 1px var(--color-border), border-radius 16px, padding 32px, text-centred): "Looking for a creator?" Syne Bold 22px. "Browse Nigerian creative talent on Crelab →" — "Crelab" from platformConfig.name note — Inter 14px var(--color-text-secondary) margin-top 8px. "Browse Creators" Primary ClButton (px 28px py 12px margin-top 20px). Note: <!-- Links to /explore. -->

Category tab JS toggle on index. ToC smooth scroll on article. Both views fully responsive.

Save to: .ai-system/designs/11-blog.html
Update README.md.
```

---

### PROMPT OD-8 — Provider Dashboard

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`, `.ai-system/designs/06-provider-profile.html`
**Purpose:** Generate the provider dashboard — the command centre for creators managing their business on Crelab.

```
Using the Crelab design system and DESIGN.md, generate one HTML file for the provider dashboard.

Context: This is the authenticated landing page for PROVIDER role users. It replaces the Explore feed as their home. It must feel like a professional workspace — clean, data-informed, and action-oriented. Reference the ExploreVideoCard for portfolio items, ServicePackageCard for packages, and EscrowStatusPill for booking states.

Include the nav bar (inline from OD-3's nav spec, but with "Dashboard" as active centre link). Page bg #0A0A0A.

Layout: max-width 1200px, centred, px 24px, padding-top 88px (below fixed nav), padding-bottom 64px.

Section 1 — Profile Completeness Bar (sticky top, z-index 20, bg var(--color-surface), border 1px var(--color-border), border-radius 12px, padding 16px 20px, margin-bottom 24px):
  Flex row, items centre, justify-between, gap 16px, flex-wrap wrap.
  Left: "Profile completeness" Inter SemiBold 14px var(--color-text-primary) + progress ring (48px diameter, stroke-width 4, --color-accent fill, --color-border-mid track). Percentage in centre: JetBrains Mono 16px var(--color-accent).
  Right: "Complete your profile" Primary ClButton (px 20px py 10px) — only shows if < 100%. Click scrolls to relevant section.
  Note: <!-- Completeness calculated from: coverVideo, bio, location, yearsActive, experienceLevel, nicheTags, platformTags, 3 packages, 3+ portfolio items, driveConnected -->.

Section 2 — Quick Stats Grid (CSS grid, 4-col desktop, 2-col tablet, 1-col mobile, gap 16px, margin-bottom 32px):
  4 stat cards (ClCard variant: bg var(--color-surface), border 1px var(--color-border), border-radius 12px, padding 20px):
    1. "Profile Views" — value JetBrains Mono 32px var(--color-text-primary), label Inter 13px var(--color-text-secondary). Sub: "+12% vs last week" Inter 12px var(--color-success).
    2. "Portfolio Plays" — same structure, sub: "+8% vs last week".
    3. "Booking Requests" — value, label. Sub: "3 pending" var(--color-warning).
    4. "Earnings (30d)" — value in ₦ JetBrains Mono, label. Sub: "₦42,500 in escrow" var(--color-escrow-held).
  Hover: border-color var(--color-border-mid), transition 200ms.

Section 3 — Booking Pipeline (ClCard, bg var(--color-surface), border 1px var(--color-border), border-radius 16px, overflow hidden):
  Header (px 20px py 16px, border-bottom 1px var(--color-border), flex, justify-between):
    "Booking Pipeline" Syne Bold 16px var(--color-text-primary).
    "View all →" Inter 13px var(--color-accent) link.
  Kanban-style columns (flex row, overflow-x auto on mobile, gap 16px, px 20px py 20px):
    Column 1: "Requested (2)" — Inter SemiBold 12px uppercase var(--color-text-tertiary), count badge bg var(--color-escrow-held) text var(--color-text-inverse) px 6px py 2px border-radius 9999px.
    Column 2: "Confirmed (1)" — badge bg var(--color-escrow-progress).
    Column 3: "In Progress (1)" — badge bg var(--color-info).
    Column 4: "Completed (8)" — badge bg var(--color-success).
  Each column: vertical stack of booking cards (gap 12px, min-width 280px, flex-shrink 0).
  Booking card (bg var(--color-surface-raised), border 1px var(--color-border), border-radius 10px, padding 16px):
    Top row: client name (Inter SemiBold 13px var(--color-text-primary)) + EscrowStatusPill (small variant, px 8px py 3px, Inter 11px).
    Middle: package name (Inter 13px var(--color-text-secondary)), service date (Inter 12px var(--color-text-tertiary)).
    Bottom: "₦85,000" JetBrains Mono 14px var(--color-accent) + action button per state:
      REQUESTED: "Review" Primary ClButton (sm).
      ACCEPTED: "Start Work" Outlined ClButton (accent, sm).
      IN_PROGRESS: "Deliver" Primary ClButton (accent, sm).
      COMPLETED: "View" Ghost ClButton (sm).
  Empty column state: centred Inter 13px var(--color-text-tertiary) "No bookings in this stage".

Section 4 — Portfolio Performance (ClCard, same wrapper, margin-top 24px):
  Header: "Portfolio Performance" + "View analytics →" link.
  Table (overflow-x auto, min-width 600px):
    Columns: Thumbnail (48px square, rounded 8px, object-fit cover) / Title / Type / Plays / Profile Clicks / Conversion / Actions.
    5 rows with realistic data: video thumbnails, titles like "GTBank Campaign", types (VIDEO/IMAGE/PDF), plays (1.2k), clicks (340), conversion (28%), actions: "Hide" / "Delete" Ghost ClButtons (sm).
  Note: <!-- Data from PortfolioService.getAnalytics(providerId) in production. -->

Section 5 — Quick Actions (margin-top 24px, flex row, gap 12px, flex-wrap wrap):
  "Add Portfolio Item" Primary ClButton (px 20px py 10px).
  "Edit Packages" Outlined ClButton (accent, same sizing).
  "Update Availability" Outlined ClButton (same sizing).
  "Sync Google Drive" Ghost ClButton (same sizing, Drive icon 16px left).

Mobile adaptations:
- Stats grid: 2-col.
- Pipeline: horizontal scroll with snap points.
- Quick actions: full-width stacked on <480px.

Save to: .ai-system/designs/12-provider-dashboard.html
Update README.md.
```

---

### PROMPT OD-9 — Profile Edit Page

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`, `.ai-system/designs/05-provider-onboarding.html`, `.ai-system/designs/09-drive-portfolio.html`
**Purpose:** Generate the profile edit page — where providers manage their live profile, packages, portfolio, and Drive connection.

```
Using the Crelab design system and DESIGN.md, generate one HTML file for the profile edit page (/profile/edit).

Context: This is the post-onboarding management surface. It mirrors the onboarding wizard sections but as editable, persistable panels. Providers return here to update bio, packages, portfolio, and Drive sync. The page is gated by middleware (PROVIDER role only).

Include the nav bar (inline from OD-3). Page bg #0A0A0A.

Layout: max-width 960px, centred, px 24px, padding-top 88px, padding-bottom 100px.

Header (margin-bottom 32px):
  "Edit Profile" Syne ExtraBold 28px var(--color-text-primary).
  "Changes save automatically. Your profile stays live while you edit." Inter 14px var(--color-text-secondary).

Tab navigation (sticky, top: 88px, z-index 20, bg var(--color-surface), border 1px var(--color-border), border-radius 12px, overflow hidden, margin-bottom 24px):
  Tabs: "Profile" | "Packages" | "Portfolio" | "Google Drive" — Inter SemiBold 13px, px 20px py 12px.
  Active: bg var(--color-accent-muted), border-bottom 2px var(--color-accent), text var(--color-accent).
  Inactive: text var(--color-text-secondary), hover bg var(--color-surface-raised).
  JS tab switching with fade 150ms.

TAB: Profile (mirrors onboarding Steps 1–2, pre-filled):
  Section: "Category" — current category badge (ClBadge, accent style, non-editable). Note: <!-- Category change requires re-onboarding; contact support. -->
  Section: "Basic Info" (ClCard, padding 24px, gap 20px):
    Bio textarea (300 char limit, live counter, warning at 280, error at 300).
    Location ClInput (placeholder "e.g. Lagos, Nigeria").
    Years Active ClInput (type number, min 0, max 50).
    Experience Level: 3 pill buttons (Emerging/Established/Veteran) — selected state from onboarding spec.
  Section: "Niche & Platforms" (ClCard, padding 24px, gap 20px):
    Content Niche: tags input (chips as accent-muted pills with × remove, input for adding, Enter to add).
    Active Platforms: same tags input style.
  Save indicator (fixed bottom-right, 24px from edges): "Saved" badge (bg var(--color-success), text var(--color-text-inverse), Inter 12px, px 12px py 6px, border-radius 9999px) — appears 1s after change, fades out.

TAB: Packages (mirrors onboarding Step 3, pre-filled):
  Three package editor cards side by side (flex row, gap 16px, wraps mobile) — same ServicePackageCard layout but all fields editable:
    Tier label (Inter SemiBold 11px uppercase var(--color-text-tertiary), non-editable: BASIC / STANDARD / PREMIUM).
    Package name ClInput (pre-filled).
    Price ClInput with "₦" prefix (JetBrains Mono 14px, value e.g. "85,000").
    Deliverables ClTextarea (one per line, "✓ " prefix auto-added).
    Turnaround ClInput (type number + "days" suffix).
    CTA button: Basic/Premium = Outlined; Standard = Primary (accent bg).
  Standard card: accent top border 3px + "Most Popular" badge (absolute top-right).
  Note: <!-- Price changes affect new bookings only. Existing bookings honour original price. -->

TAB: Portfolio (mirrors onboarding Step 4 + management):
  Upload panels (Native + Drive) — same as onboarding Step 4.
  Below: "Current Portfolio" — masonry grid (3-col desktop, 2-col tablet, 1-col mobile, gap 8px) of existing items.
  Each item: ExploreVideoCard spec but with overlay controls on hover:
    Top-right: drag handle (⠿, 28px circle, bg var(--color-surface), border 1px var(--color-border), cursor grab).
    Bottom-right: hide toggle (eye/eye-off icon, 28px circle) + delete (trash icon, 28px circle, var(--color-error) on hover).
  Reorder: drag-and-drop updates order_index via PATCH /api/portfolio/reorder.
  Empty state: "No portfolio items yet. Upload your first video or sync from Google Drive."

TAB: Google Drive (exact match to 09-drive-portfolio.html Part 1):
  All 5 states (Disconnected, Syncing, Synced, Error-Private, Error-Empty) functional via state toggle pills at top.
  Input row, validation, status cards — identical to 09-drive-portfolio.html.

All tabs: auto-save on blur/change (debounced 800ms) via PATCH /api/profile/edit. Toast notification on save (top-right, var(--color-success) bg, "Changes saved").

Save to: .ai-system/designs/13-profile-edit.html
Update README.md.
```

---

### PROMPT OD-10 — Client Dashboard

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`, `.ai-system/designs/08-escrow-timeline.html`
**Purpose:** Generate the client dashboard — where brands manage bookings, messages, and discover creators.

```
Using the Crelab design system and DESIGN.md, generate one HTML file for the client dashboard.

Context: Authenticated landing page for CLIENT role users. Focus: booking pipeline, active conversations, and quick access to discover talent. Clean, efficient, trust-forward.

Include the nav bar (inline from OD-3, "Dashboard" active). Page bg #0A0A0A.

Layout: max-width 1200px, centred, px 24px, padding-top 88px, padding-bottom 64px.

Section 1 — Quick Stats (CSS grid, 3-col desktop, 2-col tablet, 1-col mobile, gap 16px, margin-bottom 32px):
  3 stat cards (ClCard, bg var(--color-surface), border 1px var(--color-border), border-radius 12px, padding 20px):
    1. "Active Bookings" — value JetBrains Mono 32px var(--color-text-primary), label Inter 13px var(--color-text-secondary). Sub: "2 in progress" var(--color-escrow-progress).
    2. "Total Spent (30d)" — value ₦ JetBrains Mono, label. Sub: "₦180,000 across 3 bookings" var(--color-text-tertiary).
    3. "Messages" — value, label. Sub: "3 unread" var(--color-accent) with badge.

Section 2 — Booking Pipeline (ClCard, same wrapper as provider dashboard Section 3):
  Header: "Your Bookings" + "View all →" link.
  Kanban columns (flex row, overflow-x auto, gap 16px, px 20px py 20px):
    Column 1: "Pending Acceptance (1)" — badge var(--color-escrow-held).
    Column 2: "Confirmed (1)" — badge var(--color-escrow-progress).
    Column 3: "In Progress (1)" — badge var(--color-info).
    Column 4: "Completed (5)" — badge var(--color-success).
  Booking card (bg var(--color-surface-raised), border 1px var(--color-border), border-radius 10px, padding 16px):
    Top row: provider name (Inter SemiBold 13px var(--color-text-primary)) + EscrowStatusPill (small).
    Middle: package name, service date.
    Bottom: "₦89,250" JetBrains Mono 14px var(--color-accent) + action per state:
      REQUESTED: "Awaiting response" (Inter 12px var(--color-text-tertiary)).
      ACCEPTED: "Pay Now" Primary ClButton (sm, accent).
      IN_PROGRESS: "Confirm Delivery" Primary ClButton (sm, accent) + "Raise Dispute" Ghost ClButton (sm, error).
      COMPLETED: "Leave Review" Outlined ClButton (sm, accent) if no review exists.
  Click card → opens EscrowTimeline modal (from 08-escrow-timeline.html Instance 2, CLIENT VIEW).

Section 3 — Messages (ClCard, margin-top 24px):
  Header: "Conversations" + "View all →" link.
  List (max 3 shown, divider 1px var(--color-border) between):
    Each row: flex row, gap 16px, py 16px.
    Left: avatar 40px (initials, bg var(--color-surface-raised)).
    Centre: provider name (Inter SemiBold 13px var(--color-text-primary)) + last message preview (Inter 13px var(--color-text-secondary), truncate 1 line) + booking reference (JetBrains Mono 11px var(--color-text-tertiary)).
    Right: time (Inter 12px var(--color-text-tertiary)) + unread badge (8px dot, var(--color-accent)) if applicable.
    Click → navigates to /messages/[bookingId].
  Empty state: "No conversations yet. Book a creator to start messaging."

Section 4 — Discover Creators (margin-top 24px):
  "Find More Talent" Syne Bold 18px var(--color-text-primary), margin-bottom 16px.
  4 ExploreVideoCards in a row (flex, gap 12px, overflow-x auto, snap-x mandatory) — same spec as 04-explore-feed.html but horizontal scroll.
  "Browse All Creators →" Primary ClButton (full width mobile, px 24px desktop, margin-top 16px).

Mobile adaptations:
- Stats: 2-col grid.
- Pipeline: horizontal scroll with snap.
- Messages: stacked, full-width rows.
- Discover: horizontal scroll with snap.

Save to: .ai-system/designs/14-client-dashboard.html
Update README.md.
```

---

### PROMPT OD-11 — Messages Page

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`
**Purpose:** Generate the messages page — in-platform messaging tied to bookings (Phase 2 feature, but route exists in middleware).

```
Using the Crelab design system and DESIGN.md, generate one HTML file for the messages page (/messages and /messages/[bookingId]).

Context: Messaging unlocks after booking acceptance. Threads are keyed to booking_id. This page shows the conversation list (left) and active thread (right) on desktop; mobile uses a master-detail pattern with back navigation.

Include the nav bar (inline from OD-3, "Messages" active). Page bg #0A0A0A.

Layout: full-height flex container (min-height calc(100vh - 64px), padding-top 64px for nav).

Desktop (>1024px): two-pane layout.
  Left pane (width 360px, flex-shrink 0, border-right 1px var(--color-border), bg var(--color-surface), overflow-y auto, max-height calc(100vh - 64px)):
    Header (px 20px py 16px, border-bottom 1px var(--color-border)): "Messages" Syne Bold 16px.
    Search (px 16px py 12px): ClInput (placeholder "Search conversations...", magnifier icon left).
    Conversation list (divide-y var(--color-border)):
      Each item (px 16px py 12px, hover bg var(--color-surface-raised), cursor pointer, active: bg var(--color-accent-muted) border-l 2px var(--color-accent)):
        Flex row, gap 12px.
        Avatar 40px (initials, bg var(--color-surface-raised)).
        Content (flex:1, min-width 0): provider name (Inter SemiBold 13px var(--color-text-primary)) + last message (Inter 12px var(--color-text-secondary), truncate) + booking ref (JetBrains Mono 11px var(--color-text-tertiary)).
        Meta (flex column, align-items flex-end, gap 2px): time (Inter 11px var(--color-text-tertiary)) + unread badge (16px pill, bg var(--color-accent), text var(--color-text-inverse), Inter 11px) if unread > 0.
    Empty state (centred, py 40px): "No conversations yet. Book a creator to start messaging."

  Right pane (flex:1, bg #0A0A0A, display flex, flex-column):
    If no conversation selected: centred empty state — "Select a conversation" Syne Bold 20px + "Messages appear here when you book a creator." Inter 14px var(--color-text-secondary) + "Browse Creators" Primary ClButton (px 24px py 12px, margin-top 16px).
    If conversation selected:
      Header (sticky, top 0, z-index 10, bg var(--color-surface), border-bottom 1px var(--color-border), px 20px py 16px, flex, justify-between):
        Left: avatar 40px + provider name (Syne Bold 15px) + booking badge (EscrowStatusPill small, px 8px py 3px).
        Right: "View Booking" Outlined ClButton (sm, accent) → links to /bookings/[id].
      Message area (flex:1, overflow-y auto, px 20px py 20px, display flex, flex-column, gap 12px):
        Messages grouped by date (date separator: centred Inter 11px uppercase var(--color-text-tertiary), py 8px).
        Each message: flex row (gap 8px, max-width 70%).
          Own message (align-self flex-end): bubble bg var(--color-accent), text var(--color-text-inverse), border-radius 16px 16px 4px 16px, padding 10px 14px. Time below right (Inter 10px var(--color-text-tertiary)).
          Other message (align-self flex-start): bubble bg var(--color-surface-raised), text var(--color-text-primary), border 1px var(--color-border), border-radius 16px 16px 16px 4px, padding 10px 14px. Time below left.
        File attachment: bubble shows file preview (image thumbnail / video placeholder / PDF icon) + filename + download link.
      Composer (sticky bottom, bg var(--color-surface), border-top 1px var(--color-border), px 20px py 16px):
        Flex row, gap 12px, align-items flex-end.
        Attachment button (28px circle, bg var(--color-surface-raised), border 1px var(--color-border), icon 16px var(--color-text-secondary), hover border var(--color-accent)).
        ClTextarea (flex:1, min-height 44px, max-height 120px, resize none, bg var(--color-surface-raised), border 1px var(--color-border), border-radius 20px, px 16px py 10px, Inter 14px, placeholder "Type a message...").
        Send button (Primary ClButton, 44px height, px 20px, border-radius 20px, accent bg, send icon 16px).

Mobile (<1024px): master-detail.
  Shows conversation list by default.
  Clicking a conversation → slides in thread view (transform translateX(0), fixed inset-0, z-index 50, bg #0A0A0A).
  Back button in thread header (chevron left + "Messages", Ghost ClButton) → slides back to list.
  Swipe right on thread → goes back to list.

Note: <!-- Supabase Realtime subscription for live messages. Cleanup on unmount. -->

Save to: .ai-system/designs/15-messages.html
Update README.md.
```

---

### PROMPT OD-12 — Category Browse Page

**Attach:** `DESIGN.md`, `.ai-system/designs/04-explore-feed.html`
**Purpose:** Generate the category browse page — a dedicated landing for each creative category with SEO-optimised content.

```
Using the Crelab design system and DESIGN.md, generate one HTML file for the category browse page (/[category]).

Context: Distinct from the filtered Explore feed. This is a landing page for a specific category (e.g., /content-creator, /cinematographer). It has a category hero, description, and the same masonry grid pre-filtered. Slugs come from platformConfig.categories — not hardcoded routes.

Include the nav bar (inline from OD-3). Page bg #0A0A0A.

Layout: max-width 1200px, centred, px 24px, padding-top 88px, padding-bottom 64px.

Category Hero (margin-bottom 40px):
  Category badge (ClBadge, accent style, Inter SemiBold 12px, px 12px py 4px, margin-bottom 12px): "Content Creator" (from platformConfig.categories[slug].label).
  Heading: "Hire Content Creators in Nigeria" Syne ExtraBold 42px var(--color-text-primary), max-width 640px, line-height 1.15.
  Description: "Find vetted creators for UGC, lifestyle content, brand videos, and social media. Transparent packages. Escrow-protected payments." Inter 16px var(--color-text-secondary), max-width 560px, line-height 1.6, margin-top 12px.
  Stats row (flex row, gap 32px, flex-wrap wrap, margin-top 24px):
    "247" JetBrains Mono 28px var(--color-accent) + "Active creators" Inter 13px var(--color-text-secondary).
    "₦35,000" JetBrains Mono 28px var(--color-accent) + "Starting price" Inter 13px var(--color-text-secondary).
    "4.9★" JetBrains Mono 28px var(--color-warning) + "Average rating" Inter 13px var(--color-text-secondary).
  Note: <!-- Stats from ExploreService.getCategoryStats(slug) in production. -->

Filter Bar (sticky, top: 64px, z-index 40, same spec as 04-explore-feed.html but category select is pre-selected and disabled):
  Search + Location + Budget + Sort selects. Category select shows current category, disabled (bg var(--color-surface-raised), text var(--color-text-tertiary), cursor not-allowed).
  "Clear filters" Ghost ClButton (right side, Inter 13px var(--color-accent)) — resets all except category.

Masonry Grid (same spec as 04-explore-feed.html):
  ExploreVideoCards pre-filtered to this category.
  Infinite scroll, cursor pagination.
  Empty state: "No creators in this category yet. Check back soon!" + "Browse All Categories" Outlined ClButton (accent).

SEO meta (in comments):
  <!-- generateMetadata: title = "Hire {category.label}s in Nigeria | {platformConfig.name}", description = category.description, OG image = category hero gradient -->.

Mobile: hero stacks, stats wrap, filter bar scrolls horizontally.

Save to: .ai-system/designs/16-category-browse.html
Update README.md.
```

---

### PROMPT OD-13 — Search Results Page

**Attach:** `DESIGN.md`, `.ai-system/designs/04-explore-feed.html`
**Purpose:** Generate the search results page — full-text search with highlighted matches and Explore-style grid.

```
Using the Crelab design system and DESIGN.md, generate one HTML file for the search results page (/search?q=).

Context: Full-text search across providers (name, bio, niche, location) and portfolio items (title, caption). Results rendered in Explore grid layout with search-specific UI.

Include the nav bar (inline from OD-3). Page bg #0A0A0A.

Layout: max-width 1200px, centred, px 24px, padding-top 88px, padding-bottom 64px.

Search Header (margin-bottom 32px):
  Flex row, items centre, justify-between, gap 16px, flex-wrap wrap.
  Left: "Search results for" Inter 14px var(--color-text-secondary) + "UGC creator" Syne Bold 28px var(--color-text-primary) (the query, highlighted in accent). Note: <!-- Query injected from searchParam, sanitised. -->.
  Right: result count "247 results" JetBrains Mono 14px var(--color-text-tertiary).

Filter Bar (sticky, top: 64px, z-index 40, same spec as 04-explore-feed.html):
  Search input pre-filled with query, editable.
  Category, Location, Budget, Sort selects functional.
  Active filters shown as removable pills below bar (flex row, gap 8px, flex-wrap wrap, margin-top 8px): each pill bg var(--color-accent-muted), border 1px var(--color-accent), text var(--color-accent), Inter 12px, px 8px py 3px, border-radius 9999px, × remove button (16px circle, hover bg var(--color-accent), text var(--color-text-inverse)).

Masonry Grid (same spec as 04-explore-feed.html):
  ExploreVideoCards from full-text search results.
  Highlight matching terms in provider name, bio snippet, location — wrap in <mark> with bg rgba(232,255,71,0.15), text var(--color-accent).
  Infinite scroll, cursor pagination.

Empty State (if 0 results):
  Centred, py 60px.
  "No results for 'UGC creator'" Syne Bold 24px var(--color-text-primary).
  "Try broadening your search:" Inter 14px var(--color-text-secondary), margin-top 12px.
  Suggestions pills (flex row, gap 8px, margin-top 16px): "content creator" / "videographer" / "Lagos" / "₦50k-₦100k" — each pill bg var(--color-surface), border 1px var(--color-border), Inter 13px var(--color-text-secondary), px 16px py 8px, border-radius 9999px, cursor pointer. Click → updates search query and re-queries.

Mobile: header stacks, filter bar horizontal scroll, suggestions wrap.

Save to: .ai-system/designs/17-search-results.html
Update README.md.
```

---

### PROMPT OD-14 — Booking List Page

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`, `.ai-system/designs/08-escrow-timeline.html`
**Purpose:** Generate the booking list page — authenticated user's complete booking history grouped by status.

```
Using the Crelab design system and DESIGN.md, generate one HTML file for the booking list page (/bookings).

Context: Authenticated page (CLIENT or PROVIDER) showing all bookings grouped by status. Role-aware: clients see bookings they initiated; providers see bookings for their services. Links to booking detail page with EscrowTimeline.

Include the nav bar (inline from OD-3, "Bookings" active). Page bg #0A0A0A.

Layout: max-width 960px, centred, px 24px, padding-top 88px, padding-bottom 64px.

Header (margin-bottom 32px):
  "Your Bookings" Syne ExtraBold 36px var(--color-text-primary).
  "Manage and track all your creative projects." Inter 14px var(--color-text-secondary), margin-top 8px.

Role Toggle (if user has both roles — rare but possible):
  Pill toggle: "As Client (12)" | "As Provider (3)" — active: bg var(--color-accent), text var(--color-text-inverse); inactive: bg var(--color-surface-raised), text var(--color-text-secondary). JS switches data source.

Status Groups (each group: margin-bottom 40px):
  Group header: flex row, justify-between, items centre, margin-bottom 16px.
    Status label + count badge: "In Progress (2)" Syne Bold 18px var(--color-text-primary) + count badge (bg var(--color-escrow-progress), text var(--color-text-inverse), Inter 12px, px 8px py 3px, border-radius 9999px).
    "Sort: Newest ▾" ClSelect (140px, options: Newest / Oldest / Amount).
  Booking cards (vertical stack, gap 16px):
    Card (ClCard variant: bg var(--color-surface), border 1px var(--color-border), border-radius 12px, padding 20px, hover border-color var(--color-border-mid)):
      Top row: flex, justify-between, gap 16px.
        Left: provider/client name (Inter SemiBold 14px var(--color-text-primary)) + category badge (ClBadge, accent-muted style).
        Right: EscrowStatusPill (full size, px 10px py 4px, Inter SemiBold 12px) + booking ID (JetBrains Mono 12px var(--color-text-tertiary)).
      Middle (margin-top 12px, flex row, gap 24px, flex-wrap wrap):
        Package name (Inter 13px var(--color-text-secondary)).
        Service date (Inter 13px var(--color-text-secondary), calendar icon 14px inline).
        Amount (JetBrains Mono 16px var(--color-accent), "₦89,250").
      Bottom (margin-top 16px, flex row, justify-between, items centre):
        "View Details" Primary ClButton (sm, px 16px py 8px) → links to /bookings/[id].
        If PROVIDER view and status=IN_PROGRESS: "Deliver Work" Outlined ClButton (sm, accent).
        If CLIENT view and status=IN_PROGRESS: "Confirm Delivery" Primary ClButton (sm) + "Raise Dispute" Ghost ClButton (sm, error).
  Empty group: "No bookings in this status" Inter 13px var(--color-text-tertiary), centred, py 20px.

Status order: IN_PROGRESS → HELD → ACCEPTED → REQUESTED → COUNTER_PROPOSED → COMPLETED → RELEASED → DISPUTED → REFUNDED → DECLINED.

Mobile: cards stack, middle row wraps, bottom actions full-width stacked.

Save to: .ai-system/designs/18-booking-list.html
Update README.md.
```

---

### PROMPT OD-15 — Privacy & Legal Pages

**Attach:** `DESIGN.md`, `.ai-system/designs/02-design-system-components.html`, `.ai-system/designs/03-auth-flow.html`
**Purpose:** Generate the privacy policy, terms of service, and cookie consent pages — NDPR 2023 compliant.

```
Using the Crelab design system and DESIGN.md, generate one HTML file with three switchable views: Privacy Policy, Terms of Service, Cookie Policy.

Context: Legal pages required for NDPR compliance. Referenced in auth flow (03-auth-flow.html footer), compliance endpoints (OC-5), and OC-7 checklist. Must be accessible from footer on all pages.

Include the nav bar (inline from OD-3, no active link). Page bg #0A0A0A.

View toggle at top (above nav): "Privacy Policy" | "Terms of Service" | "Cookie Policy" — pill toggle, JS switches view.

Layout per view: max-width 720px, centred, px 24px, padding-top 88px, padding-bottom 80px.

VIEW: Privacy Policy
  Heading: "Privacy Policy" Syne ExtraBold 36px var(--color-text-primary).
  Last updated: "Last updated: July 2026" Inter 13px var(--color-text-tertiary), margin-bottom 32px.
  Intro: "This Privacy Policy explains how {platformConfig.name} ('we', 'us', 'our') collects, uses, and protects your personal data under the Nigeria Data Protection Regulation (NDPR) 2023." Inter 15px var(--color-text-secondary), line-height 1.7.
  Sections (each: h2 Syne Bold 22px var(--color-text-primary), margin-top 32px, margin-bottom 12px; body Inter 15px var(--color-text-secondary), line-height 1.7, margin-bottom 16px):
    1. "Data Controller" — {platformConfig.name}, contact: privacy@{domain}.
    2. "Data We Collect" — bullet list: account data (email, phone, name), profile data (bio, location, portfolio), transaction data (bookings, payments, escrow), usage data (analytics, logs), consent records.
    3. "Legal Basis" — consent, contract performance, legitimate interest, legal obligation.
    4. "Data Sharing" — with providers/clients (booking context), Paystack (payments), Cloudinary/Mux (media), Google Drive (sync), Sanity (blog), Resend (email), authorities (legal requirement).
    5. "Data Retention" — account data: while active + 2 years; financial data: 7 years (audit); analytics: 26 months; consent records: permanent.
    6. "Your Rights (NDPR)" — access, rectification, erasure, portability, restriction, objection, withdraw consent. Links to /api/account/export, /api/account/delete, /api/account/consent.
    7. "International Transfers" — adequate safeguards (SCC, BCR).
    8. "Security" — encryption at rest/in transit, RLS, access controls.
    9. "Cookies" — link to Cookie Policy.
    10. "Changes" — notified via email/in-app.
    11. "Contact" — privacy@{domain}.
  Note: <!-- platformConfig.name, privacyEmail from config. Never hardcoded. -->

VIEW: Terms of Service
  Heading: "Terms of Service" Syne ExtraBold 36px.
  Last updated line.
  Sections:
    1. "Acceptance" — binding agreement.
    2. "Definitions" — Platform, Provider, Client, Booking, Escrow, Services.
    3. "Provider Obligations" — accurate profile, deliver per scope, timelines, revisions, IP rights.
    4. "Client Obligations" — clear brief, timely feedback, payment, no off-platform.
    5. "Booking & Escrow" — request → acceptance → payment (held) → delivery → confirmation → release. Auto-release after {platformConfig.escrowReleaseDays} days. Dispute process.
    6. "Fees" — {platformConfig.feeRate*100}% platform fee, deducted at release. Paystack fees borne by client.
    7. "Cancellation & Refunds" — client cancel >{platformConfig.cancellationPolicy.clientThresholdHours}h: full refund. Provider cancel: full refund + penalty. Dispute resolution.
    8. "Intellectual Property" — provider owns IP, grants client licence per package. Portfolio display rights.
    9. "Liability" — capped at booking value. No consequential damages.
    10. "Termination" — either party, 30 days notice. Surviving clauses.
    11. "Governing Law" — Federal Republic of Nigeria. Lagos courts.
    12. "Changes" — 30 days notice.
  Note: <!-- All config values from platformConfig. -->

VIEW: Cookie Policy
  Heading: "Cookie Policy" Syne ExtraBold 36px.
  Last updated line.
  "We use cookies and similar technologies to operate {platformConfig.name}, understand usage, and improve your experience." Inter 15px var(--color-text-secondary).
  Table (ClCard wrapper, overflow-x auto):
    Columns: Cookie Name / Purpose / Duration / Type.
    Rows (realistic):
      __session / Authentication / Session / Essential
      __auth / Auth state / 30 days / Essential
      cf_clearance / Cloudflare bot protection / Session / Essential
      _ga / Google Analytics / 26 months / Analytics (opt-in)
      _gid / Google Analytics / 24 hours / Analytics (opt-in)
      sanity_session / Sanity CMS preview / Session / Functional
  Cookie Consent Banner (rendered at bottom of page as reference):
    Fixed bottom, full width, bg var(--color-surface), border-top 1px var(--color-border), padding 16px 24px, z-index 100.
    Flex row, justify-between, items centre, gap 16px, flex-wrap wrap.
    Text: "We use cookies to improve your experience. By clicking 'Accept', you consent to analytics cookies." Inter 13px var(--color-text-secondary).
    Buttons: "Accept All" Primary ClButton (px 20px py 10px) + "Reject Optional" Ghost ClButton (same sizing) + "Customise" Outlined ClButton (accent, same sizing).
    Note: <!-- Banner shows on first visit via localStorage flag. Customise opens modal with toggle per category (Essential always on, Analytics optional, Marketing optional). -->

All views: anchor links for each section in a sticky ToC (desktop only, left 20px, top 88px, width 200px, position fixed, hidden <1024px) — Inter 13px var(--color-text-secondary), py 4px, hover var(--color-accent), active border-left 2px var(--color-accent). Smooth scroll.

Save to: .ai-system/designs/19-legal-pages.html
Update README.md.
```

---

## ─── OPEN CODE ────────────────────────────────────────────────────────────────

> OC prompts reference the HTML files from the OD phase as their visual contract. Always attach the relevant HTML design file along with DESIGN.md and ROADMAP.md when running an OC prompt. The HTML file is the pixel-precise implementation reference — DESIGN.md prose is secondary where the two differ.

---

### PROMPT OC-1 — Foundation: Config, Types, Schema, Auth

**Attach:** `ROADMAP.md`, `DESIGN.md`, `.ai-system/designs/03-auth-flow.html`
**Purpose:** Establish the entire foundation layer before any feature is built.

```
Read ROADMAP.md Milestones 1.0.2 through 1.0.6 in full. Then read DESIGN.md. Then open 03-auth-flow.html as your visual reference for the auth components.

Implement the following in order. Do not proceed to the next item until the previous compiles with zero TypeScript errors.

1. config/platform.config.ts — IPlatformConfig hardcoded fallback. Include: name "Crelab", tagline from DESIGN.md, primaryColor "#E8FF47", feeRate 0.05, escrowReleaseDays 5, cancellationPolicy thresholds, two initial categories (content-creator, cinematographer) with their full fieldSchema arrays, and all feature flags. Export as DEFAULT_CONFIG: IPlatformConfig.

2. /types/index.ts — All entity interfaces and enums per ROADMAP.md OC-02 spec. Interface-first. All money fields in kobo with JSDoc. All dates as ISO 8601 strings. Barrel-export everything.

3. drizzle/schema.ts — Complete Drizzle schema per ROADMAP.md OC-03 spec. All money columns as integer with JSDoc. Status columns as text with check constraints. Include consent_records table (NDPR). Export all tables and relations.

4. drizzle/migrations/0001_initial.sql — generate via npx drizzle-kit generate. Apply.

5. drizzle/migrations/0002_rls.sql — Supabase RLS policies per ROADMAP.md OC-03 spec. Enable RLS on all tables.

6. services/PlatformConfigService.ts — class, static methods, unstable_cache with tag 'platform-config', merges DB overrides with DEFAULT_CONFIG.

7. lib/config-context.tsx — PlatformConfigProvider (Server Component), usePlatformConfig() hook (Client Component).

8. lib/auth.ts — Better Auth v1.6 instance with Supabase adapter, email/password plugin, phone OTP plugin, roles plugin. On user creation hook: insert into users table via Drizzle. Session cookie: httpOnly, secure, sameSite strict. Export getSession(), requireAuth(), requireRole().

9. app/api/auth/[...all]/route.ts — Better Auth catch-all handler.

10. middleware.ts — protect /dashboard/*, /bookings/*, /profile/edit/*, /messages/*, /admin/*. Admin routes: also check role=ADMIN. Guest allowed on all /(public)/*.

11. hooks/useAuth.ts — Better Auth client hook. Returns { user, role, isAuthenticated, isLoading, signIn, signOut, signUp }.

12. app/(auth)/register/page.tsx — implements the Register flow from 03-auth-flow.html exactly: Account Details (Step 1) and Role + Consent (Step 2). NDPR consent captured via lib/consent.ts into consent_records. After register: PROVIDER → /profile/setup, CLIENT → returnTo or /explore.

13. app/(auth)/login/page.tsx — implements the Login view from 03-auth-flow.html: email/password tab + phone OTP tab with 6-box OTP input.

14. components/shared/AuthGate.tsx — implements the Auth Gate Modal from 03-auth-flow.html. Stores pending action in sessionStorage. After auth, executes stored action, does not redirect to dashboard.

15. components/ui/ — All Cl* wrapper components (ClButton, ClCard, ClInput, ClTextarea, ClSelect, ClBadge, ClDialog, ClSheet, ClTabs, ClAvatar) wrapping shadcn/ui. No raw shadcn imports allowed outside this directory.

After each implementation: run npx tsc --noEmit. Fix all errors before proceeding.
After all 15: run npm run build. Fix all errors.
Log completion in .ai-system/checkpoints/session-log.md.
```

---

### PROMPT OC-2 — Supply Side: Provider Profile + Portfolio + Drive Sync

**Attach:** `ROADMAP.md`, `.ai-system/designs/05-provider-onboarding.html`, `.ai-system/designs/06-provider-profile.html`, `.ai-system/designs/09-drive-portfolio.html`
**Purpose:** Build the provider-side of the platform: onboarding, profile, portfolio upload, and Google Drive sync.

```
Read ROADMAP.md Milestones 1.1.1 through 1.1.5. Open 05-provider-onboarding.html, 06-provider-profile.html, and 09-drive-portfolio.html as your visual contracts. These HTML files define the exact visual output expected — match them precisely.

Implement in order:

1. services/PortfolioService.ts — interface IPortfolioService, class with static methods: getByProvider, addItem, updateItem, reorder (Drizzle transaction), setHidden, deleteItem. All Drizzle queries via lib/db.ts.

2. lib/cloudinary.ts — uploadVideo (returns url + thumbnailUrl + duration), generateVideoThumbnail (Cloudinary URL transform, first frame), uploadImage.

3. lib/drive.ts — parseFolderId (regex extract from drive.google.com/drive/folders/[ID]), validateFolderUrl, fetchFileList (Google Drive Files API v3, key=GOOGLE_API_KEY, no OAuth).

4. services/DriveService.ts — interface IDriveService, class: validateFolderUrl, ingestFolder (full pipeline: validate → parseFolderId → fetchFileList → filter mimeTypes → generate thumbnails → upsert portfolio_items with source=DRIVE → hide removed items → return DriveIngestResult). syncAll for cron. Error handling: partial ingest acceptable, DriveAccessError and DriveValidationError custom error classes.

5. app/api/portfolio/drive/route.ts — POST, authenticated PROVIDER only, calls DriveService.ingestFolder().

6. vercel.json — cron config for /api/cron/drive-sync at 03:00 daily.
   app/api/cron/drive-sync/route.ts — verify CRON_SECRET header, call DriveService.syncAll().

7. app/(auth)/profile/setup/page.tsx — implements the 5-step onboarding wizard from 05-provider-onboarding.html exactly. Category selection (Step 1) renders from platformConfig.categories — not hardcoded. Step 2 fields render from selected category's fieldSchema. Step 3 package builder. Step 4 upload (Cloudinary + Drive link). Step 5 preview using ExploreVideoCard. Wizard state persists in localStorage if user exits mid-flow.

8. app/(public)/profile/[slug]/page.tsx — implements the full profile page from 06-provider-profile.html exactly. generateMetadata: title from provider.displayName + platformConfig.name (never "Crelab" hardcoded). SSR via Drizzle query.

9. components/profile/ProviderHero.tsx — cover video section.
   components/profile/PortfolioGrid.tsx — masonry grid using ExploreVideoCard.
   components/profile/DrivePortfolioSection.tsx — Drive portfolio section from 09-drive-portfolio.html Part 2.
   components/profile/ServicePackages.tsx — 3-card tier layout from 06-provider-profile.html Section 4.
   components/profile/WorkHistory.tsx — work history list.
   components/profile/ReviewsSection.tsx — reviews with verified booking badge.
   components/profile/BookingSidebar.tsx — desktop sticky sidebar with package radio select + live price update.
   components/profile/BookingBottomBar.tsx — mobile sticky bar.

10. components/profile/DriveConnectSettings.tsx — implements 09-drive-portfolio.html Part 1. All 5 states (Disconnected, Syncing, Synced, Error-Private, Error-Empty) functional via API calls.

11. components/shared/MediaEmbed.tsx — modal for Drive item playback. Video/image/PDF handling. Keyboard navigation (Escape, arrow keys) as annotated in 09-drive-portfolio.html.

After each service: npx tsc --noEmit. After all 11: npm run build. Log completion.
```

---

### PROMPT OC-3 — Discovery: Explore Feed + Search

**Attach:** `ROADMAP.md`, `.ai-system/designs/04-explore-feed.html`
**Purpose:** Build the Explore feed — the core discovery surface.

```
Read ROADMAP.md Milestones 1.2.1 through 1.2.3. Open 04-explore-feed.html as your visual contract.

Implement in order:

1. types/explore.ts — IExploreCard, IExploreFilters, ExploreSort enum. Add to /types/index.ts.

2. services/ExploreService.ts — class: query(filters: IExploreFilters): Promise<PaginatedResponse<IExploreCard>>. Drizzle query: joins providerProfiles + min(servicePackages.priceKobo) as packagePriceFromKobo + first non-hidden VIDEO portfolio_item url as previewVideoUrl + rating. Filters: active=true always, category, location (ILIKE), budget (package in range), availability. Full-text search: PostgreSQL ts_vector via Drizzle sql`` template. Sort: NEWEST, TOP_RATED, MOST_BOOKED, FEATURED (featured=true first). Cursor pagination (encode as base64 JSON). Add GIN index migration for full-text search.

3. app/api/explore/route.ts — GET with Zod query param validation. Returns PaginatedResponse<IExploreCard>. Includes platformConfig.feeRate in response for client-side price calculations.

4. components/explore/ExploreVideoCard.tsx — implements ExploreVideoCard from 02-design-system-components.html exactly. Props: { provider: IExploreCard; portfolioItem: IPortfolioItem }. IntersectionObserver (threshold 0.5) triggers autoplay muted loop playsInline. Fade thumbnail → video 300ms. Exit viewport: pause, fade thumbnail back. prefers-reduced-motion: static thumbnail only. Hover: CSS scale + border glow + "View Profile →" pill (opacity transition). All colours via CSS vars. No raw hex values. Next.js Link wraps card → /profile/[slug].

5. components/explore/ExploreFilterBar.tsx — filter inputs rendered from platformConfig.categories + static filter schema. Applying any filter immediately triggers re-query (no Apply button). TanStack Query for data fetching. Sticky positioning (top: var(--nav-height)).

6. components/explore/ExploreGrid.tsx — masonry layout via CSS columns (2/3/4/5 col per breakpoints in DESIGN.md). ExploreVideoCard per item. TanStack Query useInfiniteQuery (cursor-based, fetch next on 80% scroll). New cards: Framer Motion fade-in + translateY(-8px → 0), stagger 30ms. Empty state and loading skeleton (same masonry ratios, shimmer).

7. app/(public)/page.tsx — landing/Explore page. Guest hero visible only when !isAuthenticated. Filter bar below hero. ExploreGrid. Scroll-to-top button (appears at 300px scroll).

8. app/(public)/explore/page.tsx — authenticated Explore, no hero.

9. app/(public)/[category]/page.tsx — category browse. Slug from platformConfig.categories. generateStaticParams from config. Category hero (name + description + active provider count from ExploreService).

10. app/(public)/search/page.tsx — full-text search results in ExploreGrid layout. Uses ExploreService.query({ q: searchParam }).

After all: npx tsc --noEmit. npm run build. Log completion.
```

---

### PROMPT OC-4 — Transactions: Booking, Escrow, Payment

**Attach:** `ROADMAP.md`, `.ai-system/designs/07-booking-drawer.html`, `.ai-system/designs/08-escrow-timeline.html`
**Purpose:** Build the complete transactional layer — booking, Paystack escrow, auto-release, and disputes.

```
Read ROADMAP.md Milestones 1.3.1 through 1.3.3 and PRD.md Section 8 (Escrow State Machine). Open 07-booking-drawer.html and 08-escrow-timeline.html as your visual contracts.

Implement in order. All money arithmetic: integer kobo only. No floating point. fee_amount = Math.round(price_kobo * platformConfig.feeRate) at booking creation time — stored on the record, never recalculated at payout.

1. lib/paystack.ts — Paystack API wrapper: initTransaction(amountKobo, email, ref), verifyWebhookSignature(rawBody, signature, secretKey): boolean (HMAC-SHA512), subaccountSplit(paymentId), refund(paystackRef).

2. services/BookingService.ts — interface IBookingService, class: createRequest (validate package belongs to provider; provider.active=true; serviceDate in future; compute feeKobo = Math.round(priceKobo * platformConfig.feeRate); insert REQUESTED), acceptRequest (REQUESTED→ACCEPTED), counterPropose (REQUESTED→COUNTER_PROPOSED), declineRequest (REQUESTED→DECLINED), getById, getByClient, getByProvider. LEGAL_TRANSITIONS map. BookingStateError custom class.

3. services/EscrowService.ts — interface IEscrowService, class: initiate (create payment PENDING, return Paystack init data), onPaystackSuccess (PENDING→HELD, set releaseDeadline=serviceDate+escrowReleaseDays), setInProgress (HELD→IN_PROGRESS, cron target), clientConfirmRelease (IN_PROGRESS→RELEASED, validate clientId), autoRelease (IN_PROGRESS→RELEASED, cron target), raiseDispute (validate: clientId=booking.clientId, state=IN_PROGRESS, NOW()<releaseDeadline; insert dispute, DISPUTED), resolveDispute (admin only, PROVIDER→RELEASED or CLIENT→REFUNDED).

4. services/PaymentService.ts — class: initPaystack, splitPayout (Paystack subaccount transfer, netKobo to provider), refund.

5. app/api/webhooks/paystack/route.ts — verify HMAC-SHA512 signature before any processing (return 401 if invalid, log attempt). Handle charge.success → EscrowService.onPaystackSuccess(reference). Return 200 immediately, process async.

6. app/api/cron/escrow/route.ts — verify CRON_SECRET header. setInProgress: bookings where serviceDate=today AND status=HELD. autoRelease: payments where releaseDeadline<NOW() AND escrowState=IN_PROGRESS AND no open dispute. Each as independent try-catch. Return { processed, errors }.

7. vercel.json — add cron for /api/cron/escrow at 00:01 daily.

8. components/booking/BookingDrawer.tsx — implements 07-booking-drawer.html exactly. ClSheet (right-slide desktop, bottom-slide mobile). 3 steps via state. Closing mid-flow: ClDialog confirmation. Step 1: package summary, date picker, scope notes, price breakdown (feeRate from usePlatformConfig()), escrow explainer collapsible. Step 2: Paystack inline checkout (@paystack/inline-js). Step 3: confirmation with Framer Motion checkmark, booking ID, "What happens next" timeline. Note: all strings with provider name use provider.displayName from props — never hardcoded.

9. components/booking/EscrowTimeline.tsx — implements 08-escrow-timeline.html exactly. Props: { booking: IBooking; payment: IPayment; viewerRole: 'CLIENT'|'PROVIDER' }. Horizontal desktop, vertical mobile. All 5 state variants. Live countdown via useEffect + setInterval(60s). CLIENT CTAs: Confirm + Dispute. PROVIDER: payout amount display. CSS @keyframes pulseDot on current node.

10. components/booking/DisputeModal.tsx — reason ClTextarea, "Submit Dispute" Primary ClButton, confirmation step.

11. app/(auth)/bookings/[id]/page.tsx — booking detail page. Renders EscrowTimeline. Scope notes. Action zone.

12. app/(auth)/bookings/page.tsx — bookings list for authenticated user. Groups by status.

After all: npx tsc --noEmit. npm run build. Log completion.
```

---

### PROMPT OC-5 — Admin Panel + Compliance Endpoints

**Attach:** `ROADMAP.md`, `.ai-system/designs/10-admin-panel.html`
**Purpose:** Build the admin panel and NDPR-compliant data subject rights endpoints.

```
Read ROADMAP.md Milestones 1.4.1 and PRD.md Section 9 (Compliance Framework). Open 10-admin-panel.html as your visual contract.

Implement in order:

1. app/(admin)/layout.tsx — Admin shell: sidebar (AdminSidebar) + content area. Full ADMIN role guard in layout (redirect to / if role !== ADMIN). Matches 10-admin-panel.html sidebar spec exactly.

2. components/admin/AdminSidebar.tsx — logo, nav links with SVG icons, active state (accent left border), admin user row at bottom.

3. app/(admin)/config/page.tsx — Platform Config tab from 10-admin-panel.html. Config sections (Branding, Fees & Escrow, Features). ConfigField component per field. Save → PATCH /api/admin/config → revalidateTag('platform-config') → success toast. Change log table.

4. components/admin/ConfigField.tsx — renders correct input type per field (text, colour picker + hex input synced, number with unit suffix, toggle switch). Handles bidirectional colour picker ↔ hex sync.

5. app/(admin)/categories/page.tsx — Categories tab. Table of categories. "Add Category" button → CategoryModal. Edit, Disable actions.

6. components/admin/CategoryModal.tsx — ClDialog: slug, label, active toggle, field schema builder (add/remove/reorder field rows). Save → POST or PATCH /api/admin/categories.

7. app/(admin)/providers/page.tsx — Provider review queue (active=true, verified=false). Approve/Flag actions.

8. app/(admin)/disputes/page.tsx — Open disputes. Inline resolution form on each card per 10-admin-panel.html spec.

9. Admin API routes (all require requireRole('ADMIN')):
   app/api/admin/config/route.ts — GET (merged config) / PATCH (PlatformConfigService.set + revalidateTag).
   app/api/admin/categories/route.ts — GET / POST.
   app/api/admin/categories/[slug]/route.ts — PATCH / DELETE (soft, active=false).
   app/api/admin/providers/[id]/route.ts — PATCH (verified, active, adminNotes).
   app/api/admin/disputes/[id]/resolve/route.ts — POST (EscrowService.resolveDispute). Idempotent: 409 if already resolved.

10. Compliance endpoints (authenticated, own data only):
    app/api/account/export/route.ts — NDPR right to data portability. Collects all user data (user, providerProfile, portfolioItems, bookings, reviews, consentRecords). Returns JSON with _notice field ("This is your personal data held by [platformConfig.name] under NDPR 2023. Contact [privacyEmail] for questions."). Content-Disposition attachment header. Logs export in audit_log table.
    app/api/account/delete/route.ts — NDPR right to erasure. Validates via OTP. Anonymises user (email, phone, displayName). Preserves payment/booking rows (financial audit trail). Hard-deletes portfolio items and messages. Sets deletedAt. Revokes all Better Auth sessions.
    app/api/account/consent/route.ts — GET (consent history) / POST (upsert — immutable audit trail, always inserts new record, never mutates existing).

After all: npx tsc --noEmit. npm run build. Log completion.
```

---

### PROMPT OC-6 — SEO Blog + Sitemap

**Attach:** `ROADMAP.md`, `.ai-system/designs/11-blog.html`
**Purpose:** Build the Sanity-powered blog system that drives organic discovery and converts SEO traffic to bookings.

```
Read ROADMAP.md Milestone 1.4.2. Open 11-blog.html as your visual contract.

Implement in order:

1. sanity/schemas/blogPost.ts — fields: title, slug (auto-generated), content (portable text), metaDescription, heroImage, category (select from: content-creation, hiring-guides, creator-spotlights, pricing, industry-news), tags (array of string), author (string), publishedAt (datetime). Export schema.

2. sanity/schemas/creatorSpotlight.ts — fields: title, slug, providerSlug (string — links to provider_profiles.slug), introText, body (portable text), publishedAt.

3. sanity/sanity.config.ts — Sanity project config with both schemas.

4. lib/sanity.ts — @sanity/client instance. Helper functions: getAllPosts(category?): BlogPost[], getPostBySlug(slug): BlogPost | null, getAllCreatorSpotlights(): CreatorSpotlight[], getSpotlightBySlug(slug): CreatorSpotlight | null.

5. app/(public)/blog/page.tsx — implements 11-blog.html View 1 exactly. Category tab filter (JS active state, filters posts). Article grid (3/2/1 col per breakpoints). generateStaticParams (ISR revalidate: 3600). Creator Spotlight cards show avatar + "View Profile →" link.

6. app/(public)/blog/[slug]/page.tsx — implements 11-blog.html View 2 exactly. generateMetadata from Sanity fields (title, metaDescription, OG image). Portable text renderer (ArticleBody). ToC (sticky, desktop, generated from h2/h3 in content). CreatorSpotlightEmbed if post.spotlightProviderSlug exists (fetches from /api/providers/[slug]). Related posts (same category, 3 most recent). End-of-article CTA with platformConfig.name.

7. components/blog/BlogCard.tsx — exact match to card in 11-blog.html. Category pill colours per category as specified.

8. components/blog/ArticleBody.tsx — portable text renderer with h2/h3 (Syne Bold), blockquote (accent left border), code span (JetBrains Mono surface-raised bg).

9. components/blog/CreatorSpotlightEmbed.tsx — mini provider card from 11-blog.html. Fetches provider from /api/providers/[slug] (cached). Links to /profile/[slug].

10. app/sitemap.ts — auto-generated sitemap including: all /profile/[slug] pages, all /blog/[slug] pages, /explore, /[category] pages, static pages. Revalidates on ISR schedule.

11. app/robots.ts — allow all, reference sitemap URL.

After all: npx tsc --noEmit. npm run build. Log completion.
```

---

### PROMPT OC-7 — Final QA, Performance + Production Gate

**Attach:** `ROADMAP.md`, `DESIGN.md`, all `.ai-system/designs/*.html` files
**Purpose:** Design-to-code delta check, performance hardening, and production gate.

```
Read ROADMAP.md. Open .ai-system/designs/README.md and verify all 11 HTML files are present.

Design-to-code delta: for each HTML file, compare annotated sections against implemented pages. Log every gap in .ai-system/checkpoints/session-log.md. Fix every gap before continuing.

1. WRAPPER COMPLIANCE AUDIT
   Grep every page and feature file for raw imports from shadcn/ui (e.g. import { Button } from '@/components/ui/button'). List every violation. Replace with ClButton etc. from components/ui/. Zero raw shadcn imports in feature code.

2. CONFIG COMPLIANCE AUDIT
   Grep for hardcoded strings: "Crelab", "#E8FF47", "5%", "5 days", "0.05". List every occurrence outside config/platform.config.ts and the design tokens CSS. Fix every violation — source from usePlatformConfig() or DEFAULT_CONFIG.

3. MONEY AUDIT
   Grep for floating point arithmetic involving booking, payment, fee, price, or kobo variables. List every occurrence. All money arithmetic must use Math.round() on integer kobo only.

4. PERFORMANCE
   - Audit all list API routes (/api/explore, /api/bookings) for N+1 queries. Fix with Drizzle .with() or batch queries.
   - Verify dynamic imports on heavy components: BookingDrawer (ssr:false), MediaEmbed (ssr:false), ExploreGrid.
   - Verify IntersectionObserver (not scroll listener) drives ExploreVideoCard autoplay and ExploreGrid infinite scroll.
   - Verify cursor-based pagination on all paginated routes.
   - Verify Supabase Realtime subscription is cleaned up on component unmount (EscrowTimeline if using Realtime).

5. ACCESSIBILITY
   - All ClButton elements have aria-label when icon-only.
   - All ClInput elements have associated label elements (not just placeholder text).
   - All video elements have muted attribute and appropriate aria-label.
   - Keyboard navigation works for: BookingDrawer (Escape to close), ExploreVideoCard (Enter to navigate), MediaEmbed (Escape + arrows).
   - Focus visible ring: 2px var(--color-accent) on all interactive elements.
   - prefers-reduced-motion: ExploreVideoCard autoplay disabled, Framer Motion animations disabled.

6. NDPR COMPLIANCE CHECK
   - consent_records table exists and is populated at registration.
   - /api/account/export route returns data with _notice field.
   - /api/account/delete route anonymises rather than deletes financial records.
   - /privacy page exists with NDPR compliance statement.
   - Cookie consent banner exists on first visit.
   - All consent checkboxes are separate and labelled correctly per 03-auth-flow.html.

7. FINAL GATE
   Run: npm run build && npx tsc --noEmit && npx next lint
   All must pass with zero errors and zero warnings.
   Update .ai-system/agents/system-architecture.md — current live state.
   Update .ai-system/planning/task-queue.md — all tasks marked [x].
   Write final entry in .ai-system/checkpoints/session-log.md: "OC-7 COMPLETE — Production ready."
```

---

## ─── SESSION CONTINUITY PROMPT (use at the start of every new session) ──────

### PROMPT SC-1 — Resume Session

**Attach:** `ROADMAP.md`, `DESIGN.md`, plus the `.ai-system/designs/*.html` files relevant to your current task

```
Read the following files before anything else, in this order:
1. ROADMAP.md — architecture invariants, patterns, conventions, full milestone list
2. DESIGN.md — design system (read before any UI work)
3. .ai-system/agents/general-instructions.md — coding standards
4. .ai-system/planning/task-queue.md — current sprint tasks
5. .ai-system/checkpoints/session-log.md — what was last completed and any blockers
6. .ai-system/designs/README.md — design index (open the relevant HTML files for your current task)

Report:
- What is the current task from task-queue.md?
- What was last completed per session-log.md?
- Are there any design-to-code deltas or blocker patterns logged?
- Which .ai-system/designs/*.html file is the visual contract for the current task?

Then proceed with the next task from the queue.

Enforce throughout this session without exception:

ARCHITECTURE:
- Config-driven: platformConfig.name, platformConfig.feeRate, platformConfig.categories — never hardcoded. Always sourced from usePlatformConfig() in components or PlatformConfigService.get() in server code.
- OOP services: BookingService, EscrowService, PortfolioService, DriveService, PaymentService — all class-based with exported interfaces. Business logic stays in services, not in API routes or components.
- Interface-first: define TypeScript interface in /types before any implementation. npx tsc --noEmit must pass at each step.
- Money in kobo: every monetary value is an integer in kobo. fee_kobo = Math.round(price_kobo * feeRate). No floating point arithmetic on money anywhere.
- LEGAL_TRANSITIONS map governs all booking and escrow state changes. BookingStateError thrown on illegal transitions.

COMPONENTS:
- Only import from '@/components/ui' (Cl* wrappers) in feature and page files. Never raw shadcn in feature code.
- All ExploreVideoCard hover behaviour: IntersectionObserver autoplay + CSS :hover transitions. prefers-reduced-motion respected.
- All platform name references: platformConfig.name — never the string "Crelab" in component code.
- All fee rate references: platformConfig.feeRate — never 0.05 or "5%" in component code.

DESIGN:
- CSS custom properties only — never raw hex values in component or style files outside :root and styles/tokens.css.
- .ai-system/designs/*.html is the pixel-precise reference. DESIGN.md prose is secondary where the two differ.
- Font usage: Syne for display/headings, Inter for body/UI, JetBrains Mono for prices/IDs/states/counts only.
- All money displayed as: "₦X,XXX" with JetBrains Mono for the amount portion.

COMPLIANCE:
- All new user data collection: add consent_records entry.
- All new financial records: store amounts in kobo, never delete, anonymise only.
- Paystack webhook: HMAC-SHA512 verification before any processing. Zero exceptions.

QUALITY:
- npm run build passes before marking any task done.
- npx tsc --noEmit — zero TypeScript errors.
- npx next lint — zero warnings.
- Log session in .ai-system/checkpoints/session-log.md.
- Update .ai-system/planning/task-queue.md — mark [x] on completed tasks.
```

---

## ─── DESIGN FILE INDEX ───────────────────────────────────────────────────────

After completing all OD prompts, `.ai-system/designs/` must contain:

| File                             | Screen                                     | OD Prompt | OC Prompt      |
| -------------------------------- | ------------------------------------------ | --------- | -------------- |
| 01-design-system-tokens.html     | Token reference                            | OD-1      | SC-1 reference |
| 02-design-system-components.html | Component library                          | OD-1      | All OC prompts |
| 03-auth-flow.html                | Auth Gate / Register / Login               | OD-2      | OC-1           |
| 04-explore-feed.html             | Explore page (guest + auth)                | OD-3      | OC-3           |
| 05-provider-onboarding.html      | Provider onboarding wizard                 | OD-3      | OC-2           |
| 06-provider-profile.html         | Provider profile page                      | OD-4      | OC-2           |
| 07-booking-drawer.html           | Booking flow (3-step drawer)               | OD-5      | OC-4           |
| 08-escrow-timeline.html          | Escrow status (all 5 states)               | OD-5      | OC-4           |
| 09-drive-portfolio.html          | Google Drive portfolio UI                  | OD-6      | OC-2           |
| 10-admin-panel.html              | Admin panel (Config, Categories, Disputes) | OD-6      | OC-5           |
| 11-blog.html                     | Blog index + article page                  | OD-7      | OC-6           |
| 12-provider-dashboard.html       | Provider dashboard                         | OD-8      | OC-2 (new)     |
| 13-profile-edit.html             | Profile edit page                          | OD-9      | OC-2 (new)     |
| 14-client-dashboard.html         | Client dashboard                           | OD-10     | OC-1 (new)     |
| 15-messages.html                 | Messages page                              | OD-11     | OC-2 (Phase 2) |
| 16-category-browse.html          | Category browse page                       | OD-12     | OC-3 (new)     |
| 17-search-results.html           | Search results page                        | OD-13     | OC-3 (new)     |
| 18-booking-list.html             | Booking list page                          | OD-14     | OC-4 (new)     |
| 19-legal-pages.html              | Privacy / Terms / Cookie Policy            | OD-15     | OC-5, OC-7     |

---

_PROMPTS.md v1.2 — Crelab — July 2026_
