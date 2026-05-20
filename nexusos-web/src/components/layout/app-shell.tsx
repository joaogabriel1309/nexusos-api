"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ProtectedRoute } from "@/components/layout/protected-route";

const sidebarStorageKey = "nexusos.sidebarCollapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem(sidebarStorageKey) === "true");
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(sidebarStorageKey, String(next));
      return next;
    });
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="flex">
          <AppSidebar collapsed={sidebarCollapsed} />
          <div className="min-w-0 flex-1">
            <AppHeader
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={toggleSidebar}
            />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">{children}</main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
