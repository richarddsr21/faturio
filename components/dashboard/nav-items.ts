import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Target,
  FileBarChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type DashboardSection =
  | "produtos"
  | "estoque"
  | "vendas"
  | "metas"
  | "relatorios"
  | "configuracoes";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface DashboardSectionItem extends DashboardNavItem {
  section: DashboardSection;
}

// Fonte única dos ícones das áreas do painel: usada pela sidebar e pelos atalhos da
// Visão geral, para que os dois mostrem sempre o mesmo ícone para a mesma área.
export const dashboardSections: DashboardSectionItem[] = [
  { section: "produtos", href: "/dashboard/produtos", label: "Produtos", icon: Package },
  { section: "estoque", href: "/dashboard/estoque", label: "Estoque", icon: Boxes },
  { section: "vendas", href: "/dashboard/vendas", label: "Vendas", icon: ShoppingCart },
  { section: "metas", href: "/dashboard/metas", label: "Metas", icon: Target },
  { section: "relatorios", href: "/dashboard/relatorios", label: "Relatórios", icon: FileBarChart },
  { section: "configuracoes", href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  ...dashboardSections,
];
