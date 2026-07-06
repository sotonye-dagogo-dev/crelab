import { db } from "@/lib/db";
import { teamMembers } from "@/drizzle/schema";
import { asc, eq } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { MockDataService } from "@/services/MockDataService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const fallback = DEFAULT_CONFIG;
  return {
    title: `Meet the Team — ${fallback.name}`,
    description: `Meet the team behind ${fallback.name}. Learn about the people building the future of creative hiring in Africa.`,
  };
}

export default async function TeamPage() {

  let members: (typeof teamMembers.$inferSelect)[];
  try {
    members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.active, true))
      .orderBy(asc(teamMembers.orderIndex), asc(teamMembers.createdAt));
  } catch {
    members = MockDataService.getTeamMembers().map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    })) as (typeof teamMembers.$inferSelect)[];
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-center max-w-[680px] mx-auto mb-16">
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-4xl md:text-5xl tracking-[-0.02em] leading-[1.2] mb-4">
            Meet the Team
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed">
            We are builders, creators, and problem-solvers on a mission to
            transform how African creatives connect with opportunity.
          </p>
        </div>

        {members.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
              {members.map((member: typeof teamMembers.$inferSelect) => (
                <div
                  key={member.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 flex flex-col items-center text-center gap-4 transition-colors duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-border-mid)] hover:-translate-y-0.5"
                >
                  <div className="w-20 h-20 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text-tertiary)] border-2 border-[var(--color-border)] overflow-hidden flex-shrink-0">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      member.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    )}
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight">
                      {member.name}
                    </div>
                    <div className="text-sm text-[var(--color-accent)] font-medium">
                      {member.role}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)] leading-normal">
                    {member.bio}
                  </div>
                  {Array.isArray(member.socialLinks) && (member.socialLinks as { platform: string; url: string }[]).length > 0 && (
                    <div className="flex gap-2 mt-auto">
                      {(member.socialLinks as { platform: string; url: string }[]).map(
                        (link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-md border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-tertiary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            aria-label={link.platform}
                          >
                            {link.platform === "Twitter" || link.platform === "X"
                              ? "X"
                              : link.platform === "LinkedIn"
                                ? "in"
                                : link.platform === "GitHub"
                                  ? "GH"
                                  : link.platform === "Dribbble"
                                    ? "Dr"
                                    : link.platform.slice(0, 2)}
                          </a>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center py-8 border-t border-[var(--color-border)]">
              <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl mb-2">
                Want to be part of the team?
              </h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                We are always looking for talented people who share our vision.
              </p>
              <a
                href="#"
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-sm no-underline hover:bg-[var(--color-accent-dim)] transition-colors"
              >
                View Open Positions
              </a>
            </div>
          </>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-center py-16 px-6">
            <div className="text-5xl mb-4 opacity-30">👥</div>
            <div className="font-[family-name:var(--font-display)] font-bold text-lg mb-2">
              Meet the Team — Coming Soon
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-[400px] mx-auto">
              We are assembling the team behind the product. Member profiles will
              appear here once configured.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
