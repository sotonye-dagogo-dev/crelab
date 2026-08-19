import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { BlogPostService } from "@/services/BlogPostService";
import { AuditService } from "@/services/AuditService";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const posts = await BlogPostService.adminList();
    return NextResponse.json({ success: true, data: posts });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");
    const body = await req.json();

    if (!body.title || !body.slug || !body.category || !body.author) {
      return NextResponse.json(
        { success: false, error: "title, slug, category and author are required" },
        { status: 400 },
      );
    }

    const post = await BlogPostService.create({
      title: body.title,
      slug: body.slug,
      content: Array.isArray(body.content) ? body.content : [],
      metaDescription: body.metaDescription ?? "",
      heroImageUrl: body.heroImageUrl ?? null,
      category: body.category,
      tags: Array.isArray(body.tags) ? body.tags : [],
      author: body.author,
      published: Boolean(body.published),
      spotlightProviderSlug: body.spotlightProviderSlug ?? undefined,
    });

    await AuditService.log({
      userId: session.user.id,
      action: "blogPost.create",
      entity: "blogPosts",
      entityId: post._id,
      newValue: {
        title: post.title,
        slug: post.slug.current,
        category: post.category,
        published: Boolean(post.publishedAt),
      },
    });

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
