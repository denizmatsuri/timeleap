import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            hostname: supabaseUrl.hostname,
            pathname: "/storage/v1/object/**",
            port: supabaseUrl.port,
            protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
          },
        ]
      : [],
  },
};

export default nextConfig;
