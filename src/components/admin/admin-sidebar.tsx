"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { ADMIN_NAV_SECTIONS, type AdminNavItem } from "./admin-nav";

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

/** Dica ao passar o mouse quando o menu está recolhido */
function Tip({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-[8px] border border-white/[0.1] bg-[#15161a] px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
      {label}
    </span>
  );
}

function NavItem({ item, pathname, collapsed, onNavigate }: { item: AdminNavItem; pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  const childActive = item.children?.some((c) => isActive(pathname, c.href)) ?? false;
  const selfActive = !item.children && isActive(pathname, item.href);
  const active = selfActive || childActive;
  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);
  const Icon = item.icon;

  const inner = (
    <>
      {active && (
        <motion.span
          layoutId="admin-nav-active"
          className="absolute inset-0 rounded-[10px] border border-[#ff2d4b]/30 bg-[linear-gradient(90deg,rgb(230_0_35/0.22),rgb(230_0_35/0.04))]"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <span className={cn("relative grid size-[30px] shrink-0 place-items-center rounded-[8px] transition-colors", active ? "bg-primary text-white shadow-[0_6px_16px_-6px_rgb(230_0_35/0.9)]" : "text-muted group-hover:text-white")}>
        <Icon size={16} strokeWidth={1.9} />
      </span>
      {!collapsed && <span className={cn("relative flex-1 truncate text-left", active ? "font-semibold text-white" : "text-fg-2 group-hover:text-white")}>{item.label}</span>}
      {!collapsed && item.children && <ChevronDown size={14} className={cn("relative text-faint transition-transform", open && "rotate-180")} />}
      <Tip show={collapsed} label={item.label} />
    </>
  );

  const base = cn("group relative flex h-10 w-full items-center gap-2.5 rounded-[10px] px-1.5 text-[13.5px] transition-colors hover:bg-white/[0.035]", collapsed && "justify-center px-0");

  return (
    <div>
      {item.children && !collapsed ? (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={base}>
          {inner}
        </button>
      ) : (
        <Link href={item.href} onClick={onNavigate} aria-current={selfActive ? "page" : undefined} aria-label={collapsed ? item.label : undefined} className={base}>
          {inner}
        </Link>
      )}
      <AnimatePresence initial={false}>
        {item.children && open && !collapsed && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="ml-[22px] overflow-hidden border-l border-white/[0.07] pl-3"
          >
            {item.children.map((c) => {
              const on = c.href === pathname || (c.href !== item.href && pathname.startsWith(c.href));
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={cn("relative my-0.5 flex h-8 items-center rounded-[8px] px-2.5 text-[13px] transition-colors", on ? "bg-white/[0.07] font-medium text-white" : "text-muted hover:text-fg")}
                  >
                    {on && <span className="absolute -left-[13px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary" />}
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

function SidebarContent({ collapsed, onToggle, onNavigate, mobile }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      <div className={cn("mb-5 flex items-center gap-2", collapsed ? "justify-center" : "justify-between px-1.5")}>
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2.5">
          <Image src={siteConfig.assets.logo} alt={siteConfig.name} width={297} height={160} priority className={cn("w-auto transition-all", collapsed ? "h-7" : "h-8")} />
          {!collapsed && <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">Admin</span>}
        </Link>
        {!collapsed && !mobile && onToggle && (
          <button type="button" onClick={onToggle} aria-label="Recolher menu" title="Recolher menu" className="grid size-8 place-items-center rounded-[8px] text-faint hover:bg-white/[0.05] hover:text-white">
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      <nav aria-label="Administração" className={cn("scrollbar-thin -mx-1 flex-1 space-y-4 px-1", collapsed ? "overflow-visible" : "overflow-y-auto")}>
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {collapsed ? <div className="mx-auto mb-1.5 h-px w-6 bg-white/[0.08]" /> : <p className="mb-1 px-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">{section.label}</p>}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.href + item.label} item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("mt-4 space-y-1 border-t border-white/[0.06] pt-3", collapsed && "flex flex-col items-center")}>
        {collapsed && onToggle && (
          <button type="button" onClick={onToggle} aria-label="Expandir menu" className="group relative grid size-10 place-items-center rounded-[10px] text-muted hover:bg-white/[0.05] hover:text-white">
            <PanelLeftOpen size={16} />
            <Tip show label="Expandir menu" />
          </button>
        )}
        <Link href="/" className={cn("group relative flex h-10 items-center gap-2.5 rounded-[10px] px-1.5 text-[13px] text-muted transition-colors hover:bg-white/[0.035] hover:text-white", collapsed && "w-10 justify-center px-0")}>
          <span className="grid size-[30px] place-items-center">
            <ExternalLink size={15} />
          </span>
          {!collapsed && "Ver loja"}
          <Tip show={collapsed} label="Ver loja" />
        </Link>
        <form action={logoutAction}>
          <button type="submit" className={cn("group relative flex h-10 w-full items-center gap-2.5 rounded-[10px] px-1.5 text-[13px] text-muted transition-colors hover:bg-white/[0.035] hover:text-[#ff6b7d]", collapsed && "w-10 justify-center px-0")}>
            <span className="grid size-[30px] place-items-center">
              <LogOut size={15} />
            </span>
            {!collapsed && "Sair"}
            <Tip show={collapsed} label="Sair" />
          </button>
        </form>
      </div>
    </>
  );
}

export function AdminSidebar({ mobileOpen, onClose, collapsed, onToggle }: { mobileOpen: boolean; onClose: () => void; collapsed: boolean; onToggle: () => void }) {
  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 248 }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-white/[0.06] bg-[linear-gradient(180deg,#08090b,#060709)] px-3 pb-3 pt-5 lg:flex"
      >
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </motion.aside>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.24 }}
              className="absolute inset-y-0 left-0 flex w-[272px] flex-col bg-[#07080a] px-3 pb-4 pt-5"
            >
              <button type="button" onClick={onClose} aria-label="Fechar menu" className="absolute right-3 top-4 grid size-8 place-items-center rounded-lg text-muted hover:bg-white/[0.05]">
                <X size={18} />
              </button>
              <SidebarContent collapsed={false} onNavigate={onClose} mobile />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
