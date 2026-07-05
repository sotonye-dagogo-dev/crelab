# Lessons Learned

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05 (OC-7 reconciliation)
> - staleness-policy: each entry has its own staleness — check supersedes links

> **Overview:** Practical knowledge accumulated during Crelab development. Tracks development process insights and architectural wisdom. Uses supersedes/superseded-by links for evolving practices.

---

## Entry Format

```
## [Lesson Title]

**Context:**
[What situation this came from]

**What We Learned:**
[The insight or pattern discovered]

**Apply When:**
[When future agents/developers should use this knowledge]

**Supersedes:** [link to any prior lesson this replaces, or None]
**Superseded by:** [link to any newer lesson that replaces this, or None]
```

---

## Lessons

## Cursor Pagination with Composite Keys

**Context:** Explore feed needed stable pagination that doesn't drift when new providers are added.

**What We Learned:** Composite cursor using `(createdAt, id)` encoded in base64url works well. Fetch `limit+1` rows — if you get `limit+1`, there are more pages. The cursor encodes the last item's values for the pagination `WHERE` clause.

**Apply When:** Any infinite scroll or cursor-paginated list (explore, search results, admin tables).

**Supersedes:** None
**Superseded by:** None

---

## raw-body for Paystack Webhook HMAC Verification

**Context:** Paystack sends webhook payloads that must be verified with HMAC-SHA512 before processing.

**What We Learned:** Next.js API routes parse JSON body automatically, but HMAC needs the raw body string. Must use route handler config `export const config = { api: { bodyParser: false } }` or re-stringify. Using `crypto.timingSafeEqual` prevents timing attacks on signature comparison.

**Apply When:** Implementing Paystack webhook handlers or any HMAC-signed webhook.

**Supersedes:** None
**Superseded by:** None

---

## Drizzle ORM: Relations After Tables

**Context:** Creating 14 tables with relations in a single schema file.

**What We Learned:** Drizzle requires all referenced tables to be defined before `relations()` calls. The `relations()` function must come after all `pgTable()` calls. Each relation explicitly declares `fields` and `references` — no magic inference.

**Apply When:** Any Drizzle schema with foreign key relations.

**Supersedes:** None
**Superseded by:** None

---

## Next.js App Router: Server Components Need Async Data

**Context:** Root layout needs PlatformConfig from DB before rendering children.

**What We Learned:** Server components can `await` data fetching directly (no `useEffect`). Root layout `layout.tsx` uses `async function RootLayout` with `PlatformConfigService.getCached()`. Falls back to `DEFAULT_CONFIG` if DB fails so the app doesn't crash on cold start.

**Apply When:** Any server component or layout that needs async data.

**Supersedes:** None
**Superseded by:** None
