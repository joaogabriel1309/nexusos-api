import { BarChart3, Bell, Building2, ClipboardCheck, ClipboardList, Code2, FolderKanban, Settings, Users } from "lucide-react";
import type { PerfilUsuario } from "@/types";

export const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { title: "Minhas OS", href: "/minhas-os", icon: Code2, roles: ["DESENVOLVEDOR"] },
  { title: "Ordens de Servico", href: "/ordens-servico", icon: ClipboardList },
  { title: "OS Finalizadas", href: "/ordens-servico/finalizadas", icon: ClipboardCheck },
  { title: "Notificacoes", href: "/notificacoes", icon: Bell },
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

  return (
    pathname === "/minhas-os" ||
    pathname.startsWith("/minhas-os/") ||
    pathname === "/notificacoes" ||
    pathname.startsWith("/notificacoes/") ||
    pathname === "/ordens-servico" ||
    pathname.startsWith("/ordens-servico/")
  );
}

export function getNavigationItems(perfil?: PerfilUsuario | null) {
  return navigationItems.filter((item) => {
    if ("roles" in item && item.roles && !item.roles.includes(perfil ?? "ADMIN")) {
      return false;
    }

    return canAccessPath(item.href, perfil);
  });
}
