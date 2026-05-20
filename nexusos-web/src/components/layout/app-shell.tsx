"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ProtectedRoute } from "@/components/layout/protected-route";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="flex">
          <AppSidebar collapsed={sidebarCollapsed} />
          <div className="min-w-0 flex-1">
            <AppHeader
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
            />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">{children}</main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
