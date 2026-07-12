"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

interface Draw {
  id: string;
  player: string;
  secretTitle: string;
  threshold: number;
  drawnAt: string;
}

interface SecretAchievement {
  id: string;
  title: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function SecretOverviewTab() {
  const [playerSearch, setPlayerSearch] = useState("");
  const [achievementFilter, setAchievementFilter] = useState("all");
  const [pool, setPool] = useState<SecretAchievement[]>([]);
  const [draws, setDraws] = useState<Draw[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ achievements: SecretAchievement[] }>("/api/admin/achievements?secret=true")
      .then((r) => setPool(r.achievements))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (playerSearch.trim()) params.set("player", playerSearch.trim());
    if (achievementFilter !== "all") params.set("achievementId", achievementFilter);
    apiFetch<{ draws: Draw[] }>(`/api/admin/secret-draws?${params.toString()}`)
      .then((r) => setDraws(r.draws))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }, [playerSearch, achievementFilter]);

  return (
    <>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <input
          className="cca-input"
          placeholder="Hledat podle hráče…"
          value={playerSearch}
          onChange={(e) => setPlayerSearch(e.target.value)}
          style={{ flex: "1 1 200px", minHeight: 44, padding: "10px 14px" }}
        />
        <select
          value={achievementFilter}
          onChange={(e) => setAchievementFilter(e.target.value)}
          className="cca-input"
          style={{ flex: "1 1 200px", minHeight: 44, padding: "10px 14px" }}
        >
          <option value="all">Všechny tajné achievementy</option>
          {pool.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.title}
            </option>
          ))}
        </select>
      </div>

      {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {draws?.map((d) => (
          <div
            key={d.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              flexWrap: "wrap",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                flexShrink: 0,
                background: "var(--surface-card-sunken)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ font: "700 12px/1 var(--font-body)", color: "var(--text-body)" }}>
                {initials(d.player)}
              </span>
            </div>
            <span style={{ flex: "0 0 140px", font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>
              {d.player}
            </span>
            <span style={{ flex: "1 1 200px", minWidth: 160, font: "var(--text-body-sm)", color: "var(--text-body)" }}>
              {d.secretTitle}
            </span>
            <span style={{ flexShrink: 0, font: "var(--text-caption)", color: "var(--text-disabled)" }}>
              {new Date(d.drawnAt).toLocaleString("cs-CZ")}
            </span>
            <span
              style={{
                flexShrink: 0,
                padding: "4px 10px",
                borderRadius: "var(--radius-pill)",
                background: "var(--status-approved-bg)",
                border: "1px solid var(--status-approved-border)",
                color: "var(--status-approved-fg)",
                font: "var(--text-label-caps)",
                letterSpacing: "var(--tracking-caps)",
              }}
            >
              práh {d.threshold}
            </span>
          </div>
        ))}
        {draws && draws.length === 0 && (
          <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)" }}>
            Žádné výsledky pro tento filtr.
          </div>
        )}
      </div>
    </>
  );
}
