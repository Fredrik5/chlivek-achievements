"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";
import { Modal, ModalField } from "./Modal";
import { Toggle } from "./Toggle";

interface Category {
  id: string;
  name: string;
  count: number;
}

interface AchievementRow {
  id: string;
  title: string;
  description: string;
  points: number;
  categoryId: string | null;
  categoryName: string | null;
  isSecret: boolean;
  requiresApproval: boolean;
  isActive: boolean;
  iconPath: string | null;
  completedCount: number;
}

const PLACEHOLDER_ICON = "/logo/logo_white_transparent.png";

interface AchievementFormState {
  id?: string;
  title: string;
  description: string;
  points: string;
  categoryId: string;
  requiresApproval: boolean;
  isSecret: boolean;
}

const NEW_CATEGORY_VALUE = "__new__";
const ICON_MAX_DIMENSION = 512;
const ICON_JPEG_QUALITY = 0.85;

// Phone camera photos routinely exceed the 2 MB server limit; downscale
// client-side so admins don't hit a silent rejection on upload.
async function resizeIconFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, ICON_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, ICON_JPEG_QUALITY));
  if (!blob) return file;
  return new File([blob], file.name, { type });
}

const EMPTY_FORM: AchievementFormState = {
  title: "",
  description: "",
  points: "10",
  categoryId: "",
  requiresApproval: true,
  isSecret: false,
};

