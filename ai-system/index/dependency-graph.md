# Dependency Graph

> **Metadata**
> - last-updated-by: update-ai-system (Session 28)
> - last-verified-against-code: 2026-08-18
> - staleness-policy: auto-regenerable — can be derived from import analysis tools. Manual content only for conventions and rules that cannot be inferred from code.

> **Overview:** Maps how modules depend on each other. Agents use this to understand the impact of changes.

---

## Module Dependency Map

```
Page / Route Components
  → Feature Components (explore/, profile/, booking/, admin/, shared/)
  → UI Wrappers (components/ui/Cl*)
  → Hooks (useAuth, TanStack Query)
  → Services (via server components or API routes)
  → Config (via ConfigContext from lib/)

UI Wrappers (Cl*)
  → shadcn/ui primitives (isolated behind Cl* interface)
  → Tailwind CSS (design tokens via CSS custom properties)

Feature Components (explore, profile, booking, admin)
  → UI Wrappers (Cl*)
  → Types
  → lib/config-context.tsx (ConfigContext)

Services
  → lib/db.ts (Drizzle + postgres client)
  → Types (interfaces, enums)
  → Drizzle ORM (drizzle/schema.ts — database operations)
  → Lib wrappers (paystack, cloudinary, drive)
  → PlatformConfigService (config lookups)

API Routes
  → Services (business logic)
  → Lib (auth helpers)
  → Types (request/response types)

PlatformConfigService
  → lib/db.ts (DB client)
  → config/platform.config.ts (fallback default)
  → Drizzle schema (platform_config + audit_log tables)
  → Next.js unstable_cache / revalidateTag
  → setNestedValue(target, path, value) deep-sets dotted config keys when merging DB rows in get(); null values skipped so defaults never clobbered

DashboardService
  → lib/db.ts (Drizzle + postgres client)
  → drizzle/schema.ts (providers, bookings, portfolio_items, service_packages, user, wallets, payments)
  → drizzle-orm (eq, and, sql, gte)
  → PlatformConfigService (availabilityLookaheadDays config)
  → MockDataService (fallback mock dashboards when NEXT_PUBLIC_MOCK_DATA=true)
  → ExploreService (queryExploreCards for client discover rail)
  → lib/currency.ts (formatKobo for display values)
  → types/dashboard.ts (IProviderDashboard, IClientDashboard, pipeline/stats/availability types) + BookingStatus, ExploreSort

EmailService (+ isResendConfigured / getResendConfig / getResendSender + DEFAULT_FROM_EMAIL + sendVerifyEmail / sendEmailChanged / sendTemplate + sendResetPassword path via Better Auth)
  → config/platform.config.ts (DEFAULT_CONFIG email templates + fromName/fromEmail — subdomain sender default)
  → types/index.ts (IEmailTemplate, IPlatformConfig, EmailTemplateBlock)
  → lib/url.ts (resolveAbsoluteUrl for logoUrl + resolveRelativeUrlsInHtml on the final filled HTML)
  → lib/email-blocks.ts (blocksToHtml for Visual-editor templates; substituteSampleVars for previews)
  → lib/email-templates.ts (resolveEmailTemplate/resolveEmailConfig — hardcoded defaults apply when a template wasn't saved to DB)
  → global fetch → https://api.resend.com/emails (raw HTTP, no SDK)
  → env RESEND_API_KEY + RESEND_FROM_NAME + RESEND_FROM_EMAIL (read at call time; preview fallback when absent)
  → consumed by app/api/email/send + app/api/email/welcome + app/api/email/status + app/api/verify-email/send + app/api/verify-email/welcome + app/api/admin/email/send

Wired email templates (lib/email-templates.ts)
  → leaf module — WIRED_EMAIL_TEMPLATES map (welcome/verifyEmail/emailChanged/bookingConfirmation/paymentReceived/passwordReset, each with label + trigger) + isWiredEmailTemplate(key) + resolveEmailTemplates/resolveEmailTemplate/resolveEmailConfig (defaults merged under DB-saved templates)
  → consumed by app/api/admin/email/send (rejects wired keys for test-send + broadcast; resolver for known-template check) + app/admin/email-templates/page.tsx (badge + Simulate-only UX) + app/api/verify-email/send (enabled check) + services/PlatformConfigService (emailConfig merge) + services/EmailService (send fallback)

BlogPostService (blog post CRUD + content-source merge)
  → lib/db.ts (Drizzle + postgres client)
  → drizzle/schema.ts (blog_posts table) + drizzle-orm (and, desc, eq, ne)
  → lib/blog-fallback.ts (getFallbackPosts/getFallbackPostBySlug/getFallbackRelatedPosts/getFallbackPostSlugs)
  → lib/sanity.ts (dynamic import — getAllPosts/getPostBySlug/getRelatedPosts/getAllSlugs)
  → types/blog.ts (IBlogPost, BlogCategory) + types/index.ts (EmailTemplateBlock content)
  → consumed by app/api/admin/blog-posts (+ [id]) + app/(public)/blog/page.tsx + app/(public)/blog/[slug]/page.tsx + app/sitemap.ts + components/blog/BlogCard.tsx

Blog post image helper (lib/blog-hero.ts)
  → leaf module — getPostHeroUrl(heroImage): resolves plain URL or Sanity `image-` ref to an absolute URL
  → consumed by components/blog/BlogCard.tsx + app/(public)/blog/[slug]/page.tsx

Admin blog posts
  → app/api/admin/blog-posts/route.ts (GET list / POST create) + [id]/route.ts (PATCH update / DELETE) → BlogPostService
  → app/admin/blog-posts/page.tsx (ClDataTable list + modal editor: live slugify, tags, meta description, publish toggle, confirm delete) → components/admin/ImageUploadField

ImageUploadField (components/admin)
  → app/api/media/upload (Cloudinary upload) with paste-URL fallback (storage-agnostic)
  → used by app/admin/blog-posts/page.tsx (hero image)

MediaAssetService (registry-driven media asset lifecycle)
  → lib/db.ts (Drizzle + postgres client)
  → drizzle/schema.ts (media_assets table) + drizzle-orm (and, desc, eq, isNotNull, like, lt, or)
  → lib/cloudinary.ts (deleteAsset, publicId extraction — signed admin ops via fetch to Cloudinary Admin API)
  → PlatformConfigService (mediaUpload.cleanupEnabled + cleanupOrphanAfterHours)
  → types/index.ts (IMediaAsset)
  → consumed by app/api/media/upload (records on upload), app/api/media/assets (+ [id] delete, [id]/replace), app/api/admin/media (+ [id]), app/api/cron/media-cleanup

Cloudinary flows
  → lib/cloudinary.ts — raw fetch → https://api.cloudinary.com/v1_1/{cloudName}/{image,upload,video}/upload + Admin API (delete by public_id). Reads env at call time: CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET/UPLOAD_PRESET with NEXT_PUBLIC_CLOUDINARY_* fallbacks. No SDK dependency.
  → consumed by app/api/media/upload + app/api/admin/media/[id] + services/MediaAssetService

Auth (Better Auth)
  → Better Auth standalone instance (lib/auth.ts)
  → Drizzle adapter → drizzle/schema.ts (user, session, account, verification)
  → next/headers (getSession forwards the current request headers — never an empty Headers())
  → hooks/useAuth.ts (client-side hook; signUp POSTs /api/verify-email/send instead of /api/email/welcome)
  → lib/oauth.ts (OAuth callback routing helpers + role guard)
  → app/api/auth/role (self-assignable role endpoint)
  → middleware.ts (route protection — protectedPrefixes now includes /profile)
  → emailVerification plugin (sendOnSignUp false, autoSignInAfterVerification true, expiresIn 3600, custom sendVerificationEmail via sendTransactionalEmail helper)
  → user.changeEmail (enabled + sendChangeEmailConfirmation via sendTransactionalEmail)
  → emailAndPassword.sendResetPassword → sendTransactionalEmail("passwordReset") (uses {{resetUrl}} var)

Lib Module
  → Third-party SDKs (Paystack, Cloudinary, Google Drive, postgres, Supabase)
  → Types (input/output types)
  → crypto (HMAC-SHA512 webhook verification)
  → blog-fallback.ts is a standalone leaf module — no dependencies beyond types/blog.ts
  → errors.ts is a leaf module — no dependencies beyond node's Error (imported by WalletService, MilestoneService, and integrations)
  → lib/url.ts is a leaf module — appOrigin() (NEXT_PUBLIC_APP_URL → VERCEL_URL → http://localhost:3000) + resolveAbsoluteUrl() (prefixes relative paths, leaves http/https/`//` unchanged) + resolveUrlForRender() (resolves relative, leaves `{{tokens}}` intact) + resolveRelativeUrlsInHtml() (rewrites relative `img src`/`a href`); consumed by EmailService + app/layout.tsx + lib/email-blocks.ts + components/blog/ContentBlocks.tsx
  → lib/seo.ts → types/index.ts (IPlatformConfig) + lib/url.ts (absolute logo/canonical) — buildSeoMetadata() consumed by app/layout.tsx + per-page generateMetadata
  → lib/email-blocks.ts is a leaf module — blocksToHtml() serializes EmailTemplateBlock[] to inline-styled HTML + substituteSampleVars()/SAMPLE_EMAIL_VARS/previewVarsFor for previews (relative URLs resolved via lib/url resolveRelativeUrlsInHtml); consumed by EmailService + app/admin/email-templates

