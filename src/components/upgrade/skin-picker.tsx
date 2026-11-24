"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, PenLine, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryId, Skin, VariantType, WearCode } from "@/types/catalog";
import { CATEGORIES, VARIANT_LABELS, WEAR_COLORS, getRarity, getWear } from "@/config/catalog";
import { useCatalogData } from "@/components/catalog/catalog-data-provider";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { minPrice, priceFor, skinDisplayName } from "@/lib/skin";
import { tradeInValue } from "@/lib/upgrade";
import type { UpgradePick } from "@/stores/upgrade-store";

type Mode = "offer" | "target";

interface SkinPickerProps {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onPick: (pick: UpgradePick) => void;
  /** Somente no modo "offer": item informado à mão */
  onCustom?: (name: string) => void;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[|★™]/g, " ");

export function SkinPicker({ open, mode, onClose, onPick, onCustom }: SkinPickerProps) {
  useLockBodyScroll(open);
  // Cada abertura começa do zero, mesmo se a anterior ainda estiver saindo da tela.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((s) => s + 1);
  }
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key={`backdrop-${session}`}
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key={`dialog-${session}`}
            role="dialog"
            aria-modal="true"
            aria-label={mode === "offer" ? "Adicionar skin que você vai entregar" : "Escolher skin que você quer receber"}
            className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[88dvh] flex-col rounded-t-[18px] border border-border-strong bg-bg-soft sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(640px,86dvh)] sm:w-[600px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[16px]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <PickerBody mode={mode} onClose={onClose} onPick={onPick} onCustom={onCustom} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PickerBody({ mode, onClose, onPick, onCustom }: Omit<SkinPickerProps, "open">) {
  const { skins } = useCatalogData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [selected, setSelected] = useState<Skin | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const usedCategories = useMemo(() => CATEGORIES.filter((c) => skins.some((s) => s.category === c.id)), [skins]);

  const results = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return skins.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!tokens.length) return true;
      const hay = normalize(`${skinDisplayName(s)} ${s.marketName}`);
      return tokens.every((t) => hay.includes(t));
    });
  }, [skins, query, category]);

  const title = mode === "offer" ? "O que você vai entregar?" : "Qual skin você quer?";

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {(selected || custom !== null) && (
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setCustom(null);
            }}
            aria-label="Voltar"
            className="grid size-8 place-items-center rounded-lg text-fg-2 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 className="flex-1 text-[15.5px] font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="grid size-8 place-items-center rounded-lg text-fg-2 hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {selected ? (
        <ConfigureStep skin={selected} mode={mode} onConfirm={onPick} />
      ) : custom !== null ? (
        <CustomStep value={custom} onChange={setCustom} onConfirm={(name) => onCustom?.(name)} />
      ) : (
        <>
          <div className="space-y-2.5 px-4 pt-3">
            <label className="flex h-11 items-center gap-2 rounded-[10px] border border-border bg-surface px-3 focus-within:border-primary/60">
              <Search size={16} className="text-muted" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar arma ou acabamento (ex.: ak redline)"
                className="h-full flex-1 bg-transparent text-[14px] outline-none"
              />
            </label>
            <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
              {[{ id: "all" as const, label: "Todas" }, ...usedCategories].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "h-7 shrink-0 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                    category === c.id ? "glow-active text-white" : "border-border text-fg-2 hover:text-white",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="scrollbar-thin mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {results.map((s) => {
              const color = getRarity(s.rarity)?.color ?? "#e60023";
              const from = minPrice(s);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s)}
                    className="group flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="relative h-[46px] w-[64px] shrink-0">
                      <span
                        aria-hidden
                        className="absolute inset-1 rounded-full blur-[10px]"
                        style={{ background: `radial-gradient(closest-side, ${color}55, transparent)` }}
                      />
                      <Image src={s.image} alt="" fill sizes="64px" className="object-contain" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{skinDisplayName(s)}</span>
                      <span className="block text-[11.5px] text-muted">
                        {mode === "offer" ? "Estimativa a partir de " : "A partir de "}
                        <span className="font-semibold text-fg-2">
                          {formatBRL(mode === "offer" ? tradeInValue(from) : from)}
                        </span>
                      </span>
                    </span>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                  </button>
                </li>
              );
            })}
            {!results.length && (
              <li className="px-4 py-10 text-center text-[13px] text-muted">Nenhuma skin encontrada.</li>
            )}
          </ul>

          {mode === "offer" && onCustom && (
            <div className="border-t border-border p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setCustom(query)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-border-strong text-[13.5px] font-semibold text-fg-2 transition-colors hover:border-primary/60 hover:text-white"
              >
                <PenLine size={15} /> Minha skin não está na lista
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ConfigureStep({ skin, mode, onConfirm }: { skin: Skin; mode: Mode; onConfirm: (p: UpgradePick) => void }) {
  // No modo "offer" o cliente pode ter qualquer condição; no "target" só as disponíveis.
  const offers = mode === "target" ? skin.offers.filter((o) => o.available) : skin.offers;
  const [wear, setWear] = useState<WearCode>(offers.find((o) => o.wear === skin.defaultWear)?.wear ?? offers[0]!.wear);
  const [variant, setVariant] = useState<VariantType>("normal");
  const color = getRarity(skin.rarity)?.color ?? "#e60023";
  const offer = offers.find((o) => o.wear === wear) ?? offers[0]!;
  const price = priceFor(offer, variant);

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="relative mx-4 mt-4 h-[170px] overflow-hidden rounded-[14px] border border-border bg-[radial-gradient(ellipse_at_center,#15161b,#08090b)]">
        <span
          aria-hidden
          className="absolute inset-x-[20%] inset-y-[10%] rounded-full blur-[30px]"
          style={{ background: `radial-gradient(closest-side, ${color}66, transparent)` }}
        />
        <Image src={skin.image} alt="" fill sizes="560px" className="object-contain p-4 drop-shadow-[0_10px_16px_rgb(0_0_0/0.7)]" />
      </div>
      <div className="px-4 pt-3">
        <p className="text-[16px] font-bold">{skinDisplayName(skin)}</p>
        <p className="text-[12px]" style={{ color }}>
          {getRarity(skin.rarity)?.label}
        </p>
      </div>

      <div className="px-4 pt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Condição</p>
        <div className="grid grid-cols-5 gap-1.5">
          {skin.offers.map((o) => {
            const enabled = offers.includes(o);
            const active = o.wear === wear;
            return (
              <button
                key={o.wear}
                type="button"
                disabled={!enabled}
                onClick={() => setWear(o.wear)}
                title={getWear(o.wear).name}
                className={cn(
                  "flex flex-col items-center rounded-[9px] border py-2 transition-colors disabled:opacity-30",
                  active ? "glow-active" : "border-border bg-surface hover:border-border-strong",
                )}
              >
                <span className="text-[12.5px] font-bold" style={{ color: WEAR_COLORS[o.wear] }}>
                  {o.wear}
                </span>
                <span className="mt-0.5 text-[10px] text-muted">
                  {formatBRL(mode === "offer" ? tradeInValue(o.price) : o.price).replace(",00", "")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {skin.variants.length > 1 && (
        <div className="px-4 pt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Variação</p>
          <div className="flex gap-1.5">
            {skin.variants.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={cn(
                  "h-9 rounded-[9px] border px-3.5 text-[12.5px] font-semibold transition-colors",
                  v === variant ? "glow-active text-white" : "border-border bg-surface text-fg-2 hover:text-white",
                )}
              >
                {VARIANT_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-5 shrink-0" />
      <div className="mt-auto flex items-center gap-3 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex-1">
          <p className="text-[11px] text-muted">{mode === "offer" ? "Estimativa de avaliação" : "Preço"}</p>
          <p className="text-[18px] font-bold">{formatBRL(mode === "offer" ? tradeInValue(price) : price)}</p>
        </div>
        <button
          type="button"
          onClick={() => onConfirm({ skinId: skin.id, wear, variant })}
          className="btn-solid-red flex h-11 items-center gap-2 rounded-[10px] px-5 text-[14px] font-semibold"
        >
          <Check size={17} /> {mode === "offer" ? "Adicionar à oferta" : "Definir como alvo"}
        </button>
      </div>
    </div>
  );
}

function CustomStep({ value, onChange, onConfirm }: { value: string; onChange: (v: string) => void; onConfirm: (n: string) => void }) {
  const valid = value.trim().length >= 3;
  return (
    <form
      className="flex flex-col gap-3 p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onConfirm(value);
      }}
    >
      <p className="text-[13px] leading-relaxed text-fg-2">
        Descreva a skin com nome, condição e detalhes que valorizam o item (float, pattern, adesivos). Nossa equipe avalia
        e informa o valor pelo WhatsApp.
      </p>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        placeholder="Ex.: M4A4 | Howl (Minimal Wear), float 0.08"
        className="h-11 rounded-[10px] border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary/60"
      />
      <button
        type="submit"
        disabled={!valid}
        className="btn-solid-red h-11 rounded-[10px] text-[14px] font-semibold disabled:opacity-40"
      >
        Adicionar para avaliação
      </button>
    </form>
  );
}
