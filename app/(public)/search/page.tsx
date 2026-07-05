import { Suspense } from "react";
import { SearchClientPage } from "./SearchClientPage";
import { DEFAULT_CONFIG } from "@/config/platform.config";

export const metadata = {
  title: `Search Creators | ${DEFAULT_CONFIG.name}`,
};

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
