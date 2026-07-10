import { BarChart3, Building2, ClipboardCheck, ClipboardList, FolderKanban, Settings, Users } from "lucide-react";
import type { PerfilUsuario } from "@/types";

export const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { title: "Ordens de Servico", href: "/ordens-servico", icon: ClipboardList },
  { title: "OS Finalizadas", href: "/ordens-servico/finalizadas", icon: ClipboardCheck },
  { title: "Projetos", href: "/projetos", icon: FolderKanban },
  { title: "Clientes", href: "/clientes", icon: Building2 },
  { title: "Usuarios", href: "/usuarios", icon: Users },
  { title: "Configuracoes", href: "/configuracoes", icon: Settings }
];

export function getActiveNavigationHref(pathname: string) {
  return navigationItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function canAccessPath(pathname: string, perfil?: PerfilUsuario | null) {
  if (perfil !== "DESENVOLVEDOR") {
    return true;
  }

  return pathname === "/ordens-servico" || pathname.startsWith("/ordens-servico/");
}

export function getNavigationItems(perfil?: PerfilUsuario | null) {
  return navigationItems.filter((item) => canAccessPath(item.href, perfil));
}
