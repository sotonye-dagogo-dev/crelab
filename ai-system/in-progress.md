# In Progress

## Session: Cloudinary Asset Lifecycle — Cleanup, Admin & User Asset Management

**Directive:** Cleanup of failed/orphaned Cloudinary uploads; asset management in the
admin panel with confirmation modal + undo for destructive actions (universal reusable
components); user-side asset management with replacement/updating; Cloudinary env vars
advanced to conventional name/key/secret; `.env.example` updated; CRON_SECRET guidance.

### Plan

1. **lib/cloudinary.ts** — new env vars (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET`) with backward-compatible
   fallbacks to `NEXT_PUBLIC_CLOUDINARY_*`; signed admin operations (`deleteAsset`,
   publicId extraction); `CloudinaryAdminNotConfiguredError`; upload result now carries
   `publicId`/`cloudName`/`assetId`.
2. **DB** — `media_assets` registry table (schema + migration `0004_media_assets.sql`),
   `IMediaAsset` type.
3. **Config** — `mediaUpload.cleanupEnabled` + `mediaUpload.cleanupOrphanAfterHours`;
   surfaced in the admin config editor (media section).
4. **services/MediaAssetService.ts** — record uploads, list by owner / all, referenced-URL
   scan, orphan cleanup (older-than-threshold + unreferenced → Cloudinary delete), delete
   (clears references), replace (swap references + delete old binary). Pure helpers kept
   testable without DB.
5. **API routes** — `/api/media/upload` records assets (deletes on record failure);
   `/api/cron/media-cleanup` (CRON_SECRET); `/api/admin/media` (list + manual cleanup +
   delete); `/api/media/assets` (own list), `/api/media/assets/[id]` (delete),
   `/api/media/assets/[id]/replace` (multipart replace).
6. **Reusable UI** — `ClConfirmDialog` + `useUndoable` helper; adopted by
   `BatchOperations` and the admin team page (replaces native `confirm()`).
7. **Admin page** — `/admin/media` asset manager (table, preview, status, delete w/ confirm,
   manual "Run cleanup", batch delete via BatchToolbar). Sidebar nav entry added.
8. **User page** — `/profile/media` "My Media" manager (own assets, replace, delete).
   Middleware protect prefix added.
9. **.env.example** — Cloudinary vars advanced; CRON_SECRET guidance.
10. **Tests** — update `cloudinary.test.ts`; new `MediaAssetService.test.ts` (db mocked).
11. **QA gate** — `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
12. **Docs** — run update-ai-system.md (repo-map, dependency-graph, architecture,
    project-plan, dev-history, lessons-learned, task-queue, session-log, test-results).

### Decisions
- Orphan cleanup is registry-driven (no Cloudinary tag/list scanning): every upload is
  recorded in `media_assets`; the cleanup job deletes rows older than the configured
  threshold whose publicId is not referenced in `providers`/`portfolio_items`.
- Deleting a media asset clears its references (provider cover/avatar → null;
  portfolio items → row removed) and deletes the Cloudinary binary. Irreversible at the
  binary level, so delete flows use `ClConfirmDialog`; undo toasts are used for
  reversible destructive actions (team member delete, portfolio item removal).
