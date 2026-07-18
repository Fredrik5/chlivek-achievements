"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, IconButton, StatusPill } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";
import { resizeImageFile } from "@/lib/imageResize";
import { withMinDelay } from "@/lib/withMinDelay";

const PHOTO_MAX_DIMENSION = 1600;
const PHOTO_JPEG_QUALITY = 0.82;

type Status = "undone" | "pending" | "approved";

interface DetailResponse {
  achievement: {
    id: string;
    title: string;
    description: string;
    points: number;
    categoryName: string;
    iconPath: string | null;
    requiresApproval: boolean;
  };
  status: Status;
  submission: { id: string; note: string | null; photoPath: string | null; reviewedAt: string | null } | null;
}

export default function AchievementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<DetailResponse>(`/api/achievements/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }

  useEffect(load, [id]);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    setPhotoProcessing(true);
    try {
      const resized = await resizeImageFile(file, {
        maxDimension: PHOTO_MAX_DIMENSION,
        quality: PHOTO_JPEG_QUALITY,
      });
      setPhotoFile(resized);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(resized);
    } catch {
      setPhotoError("Tuhle fotku se nepodařilo zpracovat (nepodporovaný formát). Zkus prosím jiný soubor.");
    } finally {
      setPhotoProcessing(false);
    }
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoError("");
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData();
      if (note.trim()) form.set("note", note.trim());
      if (photoFile) form.set("photo", photoFile);
      await withMinDelay(
        apiFetch(`/api/achievements/${id}/submit`, { method: "POST", body: form }),
        photoFile ? 1000 : 600,
      );
      setNote("");
      clearPhoto();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest() {
    if (!data?.submission) return;
    setSubmitting(true);
    setError("");
    try {
      await withMinDelay(apiFetch(`/api/submissions/${data.submission.id}/cancel`, { method: "POST" }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeCompleted() {
    if (!data?.submission) return;
    if (!window.confirm("Opravdu zrušit splnění? Body se odečtou a achievement půjde splnit znovu.")) return;
    setSubmitting(true);
    setError("");
    try {
      await withMinDelay(apiFetch(`/api/submissions/${data.submission.id}/cancel`, { method: "POST" }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-app-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            background: "linear-gradient(180deg, var(--c-bordeaux-800), var(--c-bordeaux-900))",
            borderBottom: "1px solid var(--border-default)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            flexShrink: 0,
          }}
        >
          <IconButton label="Zpět na dashboard" onClick={() => router.back()}>
            ←
          </IconButton>
          <span style={{ font: "var(--text-display-md)", color: "var(--text-heading)", flex: 1 }}>
            Detail achievementu
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: "var(--surface-app-bg-gradient)" }}>
          {error && (
            <div style={{ padding: "var(--space-4)", color: "var(--status-pending-fg)" }}>{error}</div>
          )}

          {data && (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-4)",
                  padding: "var(--space-8) var(--space-5) var(--space-5)",
                }}
              >
                <div
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    background:
                      data.status === "approved"
                        ? "radial-gradient(circle at 35% 25%, var(--c-bordeaux-500), var(--c-bordeaux-800))"
                        : "var(--surface-card-sunken)",
                    border: "1px solid var(--border-subtle)",
                    boxShadow:
                      data.status === "approved" ? "var(--status-approved-glow), var(--shadow-card)" : "var(--shadow-card)",
                  }}
                >
                  <img
                    src={data.achievement.iconPath ?? "/logo/logo_white_transparent.png"}
                    alt=""
                    style={
                      data.achievement.iconPath
                        ? { width: "100%", height: "100%", objectFit: "cover" }
                        : { width: "58%", height: "58%", objectFit: "contain", opacity: 0.7 }
                    }
                  />
                </div>

                <span
                  style={{
                    font: "700 26px/1.25 var(--font-body)",
                    color: "var(--text-heading)",
                    textAlign: "center",
                  }}
                >
                  {data.achievement.title}
                </span>

                <Badge
                  points={data.achievement.points}
                  size="lg"
                  state={data.status === "approved" ? "approved" : "default"}
                />

                <StatusPill
                  status={data.status === "approved" ? "approved" : data.status === "pending" ? "pending" : "locked"}
                />
              </div>

              <div
                style={{
                  padding: "0 var(--space-4) var(--space-6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                }}
              >
                <div
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-card)",
                    padding: "var(--space-4)",
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
                    Zadání výzvy
                  </span>
                  <span style={{ font: "var(--text-body-md)", color: "var(--text-body)" }}>
                    {data.achievement.description}
                  </span>
                  <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>
                    {data.achievement.categoryName}
                  </span>
                </div>

                {data.status === "undone" && (
                  <div
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-lg)",
                      boxShadow: "var(--shadow-card)",
                      padding: "var(--space-4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-3)",
                    }}
                  >
                    <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>
                      Splnil jsi to?
                    </span>

                    {photoPreview ? (
                      <div
                        style={{
                          position: "relative",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          border: "1px solid var(--border-default)",
                        }}
                      >
                        <img
                          src={photoPreview}
                          alt="Nahraná fotka"
                          style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
                        />
                        <button
                          onClick={clearPhoto}
                          aria-label="Odebrat fotku"
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "rgba(18,10,7,0.75)",
                            border: "1px solid var(--border-default)",
                            color: "var(--text-heading)",
                            font: "700 14px/1 var(--font-body)",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "var(--space-2)",
                          border: "1px dashed var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          padding: "var(--space-4)",
                          color: "var(--text-muted)",
                          font: "var(--text-body-sm)",
                          cursor: photoProcessing ? "default" : "pointer",
                          background: "var(--surface-card-sunken)",
                        }}
                      >
                        {photoProcessing ? (
                          <>
                            <span className="cca-spinner" aria-hidden="true" />
                            <span>Zpracovávám fotku…</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 18 }}>📷</span>
                            <span>Přidat fotku jako důkaz (volitelné)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onPhotoChange}
                          disabled={photoProcessing}
                          style={{ display: "none" }}
                        />
                      </label>
                    )}

                    {photoError && (
                      <span style={{ font: "var(--text-body-sm)", color: "var(--status-pending-fg)" }}>
                        {photoError}
                      </span>
                    )}

                    <textarea
                      className="cca-input"
                      placeholder="Poznámka (volitelné)"
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{ resize: "vertical", padding: "10px 12px", fontFamily: "var(--font-body)" }}
                    />

                    <Button
                      variant="gold"
                      size="lg"
                      fullWidth
                      disabled={photoProcessing}
                      loading={submitting}
                      onClick={submit}
                    >
                      {submitting
                        ? photoFile
                          ? "Nahrávám fotku…"
                          : "Odesílám…"
                        : data.achievement.requiresApproval
                          ? "Odeslat ke schválení"
                          : "Označit jako splněné"}
                    </Button>
                  </div>
                )}

                {data.status === "pending" && (
                  <>
                    <div
                      style={{
                        background: "var(--status-pending-bg)",
                        border: "1px solid var(--status-pending-border)",
                        borderRadius: "var(--radius-lg)",
                        padding: "var(--space-4)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                      }}
                    >
                      <span style={{ font: "var(--text-heading-sm)", color: "var(--status-pending-fg)" }}>
                        Čeká se na schválení
                      </span>
                      <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
                        Žádost čeká na potvrzení od admina/oficíra guildy.
                      </span>
                      {data.submission?.note && (
                        <div
                          style={{
                            marginTop: "var(--space-2)",
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-card-sunken)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <span
                            style={{
                              font: "var(--text-label-caps)",
                              letterSpacing: "var(--tracking-caps)",
                              color: "var(--text-muted)",
                              display: "block",
                              marginBottom: 4,
                            }}
                          >
                            Tvoje poznámka
                          </span>
                          <span style={{ font: "var(--text-body-sm)", color: "var(--text-body)" }}>
                            {data.submission.note}
                          </span>
                        </div>
                      )}
                      {data.submission?.photoPath && (
                        <img
                          src={data.submission.photoPath}
                          alt="Nahraná fotka"
                          style={{
                            width: "100%",
                            maxHeight: 200,
                            objectFit: "cover",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                            marginTop: "var(--space-2)",
                          }}
                        />
                      )}
                    </div>
                    <Button variant="ghost" size="md" fullWidth loading={submitting} onClick={cancelRequest}>
                      Zrušit žádost
                    </Button>
                  </>
                )}

                {data.status === "approved" && (
                  <div
                    style={{
                      background: "var(--status-approved-bg)",
                      border: "1px solid var(--status-approved-border)",
                      borderRadius: "var(--radius-lg)",
                      padding: "var(--space-4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                      boxShadow: "var(--status-approved-glow)",
                    }}
                  >
                    <span style={{ font: "var(--text-heading-sm)", color: "var(--accent-gold)" }}>
                      {data.achievement.requiresApproval ? "Schváleno officerem" : "Splněno"}
                    </span>
                    {data.submission?.reviewedAt && (
                      <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
                        Potvrzeno{" "}
                        {new Date(data.submission.reviewedAt).toLocaleString("cs-CZ", {
                          day: "numeric",
                          month: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {data.submission?.note && (
                      <div
                        style={{
                          marginTop: "var(--space-2)",
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-md)",
                          background: "var(--surface-card-sunken)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <span
                          style={{
                            font: "var(--text-label-caps)",
                            letterSpacing: "var(--tracking-caps)",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Tvoje poznámka
                        </span>
                        <span style={{ font: "var(--text-body-sm)", color: "var(--text-body)" }}>
                          {data.submission.note}
                        </span>
                      </div>
                    )}
                    {data.submission?.photoPath && (
                      <img
                        src={data.submission.photoPath}
                        alt="Nahraná fotka"
                        style={{
                          width: "100%",
                          maxHeight: 220,
                          objectFit: "cover",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-default)",
                          marginTop: "var(--space-2)",
                        }}
                      />
                    )}
                  </div>
                )}

                {data.status === "approved" && (
                  <Button variant="ghost" size="md" fullWidth loading={submitting} onClick={removeCompleted}>
                    Zrušit splnění
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
