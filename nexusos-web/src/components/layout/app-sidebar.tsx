"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { getActiveNavigationHref, navigationItems } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const activeHref = getActiveNavigationHref(pathname);

  return (
    <aside className="hidden min-h-screen w-64 border-r bg-white lg:block">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
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
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                active && "bg-secondary text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
