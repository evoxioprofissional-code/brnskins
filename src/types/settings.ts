export interface StoreSettings {
  storeName: string;
  supportHours: string;
  defaultDelivery: string;
  currency: "BRL";
  showSteamComparison: boolean;
}

export interface WhatsAppSettings {
  /** Somente dígitos, com DDI. Vazio = não configurado. */
  phone: string;
  greeting: string;
  orderTemplateFooter: string;
}

export interface BannerSettings {
  heroImage: string;
  heroAlt: string;
  promoEnabled: boolean;
}