Email verify flow (verify-email)
  → app/api/verify-email/send/route.ts (POST → auth.api.sendVerificationEmail with callbackURL "/verify-email?done=1")
  → app/api/verify-email/welcome/route.ts (fires welcome email once session user is emailVerified)
  → app/(public)/verify-email/page.tsx (verify/resend form with 60s cooldown + done=1 success state firing the welcome POST)
  → hooks/useAuth.ts (signUp triggers /api/verify-email/send)

Newsletter
  → app/api/newsletter/route.ts (signed-in users get a granted MARKETING consent record)
  → app/(public)/blog/page.tsx + BlogPageClient.tsx (newsletter section + config-driven hero title/subtitle)
  → app/admin/blog-templates/page.tsx (edits blogConfig with live preview)

Admin email send
  → app/api/admin/email/send/route.ts (test-send + broadcast to MARKETING-consented users) → EmailService
  → wired templates (lib/email-templates.ts isWiredEmailTemplate) rejected — preview/simulate only
  → app/admin/email-templates/page.tsx (Visual/HTML/Preview tabs + editable template name via EmailTemplateBlocksEditor → ContentBlocksEditor; wired badge/Simulate/banner)

Admin user management
  → app/api/admin/users/route.ts (GET search/list) + app/api/admin/users/[id]/route.ts (PATCH role/emailVerified, DELETE with self-guard)
  → app/admin/users/page.tsx (search, role select, verify toggle, delete confirm)

