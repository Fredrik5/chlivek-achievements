"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge, CategoryHeader, ProgressBar, StatusPill } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";

type Status = "undone" | "pending" | "approved";

interface AchievementItem {
  id: string;
  title: string;
  description: string;
  points: number;
  categoryName: string;
  status: Status;
  iconPath: string | null;
}

interface AchievementsResponse {
  totalPoints: number;
  nextMilestone: number;
  achievements: AchievementItem[];
}

function statusToPillStatus(status: Status): "locked" | "pending" | "approved" {
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  return "locked";
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<AchievementsResponse>("/api/achievements")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }, []);

  const remaining = data ? Math.max(0, data.nextMilestone - data.totalPoints) : 0;

  const groups = data
    ? data.achievements.reduce<Map<string, AchievementItem[]>>((map, a) => {
        const list = map.get(a.categoryName) ?? [];
        list.push(a);
        map.set(a.categoryName, list);
        return map;
      }, new Map())
    : new Map<string, AchievementItem[]>();

  return (
    <AppShell title="Můj dashboard" activeTab="dashboard">
      <div
        style={{
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}

        {data && (
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
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span
                  style={{
                    font: "var(--text-label-caps)",
                    letterSpacing: "var(--tracking-caps)",
                    color: "var(--text-muted)",
                  }}
                >
                  Moje body
                </span>
                <span style={{ font: "400 40px/1 var(--font-display)", color: "var(--accent-gold)" }}>
                  {data.totalPoints}
                </span>
              </div>
              <ProgressBar
                value={data.totalPoints}
                max={data.nextMilestone}
                label="Do další stovky"
                sublabel={`${data.totalPoints} / ${data.nextMilestone} b. · ještě ${remaining} b. a odemkneš tajný achievement`}
              />
            </div>

            {Array.from(groups.entries()).map(([categoryName, items]) => (
              <div key={categoryName}>
                <CategoryHeader title={categoryName} count={items.length} />
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {items.map((a) => (
                    <AchievementCard
                      key={a.id}
                      item={a}
                      onClick={() => router.push(`/achievement/${a.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div>
              <CategoryHeader title="Legendary" count={1} />
              <SecretTeaserCard onClick={() => router.push("/secret")} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function AchievementCard({ item, onClick }: { item: AchievementItem; onClick: () => void }) {
  const isApproved = item.status === "approved";
  const isPending = item.status === "pending";

  const borderStyle = isApproved
    ? "1px solid var(--status-approved-border)"
    : isPending
      ? "1px solid var(--status-pending-border)"
      : "1px solid var(--border-subtle)";
  const shadowStyle = isApproved
    ? "var(--status-approved-glow), var(--shadow-card)"
    : isPending
      ? "var(--status-pending-glow), var(--shadow-card)"
      : "var(--shadow-card)";

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-4)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-card)",
        border: borderStyle,
        boxShadow: shadowStyle,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-md)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: isApproved
            ? "radial-gradient(circle at 30% 25%, var(--c-bordeaux-500), var(--c-bordeaux-800))"
            : "var(--surface-card-sunken)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <img
          src={item.iconPath ?? "/logo/logo_white_transparent.png"}
          alt=""
          style={
            item.iconPath
              ? { width: "100%", height: "100%", objectFit: "cover" }
              : { width: "62%", height: "62%", objectFit: "contain", opacity: 0.6 }
          }
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>
            {item.title}
          </span>
          <Badge points={item.points} size="sm" state={isApproved ? "approved" : "default"} />
        </div>
        <div style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
          {item.description}
        </div>
        <div style={{ marginTop: "var(--space-2)" }}>
          <StatusPill status={statusToPillStatus(item.status)} compact />
        </div>
      </div>
    </button>
  );
}

function SecretTeaserCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-4)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-card)",
        border: "1px dashed var(--border-default)",
        opacity: 0.85,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-md)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface-card-sunken)",
          border: "1px dashed var(--border-default)",
        }}
      >
        <span style={{ font: "400 22px/1 var(--font-display)", color: "var(--text-muted)" }}>?</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>
          ??? Tajný achievement
        </span>
        <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
          Odhalí se, až dosáhneš další stovky bodů. Klepnutím zobrazíš detail losování.
        </span>
      </div>
    </button>
  );
}
