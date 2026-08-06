"use client";

import Link from "next/link";
import { ClipboardList, FilePlus2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PortalNavigation({ token, active }: { token: string; active: "tickets" | "solicitacoes" | "nova" }) {
  const itens = [
    { id: "tickets", label: "Tickets", href: `/portal/cliente/${token}`, icon: ClipboardList },
    { id: "solicitacoes", label: "Minhas solicitações", href: `/portal/cliente/${token}/solicitacoes`, icon: Inbox }
  ] as const;

  return (
    <div className="flex min-w-0 flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
      <nav className="flex min-w-0 gap-1 overflow-x-auto rounded-md bg-muted p-1" aria-label="Seções do Portal do Cliente">
        {itens.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={cn("flex h-10 shrink-0 items-center gap-2 rounded px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", active === item.id && "bg-background text-foreground shadow-sm")}>
              <Icon className="h-4 w-4" />{item.label}
            </Link>
          );
        })}
      </nav>
      <Button asChild className="w-full shrink-0 sm:w-auto"><Link href={`/portal/cliente/${token}/solicitacoes/nova`}><FilePlus2 className="h-4 w-4" />Nova solicitação</Link></Button>
    </div>
  );
}
