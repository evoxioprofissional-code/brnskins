/**
 * DADOS DEMONSTRATIVOS — combinações de kits de exemplo.
 * Os preços não são reais. Use o repositório em `@/services/catalog`.
 */
import type { Kit } from "@/types/catalog";

export const DEMO_KITS: Kit[] = [
  {
    id: "demo-kit-red-line",
    slug: "kit-red-line",
    name: "Kit Red Line",
    description: "Loadout vermelho e preto para quem joga de rifle.",
    tag: "Mais vendido",
    items: [
      { skinId: "demo-ak-47-redline", wear: "FT", variant: "normal" },
      { skinId: "demo-usp-s-kill-confirmed", wear: "FT", variant: "normal" },
      { skinId: "demo-awp-acheron", wear: "FN", variant: "normal" },
      { skinId: "demo-luvas-de-motorista-crimson-weave", wear: "FT", variant: "normal" },
    ],
    price: 3290.0,
  },
  {
    id: "demo-kit-fade",
    slug: "kit-fade",
    name: "Kit Fade",
    description: "Gradiente Fade em todas as armas principais.",
    tag: "Premium",
    items: [
      { skinId: "demo-awp-fade", wear: "FN", variant: "normal" },
      { skinId: "demo-mac-10-fade", wear: "FN", variant: "normal" },
      { skinId: "demo-bayonet-fade", wear: "FN", variant: "normal" },
    ],
    price: 4090.0,
  },
  {
    id: "demo-kit-printstream",
    slug: "kit-printstream",
    name: "Kit Printstream",
    description: "Visual clean preto e branco, do pistol ao rifle.",
    items: [
      { skinId: "demo-m4a1-s-printstream", wear: "MW", variant: "normal" },
      { skinId: "demo-desert-eagle-printstream", wear: "FT", variant: "normal" },
      { skinId: "demo-ak-47-asiimov", wear: "MW", variant: "normal" },
    ],
    price: 1790.0,
  },
  {
    id: "demo-kit-iniciante",
    slug: "kit-iniciante",
    name: "Kit Iniciante",
    description: "Skins acessíveis para montar o primeiro inventário.",
    tag: "Custo-benefício",
    items: [
      { skinId: "demo-cz75-auto-army-sheen", wear: "FN", variant: "normal" },
      { skinId: "demo-glock-18-water-elemental", wear: "MW", variant: "normal" },
      { skinId: "demo-nova-hyper-beast", wear: "MW", variant: "normal" },
      { skinId: "demo-ump-45-primal-saber", wear: "MW", variant: "normal" },
    ],
    price: 72.9,
  },
  {
    id: "demo-kit-hyper-beast",
    slug: "kit-hyper-beast",
    name: "Kit Hyper Beast",
    description: "Cores vibrantes para quem quer chamar atenção.",
    items: [
      { skinId: "demo-m4a1-s-hyper-beast", wear: "FT", variant: "normal" },
      { skinId: "demo-nova-hyper-beast", wear: "MW", variant: "normal" },
      { skinId: "demo-mp9-starlight-protector", wear: "MW", variant: "normal" },
      { skinId: "demo-luvas-esportivas-vice", wear: "FT", variant: "normal" },
    ],
    price: 4520.0,
  },
  {
    id: "demo-kit-faca-luva",
    slug: "kit-faca-luva",
    name: "Kit Faca + Luva",
    description: "Combinação ★ vermelha: Butterfly e Luvas de Especialista.",
    tag: "★ Raro",
    items: [
      { skinId: "demo-butterfly-crimson-web", wear: "FT", variant: "normal" },
      { skinId: "demo-luvas-de-especialista-crimson-kimono", wear: "MW", variant: "normal" },
    ],
    price: 15990.0,
  },
];
