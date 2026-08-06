"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, ClipboardCheck, ClipboardList, FolderKanban, Laptop, Loader2, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { getResumoNotificacao } from "@/lib/notificacao-labels";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/providers/auth-provider";
import { notificacaoService } from "@/services/notificacao-service";
import { buscaGlobalService } from "@/services/busca-global-service";
import { useTheme, type Theme } from "@/providers/theme-provider";
import type { BuscaGlobalItem } from "@/types";

type AppHeaderProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function AppHeader({ sidebarCollapsed = false, onToggleSidebar }: AppHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout, usuario } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [termoBusca, setTermoBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscaMobileAberta, setBuscaMobileAberta] = useState(false);
  const SidebarIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;
  const notificacoesQuery = useQuery({
    queryKey: ["notificacoes"],
    queryFn: notificacaoService.listarMinhas,
    refetchInterval: 60_000
  });
  const marcarComoLidaMutation = useMutation({
    mutationFn: notificacaoService.marcarComoLida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    }
  });
  const marcarTodasComoLidasMutation = useMutation({
    mutationFn: notificacaoService.marcarTodasComoLidas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    }
  });
  const buscaGlobalQuery = useQuery({
    queryKey: ["busca-global", termoBusca],
    queryFn: () => buscaGlobalService.buscar(termoBusca),
    enabled: termoBusca.length >= 2,
    staleTime: 30_000
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setTermoBusca(buscaGlobal.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [buscaGlobal]);

  const notificacoes = notificacoesQuery.data?.itens ?? [];
  const naoLidas = notificacoesQuery.data?.naoLidas ?? 0;
  const avatarFallback = usuario?.email?.slice(0, 2).toUpperCase() ?? "NX";

  function abrirNotificacao(id?: string, ordemServicoId?: string, solicitacaoId?: string) {
    if (id) {
      marcarComoLidaMutation.mutate(id);
    }

    if (ordemServicoId) {
      router.push(`/ordens-servico/${ordemServicoId}`);
    } else if (solicitacaoId) {
      router.push(`/solicitacoes/${solicitacaoId}`);
    }
  }

  function buscarGlobalmente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const primeiroResultado = gruposBusca.flatMap((grupo) => grupo.itens)[0];
    if (primeiroResultado) abrirResultado(primeiroResultado);
  }

  function abrirResultado(item: BuscaGlobalItem) {
    setBuscaAberta(false);
    setBuscaMobileAberta(false);
    setBuscaGlobal("");
    router.push(item.href);
  }

  function formatarDataHora(data: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(data));
  }

  const gruposBusca = [
    { titulo: "Tickets", itens: buscaGlobalQuery.data?.ordensServico ?? [], icon: ClipboardList },
    { titulo: "Clientes", itens: buscaGlobalQuery.data?.clientes ?? [], icon: Building2 },
    { titulo: "Projetos", itens: buscaGlobalQuery.data?.projetos ?? [], icon: FolderKanban },
    { titulo: "Usuários", itens: buscaGlobalQuery.data?.usuarios ?? [], icon: Users }
  ].filter((grupo) => grupo.itens.length > 0);

  return (
    <>
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:px-6">
      <Link
        href={usuario?.perfil === "DESENVOLVEDOR" ? "/minhas-os" : "/dashboard"}
        className="flex min-w-0 items-center gap-2 lg:hidden"
        aria-label="Ir para o início"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <span className="hidden text-sm font-semibold sm:inline">NexusOS</span>
      </Link>
      <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={onToggleSidebar}>
        <SidebarIcon className="h-5 w-5" />
        <span className="sr-only">{sidebarCollapsed ? "Abrir menu lateral" : "Esconder menu lateral"}</span>
      </Button>
      <form onSubmit={buscarGlobalmente} className="relative hidden w-full max-w-md md:block" role="search">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
            placeholder="Buscar ticket, cliente ou responsável"
          value={buscaGlobal}
          onFocus={() => setBuscaAberta(true)}
          onBlur={() => window.setTimeout(() => setBuscaAberta(false), 150)}
          onChange={(event) => { setBuscaGlobal(event.target.value); setBuscaAberta(true); }}
          aria-label="Busca global"
        />
        {buscaAberta && termoBusca.length >= 2 ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,480px)] w-full overflow-y-auto rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
            {buscaGlobalQuery.isFetching ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Buscando...</div>
            ) : buscaGlobalQuery.isError ? (
              <div className="px-3 py-4 text-sm text-destructive">Não foi possível realizar a busca.</div>
            ) : gruposBusca.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">Nenhum resultado encontrado.</div>
            ) : gruposBusca.map(({ titulo, itens, icon: Icon }) => (
              <div key={titulo} className="py-1">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {titulo}</div>
                {itens.map((item) => (
                  <button key={item.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => abrirResultado(item)} className="w-full rounded-sm px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none">
                    <span className="block truncate text-sm font-medium">{item.titulo}</span>
                    {item.subtitulo ? <span className="block truncate text-xs text-muted-foreground">{item.subtitulo}</span> : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </form>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setBuscaMobileAberta(true)}>
          <Search className="h-5 w-5" />
          <span className="sr-only">Abrir busca</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              {resolvedTheme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span className="sr-only">Alterar tema</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {([
              ["light", "Claro", Sun],
              ["dark", "Escuro", Moon],
              ["system", "Sistema", Laptop]
            ] as const).map(([value, label, Icon]) => (
              <DropdownMenuItem key={value} onClick={() => setTheme(value as Theme)}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {naoLidas > 0 ? (
                <span className="absolute right-1 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                  {naoLidas > 9 ? "9+" : naoLidas}
                </span>
              ) : null}
              <span className="sr-only">Notificações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw-2rem))] p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Notificações</div>
                <div className="text-xs text-muted-foreground">Avisos importantes do sistema</div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => router.push("/notificacoes")}>
                  Ver todas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={naoLidas === 0 || marcarTodasComoLidasMutation.isPending}
                  onClick={() => marcarTodasComoLidasMutation.mutate()}
                >
                  Marcar todas
                </Button>
              </div>
            </div>
            <Separator />
            <div className="max-h-[420px] overflow-y-auto">
              {notificacoes.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Nenhuma notificação no momento.</div>
              ) : (
                notificacoes.map((notificacao) => (
                  <button
                    key={notificacao.id}
                    type="button"
                    onClick={() => abrirNotificacao(notificacao.id, notificacao.ordemServicoId, notificacao.solicitacaoId)}
                    className="flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium">{notificacao.titulo}</span>
                      {!notificacao.lida ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                    </div>
                    <span className="text-sm text-muted-foreground">{notificacao.mensagem}</span>
                    <span className="text-xs text-muted-foreground">
                      {getResumoNotificacao(notificacao)} •{" "}
                      {formatarDataHora(notificacao.criadoEm)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarFallback>{avatarFallback}</AvatarFallback>
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
    <Sheet open={buscaMobileAberta} onOpenChange={setBuscaMobileAberta}>
      <SheetContent side="top" className="overflow-y-auto pt-14">
        <form onSubmit={buscarGlobalmente} role="search" className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-9"
            placeholder="Buscar ticket, cliente ou responsável"
            value={buscaGlobal}
            onChange={(event) => setBuscaGlobal(event.target.value)}
            aria-label="Busca global"
          />
        </form>
        <div className="mt-3 rounded-md border bg-popover p-2">
          {termoBusca.length < 2 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">Digite pelo menos dois caracteres.</div>
          ) : buscaGlobalQuery.isFetching ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Buscando...</div>
          ) : buscaGlobalQuery.isError ? (
            <div className="px-3 py-4 text-sm text-destructive">Não foi possível realizar a busca.</div>
          ) : gruposBusca.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">Nenhum resultado encontrado.</div>
          ) : gruposBusca.map(({ titulo, itens, icon: Icon }) => (
            <div key={titulo} className="py-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {titulo}</div>
              {itens.map((item) => (
                <button key={item.id} type="button" onClick={() => abrirResultado(item)} className="min-h-11 w-full rounded-sm px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none">
                  <span className="block truncate text-sm font-medium">{item.titulo}</span>
                  {item.subtitulo ? <span className="block truncate text-xs text-muted-foreground">{item.subtitulo}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
