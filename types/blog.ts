export type BlogCategory =
  | "content-creation"
  | "hiring-guides"
  | "creator-spotlights"
  | "pricing"
  | "industry-news";

export interface IBlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  content: unknown[];
  metaDescription: string;
  heroImage: { asset: { _ref: string; url: string } } | null;
  category: BlogCategory;
  tags: string[];
  author: string;
  publishedAt: string;
  spotlightProviderSlug?: string;
}

export interface ICreatorSpotlight {
  _id: string;
  title: string;
  slug: { current: string };
  providerSlug: string;
  introText: string;
  body: unknown[];
  publishedAt: string;
}
