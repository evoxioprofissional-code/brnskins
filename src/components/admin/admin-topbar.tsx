"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, ExternalLink, LogOut, Menu, Search } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { skinDisplayName } from "@/lib/skin";
import { buildAlerts, timeAgo } from "@/lib/admin-metrics";
import { useAdminStore } from "@/stores/admin-store";
import { useAdminData } from "./admin-data-provider";
import { findNavLink } from "./admin-nav";

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

function GlobalSearch() {
  const { skins } = useAdminData();
  const clients = useAdminStore((s) => s.clients);
  const subStores = useAdminStore((s) => s.subStores);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: { label: string; hint: string; href: string }[] = [];
    skins.filter((s) => skinDisplayName(s).toLowerCase().includes(term)).slice(0, 4).forEach((s) => out.push({ label: skinDisplayName(s), hint: "Skin", href: `/admin/estoque?q=${encodeURIComponent(s.finish)}` }));
    clients.filter((c) => `${c.name} ${c.handle}`.toLowerCase().includes(term)).slice(0, 4).forEach((c) => out.push({ label: `${c.name} (@${c.handle})`, hint: "Cliente", href: `/admin/clientes?q=${encodeURIComponent(c.handle)}` }));
    subStores.filter((s) => `${s.name} ${s.slug}`.toLowerCase().includes(term)).slice(0, 3).forEach((s) => out.push({ label: s.name, hint: "Sub-loja", href: "/admin/sub-lojas" }));
    return out;
  }, [q, skins, clients, subStores]);

  return (
    <div ref={ref} className="relative hidden w-[368px] md:block">
      <label className="flex h-[40px] items-center rounded-[11px] border border-[#1d1e23] bg-[#0b0c0e] px-[14px] focus-within:border-primary/50">
        <Search size={18} className="text-fg-2" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar skin, cliente, sub-loja..."
          aria-label="Busca global do painel"
          className="ml-[10px] h-full flex-1 bg-transparent text-[13.5px] outline-none"
        />
      </label>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-50 rounded-[12px] border border-border-strong bg-elevated p-1.5 shadow-2xl"
          >
            {results.map((r) => (
              <li key={r.hint + r.label}>
                <Link href={r.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-[8px] px-3 py-2 text-[13px] hover:bg-white/[0.05]">
                  <span className="truncate">{r.label}</span>
                  <span className="ml-3 shrink-0 text-[11px] text-faint">{r.hint}</span>
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlertsBell() {
  const { skins } = useAdminData();
  const stock = useAdminStore((s) => s.stock);
  const clients = useAdminStore((s) => s.clients);
  const subStores = useAdminStore((s) => s.subStores);
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const alerts = useMemo(
    () => buildAlerts({ stock, clients, subStores, skins: new Map(skins.map((s) => [s.id, s])) }),
    [stock, clients, subStores, skins],
  );
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Alertas (${alerts.length})`} className="relative grid size-10 place-items-center rounded-[10px] hover:bg-white/[0.04]">
        <Bell size={21} strokeWidth={1.9} />
        {alerts.length > 0 && (
          <span className="absolute right-[6px] top-[5px] grid h-[15px] min-w-[15px] place-items-center rounded-full bg-primary px-[3px] text-[9px] font-bold ring-2 ring-[#060709]">
            {alerts.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-[12px] border border-border-strong bg-elevated p-2 shadow-2xl">
            <p className="px-2 pb-2 pt-1 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Alertas do sistema</p>
            {alerts.map((a) => (
              <Link key={a.id} href={a.href ?? "/admin"} onClick={() => setOpen(false)} className="block rounded-[8px] px-2.5 py-2 text-[13px] hover:bg-white/[0.05]">
                {a.message}
                <span className="block text-[11px] text-faint">{timeAgo(a.date)}</span>
              </Link>
            ))}
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
    <div ref={ref} className="relative border-l border-[#17181c] pl-4">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-center gap-3">
        <span className="grid size-[42px] place-items-center rounded-full border-2 border-primary/80 bg-[radial-gradient(circle,#2a0208,#0b0405)] text-[12px] font-black tracking-tight shadow-[0_0_14px_-4px_rgb(230_0_35/0.8)]">
          BRN
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[14px] font-semibold leading-[18px]">Equipe BRN</span>
          <span className="block text-[12px] leading-[16px] text-fg-2">Administrador</span>
        </span>
        <ChevronDown size={16} className="hidden text-fg-2 sm:block" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-[calc(100%+10px)] z-50 w-48 rounded-[12px] border border-border-strong bg-elevated p-1.5 shadow-2xl">
            <Link href="/" className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] hover:bg-white/[0.05]">
              <ExternalLink size={15} /> Ver loja
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] text-primary hover:bg-white/[0.05]">
                <LogOut size={15} /> Sair
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminTopbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const link = findNavLink(pathname);
  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center gap-3 border-b border-[#141519] bg-[#060709]/95 px-4 backdrop-blur lg:px-[26px]">
      <button type="button" onClick={onMenu} aria-label="Abrir menu" className="grid size-9 place-items-center rounded-lg text-fg lg:hidden">
        <Menu size={22} />
      </button>
      <Menu size={22} className="hidden text-fg-2 lg:block" aria-hidden />
      <div className="min-w-0 lg:ml-[14px]">
        <h1 className="truncate text-[19px] font-bold leading-[24px] tracking-[-0.01em] lg:text-[21px]">{link?.title ?? "Admin"}</h1>
        {link?.subtitle && <p className="truncate text-[12.5px] text-fg-2">{link.subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-3 lg:gap-4">
        <GlobalSearch />
        <AlertsBell />
        <UserMenu />
      </div>
    </header>
  );
}
