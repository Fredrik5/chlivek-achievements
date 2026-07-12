"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppHeader, TabBar } from "./ui";
import { buildTabItems, TAB_ROUTES } from "@/lib/nav";
import { useUser } from "@/lib/user-context";

interface AppShellProps {
  title: string;
  activeTab: string;
  maxWidth?: number;
  children: ReactNode;
}

export function AppShell({ title, activeTab, maxWidth = 480, children }: AppShellProps) {
  const user = useUser();
  const router = useRouter();
  const tabItems = buildTabItems(user.role === "admin");

  function handleTabChange(key: string) {
    if (key === activeTab) return;
    const route = TAB_ROUTES[key];
    if (route) router.push(route);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-app-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth,
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
        }}
      >
        <AppHeader title={title} />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            background: "var(--surface-app-bg-gradient)",
          }}
        >
          {children}
        </div>
        <TabBar items={tabItems} active={activeTab} onChange={handleTabChange} />
      </div>
    </div>
  );
}
