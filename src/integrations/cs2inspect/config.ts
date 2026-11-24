import type { AgentLoopAnim, AgentOneShot, DopplerPhase, InspectErrorReason, InspectScene } from "./types";

/**
 * Configuração do CS2Inspect (API gratuita de visualização 3D).
 * Documentação: https://cs2inspect.skin/docs/api
 *
 * A chave é PÚBLICA por design (fica visível no HTML de quem incorpora o
 * visualizador); a proteção vem da lista de sites permitidos no painel do
 * CS2Inspect. Por isso ela usa o prefixo NEXT_PUBLIC_.
 */
export const CS2INSPECT = {
  origin: "https://cs2inspect.skin",
  scriptUrl: "https://cs2inspect.skin/embed.js",
  docsUrl: "https://cs2inspect.skin/docs/api",
  siteUrl: "https://cs2inspect.skin",
  publicKey: process.env.NEXT_PUBLIC_CS2INSPECT_KEY ?? "",
  /** Acento da BRN aplicado à interface do visualizador */
  accent: "E60023",
} as const;

export const hasCs2InspectKey = () => CS2INSPECT.publicKey.trim().length > 0;

export const SCENES: { id: InspectScene; label: string }[] = [
  { id: "vanity", label: "Vitrine" },
  { id: "dust2", label: "Dust II" },
  { id: "mirage", label: "Mirage" },
  { id: "inferno", label: "Inferno" },
  { id: "nuke", label: "Nuke" },
  { id: "overpass", label: "Overpass" },
  { id: "ancient_day", label: "Ancient (dia)" },
  { id: "ancient_night", label: "Ancient (noite)" },
  { id: "anubis", label: "Anubis" },
  { id: "vertigo", label: "Vertigo" },
  { id: "train", label: "Train" },
  { id: "cache", label: "Cache" },
  { id: "office", label: "Office" },
  { id: "italy", label: "Italy" },
  { id: "baggage", label: "Baggage" },
];

/** Modelos de agente citados na documentação oficial. */
export const AGENT_MODELS: { id: string; label: string }[] = [
  { id: "ctm_sas_variantf", label: "SAS (CT)" },
  { id: "tm_professional_varf5", label: "The Professionals (TR)" },
  { id: "tm_leet_variantg", label: "Elite Crew (TR)" },
];

export const AGENT_LOOPS: { id: AgentLoopAnim; label: string }[] = [
  { id: "idle", label: "Parado" },
  { id: "lookat", label: "Olhando a arma" },
  { id: "walk", label: "Andando" },
  { id: "run", label: "Correndo" },
  { id: "crouch", label: "Agachado" },
  { id: "crouchWalk", label: "Andando agachado" },
];

export const AGENT_ONE_SHOTS: { id: AgentOneShot; label: string }[] = [
  { id: "draw", label: "Sacar" },
  { id: "reload", label: "Recarregar" },
  { id: "fire", label: "Disparar" },
  { id: "alt", label: "Ataque alt." },
];

export const DOPPLER_PHASES: { id: DopplerPhase; label: string }[] = [
  { id: "1", label: "Fase 1" },
  { id: "2", label: "Fase 2" },
  { id: "3", label: "Fase 3" },
  { id: "4", label: "Fase 4" },
  { id: "ruby", label: "Ruby" },
  { id: "sapphire", label: "Sapphire" },
  { id: "black-pearl", label: "Black Pearl" },
  { id: "emerald", label: "Emerald" },
];

export const ERROR_MESSAGES: Record<InspectErrorReason, string> = {
  no_key: "Chave pública do CS2Inspect não configurada (NEXT_PUBLIC_CS2INSPECT_KEY).",
  bad_key: "A chave do CS2Inspect é inválida.",
  revoked: "A chave do CS2Inspect foi desativada no painel do fornecedor.",
  origin_not_allowed: "Este domínio não está na lista de sites permitidos da chave.",
  no_origin: "O visualizador precisa ser aberto dentro do site.",
  unknown_item: "O CS2Inspect não reconheceu este item.",
  no_model: "Modelo 3D indisponível no momento. Tente novamente em instantes.",
  rate_limited: "Muitas visualizações ao mesmo tempo. Aguarde alguns segundos.",
};

/** Limites documentados dos parâmetros. */
export const LIMITS = {
  seedMax: 1000,
  charmSeedMax: 100000,
  nametagMax: 20,
  stickerSlots: 5,
  patchSlots: 3,
} as const;
