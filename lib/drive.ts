const DRIVE_FOLDER_REGEX =
  /^https?:\/\/(?:www\.)?drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/;

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  "video/mp4": "video/mp4",
  "video/webm": "video/webm",
  "video/quicktime": "video/quicktime",
  "video/x-msvideo": "video/x-msvideo",
  "video/x-matroska": "video/x-matroska",
  "video/3gpp": "video/3gpp",
  "video/3gpp2": "video/3gpp2",
  "video/x-flv": "video/x-flv",
  "video/mpeg": "video/mpeg",
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "image/avif": "image/avif",
  "image/heic": "image/heic",
  "image/heif": "image/heif",
  "application/pdf": "application/pdf",
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  thumbnailLink: string | null;
}

export interface DriveFileListResult {
  files: DriveFile[];
  nextPageToken: string | null;
}

export interface DriveFetchAllResult {
  files: DriveFile[];
  /** True when the folder holds more supported pages than the per-ingest item cap allowed us to fetch. */
  truncated: boolean;
  total: number;
}

export class DriveAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveAccessError";
  }
}

export class DriveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveValidationError";
  }
}

/**
 * Google enforces strict rate limits on the Drive API (20,000 queries/min per
 * Cloud Project, 1,200 queries/min per user/IP). Exceeding them surfaces as a
 * 429, or as a 403 whose body carries `rateLimitExceeded` / `userRateLimitExceeded`
 * / `quotaExceeded`. Extends DriveAccessError so pre-existing catch sites keep
 * working; callers that want distinct handling (abort a multi-provider sync,
 * return 503 with a retry hint) check it before the base class.
 */
export class DriveRateLimitError extends DriveAccessError {
  /** Suggested wait from Google's Retry-After header, when provided. */
  readonly retryAfterMs: number | undefined;

