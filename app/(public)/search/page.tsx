import { Suspense } from "react";
import { SearchClientPage } from "./SearchClientPage";

export const metadata = {
  title: "Search Creators | Crelab",
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
