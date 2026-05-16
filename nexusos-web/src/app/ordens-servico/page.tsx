import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrdemServico, PrioridadeOS, StatusOS } from "@/types";

const ordens: OrdemServico[] = [
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

export default function OrdensServicoPage() {
  return (
    <AppShell>
      <PageHeader
        title="Ordens de Serviço"
        description="Acompanhe demandas técnicas por status, prioridade e responsável."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Nova OS
          </Button>
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
