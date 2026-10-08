# In Progress

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-08 — avatar/media-toggle/bug-emails/builder, closed)
> - last-verified-against-code: 2026-10-08
> - staleness-policy: update after each major sub-step; clear on close

*(No active work — the "Profile Avatar + Media Toggle + Bug-Report Emails + Lossless Builder (2026-10-08)" task is **CLOSED**.)*

- **Status:** Directive addressed + static QA review — new `htmlToBlocks` tests added for CI (`vitest`), `tsc`/`build` to be confirmed in CI (no node_modules in this environment).
- **Full record:** `checkpoints/session-log.md` → Session 2026-10-08 (Profile Avatar, Media Upload Toggle, Bug-Report Emails + Lossless Email Builder).
- **Residual risks:** CI must run `npm ci && npm test && npm run typecheck && npm run build` before merge; Better Auth `updateUser({image})` assumes default `image` field.
