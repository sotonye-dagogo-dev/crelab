import type { ITeamMember, IExploreCard } from "@/types";

export class MockDataService {
  static isEnabled(): boolean {
    return process.env.NEXT_PUBLIC_MOCK_DATA === "true";
  }

  static getTeamMembers(): ITeamMember[] {
    if (!this.isEnabled()) return [];
    return [
      {
        id: "mock-1",
        name: "Sotonye Dagogo",
        role: "Founder & Product Lead",
        bio: "Building the future of creative hiring in Africa. Product, design, and strategy.",
        avatarUrl: null,
        socialLinks: [
          { platform: "Twitter", url: "https://x.com" },
          { platform: "LinkedIn", url: "https://linkedin.com" },
        ],
        orderIndex: 0,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-2",
        name: "Chioma Okafor",
        role: "Lead Engineer",
        bio: "Full-stack engineer passionate about developer experience and African tech ecosystems.",
        avatarUrl: null,
        socialLinks: [
          { platform: "GitHub", url: "https://github.com" },
          { platform: "LinkedIn", url: "https://linkedin.com" },
        ],
        orderIndex: 1,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-3",
        name: "Emeka Nwosu",
        role: "Design Lead",
        bio: "Crafting cinematic interfaces that feel as good as they look.",
        avatarUrl: null,
        socialLinks: [
          { platform: "Dribbble", url: "https://dribbble.com" },
          { platform: "X", url: "https://x.com" },
        ],
        orderIndex: 2,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-4",
        name: "Amina Bello",
        role: "Operations",
        bio: "Ensuring creators and clients have a seamless experience from first click to final delivery.",
        avatarUrl: null,
        socialLinks: [
          { platform: "LinkedIn", url: "https://linkedin.com" },
        ],
        orderIndex: 3,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-5",
        name: "Tunde Balogun",
        role: "Community Lead",
        bio: "Building the community that powers Nigeria's creative economy.",
        avatarUrl: null,
        socialLinks: [
          { platform: "Twitter", url: "https://x.com" },
          { platform: "LinkedIn", url: "https://linkedin.com" },
        ],
        orderIndex: 4,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-6",
        name: "Zainab Ibrahim",
        role: "Growth & Marketing",
        bio: "Driving adoption and telling the CreLab story across Africa.",
        avatarUrl: null,
        socialLinks: [
          { platform: "LinkedIn", url: "https://linkedin.com" },
        ],
        orderIndex: 5,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  static getExploreProviders(): IExploreCard[] {
    if (!this.isEnabled()) return [];
    return [
      {
        id: "mock-provider-1",
        displayName: "Amara Studios",
        slug: "amara-studios",
        categorySlug: "content-creator",
        categoryLabel: "Content Creator",
        avatarUrl: null,
        previewVideoUrl: null,
        location: "Lagos, Nigeria",
        packagePriceFromKobo: 50000,
        rating: 4.8,
        reviewCount: 24,
        featured: true,
        verified: true,
        yearsActive: 3,
        experienceLevel: "ESTABLISHED",
      },
      {
        id: "mock-provider-2",
        displayName: "Lens & Light",
        slug: "lens-and-light",
        categorySlug: "cinematographer",
        categoryLabel: "Cinematographer / Videographer",
        avatarUrl: null,
        previewVideoUrl: null,
        location: "Abuja, Nigeria",
        packagePriceFromKobo: 75000,
        rating: 4.6,
        reviewCount: 18,
        featured: true,
        verified: true,
        yearsActive: 5,
        experienceLevel: "VETERAN",
      },
      {
        id: "mock-provider-3",
        displayName: "Kelechi Media",
        slug: "kelechi-media",
        categorySlug: "content-creator",
        categoryLabel: "Content Creator",
        avatarUrl: null,
        previewVideoUrl: null,
        location: "Port Harcourt, Nigeria",
        packagePriceFromKobo: 35000,
        rating: 4.9,
        reviewCount: 31,
        featured: false,
        verified: true,
        yearsActive: 2,
        experienceLevel: "EMERGING",
      },
    ];
  }
}
