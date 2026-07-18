"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, ProgressBar } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";

type SlotState = "locked" | "available" | "revealed";

interface Slot {
  threshold: number;
  state: SlotState;
  achievement?: { title: string; description: string; points: number; iconPath: string | null };
}

interface SecretResponse {
  points: number;
  nextThreshold: number;
  hasAvailableNow: boolean;
  slots: Slot[];
}

interface RevealResult {
  threshold: number;
  achievement: { title: string; description: string; points: number; iconPath: string | null };
}

const VIOLET_BORDER = "rgba(147,72,178,0.4)";
const VIOLET_WASH = "rgba(107,38,130,0.16)";
const VIOLET_GLOW =
  "0 0 0 1px rgba(200,148,43,0.5), 0 0 22px rgba(147,72,178,0.35), 0 0 14px rgba(200,148,43,0.25)";

export default function SecretPage() {
  const [data, setData] = useState<SecretResponse | null>(null);
  const [error, setError] = useState("");
  const [drawingThreshold, setDrawingThreshold] = useState<number | null>(null);
  const [revealModal, setRevealModal] = useState<RevealResult | null>(null);

  function load() {
    apiFetch<SecretResponse>("/api/secret")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }

  useEffect(load, []);

  async function draw(threshold: number) {
    if (drawingThreshold != null) return;
    setDrawingThreshold(threshold);
    setError("");
    try {
      const result = await apiFetch<RevealResult>("/api/secret/draw", {
        method: "POST",
        body: JSON.stringify({ threshold }),
      });
      await new Promise((resolve) => setTimeout(resolve, 1100));
      setRevealModal(result);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setDrawingThreshold(null);
    }
  }

  const nextLocked = data?.slots.find((s) => s.state === "locked");

  return (
    <AppShell title="Secret achievements" activeTab="secret">
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}

        {data && (
          <>
            <div
              style={{
                background: "var(--surface-card)",
                border: `1px solid ${VIOLET_BORDER}`,
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-card)",
                padding: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              <span
                style={{
                  font: "var(--text-label-caps)",
                  letterSpacing: "var(--tracking-caps)",
                  color: "var(--text-muted)",
                }}
              >
                Skryté výzvy srazu
              </span>
              <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
                Za každou nasbíranou stovku bodů si můžeš vylosovat jeden tajný achievement ze skryté
                sady. Dokud ho nevylosuješ, nevíš, co v něm je.
              </span>

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 4 }}>
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
                  {data.points}
                </span>
              </div>

              {data.hasAvailableNow ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: `linear-gradient(160deg, ${VIOLET_WASH}, var(--surface-card-sunken))`,
                    border: `1px solid ${VIOLET_BORDER}`,
                    boxShadow: "0 0 0 1px rgba(200,148,43,0.5), 0 0 18px rgba(147,72,178,0.3)",
                  }}
                >
                  <span style={{ font: "var(--text-body-sm)", color: "var(--text-heading)" }}>
                    Máš k dispozici losování tajného achievementu níže.
                  </span>
                </div>
              ) : (
                nextLocked && (
                  <ProgressBar
                    value={Math.min(data.points, nextLocked.threshold)}
                    max={nextLocked.threshold}
                    label="Do dalšího tajného slotu"
                    sublabel={`${data.points} / ${nextLocked.threshold} b. · ještě ${Math.max(0, nextLocked.threshold - data.points)} b.`}
                  />
                )
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {data.slots.map((slot) => (
                <SlotCard
                  key={slot.threshold}
                  slot={slot}
                  points={data.points}
                  isDrawing={drawingThreshold === slot.threshold}
                  onDraw={() => draw(slot.threshold)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {revealModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-6)",
            background: "var(--surface-overlay)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--surface-card)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--status-approved-glow), 0 20px 50px rgba(0,0,0,0.6)",
              padding: "var(--space-6) var(--space-5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-3)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                font: "var(--text-label-caps)",
                letterSpacing: "var(--tracking-caps)",
                color: "var(--accent-gold)",
              }}
            >
              Nový tajný achievement!
            </span>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "var(--radius-lg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background: "radial-gradient(circle at 30% 25%, var(--c-bordeaux-500), var(--c-bordeaux-800))",
                border: "1px solid var(--border-strong)",
                boxShadow: "var(--status-approved-glow)",
              }}
            >
              <img
                src={revealModal.achievement.iconPath ?? "/logo/logo_white_transparent.png"}
                alt=""
                style={
                  revealModal.achievement.iconPath
                    ? { width: "100%", height: "100%", objectFit: "cover" }
                    : { width: "58%", height: "58%", objectFit: "contain", opacity: 0.85 }
                }
              />
            </div>
            <span style={{ font: "400 28px/1.2 var(--font-display)", color: "var(--text-heading)" }}>
              {revealModal.achievement.title}
            </span>
            <span style={{ font: "var(--text-body-md)", color: "var(--text-body)" }}>
              {revealModal.achievement.description}
            </span>
            <Badge points={revealModal.achievement.points} size="lg" state="approved" />
            <div style={{ width: "100%", marginTop: "var(--space-2)" }}>
              <Button variant="gold" size="lg" fullWidth onClick={() => setRevealModal(null)}>
                Super!
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SlotCard({
  slot,
  points,
  isDrawing,
  onDraw,
}: {
  slot: Slot;
  points: number;
  isDrawing: boolean;
  onDraw: () => void;
}) {
  const isLocked = slot.state === "locked";
  const isAvailable = slot.state === "available";
  const isRevealed = slot.state === "revealed";

  let cardBg = "var(--surface-card)";
  let cardBorder = "1px solid var(--border-subtle)";
  let cardShadow = "var(--shadow-card)";
  let titleColor = "var(--text-heading)";
  let title = "Tajný achievement";
  let subtext = `Odemkni při ${slot.threshold} bodech`;
  let badgePoints = slot.threshold;
  let badgeState: "default" | "approved" | "locked" = "locked";

  if (isAvailable) {
    cardBg = `linear-gradient(160deg, ${VIOLET_WASH}, var(--surface-card))`;
    cardBorder = "1px solid var(--border-strong)";
    cardShadow = `${VIOLET_GLOW}, var(--shadow-card)`;
    subtext = "Připraveno k losování";
  } else if (isLocked) {
    cardBg = `linear-gradient(165deg, ${VIOLET_WASH} 0%, transparent 55%), var(--surface-card)`;
    cardBorder = `1px solid ${VIOLET_BORDER}`;
    titleColor = "var(--text-muted)";
  } else if (isRevealed && slot.achievement) {
    title = slot.achievement.title;
    subtext = slot.achievement.description;
    badgePoints = slot.achievement.points;
    badgeState = "approved";
    cardBorder = "1px solid var(--status-approved-border)";
    cardShadow = "var(--status-approved-glow), var(--shadow-card)";
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-4)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "var(--radius-md)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: isRevealed
            ? "radial-gradient(circle at 30% 25%, var(--c-bordeaux-500), var(--c-bordeaux-800))"
            : "var(--surface-card-sunken)",
          border: isAvailable || isRevealed ? "1px solid var(--border-strong)" : `1px dashed ${VIOLET_BORDER}`,
        }}
      >
        {isLocked && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 18,
                height: 13,
                border: "3px solid var(--c-gray-500)",
                borderBottom: "none",
                borderRadius: "10px 10px 0 0",
                marginBottom: -2,
              }}
            />
            <div style={{ width: 26, height: 17, borderRadius: 3, background: "var(--c-gray-500)" }} />
          </div>
        )}
        {isAvailable && (
          <span
            style={{
              font: "400 26px/1 var(--font-display)",
              color: "var(--accent-gold)",
              display: "inline-block",
              animation: isDrawing ? "cca-spin 1.1s var(--ease-standard) infinite" : "none",
            }}
          >
            ?
          </span>
        )}
        {isRevealed && (
          <img
            src={slot.achievement?.iconPath ?? "/logo/logo_white_transparent.png"}
            alt=""
            style={
              slot.achievement?.iconPath
                ? { width: "100%", height: "100%", objectFit: "cover" }
                : { width: "62%", height: "62%", objectFit: "contain", opacity: 0.75 }
            }
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ font: "var(--text-heading-sm)", color: titleColor }}>{title}</span>
          <Badge points={badgePoints} size="sm" state={badgeState} />
        </div>
        <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>{subtext}</span>

        {isLocked && (
          <ProgressBar value={Math.min(points, slot.threshold)} max={slot.threshold} />
        )}

        {isAvailable && (
          <Button variant="gold" size="md" fullWidth disabled={isDrawing} onClick={onDraw}>
            {isDrawing ? "Losuje se…" : "Vylosovat tajný achievement"}
          </Button>
        )}

        {isRevealed && (
          <span
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: "var(--radius-pill)",
              background: "var(--status-approved-bg)",
              color: "var(--status-approved-fg)",
              border: "1px solid var(--status-approved-border)",
              font: "var(--text-label-caps)",
              letterSpacing: "var(--tracking-caps)",
              textTransform: "uppercase",
            }}
          >
            Odhaleno
          </span>
        )}
      </div>
    </div>
  );
}
