import Link from "next/link";

interface ProviderData {
  id: string;
  displayName: string;
  categorySlug: string;
  avatarUrl: string | null;
  bio: string | null;
}

async function getProvider(slug: string): Promise<ProviderData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const res = await fetch(`${baseUrl}/api/providers/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

interface CreatorSpotlightEmbedProps {
  providerSlug: string;
}

export async function CreatorSpotlightEmbed({ providerSlug }: CreatorSpotlightEmbedProps) {
  const provider = await getProvider(providerSlug);

  if (!provider) return null;

  const initials = provider.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const categoryLabel = provider.categorySlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] p-5 mt-10 flex flex-row gap-4 items-start max-sm:flex-col">
      {provider.avatarUrl ? (
        <img
          src={provider.avatarUrl}
          alt={provider.displayName}
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] flex-shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1">
        <div className="font-[family-name:var(--font-display)] font-bold text-[17px] text-[var(--color-text-primary)]">
          {provider.displayName}
        </div>
        <span className="inline-flex text-[11px] font-semibold px-2 py-[3px] rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent)] text-[var(--color-accent)] mt-1">
          {categoryLabel}
        </span>
      </div>
      <div className="flex items-start flex-shrink-0 max-sm:w-full max-sm:mt-3">
        <Link
          href={`/profile/${providerSlug}`}
          className="inline-flex items-center justify-center gap-2 h-8 px-[14px] text-[13px] font-semibold rounded-[8px] border border-[var(--color-accent)] text-[var(--color-accent)] bg-transparent no-underline whitespace-nowrap transition-[background,border-color,color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-muted)] max-sm:w-full max-sm:text-center"
        >
          View Full Profile →
        </Link>
      </div>
    </div>
  );
}
