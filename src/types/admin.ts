import type { WearCode } from "./catalog";

export type StockStatus = "selling" | "reserved" | "negotiating" | "other";

/** Lote de estoque: unidades de uma skin compradas pelo mesmo custo. */
export interface StockLot {
  id: string;
  skinId: string;
  wear: WearCode;
  quantity: number;
  /** Custo unitário pago na compra */
  unitCost: number;
  /** Valor de mercado atual (unitário) */
  marketPrice: number;
  status: StockStatus;
  acquiredAt: string;
}

export type MovementType = "in" | "out";

export interface Movement {
  id: string;
  type: MovementType;
  date: string;
  skinId?: string;
  description: string;
  quantity: number;
  /** Valor total da movimentação (compra ou venda) */
  amount: number;
  /** Custo das unidades vendidas (somente saídas) — base do lucro */
  cost?: number;
  clientId?: string;
}

export interface Client {
  id: string;
  name: string;
  handle: string;
  phone: string;
  totalSpent: number;
  orders: number;
  upgrades: number;
  createdAt: string;
  lastPurchaseAt: string;
  lastContactAt?: string;
}

export type SubStorePlan = "basic" | "pro" | "elite";
export type SubStoreStatus = "pending" | "active" | "suspended";

export interface SubStore {
  id: string;
  name: string;
  slug: string;
  owner: string;
  ownerPhone: string;
  plan: SubStorePlan;
  status: SubStoreStatus;
  createdAt: string;
  activatedAt?: string;
}

export interface RecoveryRule {
  id: string;
  days: number;
  label: string;
  message: string;
  enabled: boolean;
}

export type AlertKind = "danger" | "info" | "success" | "warning";

export interface AdminAlert {
  id: string;
  kind: AlertKind;
  message: string;
  date: string;
  href?: string;
}