export function AchievementsTab() {
  const [subTab, setSubTab] = useState<"normal" | "secret">("normal");
  const [categories, setCategories] = useState<Category[]>([]);
  const [normalAchievements, setNormalAchievements] = useState<AchievementRow[]>([]);
  const [secretAchievements, setSecretAchievements] = useState<AchievementRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState("");

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [form, setForm] = useState<AchievementFormState | null>(null);
  const [newCategoryInModal, setNewCategoryInModal] = useState("");

  // Icon upload is a separate endpoint from the JSON create/edit payload
  // (it needs the achievement id, which doesn't exist yet when creating),
  // so it's tracked as its own bit of modal state.
  const [currentIconPath, setCurrentIconPath] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [iconError, setIconError] = useState("");

  function loadCategories() {
    apiFetch<{ categories: Category[] }>("/api/admin/categories")
      .then((r) => setCategories(r.categories))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }

  function loadAchievements() {
    apiFetch<{ achievements: AchievementRow[] }>("/api/admin/achievements?secret=false")
      .then((r) => setNormalAchievements(r.achievements))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
    apiFetch<{ achievements: AchievementRow[] }>("/api/admin/achievements?secret=true")
      .then((r) => setSecretAchievements(r.achievements))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }

  useEffect(() => {
    loadCategories();
    loadAchievements();
  }, []);

  function openNew(isSecret: boolean) {
    setForm({ ...EMPTY_FORM, isSecret, requiresApproval: !isSecret, categoryId: categories[0]?.id ?? "" });
    setNewCategoryInModal("");
    setCurrentIconPath(null);
    setIconFile(null);
    setIconPreview("");
    setIconError("");
    setError("");
  }

  function openEdit(a: AchievementRow) {
    setForm({
      id: a.id,
      title: a.title,
      description: a.description,
      points: String(a.points),
      categoryId: a.categoryId ?? "",
      requiresApproval: a.requiresApproval,
      isSecret: a.isSecret,
    });
    setNewCategoryInModal("");
    setCurrentIconPath(a.iconPath);
    setIconFile(null);
    setIconPreview("");
    setIconError("");
    setError("");
  }

  async function onIconFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconError("");
    const resized = await resizeIconFile(file).catch(() => file);
    setIconFile(resized);
    const reader = new FileReader();
    reader.onload = () => setIconPreview(reader.result as string);
    reader.readAsDataURL(resized);
  }

  async function removeIcon() {
    if (!form) return;
    setIconError("");
    if (form.id && currentIconPath) {
      try {
        await apiFetch(`/api/admin/achievements/${form.id}/icon`, { method: "DELETE" });
        loadAchievements();
      } catch (err) {
        setIconError(err instanceof Error ? err.message : "Něco se pokazilo.");
        return;
      }
    }
    setCurrentIconPath(null);
    setIconFile(null);
    setIconPreview("");
  }

  async function saveForm() {
    if (!form) return;
    setError("");
    try {
      let categoryId = form.categoryId;
      if (!form.isSecret && categoryId === NEW_CATEGORY_VALUE) {
        if (!newCategoryInModal.trim()) {
          setError("Zadej název nové kategorie.");
          return;
        }
        const created = await apiFetch<{ category: Category }>("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify({ name: newCategoryInModal.trim() }),
        });
        categoryId = created.category.id;
      }

      const payload = {
        title: form.title,
        description: form.description,
        points: Number(form.points),
        categoryId: form.isSecret ? null : categoryId,
        requiresApproval: form.requiresApproval,
        isSecret: form.isSecret,
      };

      let achievementId = form.id;
      if (achievementId) {
        await apiFetch(`/api/admin/achievements/${achievementId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const created = await apiFetch<{ achievement: { id: string } }>("/api/admin/achievements", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        achievementId = created.achievement.id;
      }

      if (iconFile) {
        const iconForm = new FormData();
        iconForm.set("icon", iconFile);
        await apiFetch(`/api/admin/achievements/${achievementId}/icon`, {
          method: "POST",
          body: iconForm,
        });
      }

      setForm(null);
      loadCategories();
      loadAchievements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  async function toggleActive(a: AchievementRow) {
    setError("");
    try {
      await apiFetch(`/api/admin/achievements/${a.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      loadAchievements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  async function deleteAchievement(id: string) {
    setError("");
    try {
      await apiFetch(`/api/admin/achievements/${id}`, { method: "DELETE" });
      loadAchievements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    setError("");
    try {
      await apiFetch("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      setNewCategoryName("");
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  async function confirmRename(id: string) {
    if (!renameValue.trim()) return;
    setError("");
    try {
      await apiFetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      setRenamingId(null);
      loadCategories();
      loadAchievements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  async function deleteCategory(id: string) {
    setError("");
    try {
      await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    }
  }

  const filteredAchievements =
    categoryFilter === "all" ? normalAchievements : normalAchievements.filter((a) => a.categoryId === categoryFilter);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex",
            background: "var(--surface-card-sunken)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-pill)",
            padding: 3,
          }}
        >
          <button
            onClick={() => setSubTab("normal")}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
              borderRadius: "var(--radius-pill)",
              font: "var(--text-label)",
              background: subTab === "normal" ? "var(--surface-primary)" : "transparent",
              color: subTab === "normal" ? "var(--text-on-primary)" : "var(--text-muted)",
            }}
          >
            Běžné achievementy
          </button>
          <button
            onClick={() => setSubTab("secret")}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
              borderRadius: "var(--radius-pill)",
              font: "var(--text-label)",
              background: subTab === "secret" ? "var(--surface-primary)" : "transparent",
              color: subTab === "secret" ? "var(--text-on-primary)" : "var(--text-muted)",
            }}
          >
            Pool tajných
          </button>
        </div>
        <Button variant="gold" size="md" onClick={() => openNew(subTab === "secret")}>
          {subTab === "secret" ? "+ Přidat tajný" : "+ Přidat achievement"}
        </Button>
      </div>

      {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}

      {subTab === "normal" ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <CategoryChip label="Vše" active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} />
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                label={c.name}
                active={categoryFilter === c.id}
                onClick={() => setCategoryFilter(c.id)}
              />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {filteredAchievements.map((a) => (
              <div
                key={a.id}
                onClick={() => openEdit(a)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  flexWrap: "wrap",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  opacity: a.isActive ? 1 : 0.55,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    flexShrink: 0,
                    background: "var(--surface-card-sunken)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={a.iconPath ?? PLACEHOLDER_ICON}
                    alt=""
                    style={{ width: a.iconPath ? "100%" : "55%", height: a.iconPath ? "100%" : "55%", objectFit: "cover", opacity: a.iconPath ? 1 : 0.5, borderRadius: a.iconPath ? "var(--radius-md)" : 0 }}
                  />
                </div>
                <div style={{ flex: "1 1 200px", minWidth: 160, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>{a.title}</span>
                  <span
                    style={{
                      font: "var(--text-body-sm)",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.description}
                  </span>
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--surface-card-sunken)",
                    border: "1px solid var(--border-subtle)",
                    font: "var(--text-label-caps)",
                    letterSpacing: "var(--tracking-caps)",
                    color: "var(--text-muted)",
                  }}
                >
                  {a.categoryName}
                </span>
                {!a.requiresApproval && (
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
                    auto-schváleno
                  </span>
                )}
                <Badge points={a.points} size="sm" state="default" />
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 50 }}>
                  <span style={{ font: "700 16px/1.1 var(--font-body)", color: "var(--text-heading)" }}>
                    {a.completedCount}
                  </span>
                  <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>splnilo</span>
                </div>
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
                >
                  <Toggle size="sm" checked={a.isActive} onChange={() => toggleActive(a)} label="Aktivní/skryto" />
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                    Upravit
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>Kategorie</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
              {categories.map((c) =>
                renamingId === c.id ? (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      className="cca-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      style={{ width: 140, minHeight: 32, padding: "6px 10px", boxShadow: "none" }}
                    />
                    <button
                      onClick={() => confirmRename(c.id)}
                      aria-label="Potvrdit"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--status-approved-border)",
                        background: "var(--status-approved-bg)",
                        color: "var(--status-approved-fg)",
                        cursor: "pointer",
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      aria-label="Zrušit"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-default)",
                        background: "transparent",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      padding: "4px 4px 4px 12px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--surface-card-sunken)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ font: "var(--text-body-sm)", color: "var(--text-body)" }}>{c.name}</span>
                    <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)", margin: "0 4px" }}>
                      {c.count}
                    </span>
                    <button
                      onClick={() => {
                        setRenamingId(c.id);
                        setRenameValue(c.name);
                      }}
                      aria-label="Přejmenovat"
                      style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      disabled={c.count > 0}
                      title={c.count > 0 ? "Kategorie obsahuje achievementy" : "Smazat kategorii"}
                      aria-label="Smazat kategorii"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        border: "none",
                        background: "transparent",
                        color: c.count > 0 ? "var(--text-disabled)" : "var(--c-bordeaux-500)",
                        cursor: c.count > 0 ? "default" : "pointer",
                        opacity: c.count > 0 ? 0.5 : 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ),
              )}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
              <input
                className="cca-input"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Název nové kategorie"
                style={{ flex: 1, minWidth: 160, minHeight: 40, padding: "8px 12px", boxShadow: "none" }}
              />
              <Button variant="ghost" size="md" onClick={addCategory}>
                + Přidat kategorii
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
            Sada tajných achievementů, ze které se losuje po dosažení každé stovky bodů. Hráči obsah
            nevidí, dokud si ho nevylosují.
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {secretAchievements.map((s) => (
              <div
                key={s.id}
                onClick={() => openEdit(s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  flexWrap: "wrap",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-lg)",
                  background: "linear-gradient(160deg, rgba(107,38,130,0.14), var(--surface-card))",
                  border: "1px solid rgba(147,72,178,0.35)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    flexShrink: 0,
                    background: "var(--surface-card-sunken)",
                    border: "1px dashed rgba(147,72,178,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={s.iconPath ?? PLACEHOLDER_ICON}
                    alt=""
                    style={{ width: s.iconPath ? "100%" : "55%", height: s.iconPath ? "100%" : "55%", objectFit: "cover", opacity: s.iconPath ? 1 : 0.5 }}
                  />
                </div>
                <div style={{ flex: "1 1 220px", minWidth: 160, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>{s.title}</span>
                  <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>{s.description}</span>
                </div>
                {!s.requiresApproval ? (
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
                    auto-schváleno
                  </span>
                ) : (
                  <span
                    style={{
                      flexShrink: 0,
                      padding: "4px 10px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--status-pending-bg)",
                      border: "1px solid var(--status-pending-border)",
                      color: "var(--status-pending-fg)",
                      font: "var(--text-label-caps)",
                      letterSpacing: "var(--tracking-caps)",
                    }}
                  >
                    vyžaduje schválení
                  </span>
                )}
                <Badge points={s.points} size="sm" state="approved" />
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
                >
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                    Upravit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => deleteAchievement(s.id)}>
                    Smazat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {form && (
        <Modal onClose={() => setForm(null)}>
          <span style={{ font: "var(--text-heading-md)", color: "var(--text-heading)" }}>
            {form.id ? "Upravit achievement" : form.isSecret ? "Nový tajný achievement" : "Nový achievement"}
          </span>

          <ModalField label="Název">
            <input
              className="cca-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ minHeight: 40, padding: "10px 12px", boxShadow: "none" }}
            />
          </ModalField>

          <ModalField label="Popis">
            <textarea
              className="cca-input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ padding: "10px 12px", resize: "vertical", boxShadow: "none", fontFamily: "var(--font-body)" }}
            />
          </ModalField>

          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <div style={{ flex: 1 }}>
              <ModalField label="Body">
                <input
                  className="cca-input"
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                  style={{ minHeight: 40, padding: "10px 12px", boxShadow: "none" }}
                />
              </ModalField>
            </div>
            {!form.isSecret && (
              <div style={{ flex: 2 }}>
                <ModalField label="Kategorie">
                  <select
                    className="cca-input"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    style={{ minHeight: 40, padding: "10px 12px", boxShadow: "none" }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value={NEW_CATEGORY_VALUE}>+ Nová kategorie…</option>
                  </select>
                </ModalField>
              </div>
            )}
          </div>

          {!form.isSecret && form.categoryId === NEW_CATEGORY_VALUE && (
            <ModalField label="Název nové kategorie">
              <input
                className="cca-input"
                value={newCategoryInModal}
                onChange={(e) => setNewCategoryInModal(e.target.value)}
                placeholder="např. Guildovní duch"
                style={{ minHeight: 40, padding: "10px 12px", boxShadow: "none" }}
              />
            </ModalField>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={!form.requiresApproval}
              onChange={(e) => setForm({ ...form, requiresApproval: !e.target.checked })}
              style={{ width: 18, height: 18, accentColor: "var(--accent-gold)" }}
            />
            <span style={{ font: "var(--text-body-sm)", color: "var(--text-body)" }}>
              Automaticky schválit (bez čekání na officera)
            </span>
          </label>

          <ModalField label="Ikona">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--radius-md)",
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
                  src={iconPreview || currentIconPath || PLACEHOLDER_ICON}
                  alt=""
                  style={{
                    width: iconPreview || currentIconPath ? "100%" : "55%",
                    height: iconPreview || currentIconPath ? "100%" : "55%",
                    objectFit: "cover",
                    opacity: iconPreview || currentIconPath ? 1 : 0.5,
                  }}
                />
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  font: "var(--text-body-sm)",
                  color: "var(--text-muted)",
                }}
              >
                Nahrát ikonu
                <input type="file" accept="image/*" onChange={onIconFileChange} style={{ display: "none" }} />
              </label>
              {(iconPreview || currentIconPath) && (
                <Button variant="ghost" size="sm" onClick={removeIcon}>
                  Odebrat ikonu
                </Button>
              )}
            </div>
            {iconError && (
              <span style={{ font: "var(--text-body-sm)", color: "var(--status-pending-fg)" }}>{iconError}</span>
            )}
            <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>
              Obrázek do 2 MB. Bez vlastní ikony se zobrazuje logo watermark.
            </span>
          </ModalField>

          {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}

          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <Button variant="ghost" size="md" fullWidth onClick={() => setForm(null)}>
              Zrušit
            </Button>
            <Button variant="gold" size="md" fullWidth onClick={saveForm}>
              Uložit
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
        cursor: "pointer",
        padding: "6px 14px",
        borderRadius: "var(--radius-pill)",
        font: "var(--text-label-caps)",
        letterSpacing: "var(--tracking-caps)",
        textTransform: "uppercase",
        background: active ? "var(--surface-primary)" : "var(--surface-card-sunken)",
        color: active ? "var(--text-on-primary)" : "var(--text-muted)",
      }}
    >
      {label}
    </button>
  );
}
