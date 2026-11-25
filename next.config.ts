import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [40, 75],
    // Ícones dos itens do inventário Steam (Upgrade)
    remotePatterns: [
      { protocol: "https", hostname: "community.akamai.steamstatic.com", pathname: "/economy/image/**" },
    ],
  },
};

export default nextConfig;
