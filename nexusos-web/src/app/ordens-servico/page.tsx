"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { OrdemServicoForm } from "@/components/shared/ordem-servico-form";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrdemServico, PrioridadeOS, StatusOS } from "@/types";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico-schema";
import { ordemServicoService } from "@/services/ordem-servico-service";

const clientesMock = [
  { id: "1", nome: "Acme Sistemas" },
  { id: "2", nome: "Norte Tech" },
  { id: "3", nome: "Studio Core" }
];

const responsaveisMock = [
  { id: "101", nome: "Marina Costa" },
  { id: "102", nome: "João Lima" },
  { id: "103", nome: "Ana Reis" }
];

const ordensMock: OrdemServico[] = [
  {
    id: "OS-1024",
    titulo: "Ajuste no fluxo de validação fiscal",
    descricao: "Correção em etapa de validação",
    clienteId: "1",
    clienteNome: "Acme Sistemas",
    responsavelNome: "Marina Costa",
    status: "EM_DESENVOLVIMENTO",
    prioridade: "ALTA",
    prazo: "2026-05-22",
    criadoEm: "2026-05-13T10:00:00",
    atualizadoEm: "2026-05-15T12:00:00"
  },
  {
    id: "OS-1025",
    titulo: "Nova integração de anexos",
    descricao: "Preparar upload local",
    clienteId: "2",
    clienteNome: "Norte Tech",
    responsavelNome: "João Lima",
    status: "EM_TESTES",
    prioridade: "MEDIA",
    prazo: "2026-05-24",
    criadoEm: "2026-05-14T10:00:00",
    atualizadoEm: "2026-05-15T12:00:00"
  },
  {
    id: "OS-1026",
    titulo: "Correção de cálculo de apontamentos",
    descricao: "Revisar duração",
    clienteId: "3",
    clienteNome: "Studio Core",
    responsavelNome: "Ana Reis",
    status: "RECEBIDA",
    prioridade: "CRITICA",
    prazo: "2026-05-18",
    criadoEm: "2026-05-15T10:00:00",
    atualizadoEm: "2026-05-15T12:00:00"
  }
];

const statusLabels: Record<StatusOS, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  EM_TESTES: "Em testes",
  AGUARDANDO_VALIDACAO: "Aguardando validação",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada"
};

const prioridadeLabels: Record<PrioridadeOS, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica"
};

function statusVariant(status: StatusOS): BadgeProps["variant"] {
  if (status === "FINALIZADA") return "success";
  if (status === "CANCELADA") return "danger";
  if (status === "EM_DESENVOLVIMENTO" || status === "EM_TESTES") return "warning";
  return "secondary";
}

function prioridadeVariant(prioridade: PrioridadeOS): BadgeProps["variant"] {
  if (prioridade === "CRITICA") return "danger";
  if (prioridade === "ALTA") return "warning";
  if (prioridade === "MEDIA") return "secondary";
  return "outline";
}

function criarOrdemLocal(data: OrdemServicoFormData, total: number): OrdemServico {
  const cliente = clientesMock.find((item) => item.id === data.clienteId);
  const responsavel = responsaveisMock.find((item) => item.id === data.responsavelId);
  const agora = new Date().toISOString();

  return {
    id: `OS-${1030 + total}`,
    titulo: data.titulo,
    descricao: data.descricao,
    clienteId: data.clienteId,
    clienteNome: cliente?.nome ?? "Cliente não informado",
    responsavelId: data.responsavelId,
    responsavelNome: responsavel?.nome ?? "A definir",
    status: "RECEBIDA",
    prioridade: data.prioridade,
    prazo: data.prazo,
    criadoEm: agora,
    atualizadoEm: agora
  };
}

export default function OrdensServicoPage() {
  const [open, setOpen] = useState(false);
  const [ordens, setOrdens] = useState<OrdemServico[]>(ordensMock);

  const criarMutation = useMutation({
    mutationFn: ordemServicoService.criar,
    onSuccess: (ordem) => {
      setOrdens((current) => [ordem, ...current]);
      setOpen(false);
      toast.success("OS cadastrada com sucesso");
    },
    onError: () => {
      toast.error("Não foi possível cadastrar a OS na API");
    }
  });

  function handleCreate(data: OrdemServicoFormData) {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("nexusos.accessToken") : null;

    if (!token) {
      setOrdens((current) => [criarOrdemLocal(data, current.length), ...current]);
      setOpen(false);
      toast.success("OS adicionada à lista local");
      return;
    }

    criarMutation.mutate(data);
  }

  return (
    <AppShell>
      <PageHeader
        title="Ordens de Serviço"
        description="Acompanhe demandas técnicas por status, prioridade e responsável."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Nova OS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Cadastrar OS</DialogTitle>
                <DialogDescription>Registre a demanda inicial para análise e priorização técnica.</DialogDescription>
              </DialogHeader>
              <OrdemServicoForm
                clientes={clientesMock}
                responsaveis={responsaveisMock}
                isSubmitting={criarMutation.isPending}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(prioridadeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordens.map((ordem) => (
                <TableRow key={ordem.id}>
                  <TableCell className="font-medium">{ordem.id}</TableCell>
                  <TableCell>{ordem.titulo}</TableCell>
                  <TableCell>{ordem.clienteNome}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(ordem.status)}>{statusLabels[ordem.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={prioridadeVariant(ordem.prioridade)}>{prioridadeLabels[ordem.prioridade]}</Badge>
                  </TableCell>
                  <TableCell>{ordem.responsavelNome}</TableCell>
                  <TableCell>{ordem.prazo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
