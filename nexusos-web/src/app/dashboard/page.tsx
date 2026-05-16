import { Clock, ClipboardList, Code2, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  { title: "OS abertas", value: "48", icon: ClipboardList, hint: "12 críticas" },
  { title: "Em desenvolvimento", value: "16", icon: Code2, hint: "5 responsáveis" },
  { title: "Finalizadas", value: "124", icon: CheckCircle2, hint: "últimos 30 dias" },
  { title: "Tempo médio", value: "18h", icon: Clock, hint: "até finalização" }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader title="Dashboard" description="Visão executiva das ordens de serviço e produtividade técnica." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{metric.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo operacional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Recebida", "Em análise", "Em desenvolvimento", "Em testes", "Validação"].map((label, index) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-36 text-sm text-muted-foreground">{label}</div>
                <div className="h-2 flex-1 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${72 - index * 9}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Prioridades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Crítica", "7"],
              ["Alta", "18"],
              ["Média", "31"],
              ["Baixa", "12"]
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
