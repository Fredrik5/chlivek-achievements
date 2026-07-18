"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoryHeader, ProgressBar } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";

interface PlayerRow {
  id: string;
  name: string;
  points: number;
  approvedCount: number;
  pendingCount: number;
  isMe: boolean;
  rank: number;
}

interface LeaderboardResponse {
  visible: boolean;
  filter?: "all" | "today";
  eventName?: string;
  players?: PlayerRow[];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function nextThresholdOf(total: number) {
  return Math.max(100, Math.ceil((total + 1) / 100) * 100);
}

const MEDAL_COLORS = ["var(--accent-gold)", "var(--c-gray-400)", "var(--c-amber-600)"];
const MEDAL_SIZES = [88, 72, 72];

export default function LeaderboardPage() {
  const [filter, setFilter] = useState<"all" | "today">("all");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<LeaderboardResponse>(`/api/leaderboard?filter=${filter}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }, [filter]);

  const players = data?.players ?? [];
  const podium = players.slice(0, 3);
  const rest = players.slice(3);
  const me = players.find((p) => p.isMe);

  return (
    <AppShell title="Leaderboard" activeTab="leaderboard">
      {error && (
        <div style={{ padding: "var(--space-4)", color: "var(--status-pending-fg)" }}>{error}</div>
      )}

      {data && !data.visible && (
        <div
          style={{
            margin: "var(--space-4)",
            padding: "var(--space-6)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          Žebříček je momentálně skrytý — napětí se stupňuje!
        </div>
      )}

      {data && data.visible && (
        <>
          <div
            style={{
              padding: "var(--space-4) var(--space-4) 0",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ font: "var(--text-heading-md)", color: "var(--text-heading)" }}>
                {data.eventName}
              </span>
              <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
                {players.length} hráčů na srazu
              </span>
            </div>

            <div
              style={{
                display: "flex",
                background: "var(--surface-card-sunken)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-pill)",
                padding: 3,
              }}
            >
              {(["all", "today"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1,
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 0",
                    borderRadius: "var(--radius-pill)",
                    font: "var(--text-label)",
                    background: filter === f ? "var(--surface-primary)" : "transparent",
                    color: filter === f ? "var(--text-on-primary)" : "var(--text-muted)",
                    boxShadow: filter === f ? "var(--shadow-raised)" : "none",
                  }}
                >
                  {f === "all" ? "Celkově" : "Dnes"}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "var(--space-3)",
              padding: "var(--space-5) var(--space-4) var(--space-4)",
            }}
          >
            {podium.map((p, i) => (
              <div
                key={p.id}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  order: i === 0 ? 2 : i === 1 ? 1 : 3,
                }}
              >
                <div style={{ position: "relative", width: MEDAL_SIZES[i], height: MEDAL_SIZES[i] }}>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle at 32% 28%, var(--c-bordeaux-500), var(--c-bordeaux-800))",
                      border: `3px solid ${MEDAL_COLORS[i]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ font: "700 20px/1 var(--font-body)", color: "var(--text-heading)" }}>
                      {initials(p.name)}
                    </span>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: -6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: MEDAL_COLORS[i],
                      color: "var(--c-brown-950)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "700 13px/1 var(--font-body)",
                      border: "2px solid var(--c-brown-950)",
                    }}
                  >
                    {p.rank}
                  </div>
                </div>
                <span
                  style={{
                    font: "400 17px/1.1 var(--font-display)",
                    color: MEDAL_COLORS[i],
                    textAlign: "center",
                    maxWidth: 92,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </span>
                <span style={{ font: "400 20px/1 var(--font-display)", color: "var(--text-heading)" }}>
                  {p.points}
                </span>
              </div>
            ))}
          </div>

          <div style={{ padding: "0 var(--space-4) var(--space-4)" }}>
            <CategoryHeader title="Kompletní pořadí" count={players.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
              {rest.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-lg)",
                    background: p.isMe ? "var(--status-approved-bg)" : "var(--surface-card)",
                    border: p.isMe ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
                    boxShadow: p.isMe ? "var(--status-approved-glow)" : "var(--shadow-card)",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      flexShrink: 0,
                      textAlign: "center",
                      font: "700 14px/1 var(--font-body)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {p.rank}
                  </span>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: "var(--surface-card-sunken)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ font: "700 14px/1 var(--font-body)", color: "var(--text-body)" }}>
                      {initials(p.name)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        font: "var(--text-heading-sm)",
                        color: p.isMe ? "var(--accent-gold)" : "var(--text-heading)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          font: "var(--text-caption)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--accent-gold)",
                            display: "inline-block",
                          }}
                        />
                        {p.approvedCount}
                      </span>
                      {p.pendingCount > 0 && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            font: "var(--text-caption)",
                            color: "var(--status-pending-fg)",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "var(--status-pending-fg)",
                              display: "inline-block",
                            }}
                          />
                          {p.pendingCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      font: "400 22px/1 var(--font-display)",
                      color: p.isMe ? "var(--accent-gold)" : "var(--text-heading)",
                      flexShrink: 0,
                    }}
                  >
                    {p.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {me && (
            <div
              style={{
                flexShrink: 0,
                padding: "var(--space-3) var(--space-4)",
                background: "var(--c-brown-900)",
                borderTop: "1px solid var(--border-strong)",
                boxShadow: "0 -6px 20px rgba(0,0,0,0.5), var(--status-approved-glow)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span
                  style={{
                    width: 24,
                    flexShrink: 0,
                    textAlign: "center",
                    font: "700 14px/1 var(--font-body)",
                    color: "var(--accent-gold)",
                  }}
                >
                  {me.rank}
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: "radial-gradient(circle at 32% 28%, var(--c-bordeaux-500), var(--c-bordeaux-800))",
                    border: "1px solid var(--border-strong)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ font: "700 13px/1 var(--font-body)", color: "var(--text-heading)" }}>
                    {initials(me.name)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>
                    {me.name}{" "}
                    <span style={{ color: "var(--accent-gold)", font: "var(--text-label-caps)" }}>TY</span>
                  </span>
                </div>
                <span style={{ font: "400 22px/1 var(--font-display)", color: "var(--accent-gold)", flexShrink: 0 }}>
                  {me.points}
                </span>
              </div>
              {filter === "all" && (
                <ProgressBar
                  value={me.points}
                  max={nextThresholdOf(me.points)}
                  label="Do další stovky"
                  sublabel={`${me.points} / ${nextThresholdOf(me.points)} b. · ještě ${Math.max(0, nextThresholdOf(me.points) - me.points)} b. do tajného achievementu`}
                />
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
