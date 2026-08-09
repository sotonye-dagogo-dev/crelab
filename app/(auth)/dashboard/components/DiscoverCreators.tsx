import Link from "next/link";
import { ExploreVideoCard } from "@/components/explore/ExploreVideoCard";
import type { IExploreCard } from "@/types";

export function DiscoverCreators({ creators }: { creators: IExploreCard[] }) {
  if (creators.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--color-text-primary)]">
          Find More Talent
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
        {creators.map((creator) => (
          <div key={creator.id} className="w-[220px] min-w-[200px]">
            <ExploreVideoCard provider={creator} />
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link
          href="/explore"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-6 text-[15px] font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]"
        >
          Browse All Creators →
        </Link>
      </div>
    </section>
  );
}
