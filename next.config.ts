import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Build remotePatterns so next/image can serve avatars from R2 / public CDN.
function s3RemotePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const patterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [];
  for (const envKey of ["S3_PUBLIC_URL", "S3_ENDPOINT"]) {
    const val = process.env[envKey];
    if (!val) continue;
    try {
      const { protocol, hostname } = new URL(val);
      const proto = protocol.replace(":", "") as "https" | "http";
      if (!patterns.some((p) => p.hostname === hostname)) {
        patterns.push({ protocol: proto, hostname });
      }
    } catch { /* ignore bad URLs */ }
  }
  return patterns;
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve("."),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: s3RemotePatterns(),
  },
};

export default withNextIntl(nextConfig);