UI Wrappers (Cl*)
  → ClBackButton.tsx — hydration-safe history.back with fallback href (click-interception, no typeof window in render)
  → consumed by app/(auth)/profile/page.tsx + profile/media + profile/setup + bookings list/detail + wallet
  → ClDataTable.tsx + ClPagination.tsx — config-driven reusable table (ClColumn<T>[] with hideOnMobile/checkbox columns, client-side pagination + useEffect page-clamp on data shrink, horizontal scroll, empty state) + pagination control (first/prev/next/last, ellipsis, "Showing x–y of z")
  → consumed by app/admin/{users,media,providers,team,categories,config}/page.tsx

Admin sidebar (components/admin)
  → AdminSidebar.tsx — nav + sign-out; props collapsed (72px icon-only rail) / mobileOpen / onToggle / onMobileClose
  → AdminShell.tsx — owns collapse state (localStorage `admin-sidebar-collapsed`), mobile top bar + backdrop, `lg:ml-[240px]`/`lg:ml-[72px]` main offset
  → app/admin/layout.tsx renders <AdminShell>

ContentBlocksEditor (components/admin) — shared visual block builder
  → types/index.ts (EmailTemplateBlock)
  → block types: heading/paragraph/list/button/image/divider; add/remove/reorder, per-block variable insert, optional preview vars
  → consumed by EmailTemplateBlocksEditor.tsx (thin email wrapper) + app/admin/blog-templates/page.tsx (Content Sections → IBlogConfig.sections)

