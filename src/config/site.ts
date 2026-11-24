export const siteConfig = {
  name: "BRN Skins",
  description:
    "Marketplace de skins de CS2: compra, venda e upgrade com entrega rápida e suporte direto no WhatsApp.",
  locale: "pt-BR",
  currency: "BRL",
  /** Número da loja no WhatsApp — definido via variável de ambiente pública. */
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  catalogSource: (process.env.NEXT_PUBLIC_CATALOG_SOURCE ?? "demo") as "demo" | "supabase",
  assets: {
    logo: "/images/logo.png",
    heroBanner: "/images/hero-banner.png",
    promo: {
      karambit: "/images/promo/karambit.png",
      logo: "/images/promo/logo.png",
      butterfly: "/images/promo/butterfly.png",
    },
  },
} as const;

export const mainNav = [
  { href: "/", label: "Catálogo", icon: "catalog" },
  { href: "/kits", label: "Kits", icon: "kits" },
  { href: "/como-funciona", label: "Como funciona", icon: "info" },
  { href: "/faq", label: "FAQ", icon: "faq" },
] as const;

export type MainNavIcon = (typeof mainNav)[number]["icon"];
