"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getActiveNavigationHref, getNavigationGroups } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSolicitacoesPendentes } from "@/hooks/use-solicitacoes-pendentes";

export function MobileNav({ triggerClassName }: { triggerClassName?: string }) {
  const pathname = usePathname();
  const { usuario } = useAuth();
  const activeHref = getActiveNavigationHref(pathname);
  const navigationGroups = getNavigationGroups(usuario?.perfil);
  const solicitacoesPendentes = useSolicitacoesPendentes(usuario?.perfil === "ADMIN").data?.pendentes ?? 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">NexusOS</p>
            <p className="mt-1 text-xs text-muted-foreground">Gestão de tickets</p>
          </div>
        </div>
        <nav className="space-y-5" aria-label="Menu completo">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeHref === item.href;
                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                        active && "bg-secondary text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {item.href === "/solicitacoes" && solicitacoesPendentes > 0 ? (
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                          {solicitacoesPendentes > 99 ? "99+" : solicitacoesPendentes}
                        </span>
                      ) : null}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