Blog content sections
  → components/blog/ContentBlocks.tsx renders EmailTemplateBlock[] sections (heading/paragraph/list/button/image/divider); image `src`/button `href` resolved absolute via lib/url resolveUrlForRender
  → consumed by app/(public)/blog/BlogPageClient.tsx (renders cfg.sections) — config-driven like the rest of blogConfig

Blog posts (DB-backed)
  → BlogPostService merges blog_posts (DB) → Sanity posts → fallback posts, deduped by slug (admin/DB wins); admin CRUD at /api/admin/blog-posts
  → app/(public)/blog/page.tsx + [slug]/page.tsx read via BlogPostService — block-content detected by `type` (EmailTemplateBlock[] → BlocksContent/ContentBlocks) vs `_type` (Sanity portable text → ArticleBody); hero via getPostHeroUrl
  → app/sitemap.ts + components/blog/BlogCard.tsx use BlogPostService.getAllSlugs

Drizzle
   → drizzle/schema.ts (single source of truth — exports all tables (incl. blog_posts), enums, relations)
  → postgres driver (lib/db.ts)
  → drizzle-kit (migrations)
```

---

## External Dependencies

| Package | Purpose | Used In |
|---------|---------|---------|
| next | Framework | app/, pages, middleware |
| postgres | PostgreSQL driver | lib/db.ts |
| drizzle-orm | ORM, schema, relations | drizzle/, services/ |
| tsx | TypeScript execution engine | scripts/ (seed, rollback) |
| dotenv | Environment variable loading | scripts/ (seed, rollback) |
| better-auth | Authentication + plugins | lib/auth.ts |
| @better-auth/infra | Dash dashboard plugin + sentinel security | lib/auth.ts |
| @tanstack/react-query | Client data fetching | hooks/useAuth.ts, app/page.tsx |
| framer-motion | Animation | components/ |
| tailwindcss | Styling | app/, components/ |
| shadcn/ui (via Cl* wrappers) | UI primitives (wrapped) | components/ui/ |
| zod | Schema validation (package.json) | — |
| Cloudinary (via lib/cloudinary.ts raw fetch — no SDK) | Media upload, thumbnail, signed delete | lib/cloudinary.ts, app/api/media/upload, app/api/admin/media/[id] |
| Google Drive API (raw fetch — no SDK import in lib/drive.ts) | Google Drive portfolio sync | lib/drive.ts, services/DriveService.ts |
| @sanity/client, @sanity/image-url (via next-sanity) | Sanity CMS content fetching + image URL builder | lib/sanity.ts, sanity/, app/(public)/blog/ |
| resend | Transactional email (raw HTTP, no SDK) | services/EmailService.ts |
| Not yet wired: Paystack SDK, Mux SDK, Flutterwave | — | — |

---

## Circular Dependency Warnings

[None detected]

---

## Dependency Rules

- Pages may depend on Components, Services, and Hooks — not the other way around
- Services may depend on Lib, Types, and Drizzle — not the other way around
- Components/ui (Cl* wrappers) must not depend on feature components
- Lib must not depend on Services or Components
- Types must have zero dependencies on application code
- Config must not depend on any application code (only used by it)
- Third-party SDKs must only be imported in lib/ — never directly in services or components
