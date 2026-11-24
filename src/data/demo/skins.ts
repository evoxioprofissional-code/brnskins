/**
 * ============================================================================
 *  DADOS DEMONSTRATIVOS — NÃO SÃO PREÇOS REAIS
 * ----------------------------------------------------------------------------
 *  Catálogo de exemplo usado enquanto as integrações reais (Supabase / APIs de
 *  preço) não estão configuradas. Os valores servem apenas para visualizar a
 *  interface e não devem ser apresentados como preços de produção.
 *
 *  As imagens são as artes oficiais das skins (CDN da Steam), salvas
 *  localmente em /public/images/skins.
 *
 *  Importante: componentes NÃO devem importar este arquivo diretamente.
 *  Use o repositório em `@/services/catalog`.
 * ============================================================================
 */
import type {
  CategoryId,
  RarityId,
  Skin,
  SkinColor,
  VariantType,
  WearCode,
  WearOffer,
} from "@/types/catalog";
import { WEARS } from "@/config/catalog";

interface DemoSkinSeed {
  weapon: string;
  finish: string;
  star?: boolean;
  /** Nome da arma em inglês, quando o exibido for traduzido */
  marketWeapon?: string;
  category: CategoryId;
  rarity: RarityId;
  image: string;
  colors: SkinColor[];
  variants: VariantType[];
  wears: WearCode[];
  defaultWear: WearCode;
  /** Preço da condição padrão */
  price: number;
  /** Desconto em relação à Steam (0–1) */
  discount: number;
  /** Preços explícitos por condição (sobrepõe o cálculo automático) */
  wearPrices?: Partial<Record<WearCode, number>>;
  floatOverride?: Partial<Record<WearCode, number>>;
  delivery?: string;
}

const WEAR_MULTIPLIER: Record<WearCode, number> = {
  FN: 1,
  MW: 0.84,
  FT: 0.71,
  WW: 0.63,
  BS: 0.57,
};

