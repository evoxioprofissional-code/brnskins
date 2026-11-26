"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronRight, Command, ExternalLink, LogOut, Menu, Search } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { buildAlerts, timeAgo } from "@/lib/admin-metrics";
import { cn } from "@/lib/cn";
import { useAdminStore } from "@/stores/admin-store";
import { useAdminData } from "./admin-data-provider";
import { ADMIN_NAV, findNavLink } from "./admin-nav";

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open, close]);
  return ref;
}

/* ---------------------------------------------------------------- mercado */

interface Ticker {
  configured: boolean;
  usdBrl: number;
  cnyBrl: number;
  mode: string;
  cnyRate: number | null;
  marginPct: number;
  source: string;
  syncedAt: string | null;
}

const SOURCE_LABEL: Record<string, string> = { buff163: "BUFF", c5game: "C5", csfloat: "CSFloat", skinport: "Skinport", steam: "Steam" };
const n = (v: number, d: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Painel ao vivo do mercado (câmbio, regra da loja e última sincronização) */
function MarketTicker() {
  const [t, setT] = useState<Ticker | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/admin/market-ticker")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d?.configured && setT(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 120_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  if (!t) return null;
  const stale = t.syncedAt ? Date.now() - new Date(t.syncedAt).getTime() > 36 * 3600_000 : true;
  const cell = "flex items-baseline gap-1.5 px-3";
  return (
    <Link
      href="/admin/mercado"
      title="Preços de mercado"
      className="hidden items-center divide-x divide-white/[0.07] rounded-full border border-white/[0.07] bg-black/30 py-1.5 text-[11.5px] transition-colors hover:border-white/[0.16] xl:flex"
    >
      <span className={cell}>
        <span className="text-faint">¥1</span>
        <span className="font-semibold tabular-nums text-white">R$ {n(t.cnyBrl, 4)}</span>
      </span>
      <span className={cell}>
        <span className="text-faint">US$1</span>
        <span className="font-semibold tabular-nums text-white">R$ {n(t.usdBrl, 2)}</span>
      </span>
      <span className={cell}>
        <span className="text-faint">Loja</span>
        <span className="font-semibold text-white">
          {SOURCE_LABEL[t.source] ?? t.source} · {t.mode === "cny" && t.cnyRate ? `¥ × ${n(t.cnyRate, 2)}` : `+${n(t.marginPct, 0)}%`}
        </span>
      </span>
      <span className={cn(cell, "pr-3.5")}>
        <span className={cn("size-1.5 self-center rounded-full", stale ? "bg-amber-400" : "bg-[#22c55e] shadow-[0_0_8px_#22c55e]")} />
        <span className="text-muted">{t.syncedAt ? `sync ${timeAgo(t.syncedAt)}` : "sem sync"}</span>
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- alertas */

function AlertsBell() {
  const { skins } = useAdminData();
  const stock = useAdminStore((s) => s.stock);
  const clients = useAdminStore((s) => s.clients);
  const subStores = useAdminStore((s) => s.subStores);
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const alerts = useMemo(() => buildAlerts({ stock, clients, subStores, skins: new Map(skins.map((s) => [s.id, s])) }), [stock, clients, subStores, skins]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Alertas (${alerts.length})`}
        className="relative grid size-9 place-items-center rounded-full border border-white/[0.07] text-muted transition-colors hover:border-white/[0.16] hover:text-white"
      >
        <Bell size={16} strokeWidth={1.9} />
        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-[#050608]">
            {alerts.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[340px] overflow-hidden rounded-[16px] border border-white/[0.1] bg-[#0f1013] shadow-2xl"
          >
            <p className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 text-[13px] font-semibold">
              Alertas <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-[#ff6b7d]">{alerts.length}</span>
            </p>
            <div className="max-h-[360px] overflow-y-auto p-1.5">
              {alerts.map((a) => (
                <Link key={a.id} href={a.href ?? "/admin"} onClick={() => setOpen(false)} className="block rounded-[10px] px-3 py-2.5 text-[13px] hover:bg-white/[0.05]">
                  {a.message}
                  <span className="block text-[11px] text-faint">{timeAgo(a.date)}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Conta"
        className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,#e60023,#7a0012)] text-[11px] font-black italic text-white shadow-[0_6px_16px_-6px_rgb(230_0_35/0.9)]"
      >
        BRN
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-[16px] border border-white/[0.1] bg-[#0f1013] p-1.5 shadow-2xl"
          >
            <p className="border-b border-white/[0.06] px-3 pb-2.5 pt-2 text-[13px] font-semibold">
              Equipe BRN
              <span className="block text-[11.5px] font-normal text-muted">Administrador</span>
            </p>
            <Link href="/" className="mt-1 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] hover:bg-white/[0.05]">
              <ExternalLink size={15} /> Ver loja
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] text-[#ff6b7d] hover:bg-white/[0.05]">
                <LogOut size={15} /> Sair
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------------------------------------- topo */

const DEMO_FREE = ["/admin/influenciadores", "/admin/mercado", "/admin/cotador"];

export function AdminTopbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const pathname = usePathname();
  const link = findNavLink(pathname);
  const group = ADMIN_NAV.find((i) => i.children?.some((c) => c.href === link?.href) && i.href !== link?.href);
  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center gap-3 border-b border-white/[0.06] bg-[#050608]/85 px-4 backdrop-blur-xl lg:px-8">
      <button type="button" onClick={onMenu} aria-label="Abrir menu" className="grid size-9 place-items-center rounded-lg text-fg lg:hidden">
        <Menu size={20} />
      </button>
      <div className="min-w-0">
        <p className="hidden items-center gap-1 text-[11.5px] text-faint sm:flex">
          Admin
          {group && (
            <>
              <ChevronRight size={11} /> {group.label}
            </>
          )}
          <ChevronRight size={11} />
          <span className="text-muted">{link?.label ?? "Início"}</span>
        </p>
        <h1 className="truncate text-[17px] font-semibold leading-[22px] tracking-[-0.01em]">{link?.title ?? "Admin"}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <MarketTicker />
        {!DEMO_FREE.some((p) => pathname.startsWith(p)) && (
          <span
            title="Esta tela ainda usa dados de demonstração: as alterações ficam salvas apenas neste navegador."
            className="hidden items-center gap-1.5 rounded-full border border-amber-400/20 px-2.5 py-1.5 text-[11px] font-medium text-amber-200/80 2xl:inline-flex"
          >
            <span className="size-1.5 rounded-full bg-amber-400" /> Demonstração
          </span>
        )}
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 items-center gap-2 rounded-full border border-white/[0.07] bg-black/30 pl-3 pr-1.5 text-[12.5px] text-muted transition-colors hover:border-white/[0.16] hover:text-white"
          aria-label="Buscar e executar comandos (Ctrl+K)"
        >
          <Search size={14} />
          <span className="hidden md:inline">Buscar ou executar…</span>
          <kbd className="hidden items-center gap-0.5 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10.5px] font-semibold text-fg-2 md:inline-flex">
            <Command size={10} />K
          </kbd>
        </button>
        <AlertsBell />
        <UserMenu />
      </div>
    </header>
  );
}
