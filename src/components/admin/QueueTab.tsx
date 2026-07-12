"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";
import { Modal, ModalField } from "./Modal";

interface QueueItem {
  id: string;
  player: string;
  achievementTitle: string;
  achievementIconPath: string | null;
  points: number;
  isSecret: boolean;
  note: string | null;
  hasPhoto: boolean;
  submittedAt: string;
}

const PLACEHOLDER_ICON = "/logo/logo_white_transparent.png";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function QueueTab() {
  const [filter, setFilter] = useState<"all" | "secret">("all");
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [rejectTarget, setRejectTarget] = useState<QueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function load() {
    apiFetch<{ queue: QueueItem[] }>(`/api/admin/queue?filter=${filter}`)
      .then((r) => {
        setQueue(r.queue);
        setSelected(new Set());
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }

  useEffect(load, [filter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function approve(id: string) {
    setError("");
    try {
      await apiFetch(`/api/admin/submissions/${id}/approve`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  async function bulkApprove() {
    setError("");
    try {
      await apiFetch("/api/admin/submissions/bulk-approve", {
        method: "POST",
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setError("");
    try {
      await apiFetch(`/api/admin/submissions/${rejectTarget.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectTarget(null);
      setRejectReason("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            background: "var(--surface-card-sunken)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-pill)",
            padding: 3,
          }}
        >
          {(["all", "secret"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "8px 16px",
                borderRadius: "var(--radius-pill)",
                font: "var(--text-label)",
                background: filter === f ? "var(--surface-primary)" : "transparent",
                color: filter === f ? "var(--text-on-primary)" : "var(--text-muted)",
              }}
            >
              {f === "all" ? "Vše" : "Tajné"}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
              Vybráno: {selected.size}
            </span>
            <Button variant="gold" size="sm" onClick={bulkApprove}>
              Schválit vybrané
            </Button>
          </div>
        )}
      </div>

      {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {queue?.map((q) => (
          <div
            key={q.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-3)",
              flexWrap: "wrap",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(q.id)}
              onChange={() => toggleSelect(q.id)}
              aria-label="Vybrat žádost"
              style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--accent-gold)", flexShrink: 0, cursor: "pointer" }}
            />
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
              <span style={{ font: "700 13px/1 var(--font-body)", color: "var(--text-body)" }}>
                {initials(q.player)}
              </span>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-sm)",
                flexShrink: 0,
                background: "var(--surface-card-sunken)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={q.achievementIconPath ?? PLACEHOLDER_ICON}
                alt=""
                style={{
                  width: q.achievementIconPath ? "100%" : "55%",
                  height: q.achievementIconPath ? "100%" : "55%",
                  objectFit: "cover",
                  opacity: q.achievementIconPath ? 1 : 0.5,
                }}
              />
            </div>
            <div style={{ flex: "1 1 220px", minWidth: 200, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>{q.player}</span>
                {q.isSecret && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--radius-pill)",
                      background: "rgba(107,38,130,0.22)",
                      border: "1px solid rgba(147,72,178,0.5)",
                      color: "#c48ee0",
                      font: "var(--text-label-caps)",
                      letterSpacing: "var(--tracking-caps)",
                    }}
                  >
                    TAJNÝ
                  </span>
                )}
              </div>
              <span style={{ font: "var(--text-body-sm)", color: "var(--text-body)" }}>{q.achievementTitle}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>
                  {new Date(q.submittedAt).toLocaleString("cs-CZ")}
                </span>
                {q.hasPhoto && <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>📷 fotka přiložena</span>}
              </div>
              {q.note && (
                <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)", fontStyle: "italic" }}>
                  „{q.note}“
                </span>
              )}
            </div>
            <Badge points={q.points} size="sm" state="default" />
            <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
              <Button variant="gold" size="sm" onClick={() => approve(q.id)}>
                Schválit
              </Button>
              <Button variant="danger" size="sm" onClick={() => setRejectTarget(q)}>
                Zamítnout
              </Button>
            </div>
          </div>
        ))}
        {queue && queue.length === 0 && (
          <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)" }}>
            Fronta je prázdná — vše vyřízeno.
          </div>
        )}
      </div>

      {rejectTarget && (
        <Modal onClose={() => setRejectTarget(null)} maxWidth={420}>
          <span style={{ font: "var(--text-heading-md)", color: "var(--text-heading)" }}>
            Zamítnout žádost
          </span>
          <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
            {rejectTarget.player} — {rejectTarget.achievementTitle}
          </span>
          <ModalField label="Důvod pro hráče (volitelné)">
            <textarea
              className="cca-input"
              rows={3}
              placeholder="Např. bez fotky to neuznáme…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ resize: "vertical", padding: "10px 12px", fontFamily: "var(--font-body)" }}
            />
          </ModalField>
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <Button variant="ghost" size="md" fullWidth onClick={() => setRejectTarget(null)}>
              Zrušit
            </Button>
            <Button variant="danger" size="md" fullWidth onClick={confirmReject}>
              Zamítnout
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
