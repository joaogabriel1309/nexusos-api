import { BarChart3, Building2, ClipboardCheck, ClipboardList, Settings, Users } from "lucide-react";

export const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { title: "Ordens de Servico", href: "/ordens-servico", icon: ClipboardList },
  { title: "OS Finalizadas", href: "/ordens-servico/finalizadas", icon: ClipboardCheck },
  { title: "Clientes", href: "/clientes", icon: Building2 },
  { title: "Usuarios", href: "/usuarios", icon: Users },
  { title: "Configuracoes", href: "/configuracoes", icon: Settings }
];
