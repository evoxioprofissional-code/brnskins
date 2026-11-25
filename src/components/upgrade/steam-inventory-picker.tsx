"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Lock, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UPGRADE } from "@/config/upgrade";
import { useCatalogData } from "@/components/catalog/catalog-data-provider";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { INVENTORY_ERRORS, type InventoryResult, type SteamInventoryItem } from "@/integrations/steam/types";
import { TRADE_LINK_HELP_URL, parseSteamInput, profileUrl } from "@/integrations/steam/trade-link";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { resolveOffer } from "@/lib/upgrade";
import type { OfferItem, SteamAccount } from "@/stores/upgrade-store";

interface Props {
  open: boolean;
  account: SteamAccount | null;
  selected: OfferItem[];
  onClose: () => void;
  onConnect: (account: SteamAccount) => void;
  onDisconnect: () => void;
  onConfirm: (items: OfferItem[]) => void;
}

/** Cache curto no navegador para não consultar a Steam a cada abertura. */
const cache = new Map<string, { at: number; result: InventoryResult }>();
const CACHE_MS = 60_000;

async function loadInventory(steamId: string, force: boolean): Promise<InventoryResult> {
  const hit = cache.get(steamId);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.result;
  try {
    const res = await fetch(`/api/steam/inventory?steamid=${steamId}`, { cache: force ? "no-store" : "default" });
    const result = (await res.json()) as InventoryResult;
    if (result.ok) cache.set(steamId, { at: Date.now(), result });
    return result;
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

const toOfferItem = (i: SteamInventoryItem): OfferItem => ({
  assetId: i.assetId,
  marketHashName: i.marketHashName,
  name: i.name,
  image: i.image,
  rarityColor: i.rarityColor,
  exterior: i.exterior,
});

export function SteamInventoryPicker(props: Props) {
  useLockBodyScroll(props.open);
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setSession((s) => s + 1);
  }
  return (
    <AnimatePresence>
      {props.open && (
        <>
          <motion.div
            key={`inv-backdrop-${session}`}
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={props.onClose}
          />
          <motion.div
            key={`inv-dialog-${session}`}
            role="dialog"
            aria-modal="true"
            aria-label="Seu inventário Steam"
            className="fixed inset-x-0 bottom-0 z-[61] flex h-[88dvh] flex-col rounded-t-[18px] border border-border-strong bg-bg-soft sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(720px,88dvh)] sm:w-[760px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[16px]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Body {...props} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Body({ account, selected, onClose, onConnect, onDisconnect, onConfirm }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15.5px] font-bold">Seu inventário Steam</h2>
          {account && (
            <p className="truncate text-[12px] text-muted">
              <a href={profileUrl(account.steamId)} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Conta {account.steamId}
              </a>
              {" · "}
              <button type="button" onClick={onDisconnect} className="font-semibold text-fg-2 hover:text-white">
                Trocar conta
              </button>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="grid size-8 place-items-center rounded-lg text-fg-2 hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
      {account ? (
        <InventoryStep account={account} selected={selected} onConfirm={onConfirm} onDisconnect={onDisconnect} />
      ) : (
        <ConnectStep onConnect={onConnect} />
      )}
    </>
  );
}

function ConnectStep({ onConnect }: { onConnect: (a: SteamAccount) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-1 flex-col gap-4 overflow-y-auto p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseSteamInput(value);
        if (!parsed.ok) return setError(parsed.error);
        onConnect({ steamId: parsed.steamId, tradeLink: parsed.tradeLink });
      }}
    >
      <div>
        <p className="text-[15px] font-bold">Cole seu trade link</p>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
          Com ele carregamos as skins do seu inventário de CS2 e já usamos o mesmo link para enviar a proposta de troca. Não
          pedimos login nem senha.
        </p>
      </div>
      <label className="block">
        <span className="sr-only">Trade link da Steam</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
          aria-invalid={Boolean(error)}
          className="h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-[13.5px] outline-none focus:border-primary/60 aria-[invalid=true]:border-primary"
        />
        {error && <span className="mt-1.5 block text-[12.5px] text-primary">{error}</span>}
      </label>
      <a
        href={TRADE_LINK_HELP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-semibold text-fg-2 hover:text-white"
      >
        Onde encontro meu trade link? <ExternalLink size={13} />
      </a>
      <p className="rounded-[10px] border border-border bg-surface p-3 text-[12.5px] leading-relaxed text-muted">
        Seu inventário precisa estar <span className="font-semibold text-fg-2">público</span>: na Steam, abra Perfil → Editar
        perfil → Privacidade e deixe “Inventário” como Público.
      </p>
      <button type="submit" className="btn-solid-red mt-auto h-11 rounded-[10px] text-[14px] font-semibold">
        Carregar meu inventário
      </button>
    </form>
  );
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; items: SteamInventoryItem[] };

function InventoryStep({
  account,
  selected,
  onConfirm,
  onDisconnect,
}: {
  account: SteamAccount;
  selected: OfferItem[];
  onConfirm: (items: OfferItem[]) => void;
  onDisconnect: () => void;
}) {
  const { skins } = useCatalogData();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Map<string, OfferItem>>(() => new Map(selected.map((i) => [i.assetId, i])));

  const load = useCallback(
    async (force = false) => {
      setState({ status: "loading" });
      const result = await loadInventory(account.steamId, force);
      setState(result.ok ? { status: "ready", items: result.items } : { status: "error", message: INVENTORY_ERRORS[result.code] });
    },
    [account.steamId],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const items = state.status === "ready" ? state.items : [];
  const estimates = useMemo(
    () => new Map(resolveOffer(items.map(toOfferItem), skins).map((r) => [r.item.assetId, r.match ? r.estimate : null])),
    [items, skins],
  );
  const visible = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = tokens.length
      ? items.filter((i) => tokens.every((t) => i.marketHashName.toLowerCase().includes(t)))
      : items;
    // Trocáveis primeiro; depois os que têm estimativa
    return [...list].sort(
      (a, b) =>
        Number(b.tradable) - Number(a.tradable) ||
        (estimates.get(b.assetId) ?? -1) - (estimates.get(a.assetId) ?? -1),
    );
  }, [items, query, estimates]);

  const full = picked.size >= UPGRADE.maxOfferItems;
  const toggle = (item: SteamInventoryItem) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(item.assetId)) next.delete(item.assetId);
      else if (next.size < UPGRADE.maxOfferItems) next.set(item.assetId, toOfferItem(item));
      return next;
    });

  if (state.status === "loading") {
    return (
      <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-hidden p-4 sm:grid-cols-4" aria-busy="true" aria-label="Carregando inventário">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="h-[150px] animate-pulse rounded-[11px] bg-surface" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-[420px] text-[13.5px] leading-relaxed text-fg-2">{state.message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            className="btn-solid-red flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-semibold"
          >
            <RefreshCw size={15} /> Tentar de novo
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            className="h-10 rounded-[10px] border border-border px-4 text-[13.5px] font-semibold text-fg-2 hover:text-white"
          >
            Usar outro trade link
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-3">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-[10px] border border-border bg-surface px-3 focus-within:border-primary/60">
          <Search size={15} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar em ${items.length} itens`}
            className="h-full flex-1 bg-transparent text-[13.5px] outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => void load(true)}
          aria-label="Atualizar inventário"
          title="Atualizar inventário"
          className="grid size-10 place-items-center rounded-[10px] border border-border text-fg-2 hover:text-white"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <ul className="scrollbar-thin mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-4 pb-3 sm:grid-cols-4">
        {visible.map((item) => {
          const on = picked.has(item.assetId);
          const estimate = estimates.get(item.assetId) ?? null;
          const disabled = !item.tradable || (!on && full);
          return (
            <li key={item.assetId}>
              <button
                type="button"
                onClick={() => toggle(item)}
                disabled={disabled}
                aria-pressed={on}
                title={item.marketHashName}
                className={cn(
                  "relative flex h-full w-full flex-col rounded-[11px] border p-2 text-left transition-colors",
                  on ? "border-[#ff2747]/90 bg-[#14070a]" : "border-[#1d1e23] bg-[#0b0c0f] enabled:hover:border-[#2c2d33]",
                  disabled && "opacity-45",
                )}
              >
                <span className="relative h-[78px]">
                  <Image src={item.image} alt="" fill sizes="170px" className="object-contain" />
                </span>
                <span className="mt-1.5 h-[2px] rounded-full" style={{ background: item.rarityColor ?? "#2a2b31" }} />
                <span className="mt-1.5 line-clamp-2 min-h-[30px] text-[11.5px] font-semibold leading-[15px]">{item.name}</span>
                {item.exterior && <span className="text-[10.5px] text-muted">{item.exterior}</span>}
                <span className="mt-1 text-[12px] font-bold">
                  {!item.tradable ? (
                    <span className="inline-flex items-center gap-1 text-muted">
                      <Lock size={11} /> Bloqueado para troca
                    </span>
                  ) : estimate !== null ? (
                    formatBRL(estimate)
                  ) : (
                    <span className="text-[#f59e0b]">A avaliar</span>
                  )}
                </span>
                {on && (
                  <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-white">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {!visible.length && (
          <li className="col-span-full py-10 text-center text-[13px] text-muted">
            {items.length ? "Nenhum item encontrado." : "Nenhum item de CS2 comercializável neste inventário."}
          </li>
        )}
      </ul>

      <div className="flex items-center gap-3 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <p className="flex-1 text-[12.5px] text-muted">
          <span className="font-semibold text-fg">
            {picked.size}/{UPGRADE.maxOfferItems}
          </span>{" "}
          selecionados
        </p>
        <button
          type="button"
          onClick={() => onConfirm([...picked.values()])}
          className="btn-solid-red flex h-11 items-center gap-2 rounded-[10px] px-5 text-[14px] font-semibold"
        >
          <Check size={17} /> Confirmar oferta
        </button>
      </div>
    </>
  );
}
