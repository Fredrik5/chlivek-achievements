"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";
import { Modal, ModalField } from "./Modal";

interface PlayerListItem {
  id: string;
  name: string;
  points: number;
}

interface PlayerDetail {
  player: { id: string; name: string; points: number };
  achievements: { submissionId: string; title: string; points: number }[];
  history: { label: string; when: string }[];
}

interface AchievementOption {
  id: string;
  title: string;
  points: number;
}

export function PlayersTab() {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [error, setError] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [options, setOptions] = useState<AchievementOption[]>([]);
  const [pickedId, setPickedId] = useState("");

  function loadPlayers() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    apiFetch<{ players: PlayerListItem[] }>(`/api/admin/players?${params.toString()}`)
      .then((r) => setPlayers(r.players))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }

  useEffect(loadPlayers, [search]);

  function loadDetail(id: string) {
    apiFetch<PlayerDetail>(`/api/admin/players/${id}`)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  async function openAddModal() {
    setPickedId("");
    setAddModalOpen(true);
    try {
      const [normal, secret] = await Promise.all([
        apiFetch<{ achievements: AchievementOption[] }>("/api/admin/achievements?secret=false"),
        apiFetch<{ achievements: AchievementOption[] }>("/api/admin/achievements?secret=true"),
      ]);
      setOptions([...normal.achievements, ...secret.achievements]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba načítání.");
    }
  }

  async function confirmAdd() {
    if (!selectedId || !pickedId) return;
    setError("");
    try {
      await apiFetch(`/api/admin/players/${selectedId}/achievements`, {
        method: "POST",
        body: JSON.stringify({ achievementId: pickedId }),
      });
      setAddModalOpen(false);
      loadDetail(selectedId);
      loadPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  async function removeAchievement(submissionId: string) {
    if (!selectedId) return;
    setError("");
    try {
      await apiFetch(`/api/admin/players/${selectedId}/achievements/${submissionId}`, {
        method: "DELETE",
      });
      loadDetail(selectedId);
      loadPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  return (
    <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 240px", minWidth: 220, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <input
          className="cca-input"
          placeholder="Hledat hráče…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minHeight: 44, padding: "10px 14px" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", maxHeight: 480, overflowY: "auto" }}>
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-2)",
                textAlign: "left",
                border: p.id === selectedId ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
                cursor: "pointer",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: p.id === selectedId ? "var(--surface-card-hover)" : "var(--surface-card)",
              }}
            >
              <span style={{ font: "var(--text-body-md)", color: p.id === selectedId ? "var(--accent-gold)" : "var(--text-heading)" }}>
                {p.name}
              </span>
              <span style={{ font: "400 18px/1 var(--font-display)", color: "var(--accent-gold)" }}>{p.points}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}

      {detail && detail.player.id === selectedId ? (
        <div
          style={{
            flex: "2 1 380px",
            minWidth: 280,
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
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-3)" }}>
            <span style={{ font: "var(--text-heading-lg)", color: "var(--text-heading)" }}>{detail.player.name}</span>
            <span style={{ font: "400 34px/1 var(--font-display)", color: "var(--accent-gold)" }}>
              {detail.player.points}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                font: "var(--text-label-caps)",
                letterSpacing: "var(--tracking-caps)",
                color: "var(--text-muted)",
              }}
            >
              Splněné achievementy
            </span>
            <Button variant="ghost" size="sm" onClick={openAddModal}>
              + Přidat achievement
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {detail.achievements.map((pa) => (
              <div
                key={pa.submissionId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-card-sunken)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ flex: 1, font: "var(--text-body-md)", color: "var(--text-body)" }}>{pa.title}</span>
                <Badge points={pa.points} size="sm" state="approved" />
                <button
                  onClick={() => removeAchievement(pa.submissionId)}
                  aria-label="Odebrat achievement"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1px solid var(--border-default)",
                    background: "transparent",
                    color: "var(--c-bordeaux-500)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {detail.achievements.length === 0 && (
              <span style={{ font: "var(--text-body-sm)", color: "var(--text-disabled)" }}>
                Zatím nic nesplnil/a.
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              paddingTop: "var(--space-2)",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                font: "var(--text-label-caps)",
                letterSpacing: "var(--tracking-caps)",
                color: "var(--text-muted)",
              }}
            >
              Historie ručních úprav
            </span>
            {detail.history.map((h, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "var(--text-body-sm)", color: "var(--text-body)" }}>{h.label}</span>
                <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>
                  {new Date(h.when).toLocaleString("cs-CZ")}
                </span>
              </div>
            ))}
            {detail.history.length === 0 && (
              <span style={{ font: "var(--text-body-sm)", color: "var(--text-disabled)" }}>
                Žádné ruční úpravy zatím nebyly provedeny.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: "2 1 380px",
            minWidth: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-8)",
            color: "var(--text-disabled)",
            font: "var(--text-body-sm)",
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          Vyber hráče vlevo pro zobrazení detailu.
        </div>
      )}

      {addModalOpen && (
        <Modal onClose={() => setAddModalOpen(false)}>
          <span style={{ font: "var(--text-heading-md)", color: "var(--text-heading)" }}>
            Přidat achievement
          </span>
          <ModalField label="Achievement">
            <select
              className="cca-input"
              value={pickedId}
              onChange={(e) => setPickedId(e.target.value)}
              style={{ minHeight: 44, padding: "10px 12px" }}
            >
              <option value="">— vyber —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} ({o.points} b.)
                </option>
              ))}
            </select>
          </ModalField>
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <Button variant="ghost" size="md" fullWidth onClick={() => setAddModalOpen(false)}>
              Zrušit
            </Button>
            <Button variant="gold" size="md" fullWidth disabled={!pickedId} onClick={confirmAdd}>
              Uložit
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
