"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";

type View = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchView(next: View) {
    setView(next);
    setError("");
    setPassword("");
    setConfirm("");
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Vyplň uživatelské jméno i heslo.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password || !confirm) {
      setError("Vyplň všechna pole.");
      return;
    }
    if (password !== confirm) {
      setError("Hesla se neshodují.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      router.push("/dashboard");
      router.refresh();
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
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-app-bg-gradient)",
        padding: "var(--space-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-8)",
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "var(--radius-lg)",
              background:
                "radial-gradient(circle at 30% 25%, var(--c-bordeaux-500), var(--c-bordeaux-900))",
              border: "1px solid var(--border-strong)",
              boxShadow: "var(--status-approved-glow), var(--shadow-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "var(--space-2)",
            }}
          >
            <Image
              src="/logo/logo_white_transparent.png"
              alt=""
              width={52}
              height={52}
              style={{ objectFit: "contain" }}
            />
          </div>
          <div
            style={{
              font: "400 32px/1.15 var(--font-display)",
              color: "var(--accent-gold)",
              textAlign: "center",
            }}
          >
            České chlevy a márnice
          </div>
          <div style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
            Guildovní tracker achievementů
          </div>
        </div>

        {view === "login" ? (
          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <div
              style={{
                font: "var(--text-heading-lg)",
                color: "var(--text-heading)",
                textAlign: "center",
                marginBottom: "var(--space-1)",
              }}
            >
              Přihlášení
            </div>

            <Field label="Uživatelské jméno">
              <input
                className="cca-input"
                type="text"
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="Grozarn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>

            <Field label="Heslo">
              <input
                className="cca-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <ErrorSlot message={error} />

            <Button type="submit" variant="gold" size="lg" fullWidth disabled={submitting}>
              Přihlásit se
            </Button>

            <SwitchLine
              text="Nemáš účet?"
              linkText="Zaregistruj se"
              onClick={() => switchView("register")}
            />
          </form>
        ) : (
          <form
            onSubmit={handleRegister}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <div
              style={{
                font: "var(--text-heading-lg)",
                color: "var(--text-heading)",
                textAlign: "center",
                marginBottom: "var(--space-1)",
              }}
            >
              Registrace
            </div>

            <Field label="Uživatelské jméno">
              <input
                className="cca-input"
                type="text"
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="Grozarn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>

            <Field label="Heslo">
              <input
                className="cca-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Field label="Potvrzení hesla">
              <input
                className="cca-input"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>

            <ErrorSlot message={error} />

            <Button type="submit" variant="gold" size="lg" fullWidth disabled={submitting}>
              Vytvořit účet
            </Button>

            <SwitchLine
              text="Už máš účet?"
              linkText="Přihlásit se"
              onClick={() => switchView("login")}
            />
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <span
        style={{
          font: "var(--text-label-caps)",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function ErrorSlot({ message }: { message: string }) {
  return (
    <div style={{ minHeight: 20, display: "flex", alignItems: "center" }}>
      {message && (
        <span style={{ font: "var(--text-body-sm)", color: "var(--status-pending-fg)" }}>
          {message}
        </span>
      )}
    </div>
  );
}

function SwitchLine({
  text,
  linkText,
  onClick,
}: {
  text: string;
  linkText: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-1)",
        marginTop: "var(--space-4)",
        font: "var(--text-body-sm)",
        color: "var(--text-muted)",
      }}
    >
      {text}
      <button type="button" className="cca-link" onClick={onClick}>
        {linkText}
      </button>
    </div>
  );
}
