"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Toggle } from "./Toggle";

interface EventData {
  eventName: string;
  leaderboardVisible: boolean;
  stats: {
    playersCount: number;
    pendingCount: number;
    activeAchievementsCount: number;
    secretDrawsCount: number;
  };
}

export function EventTab() {
  const [data, setData] = useState<EventData | null>(null);
  const [error, setError] = useState("");

  function load() {
    apiFetch<EventData>("/api/admin/event")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }

  useEffect(load, []);

  async function toggleLeaderboard() {
    if (!data) return;
    const next = !data.leaderboardVisible;
    setData({ ...data, leaderboardVisible: next });
    try {
      await apiFetch("/api/admin/event", {
        method: "PATCH",
        body: JSON.stringify({ leaderboardVisible: next }),
      });
    } catch (err) {
      setData({ ...data, leaderboardVisible: !next });
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  if (!data) {
    return error ? <span style={{ color: "var(--status-pending-fg)" }}>{error}</span> : null;
  }

  return (
    <>
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <span
          style={{
            font: "var(--text-label-caps)",
            letterSpacing: "var(--tracking-caps)",
            color: "var(--text-muted)",
          }}
        >
          Nastavení eventu
        </span>
        <span style={{ font: "var(--text-heading-md)", color: "var(--text-heading)" }}>
          {data.eventName}
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-card-sunken)",
            border: "1px solid var(--border-subtle)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
            <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>
              Žebříček viditelný hráčům
            </span>
            <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
              {data.leaderboardVisible ? "Zapnuto" : "Vypnuto"}
            </span>
          </div>
          <Toggle checked={data.leaderboardVisible} onChange={toggleLeaderboard} label="Přepnout viditelnost žebříčku" />
        </div>

        {data.leaderboardVisible ? (
          <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>
            Hráči vidí kompletní žebříček tak, jak je. Vypni den před koncem srazu, ať finální
            odhalení pořadí je překvapení.
          </span>
        ) : (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--status-pending-bg)",
              border: "1px solid var(--status-pending-border)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span
              style={{
                font: "var(--text-label-caps)",
                letterSpacing: "var(--tracking-caps)",
                color: "var(--status-pending-fg)",
              }}
            >
              Náhled toho, co teď vidí hráči
            </span>
            <span style={{ font: "var(--text-body-sm)", color: "var(--text-body)" }}>
              „Žebříček je momentálně skrytý — napětí se stupňuje!“
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            font: "var(--text-label-caps)",
            letterSpacing: "var(--tracking-caps)",
            color: "var(--text-muted)",
          }}
        >
          Rychlý přehled
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", marginTop: 4 }}>
          <Stat value={data.stats.playersCount} label="hráčů na srazu" />
          <Stat value={data.stats.pendingCount} label="čeká na schválení" />
          <Stat value={data.stats.activeAchievementsCount} label="aktivních achievementů" />
          <Stat value={data.stats.secretDrawsCount} label="vylosovaných tajných" />
        </div>
      </div>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ font: "400 28px/1 var(--font-display)", color: "var(--accent-gold)" }}>{value}</span>
      <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
