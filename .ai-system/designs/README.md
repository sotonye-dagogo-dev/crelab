# Design Artifacts

This directory contains design-system reference files used during AI-assisted development.

| File | Description |
|------|-------------|
| `01-design-system-tokens.html` | Colour tokens for dark & light themes, typography scale, spacing |
| `02-design-system-components.html` | Navbar, footer, theme toggler, buttons, and other UI primitives |
| `03-design-system-team-page.html` | Team/"Meet the Team" page design with member cards |
| `03-auth-flow.html` | Auth gate, registration (2-step), login with email/phone/OTP |
| `04-explore-feed.html` | Explore feed with video cards, filter bar, guest hero |
| `05-provider-onboarding.html` | Provider onboarding flow (5-step setup wizard) |
| `06-provider-profile.html` | Provider profile hero, portfolio grid, packages, booking sidebar |
| `07-booking-drawer.html` | Booking flow drawer with escrow summary |
| `08-escrow-timeline.html` | Escrow state machine timeline visualization |
| `09-drive-portfolio.html` | Google Drive portfolio sync integration |
| `10-admin-panel.html` | Admin panel dashboard layout |
| `11-blog.html` | Blog listing and article detail pages |
| `12-provider-dashboard.html` | Provider dashboard with analytics |
| `13-profile-edit.html` | Profile editing page |
| `14-client-dashboard.html` | Client dashboard |
| `15-messages.html` | Messaging system |
| `16-category-browse.html` | Category browsing page |
| `17-search-results.html` | Search results page |
| `18-booking-list.html` | Booking list page |
| `19-legal-pages.html` | Privacy & Terms pages |
| `20-team.html` | Refined Team page (NavBar, ClFooter, ClCard, ClBadge, ClButton, ClThemeToggle, TeamMemberCard, skeleton loading, values section, stats bar) |

## Usage

Open any `.html` file in a browser to view the interactive design reference.  
Each file includes a built-in theme toggle to preview both dark and light modes.

## Conventions

- Files are numbered sequentially (`01-`, `02-`, `03-`) in order of dependency. Higher numbers are refinements or new pages.
- Each file is self-contained (embedded CSS + JS) for easy preview.
- The actual implementation lives in `app/` and `components/` — these files are design specifications only.
- Light theme is supported via `.light` class overrides on CSS custom properties, included in all design files.
