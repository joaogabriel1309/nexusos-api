"use client";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ProtectedRoute } from "@/components/layout/protected-route";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="flex">
          <AppSidebar />
          <div className="min-w-0 flex-1">
            <AppHeader />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">{children}</main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
