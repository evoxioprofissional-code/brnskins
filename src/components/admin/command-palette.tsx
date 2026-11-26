"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Calculator, CornerDownLeft, ExternalLink, Megaphone, PackagePlus, RefreshCw, Search, Store, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { ADMIN_NAV } from "./admin-nav";

interface Entry {
  id: string;
  group: "Ações" | "Telas" | "Skins";
  label: string;
  hint?: string;
  icon?: LucideIcon;
  image?: string;
  href: string;
}

const ACTIONS: Entry[] = [
  { id: "a-quote", group: "Ações", label: "Nova cotação", hint: "Cotador em ¥", icon: Calculator, href: "/admin/cotador" },
  { id: "a-buy", group: "Ações", label: "Registrar compra de skins", hint: "Estoque", icon: PackagePlus, href: "/admin/estoque?acao=compra" },
  { id: "a-sync", group: "Ações", label: "Sincronizar preços", hint: "Preços de mercado", icon: RefreshCw, href: "/admin/mercado" },
  { id: "a-sub", group: "Ações", label: "Criar sub-loja", hint: "Sub-Lojas", icon: Store, href: "/admin/sub-lojas?acao=nova" },
  { id: "a-inf", group: "Ações", label: "Novo influenciador", hint: "Links de indicação", icon: Megaphone, href: "/admin/influenciadores" },
  { id: "a-store", group: "Ações", label: "Abrir a loja", hint: "Site público", icon: ExternalLink, href: "/" },
];

const PAGES: Entry[] = ADMIN_NAV.flatMap((i) =>
  (i.children ?? [i]).map((c) => ({ id: `p-${c.href}`, group: "Telas" as const, label: c.title ?? c.label, hint: c.subtitle, icon: i.icon, href: c.href })),
);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const matches = (e: Entry, q: string) => q.split(/\s+/).every((t) => norm(`${e.label} ${e.hint ?? ""}`).includes(t));

/** Ctrl/Cmd + K: navegar, executar ações e buscar skins (abre no cotador). */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const [skins, setSkins] = useState<Entry[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setSkins([]);
      setIndex(0);
    }
  }, [open]);

  // Skins do catálogo (a partir de 2 letras)
  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) {
      setSkins([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog?${new URLSearchParams({ q: term, size: "6" })}`, { signal: controller.signal });
        const data = (await res.json()) as { items?: { id: string; marketName: string; image: string; offers: { price: number }[] }[] };
        setSkins(
          (data.items ?? []).map((s) => ({
            id: `s-${s.id}`,
            group: "Skins" as const,
            label: s.marketName,
            hint: `a partir de ${formatBRL(Math.min(...s.offers.map((o) => o.price)))} · cotar`,
            image: s.image,
            href: `/admin/cotador?q=${encodeURIComponent(s.marketName)}`,
          })),
        );
      } catch {
        /* cancelada */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, open]);

  const entries = useMemo(() => {
    const term = norm(q.trim());
    const acts = term ? ACTIONS.filter((e) => matches(e, term)) : ACTIONS;
    const pages = term ? PAGES.filter((e) => matches(e, term)) : PAGES.slice(0, 6);
    return [...acts, ...pages, ...skins];
  }, [q, skins]);

  useEffect(() => setIndex(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const go = (e?: Entry) => {
    if (!e) return;
    onClose();
    router.push(e.href);
  };

  let lastGroup = "";
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[620px] overflow-hidden rounded-[20px] border border-white/[0.12] bg-[#0d0e11] shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9),0_0_0_1px_rgb(230_0_35/0.08)]"
          >
            <label className="flex h-14 items-center gap-3 border-b border-white/[0.07] px-5">
              <Search size={18} className="text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIndex((i) => Math.min(entries.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIndex((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    go(entries[index]);
                  } else if (e.key === "Escape") onClose();
                }}
                placeholder="Ir para uma tela, executar uma ação ou buscar uma skin…"
                aria-label="Buscar comando"
                className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
              />
              <kbd className="rounded-[6px] bg-white/[0.08] px-1.5 py-0.5 text-[10.5px] text-muted">ESC</kbd>
            </label>

            <div ref={listRef} className="scrollbar-thin max-h-[420px] overflow-y-auto p-2">
              {entries.map((e, i) => {
                const header = e.group !== lastGroup ? e.group : null;
                lastGroup = e.group;
                const Icon = e.icon;
                const active = i === index;
                return (
                  <div key={e.id}>
                    {header && <p className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint first:pt-1">{header}</p>}
                    <button
                      type="button"
                      data-index={i}
                      onMouseMove={() => setIndex(i)}
                      onClick={() => go(e)}
                      className={cn("flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors", active ? "bg-white/[0.07]" : "")}
                    >
                      <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-[10px]", active ? "bg-primary text-white" : "bg-white/[0.05] text-muted")}>
                        {e.image ? <Image src={e.image} alt="" fill sizes="36px" className="object-contain p-0.5" /> : Icon ? <Icon size={16} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-white">{e.label}</span>
                        {e.hint && <span className="block truncate text-[11.5px] text-faint">{e.hint}</span>}
                      </span>
                      {active ? <CornerDownLeft size={14} className="text-muted" /> : <ArrowRight size={14} className="text-faint opacity-0" />}
                    </button>
                  </div>
                );
              })}
              {!entries.length && <p className="px-4 py-10 text-center text-[13px] text-muted">Nada encontrado para “{q}”.</p>}
            </div>

            <div className="flex items-center gap-4 border-t border-white/[0.07] px-5 py-2.5 text-[11px] text-faint">
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span className="ml-auto">Digite o nome de uma skin para cotar</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
