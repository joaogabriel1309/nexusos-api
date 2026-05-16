import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function ClientesPage() {
  return (
    <AppShell>
      <PageHeader title="Clientes" description="Base inicial preparada para integração com o módulo de clientes." />
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">Nenhum cliente carregado nesta etapa.</CardContent>
      </Card>
    </AppShell>
  );
}
