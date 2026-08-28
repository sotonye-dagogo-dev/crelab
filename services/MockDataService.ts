import type {
  ITeamMember,
  IExploreCard,
  IUser,
  IProvider,
  IBooking,
  IPortfolioItem,
  IServicePackage,
  IReview,
  IProviderDashboard,
  IClientDashboard,
  IDashboardBooking,
  IDashboardPipelineColumn,
  IDashboardAvailabilitySlot,
  IPortfolioPerformanceRow,
  IClientPaymentRecord,
  IAboutPage,
  IHowItWorksPage,
} from "@/types";
import { BookingStatus, EscrowState, ExperienceLevel, PaymentMode, PortfolioItemSource, UserRole } from "@/types";

export class MockDataService {
  static isEnabled(): boolean {
    return process.env.NEXT_PUBLIC_MOCK_DATA === "true";
  }

  static getMockUser(): IUser {
    return {
      id: "mock-user-1",
      name: "Demo Creator",
      email: "demo@crelab.test",
      emailVerified: true,
      image: null,
      phone: "+234 800 000 0000",
      role: UserRole.PROVIDER,
      createdAt: new Date("2025-06-01").toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static getMockSession() {
    return {
      user: {
        id: "mock-user-1",
        name: "Demo Creator",
        email: "demo@crelab.test",
        emailVerified: true,
        image: null,
        phone: "+234 800 000 0000",
        phoneNumber: "+234 800 000 0000",
        phoneNumberVerified: true,
        role: "PROVIDER",
      },
      session: {
        id: "mock-session-1",
        userId: "mock-user-1",
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        token: "mock-token",
        ipAddress: null,
        userAgent: null,
      },
    };
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
        slug: "amara-studios--mock-pro",
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
        slug: "lens-and-light--mock-pro",
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
        slug: "kelechi-media--mock-pro",
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
      {
        id: "mock-provider-4",
        displayName: "Tunde Films",
        slug: "tunde-films--mock-pro",
        categorySlug: "cinematographer",
        categoryLabel: "Cinematographer / Videographer",
        avatarUrl: null,
        previewVideoUrl: null,
        location: "Ibadan, Nigeria",
        packagePriceFromKobo: 60000,
        rating: 4.7,
        reviewCount: 15,
        featured: true,
        verified: true,
        yearsActive: 4,
        experienceLevel: "ESTABLISHED",
      },
      {
        id: "mock-provider-5",
        displayName: "Zara Creative",
        slug: "zara-creative--mock-pro",
        categorySlug: "content-creator",
        categoryLabel: "Content Creator",
        avatarUrl: null,
        previewVideoUrl: null,
        location: "Lagos, Nigeria",
        packagePriceFromKobo: 25000,
        rating: 4.5,
        reviewCount: 42,
        featured: false,
        verified: true,
        yearsActive: 1,
        experienceLevel: "EMERGING",
      },
      {
        id: "mock-provider-6",
        displayName: "Lens Collective",
        slug: "lens-collective--mock-pro",
        categorySlug: "cinematographer",
        categoryLabel: "Cinematographer / Videographer",
        avatarUrl: null,
        previewVideoUrl: null,
        location: "Abuja, Nigeria",
        packagePriceFromKobo: 100000,
        rating: 5.0,
        reviewCount: 8,
        featured: true,
        verified: true,
        yearsActive: 7,
        experienceLevel: "VETERAN",
      },
    ];
  }

  static getMockProviders(): IProvider[] {
    if (!this.isEnabled()) return [];
    return [
      {
        id: "mock-provider-1",
        userId: "mock-user-1",
        categorySlug: "content-creator",
        displayName: "Amara Studios",
        bio: "We craft compelling visual narratives for brands that want to stand out. Specialising in UGC, lifestyle content, and brand storytelling.",
        location: "Lagos, Nigeria",
        yearsActive: 3,
        experienceLevel: ExperienceLevel.ESTABLISHED,
        categoryFields: {
          nicheTags: ["Lifestyle", "Fashion", "Food", "Travel"],
          activePlatforms: ["Instagram", "TikTok", "YouTube"],
          bio: "We craft compelling visual narratives for brands that want to stand out.",
        },
        coverVideoUrl: null,
        avatarUrl: null,
        active: true,
        verified: true,
        driveFolderUrl: null,
        profileViews: 1247,
        createdAt: new Date("2025-01-15").toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-provider-2",
        userId: "mock-user-2",
        categorySlug: "cinematographer",
        displayName: "Lens & Light",
        bio: "Cinematic storytelling for events, commercials, and documentaries. Based in Abuja, available nationwide.",
        location: "Abuja, Nigeria",
        yearsActive: 5,
        experienceLevel: ExperienceLevel.VETERAN,
        categoryFields: {
          equipment: ["Sony A7S III", "DJI RS3 Pro", "Sennheiser MKH416"],
          shootingStyle: ["Documentary", "Cinematic", "Run & Gun"],
          coverageType: "EVENTS",
        },
        coverVideoUrl: null,
        avatarUrl: null,
        active: true,
        verified: true,
        driveFolderUrl: null,
        profileViews: 893,
        createdAt: new Date("2024-08-01").toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-provider-3",
        userId: "mock-user-3",
        categorySlug: "content-creator",
        displayName: "Kelechi Media",
        bio: "Authentic UGC and short-form content that drives engagement. Trusted by 30+ brands across Nigeria.",
        location: "Port Harcourt, Nigeria",
        yearsActive: 2,
        experienceLevel: ExperienceLevel.EMERGING,
        categoryFields: {
          nicheTags: ["UGC", "Short-form", "TikTok", "Instagram Reels"],
          activePlatforms: ["TikTok", "Instagram", "Snapchat"],
          bio: "Authentic UGC and short-form content that drives engagement.",
        },
        coverVideoUrl: null,
        avatarUrl: null,
        active: true,
        verified: true,
        driveFolderUrl: null,
        profileViews: 2156,
        createdAt: new Date("2025-03-10").toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  static getMockServicePackages(providerId: string): IServicePackage[] {
    if (!this.isEnabled()) return [];
    const packages: Record<string, IServicePackage[]> = {
      "mock-provider-1": [
        {
          id: "mock-pkg-1-1",
          providerId,
          tier: "BASIC",
          label: "Starter Pack",
          price: 50000,
          deliverables: ["1 edited video (60s max)", "Behind-the-scenes photos (5)", "Usage rights (30 days)"],
          turnaroundDays: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "mock-pkg-1-2",
          providerId,
          tier: "STANDARD",
          label: "Pro Pack",
          price: 120000,
          deliverables: ["2 edited videos (90s each)", "Behind-the-scenes photos (15)", "Usage rights (90 days)", "1 revision round"],
          turnaroundDays: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "mock-pkg-1-3",
          providerId,
          tier: "PREMIUM",
          label: "Premium Pack",
          price: 250000,
          deliverables: ["3 edited videos (120s each)", "Behind-the-scenes photos (30)", "Unlimited usage rights", "3 revision rounds", "Dedicated account manager"],
          turnaroundDays: 7,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      "mock-provider-2": [
        {
          id: "mock-pkg-2-1",
          providerId,
          tier: "BASIC",
          label: "Event Coverage",
          price: 150000,
          deliverables: ["4-hour event coverage", "1 edited highlight reel (3-5 min)", "Raw footage", "50 edited photos"],
          turnaroundDays: 7,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "mock-pkg-2-2",
          providerId,
          tier: "STANDARD",
          label: "Commercial Shoot",
          price: 350000,
          deliverables: ["Full-day shoot (8 hours)", "2 edited commercials (60s each)", "Behind-the-scenes reel", "Usage rights (6 months)", "2 revision rounds"],
          turnaroundDays: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "mock-pkg-2-3",
          providerId,
          tier: "PREMIUM",
          label: "Documentary Package",
          price: 750000,
          deliverables: ["3-day shooting", "Full documentary (15-20 min)", "Trailer cut (60s)", "Raw footage archive", "Unlimited revisions", "Broadcast rights"],
          turnaroundDays: 21,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      "mock-provider-3": [
        {
          id: "mock-pkg-3-1",
          providerId,
          tier: "BASIC",
          label: "Quick UGC Pack",
          price: 25000,
          deliverables: ["1 UGC video (30-60s)", "Usage rights (30 days)", "1 revision"],
          turnaroundDays: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "mock-pkg-3-2",
          providerId,
          tier: "STANDARD",
          label: "Content Bundle",
          price: 65000,
          deliverables: ["3 UGC videos (30-60s each)", "Usage rights (90 days)", "2 revision rounds", "Thumbnail + caption templates"],
          turnaroundDays: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "mock-pkg-3-3",
          providerId,
          tier: "PREMIUM",
          label: "Campaign Package",
          price: 150000,
          deliverables: ["5 UGC videos (60s each)", "Unlimited usage rights", "3 revision rounds", "A/B test variants", "Performance report"],
          turnaroundDays: 7,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    return packages[providerId] ?? [];
  }

  static getMockPortfolioItems(providerId: string): IPortfolioItem[] {
    if (!this.isEnabled()) return [];
    const items: Record<string, IPortfolioItem[]> = {
      "mock-provider-1": [
        { id: "mock-port-1-1", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "Lifestyle Brand Campaign", caption: "Summer collection shoot for Lagos-based fashion label", driveFileId: null, mimeType: "video/mp4", orderIndex: 0, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "mock-port-1-2", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "Food Content Series", caption: "Recipe videos for a popular Nigerian food brand", driveFileId: null, mimeType: "video/mp4", orderIndex: 1, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "mock-port-1-3", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "Travel Vlog - Calabar", caption: "Weekend getaway content for tourism board", driveFileId: null, mimeType: "video/mp4", orderIndex: 2, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      "mock-provider-2": [
        { id: "mock-port-2-1", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "Corporate Event Coverage", caption: "Annual general meeting for fintech company", driveFileId: null, mimeType: "video/mp4", orderIndex: 0, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "mock-port-2-2", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "Music Video - Emerging Artist", caption: "Official music video shot in Abuja", driveFileId: null, mimeType: "video/mp4", orderIndex: 1, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "mock-port-2-3", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "Documentary Short", caption: "Life in the Makoko floating community", driveFileId: null, mimeType: "video/mp4", orderIndex: 2, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      "mock-provider-3": [
        { id: "mock-port-3-1", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "UGC - Skincare Review", caption: "Authentic product review for beauty brand", driveFileId: null, mimeType: "video/mp4", orderIndex: 0, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "mock-port-3-2", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "TikTok Campaign", caption: "Viral challenge campaign for beverage brand", driveFileId: null, mimeType: "video/mp4", orderIndex: 1, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "mock-port-3-3", providerId, source: PortfolioItemSource.DIRECT, url: "#", thumbnailUrl: null, title: "Unboxing Video", caption: "Product unboxing for tech gadget launch", driveFileId: null, mimeType: "video/mp4", orderIndex: 2, visible: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
    };
    return items[providerId] ?? [];
  }

  static getMockBookings(): IBooking[] {
    if (!this.isEnabled()) return [];
    const now = new Date();
    return [
      {
        id: "mock-booking-1",
        providerId: "mock-provider-1",
        clientId: "mock-client-1",
        packageId: "mock-pkg-1-1",
        status: BookingStatus.HELD,
        escrowState: EscrowState.HELD,
        subtotal: 50000,
        fee: 2500,
        total: 52500,
        serviceDate: new Date(now.getTime() + 7 * 86400000).toISOString(),
        paymentMode: PaymentMode.ESCROW,
        scopeNotes: "Lifestyle shoot for new clothing line launch. Need 3 outfits covered.",
        releaseDeadline: new Date(now.getTime() + 14 * 86400000).toISOString(),
        paystackRef: "mock-ref-001",
        createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: "mock-booking-2",
        providerId: "mock-provider-2",
        clientId: "mock-client-1",
        packageId: "mock-pkg-2-1",
        status: BookingStatus.IN_PROGRESS,
        escrowState: EscrowState.IN_PROGRESS,
        paymentMode: PaymentMode.ESCROW,
        subtotal: 150000,
        fee: 7500,
        total: 157500,
        serviceDate: new Date(now.getTime() - 2 * 86400000).toISOString(),
        scopeNotes: "Corporate event coverage - AGM in Abuja.",
        releaseDeadline: new Date(now.getTime() + 5 * 86400000).toISOString(),
        paystackRef: "mock-ref-002",
        createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
      {
        id: "mock-booking-3",
        providerId: "mock-provider-3",
        clientId: "mock-client-2",
        packageId: "mock-pkg-3-2",
        status: BookingStatus.REQUESTED,
        escrowState: EscrowState.PENDING,
        paymentMode: PaymentMode.ESCROW,
        subtotal: 65000,
        fee: 3250,
        total: 68250,
        serviceDate: null,
        scopeNotes: "Need 3 UGC videos for Instagram campaign. Niche: fitness/wellness.",
        releaseDeadline: null,
        paystackRef: null,
        createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: "mock-booking-4",
        providerId: "mock-provider-1",
        clientId: "mock-client-2",
        packageId: "mock-pkg-1-2",
        status: BookingStatus.RELEASED,
        escrowState: EscrowState.RELEASED,
        paymentMode: PaymentMode.ESCROW,
        subtotal: 120000,
        fee: 6000,
        total: 126000,
        serviceDate: new Date(now.getTime() - 20 * 86400000).toISOString(),
        scopeNotes: "Completed - delivery accepted.",
        releaseDeadline: new Date(now.getTime() - 14 * 86400000).toISOString(),
        paystackRef: "mock-ref-003",
        createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 14 * 86400000).toISOString(),
      },
    ];
  }

  static getMockReviews(): IReview[] {
    if (!this.isEnabled()) return [];
    return [
      { id: "mock-review-1", bookingId: "mock-booking-4", reviewerId: "mock-client-2", providerId: "mock-provider-1", rating: 5, body: "Amazing work! Exceeded our expectations. Will definitely work with Amara Studios again.", createdAt: new Date().toISOString() },
      { id: "mock-review-2", bookingId: "mock-booking-2", reviewerId: "mock-client-1", providerId: "mock-provider-2", rating: 4, body: "Great coverage of our event. Delivery was on time.", createdAt: new Date().toISOString() },
      { id: "mock-review-3", bookingId: "mock-booking-4", reviewerId: "mock-client-2", providerId: "mock-provider-1", rating: 5, body: "Professional from start to finish.", createdAt: new Date().toISOString() },
    ];
  }

  static getMockProviderBySlug(slug: string): IProvider | null {
    if (!this.isEnabled()) return null;
    const card = this.getExploreProviders().find((p) => p.slug === slug);
    if (!card) return null;
    return this.getMockProviders().find((p) => p.id === card.id) ?? null;
  }

  static getMockProviderById(id: string): IProvider | null {
    if (!this.isEnabled()) return null;
    const provider = this.getMockProviders().find((p) => p.id === id) ?? null;
    return provider;
  }

  static getMockReviewsForProvider(providerId: string): IReview[] {
    if (!this.isEnabled()) return [];
    return this.getMockReviews().filter((r) => r.providerId === providerId);
  }

  static getMockWorkHistoryForProvider(providerId: string): { id: string; title: string; clientName: string; completedAt: string; description: string }[] {
    if (!this.isEnabled()) return [];
    const bookings = this.getMockBookings().filter((b) => b.providerId === providerId && b.status === "RELEASED");
    return bookings.map((b) => ({
      id: b.id,
      title: "Completed Project",
      clientName: "Client",
      completedAt: b.updatedAt,
      description: b.scopeNotes ?? "",
    }));
  }

  private static readonly mockClientNames: Record<string, string> = {
    "mock-client-1": "Tunde Bakare",
    "mock-client-2": "Amara Chukwu",
  };

  private static readonly mockProviderNames: Record<string, string> = {
    "mock-provider-1": "Amara Studios",
    "mock-provider-2": "Lens & Light",
    "mock-provider-3": "Kelechi Media",
  };

  private static readonly mockPackageLabels: Record<string, string> = {
    "mock-pkg-1-1": "Starter Pack",
    "mock-pkg-1-2": "Pro Pack",
    "mock-pkg-1-3": "Premium Pack",
    "mock-pkg-2-1": "Event Coverage",
    "mock-pkg-2-2": "Commercial Shoot",
    "mock-pkg-2-3": "Documentary Package",
    "mock-pkg-3-1": "Quick UGC Pack",
    "mock-pkg-3-2": "Content Bundle",
    "mock-pkg-3-3": "Campaign Package",
  };

  static getMockDashboardBookings(): IDashboardBooking[] {
    if (!this.isEnabled()) return [];
    return this.getMockBookings().map((b) => ({
      id: b.id,
      booking: b,
      providerId: b.providerId,
      providerName: this.mockProviderNames[b.providerId] ?? "Mock Provider",
      clientId: b.clientId,
      clientName: this.mockClientNames[b.clientId] ?? "Demo Client",
      packageId: b.packageId,
      packageLabel: this.mockPackageLabels[b.packageId] ?? "Standard Package",
      packageTier: "STANDARD",
    }));
  }

  static getMockPortfolioPerformance(providerId: string): IPortfolioPerformanceRow[] {
    if (!this.isEnabled()) return [];
    const rows: Record<string, IPortfolioPerformanceRow[]> = {
      "mock-provider-1": [
        { id: "mock-perf-1", title: "GTBank Campaign", mimeType: "video/mp4", thumbnailUrl: null, plays: 1200, clicks: 340, conversionRate: 28, visible: true },
        { id: "mock-perf-2", title: "Beauty UGC Reel", mimeType: "video/mp4", thumbnailUrl: null, plays: 3400, clicks: 892, conversionRate: 26, visible: true },
        { id: "mock-perf-3", title: "Fashion Week BTS", mimeType: "video/mp4", thumbnailUrl: null, plays: 2800, clicks: 654, conversionRate: 23, visible: true },
        { id: "mock-perf-4", title: "Food Brand Promo", mimeType: "video/mp4", thumbnailUrl: null, plays: 1900, clicks: 487, conversionRate: 26, visible: true },
      ],
      "mock-provider-2": [
        { id: "mock-perf-5", title: "Corporate Event Coverage", mimeType: "video/mp4", thumbnailUrl: null, plays: 940, clicks: 210, conversionRate: 22, visible: true },
      ],
      "mock-provider-3": [
        { id: "mock-perf-6", title: "Skincare Review UGC", mimeType: "video/mp4", thumbnailUrl: null, plays: 5200, clicks: 1310, conversionRate: 25, visible: true },
      ],
    };
    return rows[providerId] ?? [];
  }

  static getMockAvailability(providerId: string): IDashboardAvailabilitySlot[] {
    if (!this.isEnabled()) return [];
    const bookedDates = this.getMockBookings()
      .filter((b) => b.providerId === providerId && b.serviceDate && ["HELD", "IN_PROGRESS", "REQUESTED", "ACCEPTED"].includes(b.status))
      .map((b) => new Date(b.serviceDate!).toISOString().slice(0, 10));

    const bookedSet = new Set(bookedDates);
    const slots: IDashboardAvailabilitySlot[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      const iso = day.toISOString().slice(0, 10);
      if (bookedSet.has(iso)) {
        slots.push({ date: iso, status: "BOOKED", label: "Booked" });
      } else if (i === 0) {
        slots.push({ date: iso, status: "AVAILABLE", label: "Today" });
      } else {
        slots.push({ date: iso, status: "AVAILABLE" });
      }
    }
    return slots;
  }

  static getMockProviderDashboard(userId: string): IProviderDashboard {
    if (!this.isEnabled()) {
      return {
        role: "PROVIDER",
        profile: null,
        completeness: { percent: 0, completedItems: 0, totalItems: 0, items: [] },
        stats: [],
        pipeline: [],
        portfolioPerformance: [],
        availability: [],
        quickActions: [],
      };
    }

    const bookings = this.getMockDashboardBookings().filter(
      (b) => b.providerId === "mock-provider-1",
    );

    const pipeline: IDashboardPipelineColumn[] = [
      { key: "requested", label: "Requested", statuses: [BookingStatus.REQUESTED, BookingStatus.ACCEPTED], bookings: bookings.filter((b) => ["REQUESTED", "ACCEPTED"].includes(b.booking.status)) },
      { key: "confirmed", label: "Confirmed", statuses: [BookingStatus.HELD], bookings: bookings.filter((b) => b.booking.status === "HELD") },
      { key: "in-progress", label: "In Progress", statuses: [BookingStatus.IN_PROGRESS], bookings: bookings.filter((b) => b.booking.status === "IN_PROGRESS") },
      { key: "completed", label: "Completed", statuses: [BookingStatus.RELEASED], bookings: bookings.filter((b) => b.booking.status === "RELEASED") },
    ];

    const stats = [
      { value: "1,247", rawValue: 1247, label: "Profile Views", sub: "+12% vs last week", subTone: "success" as const },
      { value: "3,892", rawValue: 3892, label: "Portfolio Plays", sub: "+8% vs last week", subTone: "success" as const },
      { value: "14", rawValue: 14, label: "Booking Requests", sub: "3 pending", subTone: "warning" as const },
      { value: "₦248,500", rawValue: 24850000, label: "Earnings (30d)", sub: "₦42,500 in escrow", subTone: "held" as const },
    ];

    return {
      role: "PROVIDER",
      profile: {
        id: "mock-provider-1",
        userId,
        displayName: "Amara Studios",
        categoryLabel: "Content Creator",
        active: true,
        verified: true,
        profileViews: 1247,
      },
      completeness: {
        percent: Math.round((6 / 9) * 100),
        completedItems: 6,
        totalItems: 9,
        items: [
          { key: "coverVideo", label: "Cover video", completed: true },
          { key: "bio", label: "Bio", completed: true },
          { key: "location", label: "Location", completed: true },
          { key: "experience", label: "Experience level", completed: true },
          { key: "niche", label: "Niche tags", completed: true },
          { key: "packages", label: "3 service packages", completed: true },
          { key: "portfolio", label: "3+ portfolio items", completed: true },
          { key: "drive", label: "Google Drive connected", completed: false },
          { key: "platforms", label: "Active platforms", completed: false },
        ],
      },
      stats,
      pipeline,
      portfolioPerformance: this.getMockPortfolioPerformance("mock-provider-1"),
      availability: this.getMockAvailability("mock-provider-1"),
      quickActions: [
        { label: "Add Portfolio Item", href: "/profile/setup", variant: "primary" },
        { label: "Edit Packages", href: "/profile/setup", variant: "accent-outlined" },
        { label: "My Media", href: "/profile/media", variant: "accent-outlined" },
        { label: "Update Availability", href: "/profile/setup", variant: "accent-outlined" },
        { label: "Sync Google Drive", href: "/profile/setup", variant: "ghost" },
      ],
    };
  }

  static getMockClientDashboard(userId: string): IClientDashboard {
    if (!this.isEnabled()) {
      return {
        role: "CLIENT",
        stats: [],
        pipeline: [],
        paymentHistory: [],
        discover: [],
      };
    }

    const bookings = this.getMockDashboardBookings().filter(
      (b) => b.clientId === "mock-client-1",
    );

    const pipeline: IDashboardPipelineColumn[] = [
      { key: "pending", label: "Pending Acceptance", statuses: [BookingStatus.REQUESTED, BookingStatus.ACCEPTED], bookings: bookings.filter((b) => ["REQUESTED", "ACCEPTED"].includes(b.booking.status)) },
      { key: "confirmed", label: "Confirmed", statuses: [BookingStatus.HELD], bookings: bookings.filter((b) => b.booking.status === "HELD") },
      { key: "in-progress", label: "In Progress", statuses: [BookingStatus.IN_PROGRESS], bookings: bookings.filter((b) => b.booking.status === "IN_PROGRESS") },
      { key: "completed", label: "Completed", statuses: [BookingStatus.RELEASED], bookings: bookings.filter((b) => b.booking.status === "RELEASED") },
    ];

    const paymentHistory: IClientPaymentRecord[] = this.getMockBookings()
      .filter((b) => b.clientId === "mock-client-1")
      .filter((b) => b.paystackRef)
      .map((b) => ({
        id: `mock-payment-${b.id}`,
        bookingId: b.id,
        providerId: b.providerId,
        providerName: this.mockProviderNames[b.providerId] ?? "Mock Provider",
        packageLabel: this.mockPackageLabels[b.packageId] ?? "Standard Package",
        amount: b.total,
        fee: b.fee,
        netAmount: b.total - b.fee,
        status: b.status,
        paystackRef: b.paystackRef ?? "mock-ref",
        createdAt: b.createdAt,
      }))
      .sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));

    const stats = [
      { value: "2", rawValue: 2, label: "Active Bookings", sub: "1 in progress", subTone: "success" as const },
      { value: "₦210,000", rawValue: 21000000, label: "Total Spent (30d)", sub: "₦157,500 across 2 bookings", subTone: "tertiary" as const },
      { value: "4", rawValue: 4, label: "Messages", sub: "1 unread", subTone: "accent" as const },
    ];

    return {
      role: "CLIENT",
      stats,
      pipeline,
      paymentHistory,
      discover: this.getExploreProviders().slice(0, 4),
    };
  }

  static getMockAboutPage(): IAboutPage {
    if (!this.isEnabled()) return null as any;
    return {
      id: "about-1",
      heroTitle: "About Crellab",
      heroSubtitle: "We're building the future of creative hiring in Africa — connecting brands with talented creators, cinematographers, and videographers.",
      sections: [
        {
          id: "mission",
          title: "Our Mission",
          content: "To democratize access to creative opportunities across Africa. We believe talent shouldn't be limited by geography, network, or follower count.",
        },
        {
          id: "vision",
          title: "Our Vision",
          content: "A thriving creative economy where every creator can build a sustainable career doing what they love, and every brand can find the perfect creative partner.",
        },
        {
          id: "values",
          title: "Our Values",
          content: "Creator-first • Transparency • Quality over quantity • Community-driven • Built for Africa",
        },
      ],
      quickLinks: [
        { label: "How It Works", href: "/how-it-works" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Report a Bug", href: "/bug-report" },
        { label: "Contact Us", href: "#contact" },
      ],
      metaTitle: "About Crellab - Connecting African Creatives with Opportunity",
      metaDescription: "Learn about Crellab's mission to connect brands with talented African creators, cinematographers, and videographers. Built for African creativity.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static getMockHowItWorksPage(): IHowItWorksPage {
    if (!this.isEnabled()) return null as any;
    return {
      id: "how-it-works-1",
      heroTitle: "How It Works",
      heroSubtitle: "Everything you need to know to get started — whether you're a creator looking for work or a brand searching for talent.",
      sections: [
        {
          id: "for-creators",
          title: "For Creators",
          subtitle: "Turn your creativity into income",
          steps: [
            { step: 1, title: "Create Your Profile", description: "Showcase your work, set your rates, and define your niche. Add portfolio items from your device or sync from Google Drive." },
            { step: 2, title: "Get Discovered", description: "Brands browse our Explore feed and search for creators like you. Your profile appears in relevant searches based on your category, location, and tags." },
            { step: 3, title: "Receive Booking Requests", description: "Clients send booking requests with project details. You can accept, decline, or negotiate scope and timeline." },
            { step: 4, title: "Deliver & Get Paid", description: "Work is protected by escrow. Funds are held securely and released automatically after completion (or when you mark milestones as done)." },
          ],
        },
        {
          id: "for-clients",
          title: "For Clients & Brands",
          subtitle: "Find the right creative talent, fast",
          steps: [
            { step: 1, title: "Browse & Search", description: "Explore creators by category, location, experience level, and budget. Watch video portfolios to evaluate style and quality." },
            { step: 2, title: "Book with Confidence", description: "Select a package, set a date, and pay securely. Your payment is held in escrow until the work is delivered to your satisfaction." },
            { step: 3, title: "Collaborate Seamlessly", description: "Communicate directly with your creator, share briefs, and track progress. Milestone payments keep larger projects on track." },
            { step: 4, title: "Review & Release", description: "Review deliverables, request revisions if needed, and release payment. Leave a review to help the community." },
          ],
        },
        {
          id: "escrow",
          title: "Secure Payments with Escrow",
          subtitle: "Your money is protected every step of the way",
          steps: [
            { step: 1, title: "Payment Held in Escrow", description: "When you book, funds are securely held by our payment partner (Paystack) — not released to the creator until you're happy." },
            { step: 2, title: "Auto-Release Timeline", description: "If no dispute is raised, funds auto-release 5 days after the service date. You're always in control." },
            { step: 3, title: "Dispute Resolution", description: "If something goes wrong, our admin team mediates. We review evidence from both sides and make a fair decision." },
            { step: 4, title: "Milestone Payments", description: "For larger projects, split payments into milestones. Each milestone is funded upfront and released upon approval." },
          ],
        },
      ],
      sandboxes: [
        {
          id: "booking-flow",
          title: "Booking Flow Simulator",
          description: "Experience the end-to-end booking process as a client or creator",
          type: "booking-simulator",
        },
        {
          id: "escrow-timeline",
          title: "Escrow Timeline Explorer",
          description: "Visualize how escrow works — from payment to release or dispute",
          type: "escrow-timeline",
        },
        {
          id: "pricing-calculator",
          title: "Pricing Calculator",
          description: "Estimate costs for different project types and creator levels",
          type: "pricing-calculator",
        },
        {
          id: "search-simulator",
          title: "Search & Discovery Simulator",
          description: "See how creators appear in search results based on profile completeness",
          type: "search-simulator",
        },
      ],
      faqs: [
        {
          question: "How do I get paid as a creator?",
          answer: "Payments are held in escrow via Paystack. Once the client approves your work (or after 5 days with no dispute), funds are automatically released to your Crellab wallet. You can withdraw to your bank account anytime.",
          category: "payments",
        },
        {
          question: "What's the platform fee?",
          answer: "Crellab charges a 5% platform fee on each booking. This covers payment processing, escrow protection, platform maintenance, and support.",
          category: "payments",
        },
        {
          question: "Can I cancel a booking?",
          answer: "Yes. Full refunds are available within 48 hours of booking. After that, a 50% cancellation fee applies to protect the creator's time.",
          category: "bookings",
        },
        {
          question: "How do I build my portfolio?",
          answer: "Upload videos and images directly, or connect Google Drive to sync your existing portfolio. Portfolio items appear on your public profile and in the Explore feed.",
          category: "creators",
        },
        {
          question: "What types of creators can I hire?",
          answer: "We support Content Creators (UGC, lifestyle, brand content) and Cinematographers/Videographers (events, commercials, narrative, documentary). Each has tailored profile fields.",
          category: "clients",
        },
        {
          question: "Is my data secure?",
          answer: "Yes. We use bank-grade encryption, row-level database security, and comply with NDPR 2023. Payment data is handled by Paystack (PCI DSS Level 1 certified).",
          category: "security",
        },
      ],
      metaTitle: "How It Works - Crellab",
      metaDescription: "Learn how Crellab works for creators and clients. Booking flow, escrow protection, milestone payments, and more.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
