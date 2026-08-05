"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { canAccessPath } from "@/components/layout/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, usuario } = useAuth();
  const possuiAcesso = canAccessPath(pathname, usuario?.perfil);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isLoading && isAuthenticated && !possuiAcesso) {
      router.replace(usuario?.perfil === "DESENVOLVEDOR" ? "/minhas-os" : "/dashboard");
    }
  }, [isAuthenticated, isLoading, possuiAcesso, router, usuario?.perfil]);

  if (isLoading || !isAuthenticated || !possuiAcesso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
