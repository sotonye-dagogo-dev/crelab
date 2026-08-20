"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClBadge, ClConfirmDialog, ClDataTable, ClModal, ClErrorState, type ClColumn } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { ContentBlocksEditor } from "@/components/admin/ContentBlocksEditor";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { IBlogPost, BlogCategory } from "@/types/blog";
import type { EmailTemplateBlock } from "@/types";
import { Plus, Edit3, Trash2, Eye, FileText, UploadCloud } from "lucide-react";

const inputClass =
  "h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";
const labelClass =
  "block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]";

const categories: { value: BlogCategory; label: string }[] = [
  { value: "content-creation", label: "Content Creation" },
  { value: "hiring-guides", label: "Hiring Guides" },
  { value: "creator-spotlights", label: "Creator Spotlights" },
  { value: "pricing", label: "Pricing" },
  { value: "industry-news", label: "Industry News" },
];

const categoryStyles: Record<string, string> = {
  "content-creation": "info",
  "hiring-guides": "success",
  "creator-spotlights": "accent",
  pricing: "warning",
  "industry-news": "default",
};

interface PostDraft {
  id?: string;
  title: string;
  slug: string;
  metaDescription: string;
  heroImageUrl: string;
  category: BlogCategory;
  tags: string;
  author: string;
  published: boolean;
  blocks: EmailTemplateBlock[];
}

function emptyDraft(): PostDraft {
  return {
    title: "",
    slug: "",
    metaDescription: "",
    heroImageUrl: "",
    category: "content-creation",
    tags: "",
    author: "",
    published: false,
    blocks: [],
  };
}

function toDraft(post: IBlogPost): PostDraft {
  const heroUrl =
    post.heroImage &&
    (post.heroImage as unknown as { asset?: { url?: string; _ref?: string } }).asset?.url;
  return {
    id: post._id,
    title: post.title,
    slug: post.slug.current,
    metaDescription: post.metaDescription,
    heroImageUrl: heroUrl ?? "",
    category: post.category,
    tags: post.tags.join(", "),
    author: post.author,
    published: Boolean(post.publishedAt) || (post as unknown as { published?: boolean }).published === true,
    blocks: Array.isArray(post.content) && post.content.some((b) => b && typeof b === "object" && "type" in (b as Record<string, unknown>))
      ? (post.content as EmailTemplateBlock[])
      : [],
  };
}

