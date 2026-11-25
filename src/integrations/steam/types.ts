/** Item do inventário Steam já normalizado para o site. */
export interface SteamInventoryItem {
  assetId: string;
  /** Nome no mercado, em inglês (ex.: "StatTrak™ AK-47 | Redline (Field-Tested)") */
  marketHashName: string;
  name: string;
  image: string;
  /** false = em trade hold / bloqueado para troca */
  tradable: boolean;
  type: string;
  exterior: string | null;
  rarityColor: string | null;
}

export type InventoryErrorCode = "invalid" | "private" | "rate_limited" | "unavailable" | "partial_failure";

export type InventoryResult = { ok: true; items: SteamInventoryItem[] } | { ok: false; code: InventoryErrorCode };

export const INVENTORY_ERRORS: Record<InventoryErrorCode, string> = {
  invalid: "Conta Steam inválida.",
  private:
    "Seu inventário está privado. Na Steam, abra Perfil → Editar perfil → Privacidade e deixe o Inventário como Público.",
  rate_limited: "A Steam limitou as consultas por alguns minutos. Tente novamente daqui a pouco.",
  unavailable:
    "A Steam não devolveu o inventário. Confira se o inventário está público e tente de novo — às vezes a Steam fica instável.",
  partial_failure: "A Steam devolveu só parte do inventário. Tente atualizar.",
};
