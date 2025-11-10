import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import AppSidebar from "./_components/app-sidebar";
import RootHeader from "./_components/root-header";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <main className="flex flex-1 flex-col">
        <RootHeader />
        <div className="flex-1">{children}</div>
      </main>
    </SidebarProvider>
  );
}
