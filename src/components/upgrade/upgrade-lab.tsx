"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Crosshair, MessageCircle, PenLine, Plus, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { Skin } from "@/types/catalog";
import { UPGRADE } from "@/config/upgrade";
import { VARIANT_LABELS, WEAR_COLORS, getRarity } from "@/config/catalog";
import { useCatalogData } from "@/components/catalog/catalog-data-provider";
import { useOpenWhatsApp } from "@/components/catalog/tab-panels";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { skinDisplayName } from "@/lib/skin";
import { buildUpgradeMessage, formatMultiplier, pickPrice, quote, resolveOffer, suggestTargets, type ResolvedOffer } from "@/lib/upgrade";
import { useUpgradeStore, type UpgradePick } from "@/stores/upgrade-store";
import { AnimatedNumber, UpgradeReactor } from "./upgrade-reactor";
import { SkinPicker } from "./skin-picker";

const brl = (n: number) => formatBRL(n);
const rarityColor = (skin: Skin) => getRarity(skin.rarity)?.color ?? "#e60023";

export function UpgradeLab() {
  const { skins, getSkin } = useCatalogData();
  const hydrated = useHydrated();
  const store = useUpgradeStore();
  const offer = hydrated ? store.offer : [];
  const target = hydrated ? store.target : null;
  const [picker, setPicker] = useState<{ open: boolean; mode: "offer" | "target" }>({ open: false, mode: "offer" });
  const openWhatsApp = useOpenWhatsApp();

  const resolved = useMemo(() => resolveOffer(offer, getSkin), [offer, getSkin]);
  const targetSkin = target ? getSkin(target.skinId) : undefined;
  const targetPrice = target && targetSkin ? pickPrice(targetSkin, target) : 0;
  const q = quote(resolved, targetPrice);
  const hasOffer = offer.length > 0;
  const hasTarget = !!targetSkin;

  const offeredIds = useMemo(() => offer.flatMap((i) => (i.kind === "catalog" ? [i.skinId] : [])), [offer]);
  const suggestions = useMemo(
    () => suggestTargets(skins, q.offerValue, store.multiplier, offeredIds),
    [skins, q.offerValue, store.multiplier, offeredIds],
  );

  const openPicker = (mode: "offer" | "target") => setPicker({ open: true, mode });
  const closePicker = useCallback(() => setPicker((p) => ({ ...p, open: false })), []);
  const onPick = (pick: UpgradePick) => {
    if (picker.mode === "offer") store.addCatalog(pick);
    else store.setTarget(pick);
    closePicker();
  };

  const send = () =>
    openWhatsApp(buildUpgradeMessage(resolved, targetSkin && target ? { skin: targetSkin, pick: target } : null, q));

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------ Palco */}
      <section
        aria-labelledby="upgrade-title"
        className="relative overflow-hidden rounded-[16px] border border-border bg-[#07080a]"
      >
        {/* Fundo: grade + brilhos */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        />
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/10 blur-[80px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 size-80 rounded-full bg-primary/10 blur-[90px]" />

        {/* Cabeçalho */}
        <header className="relative flex flex-col gap-4 px-4 pt-5 lg:flex-row lg:items-end lg:justify-between lg:px-7 lg:pt-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#ff4d67]">
              <Sparkles size={12} /> Upgrade Lab
            </span>
            <h2 id="upgrade-title" className="mt-2.5 text-[26px] font-black italic leading-none tracking-[-0.02em] lg:text-[32px]">
              Troque para <span className="text-primary [text-shadow:0_0_18px_rgb(230_0_35/0.6)]">cima.</span>
            </h2>
            <p className="mt-2 max-w-[520px] text-[13.5px] leading-relaxed text-fg-2">
              Monte sua oferta com as skins que você já tem, escolha o alvo e veja na hora quanto falta. Você paga só a
              diferença.
            </p>
          </div>
          <ol className="flex gap-2 text-[11.5px] font-semibold text-fg-2 max-lg:overflow-x-auto max-lg:scrollbar-none">
            {["Monte a oferta", "Escolha o alvo", "Pague a diferença"].map((s, i) => (
              <li key={s} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface/80 py-1 pl-1 pr-3">
                <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[10.5px] font-black text-[#ff4d67]">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </header>

        {/* Mesa de troca */}
        <div className="relative grid gap-4 px-4 pb-4 pt-5 lg:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)] lg:items-stretch lg:gap-0 lg:px-7 lg:pb-6 lg:pt-6">
          <OfferColumn resolved={resolved} total={q.offerValue} onAdd={() => openPicker("offer")} onRemove={store.remove} />

          <div className="relative flex flex-col items-center justify-center py-2 lg:py-0">
            <FlowLine className="hidden lg:block" side="left" active={hasOffer} />
            <FlowLine className="hidden lg:block" side="right" active={hasOffer && hasTarget} />
            <ChevronDown aria-hidden size={20} className="mb-1 animate-bounce text-primary/70 lg:hidden" />
            <UpgradeReactor coverage={q.coverage} multiplier={q.multiplier} hasOffer={hasOffer} hasTarget={hasTarget} />
            <ChevronDown aria-hidden size={20} className="mt-1 animate-bounce text-primary/70 lg:hidden" />
          </div>

          <TargetColumn
            skin={targetSkin}
            pick={target}
            price={targetPrice}
            onChoose={() => openPicker("target")}
            onClear={() => store.setTarget(null)}
          />
        </div>

        {/* Resumo + CTA */}
        <footer className="relative flex flex-col gap-4 border-t border-border bg-black/30 px-4 py-4 lg:flex-row lg:items-center lg:px-7">
          <dl className="grid flex-1 grid-cols-3 gap-3 lg:flex lg:gap-8">
            <Stat label="Suas skins (est.)" value={q.offerValue} />
            <Stat label="Alvo" value={q.targetPrice} />
            <div>
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-faint">
                {hasTarget && q.difference < 0 ? "Crédito" : "Você paga"}
              </dt>
              <dd>
                {hasTarget ? (
                  <AnimatedNumber
                    value={Math.abs(q.difference)}
                    format={brl}
                    className={cn(
                      "text-[17px] font-black tracking-[-0.01em] lg:text-[22px]",
                      q.difference <= 0 ? "text-[#4ade80]" : "text-primary [text-shadow:0_0_14px_rgb(230_0_35/0.5)]",
                    )}
                  />
                ) : (
                  <span className="text-[17px] font-black text-white/25 lg:text-[22px]">—</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="flex items-center gap-2">
            {(hasOffer || hasTarget) && (
              <button
                type="button"
                onClick={store.reset}
                className="flex h-11 items-center gap-1.5 rounded-[10px] border border-border px-3.5 text-[13px] font-semibold text-fg-2 transition-colors hover:border-border-strong hover:text-white"
              >
                <RotateCcw size={15} /> Limpar
              </button>
            )}
            <button
              type="button"
              onClick={send}
              disabled={!hasOffer && !hasTarget}
              className="btn-solid-red flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] px-5 text-[14px] font-semibold disabled:opacity-40 lg:flex-none"
            >
              <MessageCircle size={17} /> Solicitar upgrade
            </button>
          </div>
        </footer>
      </section>

      <p className="flex items-start gap-1.5 px-1 text-[11.5px] leading-relaxed text-muted">
        <ShieldCheck size={14} className="mt-px shrink-0 text-primary/80" />
        Estimativa calculada com {Math.round(UPGRADE.tradeInRate * 100)}% do valor de referência de cada skin. A avaliação final
        considera float, pattern e adesivos e é confirmada pela equipe antes de qualquer troca.
      </p>

      {/* ------------------------------------------------------------ Sugestões */}
      <section aria-labelledby="upgrade-suggestions" className="panel p-4 lg:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="upgrade-suggestions" className="text-[15.5px] font-bold">
              {hasOffer ? "Alvos ao seu alcance" : "Alvos populares"}
            </h3>
            <p className="text-[12.5px] text-muted">
              {hasOffer
                ? `Skins perto de ${formatMultiplier(store.multiplier)} o valor da sua oferta.`
                : "Adicione suas skins para ver sugestões pelo multiplicador."}
            </p>
          </div>
          {hasOffer && (
            <div role="radiogroup" aria-label="Multiplicador" className="flex gap-1 rounded-[10px] border border-border bg-surface p-1">
              {UPGRADE.multipliers.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={store.multiplier === m}
                  onClick={() => store.setMultiplier(m)}
                  className={cn(
                    "h-8 min-w-[46px] rounded-[7px] px-2 text-[12.5px] font-black italic transition-colors",
                    store.multiplier === m ? "glow-active text-white" : "text-fg-2 hover:text-white",
                  )}
                >
                  {formatMultiplier(m)}
                </button>
              ))}
            </div>
          )}
        </div>

        <ul className="scrollbar-none -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:-mx-5 lg:px-5">
          {suggestions.map((s) => {
            const color = rarityColor(s.skin);
            const active = target?.skinId === s.skin.id && target.wear === s.pick.wear && target.variant === s.pick.variant;
            return (
              <li key={s.skin.id} className="w-[168px] shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => store.setTarget(s.pick)}
                  aria-pressed={active}
                  className={cn(
                    "group relative flex w-full flex-col rounded-[12px] border p-2.5 text-left transition-[border-color,transform] duration-200",
                    active
                      ? "border-[#ff2747]/90 bg-[linear-gradient(180deg,#14070a,#0b0708)] shadow-[0_0_20px_-6px_rgb(230_0_35/0.7)]"
                      : "border-[#18191d] bg-[linear-gradient(180deg,#0d0e11,#090a0c)] hover:-translate-y-0.5 hover:border-[#2c2d33]",
                  )}
                >
                  {s.multiplier > 0 && (
                    <span className="absolute right-2 top-2 z-10 rounded-[6px] bg-primary px-1.5 py-0.5 text-[11px] font-black italic leading-none text-white shadow-[0_0_10px_rgb(230_0_35/0.6)]">
                      {formatMultiplier(s.multiplier)}
                    </span>
                  )}
                  <span className="relative h-[78px]">
                    <span
                      aria-hidden
                      className="absolute inset-x-4 inset-y-2 rounded-full blur-[16px]"
                      style={{ background: `radial-gradient(closest-side, ${color}50, transparent)` }}
                    />
                    <Image src={s.skin.image} alt="" fill sizes="160px" className="object-contain p-1 transition-transform duration-300 group-hover:scale-105" />
                  </span>
                  <span className="mt-2 line-clamp-1 text-[12px] font-semibold">{skinDisplayName(s.skin)}</span>
                  <span className="mt-1 flex items-center justify-between">
                    <span className="text-[13.5px] font-bold">{formatBRL(s.price)}</span>
                    <span className="text-[10.5px] font-bold" style={{ color: WEAR_COLORS[s.pick.wear] }}>
                      {s.pick.wear}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {!suggestions.length && (
            <li className="w-full py-6 text-center text-[13px] text-muted">
              Sua oferta já supera os itens do catálogo neste multiplicador. Escolha um alvo manualmente.
            </li>
          )}
        </ul>
      </section>

      <SkinPicker
        open={picker.open}
        mode={picker.mode}
        onClose={closePicker}
        onPick={onPick}
        onCustom={(name) => {
          store.addCustom(name);
          closePicker();
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-faint">{label}</dt>
      <dd>
        <AnimatedNumber value={value} format={brl} className="text-[15px] font-bold text-fg lg:text-[18px]" />
      </dd>
    </div>
  );
}

/** Linha de energia entre as colunas e o medidor (desktop). */
function FlowLine({ side, active, className }: { side: "left" | "right"; active: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute top-1/2 h-[2px] w-[38px] -translate-y-1/2 overflow-hidden rounded-full bg-[#1a1b20]",
        side === "left" ? "left-0" : "right-0",
        className,
      )}
    >
      {active && (
        <span className="absolute inset-0 animate-[upgrade-flow_1.1s_linear_infinite] bg-[linear-gradient(90deg,transparent,#ff2747,transparent)] bg-[length:50%_100%] bg-no-repeat motion-reduce:animate-none" />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------- */

function ColumnShell({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-[14px] border border-border bg-[linear-gradient(180deg,#0c0d10,#08090b)] p-3.5 lg:p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-fg-2">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

function OfferColumn({
  resolved,
  total,
  onAdd,
  onRemove,
}: {
  resolved: ResolvedOffer[];
  total: number;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  const free = UPGRADE.maxOfferItems - resolved.length;
  return (
    <ColumnShell
      title="Você entrega"
      aside={
        <span className="text-[11.5px] font-semibold text-muted">
          {resolved.length}/{UPGRADE.maxOfferItems} · <span className="text-fg">{formatBRL(total)}</span>
        </span>
      }
    >
      <ul className="grid flex-1 auto-rows-[118px] grid-cols-2 gap-2 sm:grid-cols-3">
        <AnimatePresence initial={false}>
          {resolved.map((r) => (
            <motion.li
              key={r.item.key}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="group relative overflow-hidden rounded-[11px] border border-[#1d1e23] bg-[#0b0c0f]"
            >
              <OfferSlot r={r} />
              <button
                type="button"
                onClick={() => onRemove(r.item.key)}
                aria-label="Remover da oferta"
                className="absolute right-1 top-1 z-10 grid size-6 place-items-center rounded-md bg-black/60 text-fg-2 opacity-100 transition-opacity hover:text-white lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
              >
                <X size={13} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {Array.from({ length: free }, (_, i) => (
          <li key={`empty-${i}`} aria-hidden={i > 0} className={cn(i > 0 && "max-sm:hidden")}>
            {i === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex size-full flex-col items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-primary/45 bg-primary/[0.04] text-[12px] font-semibold text-fg-2 transition-colors hover:border-primary hover:bg-primary/[0.08] hover:text-white"
              >
                <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary">
                  <Plus size={17} />
                </span>
                Adicionar skin
              </button>
            ) : (
              <div className="size-full rounded-[11px] border border-dashed border-[#1d1e23]" />
            )}
          </li>
        ))}
      </ul>
    </ColumnShell>
  );
}

function OfferSlot({ r }: { r: ResolvedOffer }) {
  if (r.item.kind === "custom") {
    return (
      <div className="flex size-full flex-col justify-between p-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-fg-2">
          <PenLine size={15} />
        </span>
        <div>
          <p className="line-clamp-2 text-[11.5px] font-semibold leading-tight">{r.item.name}</p>
          <p className="mt-1 text-[11px] font-semibold text-[#f59e0b]">A avaliar</p>
        </div>
      </div>
    );
  }
  if (!r.skin) return <div className="grid size-full place-items-center text-[11px] text-muted">Indisponível</div>;
  const color = rarityColor(r.skin);
  return (
    <div className="flex size-full flex-col p-2">
      <div className="relative min-h-0 flex-1">
        <span
          aria-hidden
          className="absolute inset-x-3 inset-y-1 rounded-full blur-[14px]"
          style={{ background: `radial-gradient(closest-side, ${color}55, transparent)` }}
        />
        <Image src={r.skin.image} alt="" fill sizes="140px" className="object-contain" />
        <span className="absolute bottom-0 left-0 text-[10px] font-bold" style={{ color: WEAR_COLORS[r.item.wear] }}>
          {r.item.wear}
          {r.item.variant !== "normal" && <span className="ml-1 text-[#ff9a5c]">{r.item.variant === "stattrak" ? "ST" : "SV"}</span>}
        </span>
      </div>
      <p className="mt-1 truncate text-[11px] font-semibold text-fg-2">{skinDisplayName(r.skin)}</p>
      <p className="text-[12.5px] font-bold">{formatBRL(r.estimate)}</p>
    </div>
  );
}

function TargetColumn({
  skin,
  pick,
  price,
  onChoose,
  onClear,
}: {
  skin?: Skin;
  pick: UpgradePick | null;
  price: number;
  onChoose: () => void;
  onClear: () => void;
}) {
  if (!skin || !pick) {
    return (
      <ColumnShell title="Você recebe">
        <button
          type="button"
          onClick={onChoose}
          className="group relative flex min-h-[244px] flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-[11px] border border-dashed border-primary/45 bg-primary/[0.03] transition-colors hover:border-primary hover:bg-primary/[0.07]"
        >
          <span className="relative grid size-16 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 motion-reduce:animate-none" />
            <span className="relative grid size-14 place-items-center rounded-full border border-primary/50 bg-[#14070a] text-primary">
              <Crosshair size={26} />
            </span>
          </span>
          <span className="text-[14px] font-bold">Escolha seu alvo</span>
          <span className="max-w-[220px] text-center text-[12px] text-muted">
            Busque no catálogo ou toque em uma sugestão abaixo.
          </span>
        </button>
      </ColumnShell>
    );
  }

  const color = rarityColor(skin);
  return (
    <ColumnShell
      title="Você recebe"
      aside={
        <button type="button" onClick={onClear} className="text-[11.5px] font-semibold text-muted hover:text-white">
          Remover
        </button>
      }
    >
      <div className="relative flex min-h-[244px] flex-1 flex-col overflow-hidden rounded-[11px] border border-[#2a1015] bg-[radial-gradient(ellipse_at_50%_40%,#1a0a0e,#090a0c_70%)]">
        <motion.div
          key={`${skin.id}-${pick.wear}-${pick.variant}`}
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative min-h-[150px] flex-1"
        >
          <span
            aria-hidden
            className="absolute inset-x-[18%] inset-y-[12%] rounded-full blur-[30px]"
            style={{ background: `radial-gradient(closest-side, ${color}70, transparent)` }}
          />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 size-[150px] -translate-x-1/2 -translate-y-1/2 animate-[reactor-spin_18s_linear_infinite] rounded-full border border-dashed border-white/[0.07] motion-reduce:animate-none"
          />
          <Image src={skin.image} alt="" fill sizes="(min-width: 1024px) 420px, 90vw" className="object-contain p-4 drop-shadow-[0_14px_18px_rgb(0_0_0/0.75)]" />
        </motion.div>
        <div className="relative flex items-end justify-between gap-3 border-t border-white/[0.05] bg-black/30 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{skinDisplayName(skin)}</p>
            <p className="mt-0.5 flex items-center gap-2 text-[11.5px] font-semibold">
              <span style={{ color: WEAR_COLORS[pick.wear] }}>{pick.wear}</span>
              {pick.variant !== "normal" && <span className="text-[#ff9a5c]">{VARIANT_LABELS[pick.variant]}</span>}
              <span style={{ color }}>{getRarity(skin.rarity)?.label}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[16px] font-black">{formatBRL(price)}</p>
            <button type="button" onClick={onChoose} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:text-[#ff4d67]">
              Trocar alvo <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </ColumnShell>
  );
}
