"use client";

import { Header } from "@core/components/base/header";
import { Sidebar } from "@core/components/base/sidebar";
import React, { useState } from "react";
import { AuthProvider } from '@/core/components/base/auth-provider';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode; }) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setSidebarCollapsed}
          />
          <main className="flex-1 flex flex-col items-center justify-center">
            {children}
          </main>
        </div>
      </div>
  );
}