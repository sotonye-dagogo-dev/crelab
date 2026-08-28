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

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
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

export async function fetchAllFiles(folderId: string): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const result = await fetchFileList(folderId, pageToken);
    allFiles.push(...result.files);
    pageToken = result.nextPageToken ?? undefined;
  } while (pageToken);

  return allFiles;
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
