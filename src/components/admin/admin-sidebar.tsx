"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CircleDashed, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { useSettingsStore, effectiveWhatsApp } from "@/stores/settings-store";
import { ADMIN_NAV, type AdminNavItem } from "./admin-nav";

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

function NavGroup({ item, pathname, onNavigate }: { item: AdminNavItem; pathname: string; onNavigate?: () => void }) {
  const childActive = item.children?.some((c) => isActive(pathname, c.href)) ?? false;
  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);
  const Icon = item.icon;
  const base = "flex h-[38px] w-full items-center gap-[12px] rounded-[10px] px-[14px] text-[14px] font-medium transition-colors";

  if (!item.children) {
    const active = isActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          base,
          active
            ? "bg-[linear-gradient(180deg,#c8001f,#8f0017)] text-white shadow-[0_0_18px_-6px_rgb(230_0_35/0.85),inset_0_1px_0_rgb(255_255_255/0.12)]"
            : "text-fg-2 hover:bg-white/[0.035] hover:text-fg",
        )}
      >
        <Icon size={18} strokeWidth={1.9} />
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(base, childActive ? "text-fg" : "text-fg-2 hover:bg-white/[0.035] hover:text-fg")}
      >
        <Icon size={18} strokeWidth={1.9} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="ml-[23px] overflow-hidden border-l border-[#1e1f24] pl-[12px]"
          >
            {item.children.map((c) => {
              const active = c.href === pathname || (c.href !== item.href && pathname.startsWith(c.href));
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative my-[2px] flex h-[32px] items-center rounded-[8px] px-[10px] text-[13px] transition-colors",
                      active ? "bg-primary/[0.12] font-semibold text-white" : "text-fg-2 hover:text-fg",
                    )}
                  >
                    {active && <span className="absolute -left-[13px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary" />}
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function SystemStatus() {
  const whatsapp = useSettingsStore((s) => s.whatsapp);
  const items = [
    { label: "Link do WhatsApp", ok: Boolean(effectiveWhatsApp(whatsapp)) },
    { label: "API do WhatsApp", ok: false },
    { label: "Gateway de pagamento", ok: false },
    { label: "Banco de dados", ok: false },
  ];
  return (
    <div className="rounded-[12px] border border-[#18191d] bg-[#0a0b0d] p-3">
      <p className="flex items-center gap-2 text-[13px] font-semibold">
        <span className="size-[8px] rounded-full bg-success shadow-[0_0_8px_rgb(34_197_94/0.8)]" /> Sistema Online
      </p>
      <p className="mt-3 border-t border-[#18191d] pt-2.5 text-[11.5px] font-semibold text-fg-2">Integrações</p>
      <ul className="mt-1.5 space-y-1 text-[11.5px]">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-fg-2">
            {i.ok ? (
              <span className="text-success">✓</span>
            ) : (
              <CircleDashed size={11} className="text-amber-300/70" aria-label="Pendente" />
            )}
            {i.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <Link href="/admin" onClick={onNavigate} className="mx-auto block w-fit">
        <Image src={siteConfig.assets.logo} alt={siteConfig.name} width={297} height={160} priority className="h-[62px] w-auto" />
      </Link>
      <div className="mb-4 mt-5 flex items-center justify-between px-[6px]">
        <span className="text-[17px] font-bold">Administração</span>
        <span className="rounded-[6px] bg-primary/15 px-2 py-[2px] text-[11.5px] font-bold text-primary ring-1 ring-primary/30">v2.0</span>
      </div>
      <nav aria-label="Administração" className="scrollbar-thin -mx-1 flex-1 space-y-[3px] overflow-y-auto px-1">
        {ADMIN_NAV.map((item) => (
          <NavGroup key={item.href + item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="pt-4">
        <SystemStatus />
      </div>
    </>
  );
}

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-[#141519] bg-[#060709] px-[12px] pb-[14px] pt-[14px] lg:flex">
        <SidebarContent />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.24 }}
              className="absolute inset-y-0 left-0 flex w-[270px] flex-col bg-[#060709] px-3 pb-4 pt-4"
            >
              <button type="button" onClick={onClose} aria-label="Fechar menu" className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg bg-white/[0.05]">
                <X size={18} />
              </button>
              <SidebarContent onNavigate={onClose} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
