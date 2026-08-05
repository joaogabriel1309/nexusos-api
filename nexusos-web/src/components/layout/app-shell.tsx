"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CompanyTheme } from "@/components/layout/company-theme";
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
      <CompanyTheme />
      <div className="min-h-screen bg-background">
        <div className="flex">
          <AppSidebar collapsed={sidebarCollapsed} />
          <div className="min-w-0 flex-1">
            <AppHeader
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={toggleSidebar}
            />
            <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:py-6 lg:px-6 lg:pb-6">{children}</main>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    </ProtectedRoute>
  );
}
