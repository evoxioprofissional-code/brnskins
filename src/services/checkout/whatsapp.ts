import type { CartItem } from "@/types/cart";
import { formatBRL } from "@/lib/format";
import { variantLabel, wearName } from "@/lib/skin";

export interface WhatsAppOrderInput {
  greeting: string;
  footer: string;
  customerName: string;
  tradeLink?: string;
  notes?: string;
  items: CartItem[];
  total: number;
  orderId: string;
  /** Código do influenciador que indicou o cliente */
  referral?: string | null;
}

const line = (item: CartItem) => {
  if (item.kind === "kit") {
    return `• ${item.quantity}x ${item.name} (${item.itemsLabel}) — ${formatBRL(item.unitPrice * item.quantity)}`;
  }
  const variant = item.variant !== "normal" ? ` ${variantLabel(item.variant)}` : "";
  const wear = item.noWear ? "" : ` (${wearName(item.wear)})`;
  return `• ${item.quantity}x ${item.name}${variant}${wear} — ${formatBRL(
    item.unitPrice * item.quantity,
  )}`;
};

export function buildOrderMessage(input: WhatsAppOrderInput) {
  return [
    input.greeting,
    "",
    `Pedido: ${input.orderId}`,
    `Nome: ${input.customerName}`,
    input.tradeLink ? `Trade link: ${input.tradeLink}` : null,
    input.referral ? `Indicação: ${input.referral}` : null,
    "",
    ...input.items.map(line),
    "",
    `Total: ${formatBRL(input.total)}`,
    input.notes ? `\nObservações: ${input.notes}` : null,
    "",
    input.footer,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/** Gera o link wa.me. Retorna null quando o número da loja não está configurado. */
export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
