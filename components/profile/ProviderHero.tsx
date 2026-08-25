"use client";

import { Film, ExternalLink } from "lucide-react";
import type { IProvider } from "@/types";

interface ProviderHeroProps {
  provider: IProvider;
  isOwnProfile?: boolean;
}

export function ProviderHero({ provider, isOwnProfile }: ProviderHeroProps) {
  const coverUrl = provider.coverVideoUrl;

  return (
    <div className="relative w-full h-[340px] md:h-[420px] overflow-hidden rounded-[16px] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
      {coverUrl ? (
        <video
          src={coverUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Film size={48} strokeWidth={1.5} color="var(--color-border-mid)" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,10,0.85)] via-[rgba(10,10,10,0.3)] to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div className="flex items-center gap-4">
          {provider.avatarUrl && (
            <img
              src={provider.avatarUrl}
              alt={provider.displayName}
              className="w-16 h-16 md:w-20 md:h-20 rounded-[12px] object-cover border-2 border-[var(--color-border)]"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-3xl text-[var(--color-text-primary)] truncate">
              {provider.displayName}
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
              {provider.location ?? "Nigeria"}
            </p>
          </div>
          {isOwnProfile && (
            <a
              href={`/profile/${provider.id}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent text-[12px] font-semibold text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]"
            >
              <ExternalLink size={13} strokeWidth={1.8} />
              Preview
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
