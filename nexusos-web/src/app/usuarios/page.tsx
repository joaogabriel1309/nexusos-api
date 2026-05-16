import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function UsuariosPage() {
  return (
    <AppShell>
      <PageHeader title="Usuários" description="Base inicial preparada para integração com o módulo de usuários." />
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">Nenhum usuário carregado nesta etapa.</CardContent>
      </Card>
    </AppShell>
  );
}
