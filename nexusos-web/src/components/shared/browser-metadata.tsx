"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type RouteMetadata = {
  title: string;
  description: string;
};

const defaultMetadata: RouteMetadata = {
  title: "NexusOS | Gestão inteligente de Ordens de Serviço",
  description: "Plataforma para gestão de ordens de serviço, atendimento técnico, prazos, cobranças e portal do cliente."
};

const routeMetadata: Array<[RegExp, RouteMetadata]> = [
  [
    /^\/$/,
    {
      title: "NexusOS | Gestão inteligente de Ordens de Serviço",
      description: "Controle técnico, financeiro e operacional das suas ordens de serviço em um só lugar."
    }
  ],
  [
    /^\/login$/,
    {
      title: "Entrar | NexusOS",
      description: "Acesse sua área segura do NexusOS para acompanhar ordens de serviço e operações técnicas."
    }
  ],
  [
    /^\/dashboard$/,
    {
      title: "Dashboard operacional | NexusOS",
      description: "Indicadores executivos de ordens de serviço, produtividade, prazos, SLA e faturamento."
    }
  ],
  [
    /^\/ordens-servico$/,
    {
      title: "Ordens de Serviço | NexusOS",
      description: "Gerencie demandas técnicas por status, prioridade, responsável, prazo e pagamento."
    }
  ],
  [
    /^\/ordens-servico\/nova$/,
    {
      title: "Nova Ordem de Serviço | NexusOS",
      description: "Cadastre uma nova demanda técnica com cliente, prioridade, prazo, responsável e escopo."
    }
  ],
  [
    /^\/ordens-servico\/finalizadas$/,
    {
      title: "OS Finalizadas | NexusOS",
      description: "Consulte ordens concluídas, data de finalização, valores, responsáveis e histórico de entrega."
    }
  ],
  [
    /^\/ordens-servico\/[^/]+\/analise$/,
    {
      title: "Análise técnica da OS | NexusOS",
      description: "Registre estimativas, entendimento técnico e dados de cobrança da ordem de serviço."
    }
  ],
  [
    /^\/ordens-servico\/[^/]+\/editar$/,
    {
      title: "Editar Ordem de Serviço | NexusOS",
      description: "Atualize dados principais, cliente, projeto, prioridade, prazo e responsável da OS."
    }
  ],
  [
    /^\/ordens-servico\/[^/]+\/finalizar$/,
    {
      title: "Finalizar Ordem de Serviço | NexusOS",
      description: "Documente a entrega da OS com descrição, branch, commits e arquivos alterados."
    }
  ],
  [
    /^\/ordens-servico\/[^/]+$/,
    {
      title: "Detalhes da Ordem de Serviço | NexusOS",
      description: "Acompanhe informações, textos técnicos, valores e auditoria completa da ordem de serviço."
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
      description: "Acompanhe alertas operacionais, prazos, aprovações, atribuições e movimentações de OS."
    }
  ],
  [
    /^\/portal\/cliente\/[^/]+$/,
    {
      title: "Portal do Cliente | NexusOS",
      description: "Área segura para o cliente acompanhar ordens de serviço, aprovar entregas e consultar pagamentos."
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
