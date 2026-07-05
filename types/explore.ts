export interface IExploreCard {
  id: string;
  displayName: string;
  slug: string;
  categorySlug: string;
  categoryLabel: string;
  location: string | null;
  avatarUrl: string | null;
  previewVideoUrl: string | null;
  packagePriceFromKobo: number | null;
  rating: number | null;
  reviewCount: number;
  featured: boolean;
  verified: boolean;
  yearsActive: number | null;
  experienceLevel: string | null;
}

export interface IExploreFilters {
  category?: string;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  availability?: boolean;
  q?: string;
  sort?: ExploreSort;
  cursor?: string;
  limit?: number;
}

export enum ExploreSort {
  NEWEST = "NEWEST",
  TOP_RATED = "TOP_RATED",
  MOST_BOOKED = "MOST_BOOKED",
  FEATURED = "FEATURED",
}
