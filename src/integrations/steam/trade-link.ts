/**
 * Identificação da conta Steam a partir do que o cliente cola:
 * trade link, SteamID64 ou link de perfil /profiles/<id>.
 * Links personalizados (/id/<nome>) exigiriam a Web API da Steam com chave,
 * então não são aceitos — o trade link resolve sem chave.
 */

/** Diferença entre SteamID64 e o "partner" (account id 32 bits) do trade link. */
const STEAMID64_BASE = BigInt("76561197960265728");

export const TRADE_LINK_RE = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=(\d+)&token=([\w-]+)$/;
const STEAMID64_RE = /^7656119\d{10}$/;
const PROFILE_RE = /^https?:\/\/steamcommunity\.com\/profiles\/(7656119\d{10})\/?/;

export type SteamIdentity =
  | { ok: true; steamId: string; tradeLink: string | null }
  | { ok: false; error: string };

export const isSteamId64 = (v: string) => STEAMID64_RE.test(v);

export function parseSteamInput(raw: string): SteamIdentity {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Cole seu trade link da Steam." };

  const trade = value.match(TRADE_LINK_RE);
  if (trade) {
    const partner = BigInt(trade[1]!);
    if (partner <= BigInt(0) || partner > BigInt(4294967295)) return { ok: false, error: "Trade link inválido." };
    return { ok: true, steamId: (partner + STEAMID64_BASE).toString(), tradeLink: value };
  }
  if (isSteamId64(value)) return { ok: true, steamId: value, tradeLink: null };
  const profile = value.match(PROFILE_RE);
  if (profile) return { ok: true, steamId: profile[1]!, tradeLink: null };
  if (/steamcommunity\.com\/id\//.test(value))
    return { ok: false, error: "Links personalizados (/id/...) não funcionam. Use o seu trade link." };
  return { ok: false, error: "Não reconhecemos esse link. Cole o trade link completo da Steam." };
}

/** Página da Steam onde o cliente encontra o próprio trade link. */
export const TRADE_LINK_HELP_URL = "https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url";
export const profileUrl = (steamId: string) => `https://steamcommunity.com/profiles/${steamId}`;