/** Pseudo-aleatório determinístico (mesmo resultado no servidor e no cliente). */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function buildOffers(seed: DemoSkinSeed, id: string): WearOffer[] {
  const base = seed.price / WEAR_MULTIPLIER[seed.defaultWear];
  return seed.wears.map((code) => {
    const range = WEARS.find((w) => w.code === code)!;
    const price = round2(seed.wearPrices?.[code] ?? base * WEAR_MULTIPLIER[code]);
    const r = seeded(`${id}-${code}`);
    const float =
      seed.floatOverride?.[code] ??
      Number((range.minFloat + (range.maxFloat - range.minFloat) * (0.08 + r * 0.6)).toFixed(6));
    return {
      wear: code,
      price,
      steamPrice: round2(price / (1 - seed.discount)),
      float,
      available: true,
    };
  });
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const SEEDS: DemoSkinSeed[] = [
  {
    weapon: "AWP",
    finish: "Fade",
    category: "sniper",
    rarity: "covert",
    image: "awp-fade",
    colors: ["pink", "orange", "purple"],
    variants: ["normal", "souvenir"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FN",
    price: 2521.95,
    discount: 0.11,
    wearPrices: { FN: 2521.95, MW: 2771.4, FT: 2998.9, WW: 3341.2, BS: 3872.6 },
    floatOverride: { FN: 0.007421 },
    delivery: "~1h",
  },
  {
    weapon: "AK-47",
    finish: "Asiimov",
    category: "rifle",
    rarity: "covert",
    image: "ak-47-asiimov",
    colors: ["orange", "white", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "MW",
    price: 472.3,
    discount: 0.08,
  },
  {
    weapon: "CZ75-Auto",
    finish: "Army Sheen",
    category: "pistol",
    rarity: "consumer",
    image: "cz75-auto-army-sheen",
    colors: ["gray", "green"],
    variants: ["normal", "souvenir"],
    wears: ["FN", "MW", "FT"],
    defaultWear: "FN",
    price: 12.05,
    discount: 0.08,
  },
  {
    weapon: "Bayonet",
    finish: "Fade",
    star: true,
    category: "knife",
    rarity: "covert",
    image: "bayonet-fade",
    colors: ["pink", "orange", "purple"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW"],
    defaultWear: "FN",
    price: 1684.3,
    discount: 0.07,
  },
  {
    weapon: "Luvas de Especialista",
    marketWeapon: "Specialist Gloves",
    finish: "Crimson Kimono",
    star: true,
    category: "gloves",
    rarity: "extraordinary",
    image: "specialist-gloves-crimson-kimono",
    colors: ["red", "black"],
    variants: ["normal"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "MW",
    price: 6890.0,
    discount: 0.06,
  },
  {
    weapon: "MAC-10",
    finish: "Fade",
    category: "smg",
    rarity: "milspec",
    image: "mac-10-fade",
    colors: ["pink", "orange", "purple"],
    variants: ["normal", "souvenir"],
    wears: ["FN", "MW"],
    defaultWear: "FN",
    price: 38.9,
    discount: 0.05,
  },
  {
    weapon: "AWP",
    finish: "Acheron",
    category: "sniper",
    rarity: "milspec",
    image: "awp-acheron",
    colors: ["gray", "red"],
    variants: ["normal", "souvenir"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FN",
    price: 21.4,
    discount: 0.04,
  },
  {
    weapon: "M4A4",
    finish: "Neo-Noir",
    category: "rifle",
    rarity: "covert",
    image: "m4a4-neo-noir",
    colors: ["pink", "white", "black"],
    variants: ["normal", "stattrak", "souvenir"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "MW",
    price: 389.9,
    discount: 0.09,
  },
  {
    weapon: "Karambit",
    finish: "Doppler",
    star: true,
    category: "knife",
    rarity: "covert",
    image: "karambit-doppler",
    colors: ["purple", "blue", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW"],
    defaultWear: "FN",
    price: 7420.0,
    discount: 0.06,
  },
  {
    weapon: "AK-47",
    finish: "Redline",
    category: "rifle",
    rarity: "classified",
    image: "ak-47-redline",
    colors: ["red", "black"],
    variants: ["normal", "stattrak"],
    wears: ["MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 168.5,
    discount: 0.1,
  },
  {
    weapon: "USP-S",
    finish: "Kill Confirmed",
    category: "pistol",
    rarity: "covert",
    image: "usp-s-kill-confirmed",
    colors: ["red", "gray", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 214.9,
    discount: 0.07,
  },
  {
    weapon: "M4A1-S",
    finish: "Printstream",
    category: "rifle",
    rarity: "covert",
    image: "m4a1-s-printstream",
    colors: ["white", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "MW",
    price: 1132.4,
    discount: 0.08,
  },
  {
    weapon: "Desert Eagle",
    finish: "Blaze",
    category: "pistol",
    rarity: "restricted",
    image: "desert-eagle-blaze",
    colors: ["orange", "yellow", "black"],
    variants: ["normal"],
    wears: ["FN", "MW"],
    defaultWear: "FN",
    price: 2390.0,
    discount: 0.05,
  },
  {
    weapon: "Luvas Esportivas",
    marketWeapon: "Sport Gloves",
    finish: "Vice",
    star: true,
    category: "gloves",
    rarity: "extraordinary",
    image: "sport-gloves-vice",
    colors: ["pink", "blue"],
    variants: ["normal"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 4380.0,
    discount: 0.06,
  },
  {
    weapon: "AWP",
    finish: "Dragon Lore",
    category: "sniper",
    rarity: "covert",
    image: "awp-dragon-lore",
    colors: ["yellow", "green"],
    variants: ["normal", "souvenir"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 48900.0,
    discount: 0.04,
  },
  {
    weapon: "Glock-18",
    finish: "Fade",
    category: "pistol",
    rarity: "restricted",
    image: "glock-18-fade",
    colors: ["pink", "orange", "purple"],
    variants: ["normal"],
    wears: ["FN", "MW"],
    defaultWear: "FN",
    price: 6120.0,
    discount: 0.05,
  },
  {
    weapon: "P90",
    finish: "Asiimov",
    category: "smg",
    rarity: "covert",
    image: "p90-asiimov",
    colors: ["orange", "white", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 64.7,
    discount: 0.09,
  },
  {
    weapon: "Nova",
    finish: "Hyper Beast",
    category: "heavy",
    rarity: "classified",
    image: "nova-hyper-beast",
    colors: ["blue", "pink", "yellow"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "MW",
    price: 18.9,
    discount: 0.06,
  },
  {
    weapon: "★ Karambit",
    finish: "Fade",
    star: true,
    category: "knife",
    rarity: "covert",
    image: "karambit-fade",
    colors: ["pink", "orange", "purple"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW"],
    defaultWear: "FN",
    price: 11250.0,
    discount: 0.05,
  },
  {
    weapon: "MP9",
    finish: "Starlight Protector",
    category: "smg",
    rarity: "covert",
    image: "mp9-starlight-protector",
    colors: ["blue", "purple", "yellow"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "MW",
    price: 92.3,
    discount: 0.07,
  },
  {
    weapon: "Desert Eagle",
    finish: "Printstream",
    category: "pistol",
    rarity: "covert",
    image: "desert-eagle-printstream",
    colors: ["white", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 286.4,
    discount: 0.08,
  },
  {
    weapon: "AK-47",
    finish: "Fire Serpent",
    category: "rifle",
    rarity: "covert",
    image: "ak-47-fire-serpent",
    colors: ["green", "orange", "yellow"],
    variants: ["normal", "stattrak", "souvenir"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 3480.0,
    discount: 0.05,
  },
  {
    weapon: "M249",
    finish: "Emerald Poison Dart",
    category: "heavy",
    rarity: "restricted",
    image: "m249-emerald-poison-dart",
    colors: ["green", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW"],
    defaultWear: "MW",
    price: 4.6,
    discount: 0.03,
  },
  {
    weapon: "XM1014",
    finish: "Tranquility",
    category: "heavy",
    rarity: "classified",
    image: "xm1014-tranquility",
    colors: ["blue", "white"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FN",
    price: 34.9,
    discount: 0.06,
  },
  {
    weapon: "UMP-45",
    finish: "Primal Saber",
    category: "smg",
    rarity: "classified",
    image: "ump-45-primal-saber",
    colors: ["yellow", "green", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "MW",
    price: 26.3,
    discount: 0.05,
  },
  {
    weapon: "Luvas de Motorista",
    marketWeapon: "Driver Gloves",
    finish: "Crimson Weave",
    star: true,
    category: "gloves",
    rarity: "extraordinary",
    image: "driver-gloves-crimson-weave",
    colors: ["red", "black"],
    variants: ["normal"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 2980.0,
    discount: 0.07,
  },
  {
    weapon: "Glock-18",
    finish: "Water Elemental",
    category: "pistol",
    rarity: "classified",
    image: "glock-18-water-elemental",
    colors: ["blue", "red"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "MW",
    price: 21.8,
    discount: 0.06,
  },
  {
    weapon: "M4A1-S",
    finish: "Hyper Beast",
    category: "rifle",
    rarity: "covert",
    image: "m4a1-s-hyper-beast",
    colors: ["blue", "pink", "yellow"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 98.6,
    discount: 0.08,
  },
  {
    weapon: "Butterfly",
    marketWeapon: "Butterfly Knife",
    finish: "Crimson Web",
    star: true,
    category: "knife",
    rarity: "covert",
    image: "butterfly-knife-crimson-web",
    colors: ["red", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FT",
    price: 9870.0,
    discount: 0.05,
  },
  {
    weapon: "Negev",
    finish: "Power Loader",
    category: "heavy",
    rarity: "restricted",
    image: "negev-power-loader",
    colors: ["yellow", "black"],
    variants: ["normal", "stattrak"],
    wears: ["FN", "MW", "FT", "WW", "BS"],
    defaultWear: "FN",
    price: 3.2,
    discount: 0.04,
  },
  {
    weapon: "Sir Bloody Miami Darryl",
    finish: "The Professionals",
    category: "agent",
    rarity: "master",
    image: "sir-bloody-miami-darryl-the-professionals",
    colors: ["red", "black"],
    variants: ["normal"],
    wears: ["FN"],
    defaultWear: "FN",
    price: 46.9,
    discount: 0.05,
  },
  {
    weapon: "Cmdr. Mae 'Dead Cold' Jamison",
    finish: "SWAT",
    category: "agent",
    rarity: "master",
    image: "cmdr-mae-dead-cold-jamison-swat",
    colors: ["blue", "black"],
    variants: ["normal"],
    wears: ["FN"],
    defaultWear: "FN",
    price: 38.4,
    discount: 0.05,
  },
];

export const DEMO_SKINS: Skin[] = SEEDS.map((seed, index) => {
  const weapon = seed.weapon.replace(/^★\s*/, "");
  const slug = slugify(`${weapon}-${seed.finish}`);
  const id = `demo-${slug}`;
  return {
    id,
    slug,
    weapon,
    finish: seed.finish,
    isStar: Boolean(seed.star),
    marketName: `${seed.star ? "★ " : ""}${seed.marketWeapon ?? weapon} | ${seed.finish}`,
    category: seed.category,
    rarity: seed.rarity,
    image: `/images/skins/${seed.image}.png`,
    colors: seed.colors,
    variants: seed.variants,
    defaultWear: seed.defaultWear,
    offers: buildOffers(seed, id),
    deliveryEstimate: seed.delivery ?? (index % 3 === 0 ? "~1h" : index % 3 === 1 ? "~2h" : "~30min"),
    featuredRank: index + 1,
    createdAt: new Date(Date.UTC(2026, 9, 1 + ((index * 7) % 50))).toISOString(),
  };
});
