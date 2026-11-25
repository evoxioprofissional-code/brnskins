/** Regras do programa de indicação de influenciadores. */
export const REFERRAL = {
  /** Cookie (legível no navegador) com o código de quem indicou */
  refCookie: "brn_ref",
  /** Cookie httpOnly com o id aleatório do visitante */
  visitorCookie: "brn_vid",
  /** Por quantos dias a indicação vale depois do clique (último clique vence) */
  attributionDays: 30,
  /** Visitas do mesmo visitante dentro desta janela contam uma vez só */
  visitDedupeMinutes: 30,
  /** Limite de comissões registradas por visitante por dia (anti-abuso) */
  maxConversionsPerVisitorPerDay: 10,
  /** Comissão padrão para novos influenciadores (%) */
  defaultCommission: 10,
} as const;

export const REFERRAL_CODE_RE = /^[a-z0-9][a-z0-9_-]{1,29}$/;

/** Gera um código de link a partir do nome ("Paulo Souza" → "paulo-souza"). */
export const slugifyCode = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
