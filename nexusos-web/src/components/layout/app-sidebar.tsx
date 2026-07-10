"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { getActiveNavigationHref, getNavigationItems } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type AppSidebarProps = {
  collapsed?: boolean;
};

export function AppSidebar({ collapsed = false }: AppSidebarProps) {
  const pathname = usePathname();
  const { usuario } = useAuth();
  const activeHref = getActiveNavigationHref(pathname);
  const navigationItems = getNavigationItems(usuario?.perfil);

  return (
    <aside className={cn("hidden min-h-screen border-r bg-white transition-all lg:block", collapsed ? "w-20" : "w-64")}>
      <div className={cn("flex h-16 items-center gap-3 border-b px-5", collapsed && "justify-center px-3")}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div className={cn(collapsed && "hidden")}>
          <p className="text-sm font-semibold leading-none">NexusOS</p>
          <p className="mt-1 text-xs text-muted-foreground">Workflow técnico</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                collapsed && "justify-center px-0",
                active && "bg-secondary text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className={cn(collapsed && "sr-only")}>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
