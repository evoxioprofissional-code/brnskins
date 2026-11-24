import type { VariantType, WearCode } from "./catalog";

export interface CartSkinItem {
  kind: "skin";
  key: string;
  skinId: string;
  name: string;
  image: string;
  wear: WearCode;
  variant: VariantType;
  unitPrice: number;
  quantity: number;
}

export interface CartKitItem {
  kind: "kit";
  key: string;
  kitId: string;
  name: string;
  images: string[];
  itemsLabel: string;
  unitPrice: number;
  quantity: number;
}

export type CartItem = CartSkinItem | CartKitItem;

export type OrderStatus = "pending" | "confirmed" | "delivered" | "cancelled";

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  tradeLink?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  channel: "whatsapp";
}