export default function AdminBlogPostsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<PostDraft>(emptyDraft());
  const [postToDelete, setPostToDelete] = useState<IBlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: posts = [], isLoading, isError, refetch } = useQuery<IBlogPost[]>({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog-posts");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load blog posts");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (d: PostDraft) => {
      const payload = {
        title: d.title.trim(),
        slug: d.slug.trim(),
        metaDescription: d.metaDescription.trim(),
        heroImageUrl: d.heroImageUrl.trim(),
        category: d.category,
        tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
        author: d.author.trim(),
        published: d.published,
        content: d.blocks,
      };
      const res = await fetch(d.id ? `/api/admin/blog-posts/${d.id}` : "/api/admin/blog-posts", {
        method: d.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save post");
      return json.data as IBlogPost;
    },
    onSuccess: () => {
      toast("Blog post saved", "success");
      setEditorOpen(false);
      setDraft(emptyDraft());
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const deletePost = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog-posts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to delete post");
      toast("Blog post deleted", "info");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      setPostToDelete(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setDraft(emptyDraft());
    setEditorOpen(true);
  };

  const openEdit = (post: IBlogPost) => {
    setDraft(toDraft(post));
    setEditorOpen(true);
  };

  const columns: ClColumn<IBlogPost>[] = [
    {
      key: "title",
      header: "Title",
      cell: (post) => (
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate max-w-[280px]">
            {post.title}
          </div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] truncate max-w-[280px]">
            /blog/{post.slug.current}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (post) => (
        <ClBadge variant={(categoryStyles[post.category] as "info" | "success" | "warning" | "default" | "accent") ?? "default"}>
          {post.category.replace(/-/g, " ")}
        </ClBadge>
      ),
    },
    {
      key: "author",
      header: "Author",
      hideOnMobile: true,
      cell: (post) => (
        <span className="text-[12px] text-[var(--color-text-secondary)]">{post.author || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (post) =>
        post.publishedAt ? (
          <ClBadge variant="success">Published</ClBadge>
        ) : (
          <ClBadge variant="warning">Draft</ClBadge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (post) => (
        <div className="flex items-center gap-1">
          <a
            href={`/blog/${post.slug.current}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
            aria-label="View post"
          >
            <Eye size={14} strokeWidth={1.8} />
          </a>
          <button
            onClick={() => openEdit(post)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] cursor-pointer border-none"
            aria-label="Edit post"
          >
            <Edit3 size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={() => setPostToDelete(post)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-raised)] cursor-pointer border-none"
            aria-label="Delete post"
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading blog posts...
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <ClErrorState
          title="Blog posts failed to load"
          message="There was a problem loading blog posts. Try again — if it keeps happening, check the server logs."
          action={{ label: "Try again", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Blog Posts
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Write, publish and manage blog posts. Add a hero image and build the
            body visually — no HTML or code needed.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/blog-templates"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[8px] border border-[var(--color-border-mid)] text-[13px] font-semibold text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            <FileText size={15} strokeWidth={1.8} />
            Blog Page Template
          </Link>
          <ClButton variant="primary" size="default" onClick={openCreate}>
            <Plus size={15} strokeWidth={2} /> New Post
          </ClButton>
        </div>
      </div>

      <ClDataTable
        columns={columns}
        rows={posts}
        rowKey={(p) => p._id}
        pageSize={10}
        emptyState={
          <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
            No blog posts yet. Create your first post to start publishing.
          </div>
        }
      />

      {editorOpen && (
        <ClModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          size="lg"
          title={draft.id ? "Edit Post" : "New Blog Post"}
          description="Publish to make it live on the public blog."
          footer={
            <>
              <div className="flex items-center gap-2 mr-auto">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                  className="w-4 h-4 rounded accent-[var(--color-accent)] cursor-pointer"
                />
                <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                  Publish immediately
                </span>
              </div>
              <ClButton variant="ghost" size="default" onClick={() => setEditorOpen(false)} disabled={saveMutation.isPending}>
                Cancel
              </ClButton>
              <ClButton
                variant="primary"
                size="default"
                loading={saveMutation.isPending}
                disabled={!draft.title.trim() || !draft.slug.trim()}
                onClick={() => saveMutation.mutate(draft)}
              >
                <UploadCloud size={14} strokeWidth={2} />
                {draft.id ? "Save Changes" : draft.published ? "Publish Post" : "Save Draft"}
              </ClButton>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  placeholder="e.g. How to Price Your Creative Services"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value, slug: draft.slug || slugify(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Slug</label>
                <input
                  className={inputClass}
                  placeholder="how-to-price-your-services"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select
                  className={inputClass}
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as BlogCategory })}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Author</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Crelab Editorial"
                  value={draft.author}
                  onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Tags (comma separated)</label>
                <input
                  className={inputClass}
                  placeholder="pricing, freelancing, creative business"
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Meta description</label>
                <textarea
                  className={`${inputClass} h-auto py-2 resize-y`}
                  rows={2}
                  placeholder="Short summary shown in search results and cards."
                  value={draft.metaDescription}
                  onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <ImageUploadField
                  label="Hero image"
                  value={draft.heroImageUrl}
                  onChange={(url) => setDraft({ ...draft, heroImageUrl: url })}
                  helper="Shown at the top of the post and on blog cards. Upload or paste a link."
                />
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="mb-3">
                <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  Content
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                  Build the post body visually — headings, paragraphs, lists,
                  images, buttons and dividers.
                </div>
              </div>
              <ContentBlocksEditor blocks={draft.blocks} onChange={(blocks) => setDraft({ ...draft, blocks })} />
            </div>
          </div>
        </ClModal>
      )}

      <ClConfirmDialog
        open={postToDelete !== null}
        title="Delete blog post"
        message={`Permanently delete "${postToDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete post"
        loading={deleting}
        onConfirm={() => postToDelete && deletePost(postToDelete._id)}
        onCancel={() => setPostToDelete(null)}
      />
    </div>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
