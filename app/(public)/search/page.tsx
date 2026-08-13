import { Suspense } from "react";
import { SearchClientPage } from "./SearchClientPage";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata(DEFAULT_CONFIG, {
  title: "Search Creators",
  path: "/search",
});

export default async function SearchPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <Suspense>
      <SearchClientPage query={searchParams.q ?? ""} />
    </Suspense>
  );
}
