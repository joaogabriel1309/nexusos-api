"use client";

import { Bell, LogOut, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/providers/auth-provider";

type AppHeaderProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function AppHeader({ sidebarCollapsed = false, onToggleSidebar }: AppHeaderProps) {
  const { logout } = useAuth();
  const SidebarIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur lg:px-6">
      <MobileNav />
      <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={onToggleSidebar}>
        <SidebarIcon className="h-5 w-5" />
        <span className="sr-only">{sidebarCollapsed ? "Abrir menu lateral" : "Esconder menu lateral"}</span>
      </Button>
      <div className="relative hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar OS, cliente ou responsável" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notificações</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarFallback>NX</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
