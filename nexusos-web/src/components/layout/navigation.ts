import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  Code2,
  FolderKanban,
  Inbox,
  Settings,
  Users
} from "lucide-react";
import type { PerfilUsuario } from "@/types";

type NavigationItem = {
  title: string;
  developerTitle?: string;
  href: string;
  icon: typeof BarChart3;
  roles?: PerfilUsuario[];
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: "Trabalho",
    items: [
      { title: "Visão geral", href: "/dashboard", icon: BarChart3, roles: ["ADMIN"] },
      { title: "Pendências", href: "/pendencias", icon: AlertTriangle, roles: ["ADMIN"] },
      { title: "Solicitações", href: "/solicitacoes", icon: Inbox, roles: ["ADMIN"] },
      { title: "Filas da equipe", developerTitle: "Meu trabalho", href: "/minhas-os", icon: Code2 },
      { title: "Tickets", href: "/ordens-servico", icon: ClipboardList },
      { title: "Agenda", href: "/calendario", icon: CalendarDays }
    ]
  },
  {
    label: "Gestão",
    items: [
      { title: "Clientes", href: "/clientes", icon: Building2, roles: ["ADMIN"] },
      { title: "Projetos", href: "/projetos", icon: FolderKanban, roles: ["ADMIN"] },
      { title: "Usuários", href: "/usuarios", icon: Users, roles: ["ADMIN"] }
    ]
  },
  {
    label: "Sistema",
    items: [
      { title: "Notificações", href: "/notificacoes", icon: Bell },
      { title: "Configurações", href: "/configuracoes", icon: Settings, roles: ["ADMIN"] }
    ]
  }
];

export const navigationItems = navigationGroups.flatMap((group) => group.items);

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
    pathname === "/calendario" ||
    pathname.startsWith("/calendario/") ||
    pathname === "/notificacoes" ||
    pathname.startsWith("/notificacoes/") ||
    pathname === "/ordens-servico" ||
    pathname.startsWith("/ordens-servico/")
  );
}

export function getNavigationItems(perfil?: PerfilUsuario | null) {
  return navigationItems
    .filter((item) => {
      if (item.roles && !item.roles.includes(perfil ?? "ADMIN")) {
        return false;
      }

      return canAccessPath(item.href, perfil);
    })
    .map((item) => ({
      ...item,
      title: perfil === "DESENVOLVEDOR" && item.developerTitle ? item.developerTitle : item.title
    }));
}

export function getNavigationGroups(perfil?: PerfilUsuario | null) {
  const allowed = new Set(getNavigationItems(perfil).map((item) => item.href));

  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => allowed.has(item.href))
        .map((item) => ({
          ...item,
          title: perfil === "DESENVOLVEDOR" && item.developerTitle ? item.developerTitle : item.title
        }))
    }))
    .filter((group) => group.items.length > 0);
}

export function getMobilePrimaryItems(perfil?: PerfilUsuario | null) {
  const preferred = perfil === "DESENVOLVEDOR"
    ? ["/minhas-os", "/ordens-servico", "/calendario", "/notificacoes"]
    : ["/dashboard", "/solicitacoes", "/ordens-servico", "/pendencias"];
  const items = getNavigationItems(perfil);

  return preferred
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}
