# In Progress

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-08 — referral surfaces + team hiring config, closed)
> - last-verified-against-code: 2026-10-08
> - staleness-policy: update after each major sub-step; clear on close

*(No active work — the "Referral Surfaces + Team Hiring Config (2026-10-08)" task is **CLOSED**.)*

- **Status:** Directive addressed + QA gate passed — `vitest` 431/431 · `tsc --noEmit` clean · `next lint` 0 errors · `next build` green.
- **Full record:** `checkpoints/session-log.md` → Session 2026-10-08 (Referral Discovery Links + Auth-Agnostic Claim + Config-Driven Team Hiring Block).
- **Residual risks:** none. Claim stays idempotent (unique index), so the extra triggers cannot double-award; cookie cleared post-claim.
