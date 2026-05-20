export type PrazoSituacao = "sem-prazo" | "vence-hoje" | "proximo" | "tranquilo";

export function formatarDataPrazo(data?: string) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${data}T00:00:00`));
}

export function obterSituacaoPrazo(data?: string): PrazoSituacao {
  if (!data) {
    return "sem-prazo";
  }

  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const prazo = new Date(`${data}T00:00:00`);
  const diffDias = Math.ceil((prazo.getTime() - inicioHoje.getTime()) / 86_400_000);

  if (diffDias <= 0) {
    return "vence-hoje";
  }

  if (diffDias <= 3) {
    return "proximo";
  }

  return "tranquilo";
}

export function prazoClasses(data?: string) {
  const situacao = obterSituacaoPrazo(data);

  if (situacao === "vence-hoje") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (situacao === "proximo") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (situacao === "tranquilo") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-border bg-secondary/40 text-muted-foreground";
}
