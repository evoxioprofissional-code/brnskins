"use client";

import Image from "next/image";
import { trackReferralConversion } from "@/app/actions/referral";
import { readReferralCode } from "@/lib/referral-client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, MessageCircle, ShieldCheck, ShoppingCart, Trash2, Truck } from "lucide-react";
import type { CartItem, Order } from "@/types/cart";
import { formatBRL } from "@/lib/format";
import { variantLabel, wearName } from "@/lib/skin";
import { createId } from "@/lib/id";
import { cartSubtotal, useCartStore } from "@/stores/cart-store";
import { useOrdersStore } from "@/stores/orders-store";
import { effectiveWhatsApp, useSettingsStore } from "@/stores/settings-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { checkoutSchema, type CheckoutInput } from "@/validations/checkout";
import { buildOrderMessage, buildWhatsAppUrl } from "@/services/checkout/whatsapp";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { toast } from "@/components/ui/toaster";

function CartLine({ item }: { item: CartItem }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#18191d] bg-[linear-gradient(180deg,#0c0d0f,#090a0c)] p-3 sm:flex-nowrap"
    >
      <div className="relative h-[60px] w-[84px] shrink-0 rounded-[8px] bg-[radial-gradient(closest-side,rgb(230_0_35/0.18),transparent)]">
        {item.kind === "skin" ? (
          <Image src={item.image} alt="" fill sizes="84px" className="object-contain" />
        ) : (
          <div className="grid h-full grid-cols-2 gap-0.5 p-0.5">
            {item.images.slice(0, 4).map((src) => (
              <div key={src} className="relative">
                <Image src={src} alt="" fill sizes="40px" className="object-contain" />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{item.name}</p>
        <p className="truncate text-[12px] text-fg-2">
          {item.kind === "skin"
            ? `${wearName(item.wear)}${item.variant !== "normal" ? ` · ${variantLabel(item.variant)}` : ""}`
            : `Kit · ${item.itemsLabel}`}
        </p>
        <p className="mt-0.5 text-[12px] text-faint">{formatBRL(item.unitPrice)} / un.</p>
      </div>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <QuantityStepper size="sm" value={item.quantity} onChange={(q) => setQuantity(item.key, q)} />
        <span className="w-[110px] text-right text-[15px] font-bold">{formatBRL(item.unitPrice * item.quantity)}</span>
        <button
          type="button"
          onClick={() => {
            remove(item.key);
            toast("Item removido do carrinho");
          }}
          aria-label={`Remover ${item.name}`}
          className="grid size-8 place-items-center rounded-md text-fg-2 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.li>
  );
}

export function CartView() {
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const addOrder = useOrdersStore((s) => s.add);
  const whatsapp = useSettingsStore((s) => s.whatsapp);
  const [form, setForm] = useState<CheckoutInput>({ customerName: "", tradeLink: "", notes: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutInput, string>>>({});

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-[12px] bg-surface" aria-busy />;
  }

  const subtotal = cartSubtotal(items);
  const total = subtotal;
  const phone = effectiveWhatsApp(whatsapp);

  const checkout = () => {
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof CheckoutInput] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    const orderId = createId("BRN").toUpperCase();
    const referral = readReferralCode();
    const message = buildOrderMessage({
      greeting: whatsapp.greeting,
      footer: whatsapp.orderTemplateFooter,
      customerName: parsed.data.customerName,
      tradeLink: parsed.data.tradeLink || undefined,
      notes: parsed.data.notes || undefined,
      items,
      total,
      orderId,
      referral,
    });
    const url = buildWhatsAppUrl(phone, message);
    if (!url) {
      toast("WhatsApp da loja ainda não configurado. Defina o número no painel admin.", "error");
      return;
    }
    const order: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: parsed.data.customerName,
      tradeLink: parsed.data.tradeLink || undefined,
      items,
      subtotal,
      discount: 0,
      total,
      status: "pending",
      channel: "whatsapp",
    };
    addOrder(order);
    window.open(url, "_blank", "noopener,noreferrer");
    // Registra a comissão do influenciador sem atrasar a abertura do WhatsApp
    if (referral) void trackReferralConversion({ source: "order", reference: orderId, amount: total });
    clear();
    toast("Pedido enviado para o WhatsApp");
  };

  if (!items.length) {
    return (
      <div className="panel grid place-items-center px-6 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30">
          <ShoppingCart size={24} />
        </span>
        <p className="mt-4 text-[17px] font-bold">Seu carrinho está vazio</p>
        <p className="mt-1 text-[13.5px] text-fg-2">Explore o catálogo e adicione suas skins favoritas.</p>
        <Link href="/" className="btn-solid-red mt-6 inline-flex h-10 items-center gap-2 rounded-[8px] px-5 text-[14px] font-semibold">
          <ArrowLeft size={16} /> Ver catálogo
        </Link>
      </div>
    );
  }

  const field =
    "mt-1.5 w-full rounded-[8px] border border-[#1d1e22] bg-[#0e0f11] px-3 text-[13.5px] text-fg outline-none transition-colors focus:border-primary/60";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Itens do carrinho">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] text-fg-2">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </p>
          <button
            type="button"
            onClick={() => {
              clear();
              toast("Carrinho esvaziado");
            }}
            className="text-[12.5px] font-semibold text-fg-2 hover:text-primary"
          >
            Esvaziar carrinho
          </button>
        </div>
        <ul className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <CartLine key={i.key} item={i} />
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <aside className="panel p-5 lg:sticky lg:top-[90px]" aria-label="Resumo do pedido">
        <h2 className="text-[16px] font-bold">Resumo do pedido</h2>
        <dl className="mt-4 space-y-2 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-fg-2">Subtotal</dt>
            <dd className="font-semibold">{formatBRL(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-2">Entrega</dt>
            <dd className="font-semibold text-success">Grátis</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-[16px]">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold">{formatBRL(total)}</dd>
          </div>
        </dl>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            checkout();
          }}
          noValidate
        >
          <label className="block text-[12.5px] font-semibold text-fg-2">
            Seu nome
            <input
              className={`${field} h-10`}
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              autoComplete="name"
              aria-invalid={Boolean(errors.customerName)}
            />
            {errors.customerName && <span className="mt-1 block text-[12px] text-primary">{errors.customerName}</span>}
          </label>
          <label className="block text-[12.5px] font-semibold text-fg-2">
            Trade link da Steam <span className="font-normal text-faint">(opcional)</span>
            <input
              className={`${field} h-10`}
              value={form.tradeLink}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
              onChange={(e) => setForm({ ...form, tradeLink: e.target.value })}
              aria-invalid={Boolean(errors.tradeLink)}
            />
            {errors.tradeLink && <span className="mt-1 block text-[12px] text-primary">{errors.tradeLink}</span>}
          </label>
          <label className="block text-[12.5px] font-semibold text-fg-2">
            Observações <span className="font-normal text-faint">(opcional)</span>
            <textarea
              className={`${field} min-h-[72px] resize-y py-2`}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <button
            type="submit"
            className="btn-solid-red flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] text-[14.5px] font-semibold"
          >
            <MessageCircle size={18} /> Finalizar pelo WhatsApp
          </button>
        </form>

        <ul className="mt-5 space-y-2 text-[12.5px] text-fg-2">
          <li className="flex items-center gap-2">
            <Truck size={15} className="text-primary" /> Entrega via proposta de troca na Steam
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-primary" /> Atendimento humano direto no WhatsApp
          </li>
        </ul>
      </aside>
    </div>
  );
}
