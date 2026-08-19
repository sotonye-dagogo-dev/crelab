import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { BlogPostService } from "@/services/BlogPostService";
import { AuditService } from "@/services/AuditService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const body = await req.json();

    const existing = await BlogPostService.getById(id);

    const post = await BlogPostService.update(id, {
      title: body.title,
      slug: body.slug,
      content: Array.isArray(body.content) ? body.content : undefined,
      metaDescription: body.metaDescription,
      heroImageUrl: body.heroImageUrl !== undefined ? (body.heroImageUrl || null) : undefined,
      category: body.category,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      author: body.author,
      published: typeof body.published === "boolean" ? body.published : undefined,
      spotlightProviderSlug:
        body.spotlightProviderSlug !== undefined ? (body.spotlightProviderSlug || undefined) : undefined,
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Blog post not found" },
        { status: 404 },
      );
    }

    await AuditService.log({
      userId: session.user.id,
      action: "blogPost.update",
      entity: "blogPosts",
      entityId: id,
      oldValue: existing
        ? { title: existing.title, slug: existing.slug.current, published: Boolean(existing.publishedAt) }
        : null,
      newValue: {
        title: post.title,
        slug: post.slug.current,
        category: post.category,
        published: Boolean(post.publishedAt),
      },
    });

    return NextResponse.json({ success: true, data: post });
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const existing = await BlogPostService.getById(id);
    const removed = await BlogPostService.remove(id);

    if (!removed) {
      return NextResponse.json(
        { success: false, error: "Blog post not found" },
        { status: 404 },
      );
    }

    await AuditService.log({
      userId: session.user.id,
      action: "blogPost.delete",
      entity: "blogPosts",
      entityId: id,
      oldValue: existing
        ? { title: existing.title, slug: existing.slug.current, published: Boolean(existing.publishedAt) }
        : null,
    });

    return NextResponse.json({ success: true });
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
