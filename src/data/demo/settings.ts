/** DADOS DEMONSTRATIVOS — configurações iniciais da loja. */
import type { BannerSettings, StoreSettings, WhatsAppSettings } from "@/types/settings";

export const DEMO_STORE_SETTINGS: StoreSettings = {
  storeName: "BRN Skins",
  supportHours: "Todos os dias, 10h às 23h",
  defaultDelivery: "~1h",
  currency: "BRL",
  showSteamComparison: true,
};

export const DEMO_WHATSAPP_SETTINGS: WhatsAppSettings = {
  phone: "",
  greeting: "Olá, BRN Skins! Quero finalizar este pedido:",
  orderTemplateFooter: "Aguardo o link de pagamento e o trade.",
};

export const DEMO_BANNER_SETTINGS: BannerSettings = {
  heroImage: "/images/hero-banner.png",
  heroAlt: "BRN Skins — compra, venda e upgrade de skins de CS2",
  promoEnabled: true,
};
