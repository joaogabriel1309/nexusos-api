"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BellRing, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { notificacaoService } from "@/services/notificacao-service";
import type { PreferenciaNotificacao, TipoPreferenciaNotificacao } from "@/types";

const detalhes: Record<TipoPreferenciaNotificacao, { titulo: string; descricao: string }> = {
  OS_ATRIBUIDA: { titulo: "OS atribuída", descricao: "Quando uma ordem de serviço for atribuída a você ou à equipe." },
  PRAZO_VENCIDO: { titulo: "Prazo vencido", descricao: "Quando uma ordem de serviço ultrapassar o prazo definido." },
  APROVACAO_CLIENTE: { titulo: "Aprovação do cliente", descricao: "Quando o cliente aprovar ou solicitar ajustes em uma OS." },
  PAGAMENTO: { titulo: "Pagamento", descricao: "Quando o pagamento de uma ordem de serviço for alterado." },
  COMENTARIO: { titulo: "Comentários", descricao: "Quando um novo comentário for adicionado a uma OS." },
  ALTERACAO_STATUS: { titulo: "Alterações de status", descricao: "Quando uma ordem de serviço mudar de etapa." }
};

export default function PreferenciasNotificacaoPage() {
  const queryClient = useQueryClient();
  const [preferencias, setPreferencias] = useState<PreferenciaNotificacao[]>([]);
  const query = useQuery({
    queryKey: ["notificacoes", "preferencias"],
    queryFn: notificacaoService.consultarPreferencias
  });

  useEffect(() => {
    if (query.data) setPreferencias(query.data.preferencias);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: notificacaoService.atualizarPreferencias,
    onSuccess: (data) => {
      setPreferencias(data.preferencias);
      queryClient.setQueryData(["notificacoes", "preferencias"], data);
      toast.success("Preferências de notificação salvas.");
    },
    onError: () => toast.error("Não foi possível salvar as preferências.")
  });

  function alternar(tipo: TipoPreferenciaNotificacao) {
    setPreferencias((atuais) =>
      atuais.map((item) => item.tipo === tipo ? { ...item, habilitada: !item.habilitada } : item)
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Preferências de notificação"
          description="Escolha quais alertas deseja receber. O histórico existente não será alterado."
          actions={<Button variant="outline" asChild><Link href="/notificacoes"><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>}
        />

        <Card>
          <CardContent className="p-4 sm:p-6">
            {query.isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}</div>
            ) : query.isError ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Não foi possível carregar suas preferências.</p>
                <Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button>
              </div>
            ) : (
              <div className="divide-y">
                {preferencias.map((preferencia) => {
                  const detalhe = detalhes[preferencia.tipo];
                  return (
                    <div key={preferencia.tipo} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 gap-3">
                        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                        <div><p className="font-medium">{detalhe.titulo}</p><p className="text-sm text-muted-foreground">{detalhe.descricao}</p></div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={preferencia.habilitada}
                        aria-label={`${detalhe.titulo}: ${preferencia.habilitada ? "ativado" : "desativado"}`}
                        onClick={() => alternar(preferencia.tipo)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${preferencia.habilitada ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${preferencia.habilitada ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {!query.isLoading && !query.isError ? (
          <div className="flex justify-end">
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ preferencias })}>
              <Save className="h-4 w-4" />{mutation.isPending ? "Salvando..." : "Salvar preferências"}
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
