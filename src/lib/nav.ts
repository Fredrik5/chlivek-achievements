import type { TabItem } from "@/components/ui";

export function buildTabItems(isAdmin: boolean): TabItem[] {
  const items: TabItem[] = [
    { key: "dashboard", label: "Dashboard", icon: "▲" },
    { key: "leaderboard", label: "Žebříček", icon: "◆" },
    { key: "secret", label: "Tajné", icon: "●" },
  ];
  if (isAdmin) items.push({ key: "admin", label: "Admin", icon: "■" });
  return items;
}

export const TAB_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  leaderboard: "/leaderboard",
  secret: "/secret",
  admin: "/admin",
};
