export type TipoTemplate = "DESCRICAO_OS" | "ANALISE_TECNICA" | "FINALIZACAO" | "MENSAGEM_CLIENTE";

export type TemplateTexto = { id: string; nome: string; conteudo: string; tipo: TipoTemplate; personalizado?: boolean };

export const templatesIniciais: TemplateTexto[] = [
  { id: "descricao-correcao", nome: "Correcao de problema", tipo: "DESCRICAO_OS", conteudo: "Contexto:\n\nProblema identificado:\n\nComportamento esperado:\n\nCriterios de aceite:\n- " },
  { id: "descricao-melhoria", nome: "Solicitacao de melhoria", tipo: "DESCRICAO_OS", conteudo: "Objetivo da melhoria:\n\nCenario atual:\n\nResultado esperado:\n\nCriterios de aceite:\n- " },
  { id: "analise-padrao", nome: "Analise tecnica completa", tipo: "ANALISE_TECNICA", conteudo: "Entendimento da demanda:\n\nSolucao proposta:\n\nImpactos tecnicos:\n\nRiscos e dependencias:\n\nPlano de validacao:\n- " },
  { id: "finalizacao-padrao", nome: "Entrega concluida", tipo: "FINALIZACAO", conteudo: "O que foi realizado:\n\nValidacoes executadas:\n\nOrientacoes para uso:\n\nPendencias conhecidas:\n- Nenhuma." },
  { id: "mensagem-andamento", nome: "Atualizacao de andamento", tipo: "MENSAGEM_CLIENTE", conteudo: "Ola! Estamos trabalhando na sua solicitacao. No momento, ela esta em andamento e avisaremos assim que houver uma nova atualizacao." },
  { id: "mensagem-conclusao", nome: "Comunicacao de conclusao", tipo: "MENSAGEM_CLIENTE", conteudo: "Ola! Sua solicitacao foi concluida. Por favor, confira a entrega e nos avise se precisar de algum ajuste." }
];

export const TEMPLATE_STORAGE_KEY = "nexusos.templates-personalizados.v1";

export function carregarTemplatesPersonalizados(): TemplateTexto[] {
  if (typeof window === "undefined") return [];
  try {
    const valor = JSON.parse(window.localStorage.getItem(TEMPLATE_STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(valor)) return [];
    return valor.filter((item): item is TemplateTexto => {
      if (!item || typeof item !== "object") return false;
      const template = item as Partial<TemplateTexto>;
      return typeof template.id === "string" && typeof template.nome === "string" && typeof template.conteudo === "string" &&
        ["DESCRICAO_OS", "ANALISE_TECNICA", "FINALIZACAO", "MENSAGEM_CLIENTE"].includes(template.tipo ?? "") && template.personalizado === true;
    });
  } catch { return []; }
}

export function salvarTemplatesPersonalizados(templates: TemplateTexto[]) {
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

export function combinarComTextoAtual(atual: string, template: string) {
  const textoAtual = atual.trim();
  return textoAtual ? `${textoAtual}\n\n${template}` : template;
}
