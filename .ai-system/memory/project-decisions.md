# Project Decisions

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: 2026-07-04
> - staleness-policy: each entry has its own staleness — check supersedes links

> **Overview:** Log of significant architectural, technical, and product decisions for Crelab.

---

## Decision Format

```
## [Decision Title]

**Decision:** [What was decided]
**Date:** [YYYY-MM-DD]
**Made by:** [Role / Agent / Developer]
**Supersedes:** [link to any prior decision this replaces, or None]
**Superseded by:** [link to any newer decision that replaces this, or None]

**Reason:**
[Why this choice was made]

**Alternatives Considered:**
[What else was evaluated and why it was rejected]

**Implications:**
[What this decision affects going forward]
```

---

## Decisions

## Launch Categories: Content Creators + Cinematographers

**Decision:** Launch with two categories — Content Creators and Cinematographers/Videographers. Category schema is admin-configurable JSONB — expansion requires zero code changes.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D1)
**Supersedes:** None
**Superseded by:** None

**Reason:** Focused launch scope. These two categories cover the highest-demand creative services based on primary survey data. Metadata-driven schema allows expansion without code changes.

**Alternatives Considered:** Launching with 5+ categories; single category. Both rejected — too broad or too narrow.

**Implications:** Admin panel needs a category manager with field schema builder. All category-specific UI must be rendered from config, not hardcoded.

---

## Payment Release Trigger: Hybrid Auto-Release

**Decision:** Hybrid model — auto-release 5 days post-service date unless client raises formal dispute. Client can also confirm and release early.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D2)
**Supersedes:** None
**Superseded by:** None

**Reason:** Balances provider need for guaranteed payment with client protection. Auto-release prevents funds being stuck indefinitely. Early release option gives clients control.

**Alternatives Considered:** Pure manual release (disputes could lock funds forever); pure auto-release (no client protection).

**Implications:** Cron endpoints needed for setInProgress and autoRelease. EscrowTimelineUI needs live countdown. Dispute window logic required.

---

## Platform Fee: 5%

**Decision:** 5% platform fee on completed transactions. Admin-configurable rate.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D3)
**Supersedes:** None
**Superseded by:** None

**Reason:** Competitive rate that funds escrow and dispute infrastructure. Paystack subaccount split deducts fee before provider payout.

**Alternatives Considered:** Tiered pricing; subscription model. Both rejected for simplicity at MVP.

**Implications:** Fee rate displayed prominently in booking flow. Paystack subaccount configuration needed. Fee displayed as platformConfig.feeRate — never hardcoded.

---

## Provider Profile Review: Soft Launch

**Decision:** Profiles go live immediately with "New" badge. Manual admin review within 48h. Abuse reports trigger suspension.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D4)
**Supersedes:** None
**Superseded by:** None

**Reason:** Reduces friction for provider onboarding while maintaining quality control. "New" badge signals to clients that profile is unverified.

**Alternatives Considered:** Hard gating (profiles hidden until review) — rejected as too slow for cold start.

**Implications:** Provider review queue in admin panel. Badge component for "New" state. Verification system in admin.

---

## Guest Browse, Gate Booking

**Decision:** Anyone can browse Explore and view profiles. Registration required to book or message.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D5)
**Supersedes:** None
**Superseded by:** None

**Reason:** Maximizes SEO and discovery while maintaining trust for transactions. Auth gate modal (not page redirect) preserves browsing context.

**Alternatives Considered:** Full gating (login wall) — rejected as it kills organic discovery.

**Implications:** AuthGate modal component needed. sessionStorage for pending action. Middleware protects only booking/messaging routes.

---

## Paystack Subaccount Model for Escrow

**Decision:** Use Paystack subaccount model where Crelab never holds user funds directly. Keeps Crelab outside direct CBN licensing requirements at MVP.
**Date:** 2026-07-04
**Made by:** Product (PRD v2.1 §9.3)
**Supersedes:** None
**Superseded by:** None

**Reason:** PCI SAQ A scope (lowest complexity). No CBN payment licence needed at MVP. Paystack handles all regulatory compliance for payment processing.

**Alternatives Considered:** Direct fund holding (requires CBN licence); Flutterwave-only (less Nigerian market penetration than Paystack).

**Implications:** Paystack webhook HMAC-SHA512 verification mandatory. Subaccount split configuration. Legal counsel required to confirm model before real money flows.

---

## All Money in Kobo (Integer)

**Decision:** All monetary values stored as integers (kobo). No floating point arithmetic on money anywhere in the codebase.
**Date:** 2026-07-04
**Made by:** Technical Lead (PRD v2.1 §7)
**Supersedes:** None
**Superseded by:** None

**Reason:** Floating point arithmetic on money causes rounding errors. Integer math is precise, auditable, and standard practice for financial systems.

**Alternatives Considered:** Decimal type in PostgreSQL; float with rounding. Both rejected as error-prone.

**Implications:** All DB columns are INTEGER with JSDoc comments specifying kobo. Services format to Naira for display only. Display layer divides by 100 for user-facing values.
