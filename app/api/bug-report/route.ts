import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bugReports } from "@/drizzle/schema";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/cloudinary";

const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024; // 8 MB per screenshot

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const bodySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  stepsToReproduce: z.string().max(5000).optional(),
  expectedBehavior: z.string().max(2000).optional(),
  actualBehavior: z.string().max(2000).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  pageUrl: z.string().max(1000).optional(),
  reporterEmail: z.string().email().max(254).optional().or(z.literal("")),
  reporterName: z.string().max(120).optional(),
  screenshotUrls: z.array(z.string().url().max(2000)).max(MAX_SCREENSHOTS).optional(),
});

function isFormDataRequest(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") ?? "";
  return ct.includes("multipart/form-data");
}

export async function POST(req: NextRequest) {
  try {
    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent") ?? null;

    // Optional auth — attach userId when logged in, but allow anonymous reports
    let sessionUser: { id: string; email: string; name: string } | null = null;
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session?.user) {
        sessionUser = { id: session.user.id, email: session.user.email, name: session.user.name };
      }
    } catch {
      // No session — anonymous report is allowed
    }

    let parsed: z.infer<typeof bodySchema>;
    let screenshotUrls: string[] = [];

    if (isFormDataRequest(req)) {
      const form = await req.formData();
      const raw: Record<string, unknown> = {
        title: form.get("title") ?? "",
        description: form.get("description") ?? "",
        stepsToReproduce: form.get("stepsToReproduce") ?? undefined,
        expectedBehavior: form.get("expectedBehavior") ?? undefined,
        actualBehavior: form.get("actualBehavior") ?? undefined,
        severity: form.get("severity") ?? undefined,
        pageUrl: form.get("pageUrl") ?? undefined,
        reporterEmail: form.get("reporterEmail") ?? undefined,
        reporterName: form.get("reporterName") ?? undefined,
      };
      // screenshotUrls may be sent as JSON string or repeated fields
      const urlsRaw = form.get("screenshotUrls");
      if (typeof urlsRaw === "string" && urlsRaw) {
        try {
          const arr = JSON.parse(urlsRaw);
          if (Array.isArray(arr)) raw.screenshotUrls = arr;
        } catch {
          // ignore malformed
        }
      }
      const check = bodySchema.safeParse(raw);
      if (!check.success) {
        return NextResponse.json(
          { success: false, data: null, error: check.error.flatten().fieldErrors },
          { status: 400 },
        );
      }
      parsed = check.data;

      // Handle file uploads — accept "screenshots", "screenshot", or "files"
      const fileKeys = ["screenshots", "screenshot", "files", "file"];
      const files: File[] = [];
      for (const k of fileKeys) {
        for (const v of form.getAll(k)) {
          if (v instanceof File && v.size > 0) files.push(v);
        }
      }
      // Deduplicate by name+size
      const seen = new Set<string>();
      const uniqueFiles = files.filter((f) => {
        const key = `${f.name}:${f.size}:${f.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueFiles.length > MAX_SCREENSHOTS) {
        return NextResponse.json(
          { success: false, error: `Maximum ${MAX_SCREENSHOTS} screenshots allowed. You sent ${uniqueFiles.length}.` },
          { status: 400 },
        );
      }

      for (const file of uniqueFiles) {
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          return NextResponse.json(
            { success: false, error: `Unsupported screenshot type: ${file.type}. Use JPEG, PNG, WebP, GIF, AVIF or HEIC.` },
            { status: 400 },
          );
        }
        if (file.size > MAX_SCREENSHOT_BYTES) {
          return NextResponse.json(
            { success: false, error: `Screenshot "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — limit is ${MAX_SCREENSHOT_BYTES / 1024 / 1024} MB per image.` },
            { status: 400 },
          );
        }
      }

      // Upload each screenshot to Cloudinary (public, no auth required)
      for (const file of uniqueFiles) {
        try {
          const result = await uploadFile(file, file.type);
          screenshotUrls.push(result.url);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return NextResponse.json(
            { success: false, error: `Failed to upload screenshot "${file.name}": ${msg}` },
            { status: 500 },
          );
        }
      }
      // Merge any pre-uploaded URLs passed alongside files
      if (parsed.screenshotUrls?.length) {
        screenshotUrls = [...parsed.screenshotUrls, ...screenshotUrls].slice(0, MAX_SCREENSHOTS);
      }
    } else {
      const json = await req.json();
      const check = bodySchema.safeParse(json);
      if (!check.success) {
        return NextResponse.json(
          { success: false, data: null, error: check.error.flatten().fieldErrors },
          { status: 400 },
        );
      }
      parsed = check.data;
      screenshotUrls = parsed.screenshotUrls ?? [];
    }

    const reporterEmail = (parsed.reporterEmail && parsed.reporterEmail.trim()) || sessionUser?.email || null;
    const reporterName = (parsed.reporterName && parsed.reporterName.trim()) || sessionUser?.name || null;

    const report = {
      id: crypto.randomUUID(),
      title: parsed.title,
      description: parsed.description,
      stepsToReproduce: parsed.stepsToReproduce ?? null,
      expectedBehavior: parsed.expectedBehavior ?? null,
      actualBehavior: parsed.actualBehavior ?? null,
      severity: (parsed.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") ?? "MEDIUM",
      status: "OPEN" as const,
      pageUrl: parsed.pageUrl ?? null,
      userAgent,
      attachments: screenshotUrls.length ? screenshotUrls.map((url) => ({ url, type: "screenshot" })) : [],
      screenshotUrls,
      reporterEmail,
      reporterName,
      adminNotes: null,
      resolvedAt: null,
      resolvedById: null,
      userId: sessionUser?.id ?? null,
    };

    await db.insert(bugReports).values(report);

    return NextResponse.json({ success: true, data: { id: report.id }, error: null }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/bug-report] error", err);
    return NextResponse.json(
      { success: false, data: null, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
