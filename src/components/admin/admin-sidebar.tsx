"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { ADMIN_NAV_SECTIONS, type AdminNavItem } from "./admin-nav";

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

const itemBase =
  "relative flex h-[34px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-[13.5px] transition-colors";

function NavGroup({ item, pathname, onNavigate }: { item: AdminNavItem; pathname: string; onNavigate?: () => void }) {
  const childActive = item.children?.some((c) => isActive(pathname, c.href)) ?? false;
  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);
  const Icon = item.icon;

  if (!item.children) {
    const active = isActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(itemBase, active ? "bg-white/[0.07] font-medium text-white" : "text-muted hover:bg-white/[0.035] hover:text-fg")}
      >
        {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary" />}
        <Icon size={17} strokeWidth={1.8} className={active ? "text-white" : ""} />
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
        className={cn(itemBase, childActive ? "text-fg" : "text-muted hover:bg-white/[0.035] hover:text-fg")}
      >
        <Icon size={17} strokeWidth={1.8} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={14} className={cn("text-faint transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden"
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
                      "relative my-px flex h-[30px] items-center rounded-[8px] pl-[37px] pr-2.5 text-[13px] transition-colors",
                      active ? "bg-white/[0.07] font-medium text-white" : "text-muted hover:text-fg",
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary" />}
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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <Link href="/admin" onClick={onNavigate} className="mb-6 flex items-center gap-2.5 px-2.5">
        <Image src={siteConfig.assets.logo} alt={siteConfig.name} width={297} height={160} priority className="h-8 w-auto" />
        <span className="text-[12px] font-medium text-faint">Admin</span>
      </Link>
      <nav aria-label="Administração" className="scrollbar-thin -mx-1 flex-1 space-y-5 overflow-y-auto px-1">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1 px-2.5 text-[11px] font-medium text-faint">{section.label}</p>
            <div className="space-y-px">
              {section.items.map((item) => (
                <NavGroup key={item.href + item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <Link
        href="/"
        className="mt-4 flex h-[34px] items-center gap-2.5 rounded-[8px] px-2.5 text-[13px] text-muted transition-colors hover:bg-white/[0.035] hover:text-fg"
      >
        <ExternalLink size={16} strokeWidth={1.8} /> Ver loja
      </Link>
    </>
  );
}

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[224px] shrink-0 flex-col border-r border-white/[0.06] bg-[#060709] px-3 pb-3 pt-5 lg:flex">
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
              className="absolute inset-y-0 left-0 flex w-[264px] flex-col bg-[#060709] px-3 pb-4 pt-5"
            >
              <button type="button" onClick={onClose} aria-label="Fechar menu" className="absolute right-3 top-4 grid size-8 place-items-center rounded-lg text-muted hover:bg-white/[0.05]">
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
