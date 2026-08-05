"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type RouteMetadata = {
  title: string;
  description: string;
};

const defaultMetadata: RouteMetadata = {
  title: "NexusOS | Gestão inteligente de Tickets",
  description: "Plataforma para gestão de tickets, atendimento técnico, prazos, cobranças e portal do cliente."
};

const routeMetadata: Array<[RegExp, RouteMetadata]> = [
  [
    /^\/$/,
    {
      title: "NexusOS | Gestão inteligente de Tickets",
      description: "Controle técnico, financeiro e operacional das seus tickets em um só lugar."
    }
  ],
  [
    /^\/login$/,
    {
      title: "Entrar | NexusOS",
      description: "Acesse sua área segura do NexusOS para acompanhar tickets e operações técnicas."
    }
  ],
  [
    /^\/dashboard$/,
    {
      title: "Dashboard operacional | NexusOS",
      description: "Indicadores executivos de tickets, produtividade, prazos, SLA e faturamento."
    }
  ],
  [
    /^\/ordens-servico$/,
    {
      title: "Tickets | NexusOS",
      description: "Gerencie demandas técnicas por status, prioridade, responsável, prazo e pagamento."
    }
  ],
  [
    /^\/ordens-servico\/nova$/,
    {
      title: "Nova Ticket | NexusOS",
      description: "Cadastre uma nova demanda técnica com cliente, prioridade, prazo, responsável e escopo."
    }
  ],
  [
    /^\/ordens-servico\/finalizadas$/,
    {
      title: "Tickets finalizados | NexusOS",
      description: "Consulte ordens concluídas, data de finalização, valores, responsáveis e histórico de entrega."
    }
  ],
  [
    /^\/ordens-servico\/[^/]+\/analise$/,
    {
      title: "Análise técnica do ticket | NexusOS",
      description: "Registre estimativas, entendimento técnico e dados de cobrança do ticket."
    }
  ],
  [
    /^\/ordens-servico\/[^/]+\/editar$/,
    {
      title: "Editar Ticket | NexusOS",
      description: "Atualize dados principais, cliente, projeto, prioridade, prazo e responsável do ticket."
    }
  ],
  [
    /^\/ordens-servico\/[^/]+\/finalizar$/,
    {
      title: "Finalizar Ticket | NexusOS",
      description: "Documente a entrega do ticket com descrição, branch, commits e arquivos alterados."
    }
  ],
  [
    /^\/ordens-servico\/[^/]+$/,
    {
      title: "Detalhes da Ticket | NexusOS",
      description: "Acompanhe informações, textos técnicos, valores e auditoria completa do ticket."
    }
  ],
  [
    /^\/clientes$/,
    {
      title: "Clientes | NexusOS",
      description: "Gerencie clientes, contatos, valores de hora, notificações e acesso ao portal."
    }
  ],
  [
    /^\/projetos$/,
    {
      title: "Projetos | NexusOS",
      description: "Organize projetos vinculados a clientes e acompanhe escopos ativos de atendimento."
    }
  ],
  [
    /^\/usuarios$/,
    {
      title: "Usuários e Permissões | NexusOS",
      description: "Administre usuários, perfis, acesso de administradores e desenvolvedores."
    }
  ],
  [
    /^\/notificacoes$/,
    {
      title: "Notificações | NexusOS",
      description: "Acompanhe alertas operacionais, prazos, aprovações, atribuições e movimentações de ticket."
    }
  ],
  [
    /^\/portal\/cliente\/[^/]+$/,
    {
      title: "Portal do Cliente | NexusOS",
      description: "Área segura para o cliente acompanhar tickets, aprovar entregas e consultar pagamentos."
    }
  ]
];

function metadataForPath(pathname: string): RouteMetadata {
  return routeMetadata.find(([pattern]) => pattern.test(pathname))?.[1] ?? defaultMetadata;
}

export function BrowserMetadata() {
  const pathname = usePathname();

  useEffect(() => {
    const metadata = metadataForPath(pathname);
    document.title = metadata.title;

    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = metadata.description;
  }, [pathname]);

  return null;
}
