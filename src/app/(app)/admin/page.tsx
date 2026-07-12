"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventTab } from "@/components/admin/EventTab";
import { AchievementsTab } from "@/components/admin/AchievementsTab";
import { QueueTab } from "@/components/admin/QueueTab";
import { SecretOverviewTab } from "@/components/admin/SecretOverviewTab";
import { PlayersTab } from "@/components/admin/PlayersTab";

type SectionKey = "event" | "achievements" | "queue" | "secretOverview" | "players";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "event", label: "Event" },
  { key: "achievements", label: "Achievementy" },
  { key: "queue", label: "Fronta" },
  { key: "secretOverview", label: "Tajné losování" },
  { key: "players", label: "Hráči" },
];

export default function AdminPage() {
  const [section, setSection] = useState<SectionKey>("event");

  return (
    <AppShell title="Admin panel" activeTab="admin" maxWidth={980}>
      <div
        style={{
          padding: "var(--space-4) var(--space-4) var(--space-10)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: 2 }}>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              style={{
                flexShrink: 0,
                border: section === s.key ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: "var(--radius-pill)",
                font: "var(--text-label)",
                background: section === s.key ? "var(--surface-primary)" : "var(--surface-card-sunken)",
                color: section === s.key ? "var(--text-on-primary)" : "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section === "event" && <EventTab />}
        {section === "achievements" && <AchievementsTab />}
        {section === "queue" && <QueueTab />}
        {section === "secretOverview" && <SecretOverviewTab />}
        {section === "players" && <PlayersTab />}
      </div>
    </AppShell>
  );
}
