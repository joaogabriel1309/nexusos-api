"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getActiveNavigationHref, getMobilePrimaryItems } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { usuario } = useAuth();
  const activeHref = getActiveNavigationHref(pathname);
  const items = getMobilePrimaryItems(usuario?.perfil);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 backdrop-blur lg:hidden"
      aria-label="Navegação rápida"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-muted-foreground",
              active && "bg-secondary text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.title}</span>
          </Link>
        );
      })}
      <div className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
        <MobileNav triggerClassName="h-7 w-10" />
        <span className="-mt-1">Mais</span>
      </div>
    </nav>
  );
}
