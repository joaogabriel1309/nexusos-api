"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prioridadeLabels } from "@/lib/os-labels";
import { ordemServicoService } from "@/services/ordem-servico-service";
import type { PrioridadeOS } from "@/types";

const ordensFinalizadasQueryKey = ["ordens-servico", "finalizadas"];
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function prioridadeVariant(prioridade: PrioridadeOS): BadgeProps["variant"] {
  if (prioridade === "CRITICA") return "danger";
  if (prioridade === "ALTA") return "warning";
  if (prioridade === "MEDIA") return "secondary";
  return "outline";
}

function formatarDataHora(data?: string) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(data));
}

export default function OrdensServicoFinalizadasPage() {
  const ordensQuery = useQuery({
    queryKey: ordensFinalizadasQueryKey,
    queryFn: ordemServicoService.listar,
    select: (ordens) => ordens.filter((ordem) => ordem.status === "FINALIZADA")
  });

  const ordens = ordensQuery.data ?? [];

  return (
    <AppShell>
      <PageHeader
        title="OS Finalizadas"
        description="Consulte ordens encerradas, data de finalizacao e resumo do que foi feito."
      />

      <Card>
        <CardContent className="p-5">
          {ordensQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : ordensQuery.isError ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nao foi possivel carregar as OS finalizadas.</span>
              <Button variant="outline" size="sm" onClick={() => ordensQuery.refetch()}>
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : ordens.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma OS finalizada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Finalizada em</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>O que foi feito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map((ordem) => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-medium">{ordem.titulo}</TableCell>
                    <TableCell>{ordem.clienteNome}</TableCell>
                    <TableCell>
                      <Badge variant={prioridadeVariant(ordem.prioridade)}>{prioridadeLabels[ordem.prioridade]}</Badge>
                    </TableCell>
                    <TableCell>{formatarDataHora(ordem.finalizadoEm)}</TableCell>
                    <TableCell>{ordem.estimativaHoras ?? "-"}</TableCell>
                    <TableCell>{ordem.valorTotalEstimado != null ? moeda.format(ordem.valorTotalEstimado) : "-"}</TableCell>
                    <TableCell className="max-w-[360px] whitespace-normal text-muted-foreground">
                      {ordem.descricaoFinalizacao || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