  constructor(message: string, opts?: { retryAfterMs?: number | undefined }) {
    super(message);
    this.name = "DriveRateLimitError";
    this.retryAfterMs = opts?.retryAfterMs;
  }
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Infra-level knobs (env-overridable; not admin UI — these bound API spend,
 * not product behaviour). Defaults sit well under Google's documented limits:
 * the per-minute cap is half the 1,200/user ceiling to leave headroom for
 * concurrent isolates, and the item cap keeps a single ingest bounded even
 * against a folder approaching Drive's 500k-item quota.
 *
 * NOTE (serverless caveat): the throttle state below is per-process/per-isolate.
 * On Vercel, concurrent isolates each get their own budget — the conservative
 * defaults + daily single cron run keep the aggregate safely under the limits.
 */
export const DRIVE_LIMITS = {
  get maxFilesPerFolder(): number {
    return envInt("DRIVE_MAX_FILES_PER_FOLDER", 500);
  },
  get maxRetries(): number {
    return envInt("DRIVE_FETCH_MAX_RETRIES", 3);
  },
  get retryBaseMs(): number {
    return envInt("DRIVE_FETCH_RETRY_BASE_MS", 750);
  },
  get minRequestIntervalMs(): number {
    return envInt("DRIVE_MIN_REQUEST_INTERVAL_MS", 200);
  },
  get maxRequestsPerMinute(): number {
    return envInt("DRIVE_MAX_REQUESTS_PER_MINUTE", 600);
  },
};

const RETRY_DELAY_CAP_MS = 30_000;
const SLIDING_WINDOW_MS = 60_000;

let lastRequestAt = 0;
const requestTimestamps: number[] = [];

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Test hook: clear throttle bookkeeping between cases. */
export function __resetDriveThrottleForTests(): void {
  lastRequestAt = 0;
  requestTimestamps.length = 0;
}

/**
 * Per-process pacing for Drive API calls: minimum spacing between requests
 * plus a sliding one-minute window cap. Waits (rather than rejects) when the
 * budget is spent, so a sync degrades to "slower" instead of "failed".
 */
async function acquireDriveRequestSlot(): Promise<void> {
  const minInterval = DRIVE_LIMITS.minRequestIntervalMs;
  const cap = DRIVE_LIMITS.maxRequestsPerMinute;

  let waitMs = 0;
  for (;;) {
    const now = Date.now();
    while (requestTimestamps.length > 0 && requestTimestamps[0] <= now - SLIDING_WINDOW_MS) {
      requestTimestamps.shift();
    }
    waitMs = 0;
    if (minInterval > 0 && lastRequestAt > 0 && now - lastRequestAt < minInterval) {
      waitMs = Math.max(waitMs, minInterval - (now - lastRequestAt));
    }
    if (cap > 0 && requestTimestamps.length >= cap) {
      waitMs = Math.max(waitMs, requestTimestamps[0] + SLIDING_WINDOW_MS - now + 1);
    }
    if (waitMs <= 0) break;
    await sleep(waitMs);
  }
  const recordedAt = Date.now();
  lastRequestAt = recordedAt;
  requestTimestamps.push(recordedAt);
}

function parseRetryAfterMs(res: Response): number | null {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

function isRateLimitBody(body: string): boolean {
  const b = body.toLowerCase();
  return (
    b.includes("ratelimitexceeded") ||
    b.includes("userratelimitexceeded") ||
    b.includes("rate limit") ||
    b.includes("too many requests") ||
    b.includes("quotaexceeded")
  );
}

function retryDelayMs(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs !== null) return Math.min(Math.max(retryAfterMs, 0), RETRY_DELAY_CAP_MS);
  const base = DRIVE_LIMITS.retryBaseMs;
  const backoff = base * 2 ** attempt;
  const jitter = base > 0 ? Math.floor(Math.random() * base) : 0;
  return Math.min(backoff + jitter, RETRY_DELAY_CAP_MS);
}

export function parseFolderId(url: string): string | null {
  const match = url.match(DRIVE_FOLDER_REGEX);
  return match ? match[1] : null;
}

export function validateFolderUrl(url: string): boolean {
  return DRIVE_FOLDER_REGEX.test(url);
}

export function isSupportedMimeType(mimeType: string): boolean {
  return mimeType in SUPPORTED_MIME_TYPES;
}

export function getSupportedMimeType(mimeType: string): string | null {
  return SUPPORTED_MIME_TYPES[mimeType] ?? null;
}

/**
 * Build the stable, UNSIGNED Drive thumbnail endpoint for a file id.
 * Unlike the API's `thumbnailLink` (a signed googleusercontent.com URL that
 * typically expires within the hour — the "hot-link expiry trap"), this
 * endpoint takes no signature and keeps working for publicly shared files
 * (which the API-key integration requires anyway). Safe to cache forever.
 */
export function buildStableDriveThumbnailUrl(fileId: string, sizePx = 600): string | null {
  const id = fileId?.trim();
  if (!id) return null;
  const size =
    Number.isFinite(sizePx) && sizePx > 0 ? Math.min(Math.round(sizePx), 2000) : 600;
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${size}`;
}

/** True for the signed, short-lived thumbnail URLs Google hands out via the API. */
export function isExpiringDriveThumbnailUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("googleusercontent.com");
}

/**
 * Client-side healing helper: for a DRIVE portfolio row whose cached thumbnail
 * is a legacy signed URL (predates stable-URL storage), returns the stable
 * replacement so renderers can retry once before giving up. Returns null when
 * no heal is applicable (non-Drive rows, already-stable URLs, missing id).
 */
export function driveThumbnailHealSrc(item: {
  source: string;
  driveFileId: string | null;
  thumbnailUrl: string | null;
}): string | null {
  if (item.source !== "DRIVE" || !item.driveFileId) return null;
  if (!isExpiringDriveThumbnailUrl(item.thumbnailUrl)) return null;
  return buildStableDriveThumbnailUrl(item.driveFileId);
}

export async function fetchFileList(
  folderId: string,
  pageToken?: string | undefined,
): Promise<DriveFileListResult> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,webViewLink,thumbnailLink),nextPageToken",
    orderBy: "name_natural",
    pageSize: "100",
    key: apiKey,
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  const maxRetries = DRIVE_LIMITS.maxRetries;
  let attempt = 0;

  for (;;) {
    await acquireDriveRequestSlot();

    let res: Response;
    try {
      res = await fetch(url);
    } catch (networkErr) {
      if (attempt < maxRetries) {
        await sleep(retryDelayMs(attempt, null));
        attempt++;
        continue;
      }
      throw new DriveAccessError(
        `Failed to reach Google Drive: ${networkErr instanceof Error ? networkErr.message : "Network error"}`,
      );
    }

    if (res.ok) {
      const data = await res.json();
      return {
        files: (data.files ?? []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          name: f.name as string,
          mimeType: f.mimeType as string,
          webViewLink: f.webViewLink as string,
          thumbnailLink: (f.thumbnailLink as string) ?? null,
        })),
        nextPageToken: data.nextPageToken ?? null,
      };
    }

    const body = await res.text().catch(() => "");
    const retryAfterMs = parseRetryAfterMs(res);
    const rateLimited =
      res.status === 429 || (res.status === 403 && isRateLimitBody(body));

    if (rateLimited) {
      if (attempt < maxRetries) {
        await sleep(retryDelayMs(attempt, retryAfterMs));
        attempt++;
        continue;
      }
      throw new DriveRateLimitError(
        "Google Drive is rate-limiting requests. Please wait a few minutes and try again.",
        { retryAfterMs: retryAfterMs ?? undefined },
      );
    }

    if (res.status === 404) {
      throw new DriveAccessError("Folder not found or not accessible");
    }
    if (res.status === 403) {
      throw new DriveAccessError(
        "Folder is private or sharing settings prevent access",
      );
    }
    throw new DriveAccessError(
      `Google Drive API error: ${res.status}${body ? ` - ${body}` : ""}`,
    );
  }
}

/**
 * Fetch every file in a folder, paginating through the Drive API — but never
 * beyond `maxFiles` (default DRIVE_MAX_FILES_PER_FOLDER). Drive folders cap at
 * 500,000 items; without this bound a single ingest could fire thousands of
 * page requests and blow the project rate budget. `truncated` tells the caller
 * (and, via ingest results, the user) that the cap was hit.
 */
export async function fetchAllFiles(
  folderId: string,
  opts?: { maxFiles?: number | undefined },
): Promise<DriveFetchAllResult> {
  const maxFiles = Math.max(1, opts?.maxFiles ?? DRIVE_LIMITS.maxFilesPerFolder);
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;
  let truncated = false;

  do {
    const result = await fetchFileList(folderId, pageToken);
    const remaining = maxFiles - allFiles.length;
    const take = Math.min(result.files.length, remaining);
    allFiles.push(...result.files.slice(0, take));

    if (take < result.files.length) {
      truncated = true;
      break;
    }
    if (result.nextPageToken && allFiles.length >= maxFiles) {
      truncated = true;
      break;
    }
    pageToken = result.nextPageToken ?? undefined;
  } while (pageToken);

  return { files: allFiles, truncated, total: allFiles.length };
}
