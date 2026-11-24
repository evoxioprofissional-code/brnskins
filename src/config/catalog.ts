import type { Category, Rarity, SkinColor, Wear, WearCode, VariantType } from "@/types/catalog";
import type { SortOption } from "@/types/filters";

/** Dados de referência do domínio CS2 (não são dados demonstrativos). */

export const CATEGORIES: Category[] = [
  { id: "rifle", label: "Rifle", badge: "RIFLE", sortOrder: 1 },
  { id: "sniper", label: "Sniper", badge: "SNIPER", sortOrder: 2 },
  { id: "pistol", label: "Pistola", badge: "PISTOLA", sortOrder: 3 },
  { id: "smg", label: "SMG", badge: "SMG", sortOrder: 4 },
  { id: "heavy", label: "Pesada", badge: "PESADA", sortOrder: 5 },
  { id: "knife", label: "Faca", badge: "FACA", sortOrder: 6 },
  { id: "gloves", label: "Luvas", badge: "LUVAS", sortOrder: 7 },
  { id: "agent", label: "Agentes", badge: "AGENTE", sortOrder: 8 },
];

export const RARITIES: Rarity[] = [
  { id: "consumer", name: "Consumer Grade", label: "Nível Consumidor", color: "#b0c3d9", sortOrder: 1 },
  { id: "industrial", name: "Industrial Grade", label: "Nível Industrial", color: "#5e98d9", sortOrder: 2 },
  { id: "milspec", name: "Mil-Spec Grade", label: "Nível Militar", color: "#4b69ff", sortOrder: 3 },
  { id: "restricted", name: "Restricted", label: "Restrito", color: "#8847ff", sortOrder: 4 },
  { id: "classified", name: "Classified", label: "Secreto", color: "#d32ce6", sortOrder: 5 },
  { id: "covert", name: "Covert", label: "Oculto", color: "#eb4b4b", sortOrder: 6 },
  { id: "extraordinary", name: "Extraordinary", label: "Extraordinário", color: "#eb4b4b", sortOrder: 7 },
  { id: "master", name: "Master", label: "Mestre (Agente)", color: "#eb4b4b", sortOrder: 8 },
  { id: "contraband", name: "Contraband", label: "Contrabando", color: "#e4ae39", sortOrder: 9 },
];

export const WEARS: Wear[] = [
  { code: "FN", name: "Factory New", label: "Nova de Fábrica", minFloat: 0, maxFloat: 0.07 },
  { code: "MW", name: "Minimal Wear", label: "Pouco Usada", minFloat: 0.07, maxFloat: 0.15 },
  { code: "FT", name: "Field-Tested", label: "Testada em Campo", minFloat: 0.15, maxFloat: 0.38 },
  { code: "WW", name: "Well-Worn", label: "Bem Desgastada", minFloat: 0.38, maxFloat: 0.45 },
  { code: "BS", name: "Battle-Scarred", label: "Veterana de Guerra", minFloat: 0.45, maxFloat: 1 },
];

export const WEAR_CODES: WearCode[] = WEARS.map((w) => w.code);

export const WEAR_COLORS: Record<WearCode, string> = {
  FN: "#22c55e",
  MW: "#a3e635",
  FT: "#fb923c",
  WW: "#f59e0b",
  BS: "#ef4444",
};

export const VARIANT_LABELS: Record<VariantType, string> = {
  normal: "Normal",
  stattrak: "StatTrak™",
  souvenir: "Souvenir",
};

export const COLOR_SWATCHES: { id: SkinColor; label: string; hex: string }[] = [
  { id: "red", label: "Vermelho", hex: "#e60023" },
  { id: "pink", label: "Rosa", hex: "#ec4899" },
  { id: "orange", label: "Laranja", hex: "#f97316" },
  { id: "yellow", label: "Amarelo", hex: "#eab308" },
  { id: "green", label: "Verde", hex: "#22c55e" },
  { id: "blue", label: "Azul", hex: "#3b82f6" },
  { id: "purple", label: "Roxo", hex: "#8b5cf6" },
  { id: "white", label: "Branco", hex: "#f5f5f5" },
  { id: "gray", label: "Cinza", hex: "#71717a" },
  { id: "black", label: "Preto", hex: "#18181b" },
];

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "featured", label: "Destaques" },
  { id: "price-asc", label: "Menor preço" },
  { id: "price-desc", label: "Maior preço" },
  { id: "discount", label: "Maior desconto" },
  { id: "newest", label: "Mais recentes" },
  { id: "name", label: "Nome (A-Z)" },
];

export const getCategory = (id: string) => CATEGORIES.find((c) => c.id === id);
export const getRarity = (id: string) => RARITIES.find((r) => r.id === id);
export const getWear = (code: WearCode) => WEARS.find((w) => w.code === code)!;
