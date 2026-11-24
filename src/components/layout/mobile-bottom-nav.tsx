"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  ChevronRight,
  CircleHelp,
  Eye,
  Heart,
  House,
  Info,
  LayoutGrid,
  Package,
  RefreshCw,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { cartCount, useCartStore } from "@/stores/cart-store";
import { useCatalogStore, type CatalogTab } from "@/stores/catalog-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  href,
  onClick,
  ariaLabel,
}: {
  ariaLabel?: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="relative">
        <Icon size={21} strokeWidth={active ? 2.2 : 1.9} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-[9px] -top-[6px] grid h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-[4px] text-[9.5px] font-bold leading-none text-white ring-2 ring-[#0c0d10]">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="text-[10.5px] font-semibold leading-none">{label}</span>
    </>
  );
  const cls = cn(
    "relative flex h-[54px] flex-1 flex-col items-center justify-center gap-[5px] rounded-[16px] transition-colors",
    active ? "text-white" : "text-fg-2 active:text-fg",
  );
  const pill = active && (
    <motion.span
      layoutId="bottom-nav-pill"
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
      className="absolute inset-[3px] -z-10 rounded-[14px] border border-primary/40 bg-[linear-gradient(180deg,rgb(230_0_35/0.32),rgb(230_0_35/0.12))] shadow-[0_0_18px_-6px_rgb(230_0_35/0.8)]"
    />
  );
  return href ? (
    <Link href={href} className={cls} aria-current={active ? "page" : undefined} aria-label={ariaLabel}>
      {pill}
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {pill}
      {content}
    </button>
  );
}

const MORE_LINKS: { label: string; text: string; icon: LucideIcon; href?: string; tab?: CatalogTab }[] = [
  { label: "Como funciona", text: "Do catálogo à sua Steam", icon: Info, href: "/como-funciona" },
  { label: "Upgrades", text: "Use suas skins como pagamento", icon: RefreshCw, tab: "upgrades" },
  { label: "Inspect 3D", text: "Veja a skin em 3D antes de comprar", icon: Eye, href: "/inspect" },
  { label: "Inventário", text: "Suas skins compradas", icon: Briefcase, tab: "inventory" },
  { label: "FAQ", text: "Perguntas frequentes", icon: CircleHelp, href: "/faq" },
];

/** Barra de navegação inferior estilo aplicativo (somente mobile/tablet). */
export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const tab = useCatalogStore((s) => s.tab);
  const setTab = useCatalogStore((s) => s.setTab);
  const count = useCartStore((s) => cartCount(s.items));
  const [moreOpen, setMoreOpen] = useState(false);
  useLockBodyScroll(moreOpen);
  useEffect(() => setMoreOpen(false), [pathname]);

  const goToTab = (next: CatalogTab) => {
    setTab(next);
    setMoreOpen(false);
    if (pathname !== "/") router.push("/#catalogo");
    else document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onHome = pathname === "/";
  const moreActive =
    moreOpen || pathname.startsWith("/como-funciona") || pathname.startsWith("/faq") ||
    (onHome && ["upgrades", "inspect", "inventory"].includes(tab));

  return (
    <>
      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-[45] px-[10px] pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[110%] bg-gradient-to-t from-bg via-bg/80 to-transparent" />
        <div className="relative isolate flex gap-1 rounded-[20px] border border-[#202127] bg-[#0c0d10]/90 p-[4px] shadow-[0_12px_40px_-10px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.04)] backdrop-blur-xl">
          <NavItem
            icon={House}
            label="Início"
            active={onHome && !moreActive && tab !== "favorites"}
            onClick={() => {
              setTab("catalog");
              if (onHome) window.scrollTo({ top: 0, behavior: "smooth" });
              else router.push("/");
            }}
          />
          <NavItem icon={Package} label="Kits" href="/kits" active={pathname.startsWith("/kits")} />
          <NavItem icon={Heart} label="Favoritos" active={onHome && tab === "favorites" && !moreOpen} onClick={() => goToTab("favorites")} />
          <NavItem
            icon={ShoppingCart}
            label="Carrinho"
            href="/carrinho"
            active={pathname.startsWith("/carrinho")}
            badge={hydrated ? count : 0}
            ariaLabel={`Carrinho (${hydrated ? count : 0} itens)`}
          />
          <NavItem icon={LayoutGrid} label="Mais" active={moreActive} onClick={() => setMoreOpen((v) => !v)} />
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[44] bg-black/65 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Mais opções"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "tween", duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-[10px] bottom-[calc(80px+env(safe-area-inset-bottom))] z-[44] rounded-[20px] border border-[#202127] bg-[#0c0d10] p-2 shadow-2xl lg:hidden"
            >
              {MORE_LINKS.map((l) => {
                const inner = (
                  <>
                    <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-primary/10 text-primary ring-1 ring-primary/25">
                      <l.icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-[14px] font-semibold">{l.label}</span>
                      <span className="block text-[12px] text-fg-2">{l.text}</span>
                    </span>
                    <ChevronRight size={17} className="text-faint" />
                  </>
                );
                const cls = "flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 active:bg-white/[0.04]";
                return l.href ? (
                  <Link key={l.label} href={l.href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button key={l.label} type="button" className={cls} onClick={() => goToTab(l.tab!)}>
                    {inner}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
