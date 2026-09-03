import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    // Allow ~100 MB server-action / route-handler payloads so 50-60 MB media
    // files can pass through Next when the server proxy is used.
    // Vercel's serverless payload limit (~4.5 MB on Hobby) still applies;
    // large files therefore prefer the direct-to-Cloudinary path that bypasses
    // the Next server entirely (see /api/media/status + /api/media/confirm).
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
