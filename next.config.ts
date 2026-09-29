import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Notices upload their photos and PDF through a Server Action, and the
      // default 1 MB cap rejects a single phone photo. Photos are shrunk in the
      // browser first (lib/client-image.ts), so real requests stay small; this
      // ceiling covers a full notice when that step is skipped, plus a PDF.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
