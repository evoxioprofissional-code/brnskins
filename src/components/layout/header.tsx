"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Info,
  LayoutGrid,
  Package,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { mainNav, siteConfig, type MainNavIcon } from "@/config/site";
import { cn } from "@/lib/cn";
import { useCatalogStore } from "@/stores/catalog-store";
import { cartCount, useCartStore } from "@/stores/cart-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { Cs2Badge } from "@/components/icons/category-icons";

const NAV_ICONS: Record<MainNavIcon, typeof LayoutGrid> = {
  catalog: LayoutGrid,
  kits: Package,
  info: Info,
  faq: CircleHelp,
};

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function HeaderSearch({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useCatalogStore((s) => s.filters.query);
  const setFilter = useCatalogStore((s) => s.setFilter);
  const setTab = useCatalogStore((s) => s.setTab);
  const [gameOpen, setGameOpen] = useState(false);
  const gameRef = useOutsideClose(gameOpen, () => setGameOpen(false));

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        setTab("catalog");
        if (pathname !== "/") router.push("/#catalogo");
        else document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className={cn(
        "relative flex h-[37px] items-center rounded-[10px] border border-[#1d1d22] bg-[#0b0b0d]",
        className,
      )}
    >
      <Search size={19} strokeWidth={2} className="ml-[17px] shrink-0 text-fg" aria-hidden />
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setFilter("query", e.target.value)}
        placeholder="Buscar por skin, ex: AK-47 Redline..."
        aria-label="Buscar skins"
        className="ml-[12px] h-full min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <div ref={gameRef} className="relative mr-[14px] shrink-0">
        <button
          type="button"
          onClick={() => setGameOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={gameOpen}
          className="flex items-center gap-[7px] rounded-md py-1 pl-1 text-[13.5px] font-bold text-fg"
        >
          <Cs2Badge size={19} />
          CS2
          <ChevronDown size={15} strokeWidth={2.4} className={cn("transition-transform", gameOpen && "rotate-180")} />
        </button>
        <AnimatePresence>
          {gameOpen && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-44 rounded-[10px] border border-border-strong bg-elevated p-1.5 shadow-2xl"
            >
              <li
                role="option"
                aria-selected
                className="flex items-center justify-between rounded-md bg-white/[0.04] px-2.5 py-2 text-[13px] font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Cs2Badge size={16} /> Counter-Strike 2
                </span>
                <Check size={14} className="text-primary" />
              </li>
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-[10px] text-fg transition-colors hover:bg-white/[0.04]"
      >
        <Bell size={22} strokeWidth={1.9} />
        <span className="absolute right-[7px] top-[6px] size-[7px] rounded-full bg-primary ring-2 ring-bg" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[300px] rounded-[12px] border border-border-strong bg-elevated p-2 shadow-2xl"
          >
            <p className="px-2 pb-2 pt-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
              Notificações
            </p>
            <div className="rounded-[8px] bg-white/[0.03] p-3 text-[13px]">
              <p className="font-semibold">Bem-vindo à BRN Skins</p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Monte seu carrinho e finalize pelo WhatsApp com atendimento direto.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CartButton() {
  const hydrated = useHydrated();
  const count = useCartStore((s) => cartCount(s.items));
  const shown = hydrated ? count : 0;
  return (
    <Link
      href="/carrinho"
      aria-label={`Carrinho (${shown} itens)`}
      className="relative grid size-[41px] place-items-center rounded-[10px] border border-[#1a1a1f] bg-[#0d0d10] text-fg transition-colors hover:border-[#2a2a30]"
    >
      <ShoppingCart size={21} strokeWidth={1.9} />
      <span className="absolute -right-[6px] -top-[6px] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_10px_rgb(230_0_35/0.6)]">
        {shown > 99 ? "99+" : shown}
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className={cn("flex", vertical ? "flex-col gap-1" : "items-center gap-[5px]")}>
      {mainNav.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-[35px] items-center gap-[7px] rounded-[10px] border border-transparent px-[13.5px] text-[13px] font-semibold tracking-[-0.005em] text-fg transition-colors",
              active ? "glow-active" : "hover:text-white hover:bg-white/[0.03]",
              vertical && "h-11 text-[15px]",
            )}
          >
            <Icon size={16} strokeWidth={2} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setSearchOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#3a1d23] bg-[#050407]/95 shadow-[0_1px_0_rgb(120_0_20/0.18),0_8px_24px_-12px_rgb(0_0_0/0.9)] backdrop-blur-md">
      {/* Desktop */}
      <div className="hidden h-[67px] items-center pl-[56px] pr-[35px] lg:flex">
        <Link href="/" aria-label={`${siteConfig.name} — início`} className="shrink-0">
          <Image
            src={siteConfig.assets.logo}
            alt={siteConfig.name}
            width={297}
            height={160}
            priority
            className="h-[52px] w-auto"
          />
        </Link>
        <div className="ml-[38px]">
          <NavLinks />
        </div>
        <HeaderSearch className="ml-auto w-[423px] shrink" />
        <div className="ml-[54px] flex items-center gap-[16px]">
          <Notifications />
          <CartButton />
        </div>
      </div>

      {/* Mobile / tablet: header compacto estilo app (navegação fica na barra inferior) */}
      <div className="flex h-[54px] items-center px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <Link href="/" aria-label={siteConfig.name} className="shrink-0">
          <Image src={siteConfig.assets.logo} alt={siteConfig.name} width={297} height={160} priority className="h-[34px] w-auto" />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Buscar"
            aria-expanded={searchOpen}
            className="grid size-9 place-items-center rounded-[10px] text-fg active:bg-white/[0.06]"
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <Notifications />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 lg:hidden"
          >
            <HeaderSearch className="mb-3 w-full" autoFocus />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
