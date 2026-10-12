# In Progress

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-12 — wired webinar + newsletter emails, closed)
> - last-verified-against-code: 2026-10-12
> - staleness-policy: update after each major sub-step; clear on close

*(No active work — the "Wired Emails: Webinar Registration + Newsletter Subscribe (2026-10-12)" task is **CLOSED**.)*

- **Status:** Directive addressed + full QA — wired `newsletterSubscription` template + `sendNewsletterSubscription` + newsletter-route welcome (new opt-ins only) + webinar checkbox welcome (in-transaction newly-granted flag, guest new-seat path); webinar confirmation semantics unchanged; `vitest` 467/467, `tsc` clean, `lint` 0 errors, `next build` green.
- **Full record:** `checkpoints/session-log.md` → Session 2026-10-12 (Wired Emails: Webinar Registration + Newsletter Subscribe).
- **Residual risks:** guest cross-webinar double welcome (no guest subscriber store — per-registration consent only); concurrent double-submit duplicate welcome (best-effort, harmless, no seat/consent corruption).
