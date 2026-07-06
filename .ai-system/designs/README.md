# Design Artifacts

This directory contains design-system reference files used during AI-assisted development.

| File | Description |
|------|-------------|
| `01-design-system-tokens.html` | Colour tokens for dark & light themes, typography scale, spacing |
| `02-design-system-components.html` | Navbar, footer, theme toggler, buttons, and other UI primitives |
| `03-design-system-team-page.html` | Team/"Meet the Team" page design with member cards |

## Usage

Open any `.html` file in a browser to view the interactive design reference.  
Each file includes a built-in theme toggle to preview both dark and light modes.

## Conventions

- Files are numbered sequentially (`01-`, `02-`, `03-`) in order of dependency.
- Each file is self-contained (embedded CSS + JS) for easy preview.
- The actual implementation lives in `app/` and `components/` — these files are design specifications only.
