/**
 * ============================================================================
 *  DADOS DEMONSTRATIVOS DO PAINEL ADMINISTRATIVO — NÃO SÃO DADOS REAIS
 * ----------------------------------------------------------------------------
 *  Gera estoque, movimentações, clientes e sub-lojas de exemplo de forma
 *  determinística, apenas para visualizar e validar os fluxos do painel
 *  enquanto o banco (Supabase) não está conectado.
 * ============================================================================
 */
import type { Skin, WearCode } from "@/types/catalog";
import type { Client, Movement, RecoveryRule, StockLot, StockStatus, SubStore } from "@/types/admin";

/** Gerador pseudo-aleatório determinístico (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86_400_000;

const FIRST = ["Lucas", "Gabriel", "Pedro", "Matheus", "Rafael", "Bruno", "Felipe", "Gustavo", "Thiago", "Diego", "João", "Leonardo", "Vitor", "Caio", "André", "Henrique", "Eduardo", "Murilo", "Igor", "Renan"];
const LAST = ["Silva", "Souza", "Oliveira", "Santos", "Lima", "Pereira", "Costa", "Ferreira", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Rocha", "Martins"];
const HANDLES = ["GameOver", "lucasg", "fraggod", "headhunter", "awpzera", "clutchking", "noscope", "dragonlord", "kniferush", "ecoround", "pistolpro", "smokecrim", "flashbang", "molotov", "entryfrag", "baiter", "lurker", "igl_br", "spray", "onetap"];

export interface AdminSeed {
  stock: StockLot[];
  movements: Movement[];
  clients: Client[];
  subStores: SubStore[];
  rules: RecoveryRule[];
}

export function createAdminSeed(skins: Skin[], now = Date.now()): AdminSeed {
  const r = rng(20261124);
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)]!;
  const priceOf = (s: Skin, w?: WearCode) => (s.offers.find((o) => o.wear === w) ?? s.offers[0]!).price;

  // Peso maior para skins baratas (vendem mais)
  const weighted = skins.flatMap((s) => {
    const p = priceOf(s, s.defaultWear);
    const weight = p < 50 ? 10 : p < 300 ? 7 : p < 1500 ? 1 : 0;
    return Array.from({ length: weight }, () => s);
  });

  // ---------------- Estoque
  const statuses: StockStatus[] = ["selling", "selling", "selling", "selling", "selling", "selling", "reserved", "negotiating", "other"];
  const stock: StockLot[] = [];
  skins.forEach((s, i) => {
    const lots = 1 + Math.floor(r() * 3);
    for (let l = 0; l < lots; l++) {
      const offer = s.offers[Math.floor(r() * s.offers.length)]!;
      const price = offer.price;
      const qtyBase = price < 50 ? 120 : price < 300 ? 60 : price < 2000 ? 18 : price < 8000 ? 5 : 2;
      const quantity = Math.max(1, Math.round(qtyBase * (0.3 + r())));
      // variação entre -18% e +22% em relação ao custo
      const unitCost = round2(price / (0.82 + r() * 0.4));
      stock.push({
        id: `lot-${i}-${l}`,
        skinId: s.id,
        wear: offer.wear,
        quantity: i % 9 === 0 && l === 0 ? 2 : quantity,
        unitCost,
        marketPrice: price,
        status: pick(statuses),
        acquiredAt: new Date(now - Math.floor(r() * 75) * DAY).toISOString(),
      });
    }
  });

  // ---------------- Clientes
  const clients: Client[] = Array.from({ length: 48 }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    const handle = i < HANDLES.length ? HANDLES[i]! : `${HANDLES[i % HANDLES.length]}${i}`;
    const lastDays = i < 6 || i % 6 === 1 ? Math.floor(r() * 6) : Math.floor(Math.pow(r(), 1.4) * 120);
    return {
      id: `cli-${i}`,
      name,
      handle,
      phone: `55119${String(70000000 + Math.floor(r() * 29999999)).padStart(8, "0")}`,
      totalSpent: 0,
      orders: 0,
      upgrades: Math.floor(r() * 4),
      createdAt: new Date(now - (i % 6 === 1 ? lastDays + Math.floor(r() * 12) : lastDays + 20 + Math.floor(r() * 200)) * DAY).toISOString(),
      lastPurchaseAt: new Date(now - lastDays * DAY - Math.floor(r() * DAY)).toISOString(),
    };
  });

  // ---------------- Movimentações (60 dias)
  const movements: Movement[] = [];
  let mid = 0;
  for (let d = 59; d >= 0; d--) {
    const growth = 1 + (59 - d) / 90; // tendência de alta
    const sales = Math.round((9 + r() * 4) * growth);
    for (let k = 0; k < sales; k++) {
      const s = pick(weighted);
      const price = round2(priceOf(s) * (0.94 + r() * 0.12));
      const cost = round2(price * (0.58 + r() * 0.12));
      const activeClients = clients.filter((c) => now - new Date(c.lastPurchaseAt).getTime() <= d * DAY + DAY * 30);
      const client = activeClients.length ? pick(activeClients) : pick(clients);
      movements.push({
        id: `mov-${mid++}`,
        type: "out",
        date: new Date(now - d * DAY - Math.floor(r() * DAY * 0.8)).toISOString(),
        skinId: s.id,
        description: `Venda · ${s.isStar ? "★ " : ""}${s.weapon} | ${s.finish}`,
        quantity: 1,
        amount: price,
        cost,
        clientId: client.id,
      });
      client.totalSpent = round2(client.totalSpent + price);
      client.orders += 1;
    }
    const buys = Math.round(2 + r() * 3);
    for (let k = 0; k < buys; k++) {
      const s = pick(weighted);
      const qty = 1 + Math.floor(r() * 4);
      const amount = round2(priceOf(s) * 0.66 * qty);
      movements.push({
        id: `mov-${mid++}`,
        type: "in",
        date: new Date(now - d * DAY - Math.floor(r() * DAY * 0.8)).toISOString(),
        skinId: s.id,
        description: `Compra · ${s.isStar ? "★ " : ""}${s.weapon} | ${s.finish}`,
        quantity: qty,
        amount,
      });
    }
  }
  movements.sort((a, b) => b.date.localeCompare(a.date));
  // o cliente mais antigo de cada movimentação define a "última compra" real
  for (const c of clients) {
    const last = movements.find((m) => m.type === "out" && m.clientId === c.id);
    if (last && last.date > c.lastPurchaseAt) c.lastPurchaseAt = last.date;
  }

  // ---------------- Sub-lojas
  const subStores: SubStore[] = [
    { id: "sub-1", name: "GamerX Skins", slug: "gamerx", owner: "Rafael Costa", ownerPhone: "5511988887777", plan: "elite", status: "active", createdAt: new Date(now - 40 * DAY).toISOString(), activatedAt: new Date(now - 40 * DAY).toISOString() },
    { id: "sub-2", name: "Tropa Store", slug: "tropa", owner: "Igor Lima", ownerPhone: "5521977776666", plan: "pro", status: "active", createdAt: new Date(now - 22 * DAY).toISOString(), activatedAt: new Date(now - 22 * DAY).toISOString() },
    { id: "sub-3", name: "EliteCS", slug: "elitecs", owner: "Caio Ribeiro", ownerPhone: "5531966665555", plan: "basic", status: "active", createdAt: new Date(now - 9 * DAY).toISOString(), activatedAt: new Date(now - 9 * DAY).toISOString() },
    { id: "sub-4", name: "Clutch Market", slug: "clutch", owner: "Diego Santos", ownerPhone: "5541955554444", plan: "pro", status: "pending", createdAt: new Date(now - 1 * DAY).toISOString() },
  ];

  const rules: RecoveryRule[] = [
    { id: "r7", days: 7, label: "Reativar após 7 dias sem compra", enabled: true, message: "Fala, {nome}! Chegaram skins novas na BRN Skins e separei algumas que combinam com você. Quer dar uma olhada?" },
    { id: "r15", days: 15, label: "Promoção personalizada após 15 dias", enabled: true, message: "{nome}, faz um tempinho! Liberei um desconto especial pra sua próxima skin ou upgrade. Bora?" },
    { id: "r30", days: 30, label: "Última tentativa após 30 dias", enabled: true, message: "{nome}, sentimos sua falta na BRN Skins! Seu inventário merece um upgrade — me chama que eu te ajudo." },
  ];

  return { stock, movements, clients, subStores, rules };
}

export const SUB_STORE_PLANS = {
  basic: { label: "Básico", price: 297 },
  pro: { label: "Pro", price: 497 },
  elite: { label: "Elite", price: 997 },
} as const;
