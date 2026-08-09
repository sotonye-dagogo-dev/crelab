import type { IPlatformConfig } from "@/types";

export const DEFAULT_CONFIG: IPlatformConfig = {
  name: "Crellab",
  tagline: "Get hired for your creativity, not your follower count.",
  primaryColor: "#E8FF47",
  logoPath: "/primary-logo.png",
  iconPath: "/icon.png",
  feeRate: 0.05,
  escrowReleaseDays: 5,
  cancellationPolicy: {
    fullRefundThresholdHours: 48,
    lateCancellationHoldPercent: 50,
  },
  milestonePayments: {
    enabled: true,
    minBookingAmountKobo: 10000000,
    maxMilestones: 5,
    minMilestones: 2,
    minMilestoneAmountKobo: 500000,
    reviewWindowDays: 8,
  },
  wallet: {
    enabled: true,
    minTopUpKobo: 100000,
    minWithdrawalKobo: 100000,
    maxDvaAccounts: 1000,
  },
  categories: [
    {
      slug: "content-creator",
      label: "Content Creator",
      description: "UGC, lifestyle, brand content, social media",
      icon: "video",
      active: true,
      fieldSchema: [
        {
          key: "bio",
          label: "Bio",
          type: "text",
          required: true,
          placeholder: "Tell brands what makes you unique...",
        },
        {
          key: "location",
          label: "Location",
          type: "text",
          required: true,
          placeholder: "e.g. Lagos, Nigeria",
        },
        {
          key: "yearsActive",
          label: "Years Active",
          type: "number",
          required: true,
          placeholder: "e.g. 3",
        },
        {
          key: "experienceLevel",
          label: "Experience Level",
          type: "select",
          required: true,
          options: ["EMERGING", "ESTABLISHED", "VETERAN"],
        },
        {
          key: "nicheTags",
          label: "Content Niche",
          type: "tags",
          required: true,
          placeholder: "Type and enter...",
        },
        {
          key: "activePlatforms",
          label: "Active Platforms",
          type: "tags",
          required: true,
          placeholder: "Type and enter...",
        },
      ],
    },
    {
      slug: "cinematographer",
      label: "Cinematographer / Videographer",
      description: "Events, commercials, narrative, documentary",
      icon: "camera",
      active: true,
      fieldSchema: [
        {
          key: "bio",
          label: "Bio",
          type: "text",
          required: true,
          placeholder: "Tell brands what makes you unique...",
        },
        {
          key: "location",
          label: "Location",
          type: "text",
          required: true,
          placeholder: "e.g. Lagos, Nigeria",
        },
        {
          key: "yearsActive",
          label: "Years Active",
          type: "number",
          required: true,
          placeholder: "e.g. 3",
        },
        {
          key: "experienceLevel",
          label: "Experience Level",
          type: "select",
          required: true,
          options: ["EMERGING", "ESTABLISHED", "VETERAN"],
        },
        {
          key: "equipment",
          label: "Equipment",
          type: "tags",
          required: true,
          placeholder: "e.g. Sony A7S III, DJI RS3...",
        },
        {
          key: "shootingStyle",
          label: "Shooting Style",
          type: "tags",
          required: true,
          placeholder: "e.g. Documentary, Cinematic...",
        },
        {
          key: "coverageType",
          label: "Coverage Type",
          type: "select",
          required: true,
          options: ["EVENTS", "COMMERCIAL", "NARRATIVE", "DOCUMENTARY"],
        },
      ],
    },
  ],
  features: {
    guestBrowse: true,
    googleDriveSync: true,
    blogEnabled: true,
  },
  mediaUpload: {
    enabled: true,
    cloudinaryEnabled: true,
    maxFileSizeMb: 100,
    videoTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
    imageTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  emailConfig: {
    fromName: "Crellab",
    fromEmail: "noreply@crellab.com",
    templates: {
      welcome: {
        subject: "Welcome to {{name}}!",
        bodyHtml: `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
<div style="text-align:center;margin-bottom:32px;">
<img src="{{logoUrl}}" alt="{{name}}" style="height:32px;border-radius:8px;" />
<h1 style="font-family:Syne,sans-serif;font-size:24px;font-weight:800;color:#F2F2F2;margin:16px 0 0;">Welcome to {{name}}</h1>
</div>
<p style="font-size:14px;color:#9A9A9A;line-height:1.6;">Hi {{userName}},</p>
<p style="font-size:14px;color:#9A9A9A;line-height:1.6;">Thanks for joining {{name}} — the platform where African creatives connect with opportunity. We're excited to have you on board.</p>
<p style="font-size:14px;color:#9A9A9A;line-height:1.6;">Here's what you can do next:</p>
<ul style="font-size:14px;color:#9A9A9A;line-height:1.8;">
<li>Complete your profile to stand out</li>
<li>Explore creator portfolios</li>
<li>Book your first project</li>
</ul>
<div style="text-align:center;margin:32px 0;">
<a href="{{exploreUrl}}" style="display:inline-block;padding:12px 24px;background:#E8FF47;color:#0A0A0A;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">Explore Creators</a>
</div>
<p style="font-size:12px;color:#5C5C5C;text-align:center;margin-top:32px;">{{name}} — Get hired for your creativity, not your follower count.</p>
</div>`,
        enabled: true,
      },
      bookingConfirmation: {
        subject: "Booking Confirmed — {{providerName}}",
        bodyHtml: `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
<div style="text-align:center;margin-bottom:32px;">
<img src="{{logoUrl}}" alt="{{name}}" style="height:32px;border-radius:8px;" />
<h1 style="font-family:Syne,sans-serif;font-size:24px;font-weight:800;color:#F2F2F2;margin:16px 0 0;">Booking Confirmed</h1>
</div>
<p style="font-size:14px;color:#9A9A9A;line-height:1.6;">Hi {{userName}},</p>
<p style="font-size:14px;color:#9A9A9A;line-height:1.6;">Your booking with <strong style="color:#F2F2F2;">{{providerName}}</strong> has been confirmed.</p>
<div style="background:#141414;border:1px solid #2A2A2A;border-radius:12px;padding:16px;margin:24px 0;">
<p style="font-size:13px;color:#9A9A9A;margin:0 0 8px;"><strong style="color:#F2F2F2;">Package:</strong> {{packageName}}</p>
<p style="font-size:13px;color:#9A9A9A;margin:0 0 8px;"><strong style="color:#F2C2F2;">Date:</strong> {{bookingDate}}</p>
<p style="font-size:13px;color:#9A9A9A;margin:0;"><strong style="color:#F2F2F2;">Amount:</strong> {{amount}}</p>
</div>
<div style="text-align:center;margin:32px 0;">
<a href="{{bookingUrl}}" style="display:inline-block;padding:12px 24px;background:#E8FF47;color:#0A0A0A;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">View Booking</a>
</div>
<p style="font-size:12px;color:#5C5C5C;text-align:center;margin-top:32px;">{{name}} — Get hired for your creativity, not your follower count.</p>
</div>`,
        enabled: true,
      },
      paymentReceived: {
        subject: "Payment Received — {{amount}}",
        bodyHtml: `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
<div style="text-align:center;margin-bottom:32px;">
<img src="{{logoUrl}}" alt="{{name}}" style="height:32px;border-radius:8px;" />
<h1 style="font-family:Syne,sans-serif;font-size:24px;font-weight:800;color:#F2F2F2;margin:16px 0 0;">Payment Received</h1>
</div>
<p style="font-size:14px;color:#9A9A9A;line-height:1.6;">Hi {{userName}},</p>
<p style="font-size:14px;color:#9A9A9A;line-height:1.6;">We've received your payment of <strong style="color:#F2F2F2;">{{amount}}</strong> for the booking with <strong style="color:#F2F2F2;">{{providerName}}</strong>.</p>
<p style="font-size:14px;color:#9A9A9A;line-height:1.6;">Your funds are now held securely in escrow and will be released once the work is completed to your satisfaction.</p>
<div style="text-align:center;margin:32px 0;">
<a href="{{bookingUrl}}" style="display:inline-block;padding:12px 24px;background:#E8FF47;color:#0A0A0A;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">View Booking Details</a>
</div>
<p style="font-size:12px;color:#5C5C5C;text-align:center;margin-top:32px;">{{name}} — Get hired for your creativity, not your follower count.</p>
</div>`,
        enabled: true,
      },
    },
  },
  devCredit: {
    text: "Built for African creativity, by S.D.",
    url: "https://sotonye-dagogo.is-a.dev",
  },
};
