"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge, StatusPill } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";

type HistoryStatus = "approved" | "pending" | "missed";

interface HistoryItem {
  id: string;
  title: string;
  dailyDate: string;
  points: number;
  iconPath: string | null;
  status: HistoryStatus;
}

interface DailyResponse {
  history: HistoryItem[];
}

function formatDailyDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export default function DailyHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<DailyResponse>("/api/daily")
      .then((r) => setHistory(r.history))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }, []);

  return (
    <AppShell title="Daily achievements history" activeTab="dashboard">
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}
        {history?.length === 0 && (
          <span style={{ font: "var(--text-body-sm)", color: "var(--text-disabled)" }}>
            Zatím žádná denní výzva neproběhla.
          </span>
        )}
        {history?.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(`/achievement/${item.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>{item.title}</span>
              <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>
                {formatDailyDate(item.dailyDate)}
              </span>
            </div>
            <Badge points={item.points} size="sm" state={item.status === "approved" ? "approved" : "default"} />
            <StatusPill status={item.status === "pending" ? "pending" : item.status} compact />
          </button>
        ))}
      </div>
    </AppShell>
  );
}
