import {
  ArrowRightLeft,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Megaphone,
  Tags,
  Calculator,
  MessageCircle,
  Settings,
  Store,
  UsersRound,
  Wallet,
  Warehouse,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavLink {
  href: string;
  label: string;
  title?: string;
  subtitle?: string;
}

export interface AdminNavItem extends AdminNavLink {
  icon: LucideIcon;
  children?: AdminNavLink[];
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, title: "Dashboard", subtitle: "Visão geral da sua loja" },
  {
    href: "/admin/estoque",
    label: "Estoque",
    icon: Warehouse,
    children: [
      { href: "/admin/estoque", label: "Inventário", title: "Estoque", subtitle: "Lotes, custos e valor de mercado" },
      { href: "/admin/skins", label: "Catálogo", title: "Catálogo", subtitle: "Itens exibidos na loja" },
      { href: "/admin/precos", label: "Preços", title: "Preços", subtitle: "Preço de venda por condição" },
      { href: "/admin/categorias", label: "Categorias", title: "Categorias", subtitle: "Categorias e raridades" },
      { href: "/admin/kits", label: "Kits", title: "Kits", subtitle: "Conjuntos vendidos juntos" },
    ],
  },
  {
    href: "/admin/financeiro",
    label: "Financeiro",
    icon: Wallet,
    children: [
      { href: "/admin/financeiro", label: "Desempenho", title: "Financeiro", subtitle: "Faturamento, lucro e margem" },
      { href: "/admin/financeiro/variacoes", label: "Baixas e altas", title: "Baixas e altas", subtitle: "Valorização do estoque vs. preço pago" },
    ],
  },
  { href: "/admin/cotador", label: "Cotador", icon: Calculator, title: "Cotador", subtitle: "Cote skins em ¥ com a sua cotação" },
  { href: "/admin/mercado", label: "Preços de mercado", icon: Tags, title: "Preços de mercado", subtitle: "Catálogo sincronizado e regra de preço" },
  { href: "/admin/movimentacoes", label: "Movimentações", icon: ArrowRightLeft, title: "Movimentações", subtitle: "Entradas (compras) e saídas (vendas)" },
  { href: "/admin/sub-lojas", label: "Sub-Lojas", icon: Store, title: "Sub-Lojas", subtitle: "Lojas vendidas para revendedores" },
  { href: "/admin/clientes", label: "Clientes", icon: UsersRound, title: "Clientes", subtitle: "Quem compra, quanto e há quanto tempo" },
  { href: "/admin/influenciadores", label: "Influenciadores", icon: Megaphone, title: "Influenciadores", subtitle: "Links de indicação e comissões" },
  { href: "/admin/automacao", label: "Automação", icon: Workflow, title: "Automação", subtitle: "Recuperação automática de clientes" },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, title: "WhatsApp", subtitle: "Número e mensagens da loja" },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList, title: "Pedidos", subtitle: "Pedidos enviados pelo carrinho" },
  { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart, title: "Relatórios", subtitle: "Exportação de dados" },
  {
    href: "/admin/configuracoes",
    label: "Configurações",
    icon: Settings,
    children: [
      { href: "/admin/configuracoes", label: "Loja", title: "Configurações", subtitle: "Informações gerais da loja" },
      { href: "/admin/banners", label: "Banners", title: "Banners", subtitle: "Artes do topo da loja" },
    ],
  },
];

export function findNavLink(pathname: string): AdminNavLink | undefined {
  const all = ADMIN_NAV.flatMap((i) => (i.children ? i.children : [i]));
  return [...all].sort((a, b) => b.href.length - a.href.length).find((l) => (l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href)));
}

const byHref = (href: string) => ADMIN_NAV.find((i) => i.href === href)!;

/** Menu lateral agrupado por assunto. */
export const ADMIN_NAV_SECTIONS: { label: string; items: AdminNavItem[] }[] = [
  { label: "Geral", items: [byHref("/admin"), byHref("/admin/pedidos")] },
  { label: "Operação", items: [byHref("/admin/cotador"), byHref("/admin/mercado"), byHref("/admin/estoque"), byHref("/admin/movimentacoes"), byHref("/admin/financeiro")] },
  { label: "Clientes", items: [byHref("/admin/clientes"), byHref("/admin/influenciadores"), byHref("/admin/automacao"), byHref("/admin/sub-lojas")] },
  { label: "Sistema", items: [byHref("/admin/whatsapp"), byHref("/admin/relatorios"), byHref("/admin/configuracoes")] },
];
