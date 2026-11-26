import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pasta de build separada para o servidor de testes (ver playwright.config.ts)
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [40, 75],
    // Imagens oficiais dos itens (CDN da Steam) e do catálogo aberto ByMykel
    remotePatterns: [
      { protocol: "https", hostname: "community.akamai.steamstatic.com", pathname: "/economy/image/**" },
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/ByMykel/**" },
      { protocol: "https", hostname: "cdn.steamstatic.com", pathname: "/apps/730/**" },
    ],
  },
};

export default nextConfig;
