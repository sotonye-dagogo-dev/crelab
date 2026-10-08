# In Progress

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-08 — public-pages team/webinars re-verification, closed)
> - last-verified-against-code: 2026-10-08
> - staleness-policy: update after each major sub-step; clear on close

*(No active work — the "Public-Pages Team/Webinars Re-verification (2026-10-08)" task is **CLOSED**.)*

- **Status:** All directive items addressed + QA gate passed — `vitest` 424/424 · `tsc --noEmit` clean · `next lint` 0 errors (pre-existing warnings only) · `next build` green (all public routes `ƒ` dynamic).
- **Full record:** `checkpoints/session-log.md` → Session 2026-10-08 (Public-Pages Team/Webinars Re-verification).
- **Residual risks:** none new. If `/team` reads empty with rows present: check the row's `active` flag, server logs (`[TeamPage]`/`[GET /api/team]`), and `GET /api/team` directly (page + API share `TeamService.listPublic`).
