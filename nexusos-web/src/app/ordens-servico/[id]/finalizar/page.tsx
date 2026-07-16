"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ordemServicoService, type OrdemServicoFinalizacaoPayload } from "@/services/ordem-servico-service";

export default function FinalizarOrdemServicoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id;

  const [descricao, setDescricao] = useState("");
  const [commitsFinalizacao, setCommitsFinalizacao] = useState("");
  const [branchFinalizacao, setBranchFinalizacao] = useState("");
  const [arquivosAlteradosFinalizacao, setArquivosAlteradosFinalizacao] = useState("");

  const ordemQuery = useQuery({
    queryKey: ["ordens-servico", id],
    queryFn: () => ordemServicoService.buscarPorId(id),
    enabled: Boolean(id)
  });

  const ordem = ordemQuery.data;

  useEffect(() => {
    if (!ordem) {
      return;
    }

    setDescricao(ordem.descricaoFinalizacao ?? "");
    setCommitsFinalizacao(ordem.commitsFinalizacao ?? "");
    setBranchFinalizacao(ordem.branchFinalizacao ?? "");
    setArquivosAlteradosFinalizacao(ordem.arquivosAlteradosFinalizacao ?? "");
  }, [ordem]);

  const finalizarMutation = useMutation({
    mutationFn: (payload: OrdemServicoFinalizacaoPayload) => {
      if (!ordem) {
        throw new Error("OS não carregada.");
      }

      return ordemServicoService.finalizar(ordem.id, payload);
    },
    onSuccess: (ordemAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico", id] });
      queryClient.invalidateQueries({ queryKey: ["auditoria", "ordens-servico", id] });
      toast.success("OS finalizada com sucesso.");
      router.push(`/ordens-servico/${ordemAtualizada.id}`);
    },
    onError: () => {
      toast.error("Não foi possível finalizar a OS.");
    }
  });

  function recarregar() {
    ordemQuery.refetch();
  }

  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!descricao.trim()) {
      toast.error("Informe a descrição do que foi feito.");
      return;
    }

    finalizarMutation.mutate({
      descricao: descricao.trim(),
      commitsFinalizacao: commitsFinalizacao.trim() || null,
      branchFinalizacao: branchFinalizacao.trim() || null,
      arquivosAlteradosFinalizacao: arquivosAlteradosFinalizacao.trim() || null
    });
  }

  return (
    <AppShell>
      <PageHeader
        title={ordem ? `Finalizar OS ${ordem.codigo}` : "Finalizar OS"}
        description="Registre o que foi entregue e os detalhes técnicos usados na conclusão da ordem de serviço."
        actions={
          <Button variant="outline" onClick={() => router.push(`/ordens-servico/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Dados da finalização</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {ordemQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : ordemQuery.isError || !ordem ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Não foi possível carregar a OS para finalização.</span>
              <Button variant="outline" size="sm" onClick={recarregar}>
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={salvar}>
              <div className="rounded-md border bg-secondary/30 p-4">
                <div className="text-sm font-medium">{ordem.titulo}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Cliente: {ordem.clienteNome} {ordem.projetoNome ? `- Projeto: ${ordem.projetoNome}` : ""}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="descricao-finalizacao">
                  Descrição do que foi feito
                </label>
                <Textarea
                  id="descricao-finalizacao"
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Descreva o que foi entregue, corrigido ou configurado nesta OS."
                  className="min-h-36 resize-y"
                  required
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="branch-finalizacao">
                    Branch utilizada
                  </label>
                  <Input
                    id="branch-finalizacao"
                    value={branchFinalizacao}
                    onChange={(event) => setBranchFinalizacao(event.target.value)}
                    placeholder="ex: feature/os-123-ajuste-login"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="commits-finalizacao">
                    Numero dos commits ou links
                  </label>
                  <Textarea
                    id="commits-finalizacao"
                    value={commitsFinalizacao}
                    onChange={(event) => setCommitsFinalizacao(event.target.value)}
                    placeholder="ex: a1b2c3d, https://github.com/.../commit/..."
                    className="min-h-24 resize-y"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="arquivos-finalizacao">
                  Arquivos alterados
                </label>
                <Textarea
                  id="arquivos-finalizacao"
                  value={arquivosAlteradosFinalizacao}
                  onChange={(event) => setArquivosAlteradosFinalizacao(event.target.value)}
                  placeholder="Liste os arquivos principais alterados, um por linha."
                  className="min-h-32 resize-y"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => router.push(`/ordens-servico/${id}`)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={finalizarMutation.isPending}>
                  {finalizarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Finalizar OS
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
