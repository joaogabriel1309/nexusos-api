"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { prioridadeLabels, statusLabels } from "@/lib/os-labels";
import { calendarioService } from "@/services/calendario-service";
import type { EventoCalendario, PrioridadeOS, StatusOS, TipoEventoCalendario } from "@/types";

const TODOS = "__todos__";
const statusOptions: StatusOS[] = ["RECEBIDA", "EM_ANALISE", "AGUARDANDO_APROVACAO", "APROVADA", "EM_DESENVOLVIMENTO", "EM_TESTE", "AGUARDANDO_PAGAMENTO", "FINALIZADA"];
const prioridadeOptions: PrioridadeOS[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
const tipoLabels: Record<TipoEventoCalendario, string> = { PRAZO_OS: "Prazo", VENCIMENTO: "Vencimento", ENTREGA_PREVISTA: "Entrega prevista", EVENTO_IMPORTANTE: "Finalização" };
const tipoClasses: Record<TipoEventoCalendario, string> = { PRAZO_OS: "border-blue-200 bg-blue-50 text-blue-800", VENCIMENTO: "border-red-200 bg-red-50 text-red-800", ENTREGA_PREVISTA: "border-amber-200 bg-amber-50 text-amber-900", EVENTO_IMPORTANTE: "border-emerald-200 bg-emerald-50 text-emerald-800" };

function iso(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function opcoes(eventos: EventoCalendario[], id: "clienteId" | "projetoId" | "responsavelId", nome: "clienteNome" | "projetoNome" | "responsavelNome") {
  const mapa = new Map<string, string>();
  eventos.forEach((evento) => { if (evento[id] && evento[nome]) mapa.set(evento[id]!, evento[nome]!); });
  return [...mapa].sort((a, b) => a[1].localeCompare(b[1]));
}

export default function CalendarioPage() {
  const agora = new Date();
  const [mes, setMes] = useState(() => new Date(agora.getFullYear(), agora.getMonth(), 1));
  const [responsavelId, setResponsavelId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [projetoId, setProjetoId] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeOS | "">("");
  const [status, setStatus] = useState<StatusOS | "">("");
  const inicio = iso(new Date(mes.getFullYear(), mes.getMonth(), 1));
  const fim = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
  const filtros = { inicio, fim, responsavelId: responsavelId || undefined, clienteId: clienteId || undefined, projetoId: projetoId || undefined, prioridade: prioridade || undefined, status: status || undefined };
  const { data: eventos = [], isLoading, isError, refetch } = useQuery({ queryKey: ["calendario", filtros], queryFn: () => calendarioService.listar(filtros) });

  const eventosPorData = useMemo(() => eventos.reduce<Record<string, EventoCalendario[]>>((acc, evento) => {
    (acc[evento.data] ??= []).push(evento); return acc;
  }, {}), [eventos]);
  const dias = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    return [...Array<Date | null>(primeiro.getDay()).fill(null), ...Array.from({ length: ultimo.getDate() }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))];
  }, [mes]);

  return <AppShell>
    <PageHeader title="Calendário" description="Prazos, vencimentos, entregas previstas e eventos importantes das ordens de serviço." />
    <Card><CardContent className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="min-w-44 text-center font-semibold capitalize">{mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2>
          <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Filtro value={responsavelId} nome="Responsável" options={opcoes(eventos, "responsavelId", "responsavelNome")} onChange={setResponsavelId} />
          <Filtro value={clienteId} nome="Cliente" options={opcoes(eventos, "clienteId", "clienteNome")} onChange={setClienteId} />
          <Filtro value={projetoId} nome="Projeto" options={opcoes(eventos, "projetoId", "projetoNome")} onChange={setProjetoId} />
          <Filtro value={prioridade} nome="Prioridade" options={prioridadeOptions.map((x) => [x, prioridadeLabels[x]])} onChange={(x) => setPrioridade(x as PrioridadeOS | "")} />
          <Filtro value={status} nome="Status" options={statusOptions.map((x) => [x, statusLabels[x]])} onChange={(x) => setStatus(x as StatusOS | "")} />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">{Object.entries(tipoLabels).map(([tipo, label]) => <Badge key={tipo} variant="outline" className={tipoClasses[tipo as TipoEventoCalendario]}>{label}</Badge>)}</div>
      {isError ? <div className="flex items-center justify-between py-8 text-sm text-muted-foreground"><span>Não foi possível carregar o calendário.</span><Button variant="outline" onClick={() => refetch()}><RefreshCcw className="h-4 w-4" />Tentar novamente</Button></div> : <div className="overflow-x-auto"><div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-l border-t">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => <div key={dia} className="border-b border-r bg-secondary/40 p-2 text-center text-xs font-medium text-muted-foreground">{dia}</div>)}</div>
        <div className="grid grid-cols-7 border-l">{dias.map((dia, i) => dia ? <Dia key={iso(dia)} data={dia} eventos={eventosPorData[iso(dia)] ?? []} /> : <div key={`vazio-${i}`} className="min-h-32 border-b border-r bg-muted/20" />)}</div>
      </div>{isLoading ? <p className="py-3 text-sm text-muted-foreground">Carregando eventos...</p> : null}</div>}
    </CardContent></Card>
  </AppShell>;
}

function Filtro({ value, nome, options, onChange }: { value: string; nome: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <Select value={value || TODOS} onValueChange={(x) => onChange(x === TODOS ? "" : x)}><SelectTrigger><SelectValue placeholder={nome} /></SelectTrigger><SelectContent><SelectItem value={TODOS}>Todos: {nome.toLowerCase()}</SelectItem>{options.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select>;
}

function Dia({ data, eventos }: { data: Date; eventos: EventoCalendario[] }) {
  const hoje = iso(data) === iso(new Date());
  return <div className="min-h-32 border-b border-r p-1.5"><div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${hoje ? "bg-primary text-primary-foreground" : ""}`}>{data.getDate()}</div><div className="space-y-1">{eventos.map((evento) => <Link key={evento.id} href={`/ordens-servico/${evento.ordemServicoId}`} title={`${tipoLabels[evento.tipo]} - ${evento.clienteNome}`} className={`block rounded border px-1.5 py-1 text-xs hover:opacity-75 ${tipoClasses[evento.tipo]}`}><span className="font-semibold">#{evento.ordemServicoCodigo}</span> <span className="line-clamp-1">{evento.titulo}</span></Link>)}</div></div>;
}
