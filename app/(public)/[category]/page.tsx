import { notFound } from "next/navigation";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { ExploreService } from "@/services/ExploreService";
import { CategoryClientPage } from "./CategoryClientPage";
import { DEFAULT_CONFIG } from "@/config/platform.config";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  try {
    const config = await PlatformConfigService.getCached();
    return config.categories
      .filter((c) => c.active)
      .map((c) => ({ category: c.slug }));
  } catch {
    return DEFAULT_CONFIG.categories
      .filter((c) => c.active)
      .map((c) => ({ category: c.slug }));
  }
}

export async function generateMetadata({ params }: Props) {
  const { category: slug } = await params;
  try {
    const config = await PlatformConfigService.getCached();
    const category = config.categories.find((c) => c.slug === slug);
    if (!category) return { title: "Category Not Found" };
    return {
      title: `Hire ${category.label}s in Nigeria | ${config.name}`,
      description: category.description,
    };
  } catch {
    const category = DEFAULT_CONFIG.categories.find((c) => c.slug === slug);
    if (!category) return { title: "Category Not Found" };
    return {
      title: `Hire ${category.label}s in Nigeria | ${DEFAULT_CONFIG.name}`,
      description: category.description,
    };
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }

  const category = config.categories.find((c) => c.slug === slug);
  if (!category || !category.active) notFound();

  let stats = { activeCount: 0, avgRating: 0, minPrice: 0 };
  try {
    stats = await ExploreService.getCategoryStats(slug);
  } catch {
  }

  return (
    <CategoryClientPage
      category={category}
      stats={stats}
      categories={config.categories}
    />
  );
}
